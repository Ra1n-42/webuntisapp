from flask import Flask, jsonify, request
import webuntis
from datetime import date, timedelta, time
import logging
# ACHTUNG: Importiere die Config-Klasse nun aus der lokalen Datei conf.py
from conf import Config 

# -------------------------------------------------------
# Konfiguration & Globale Variablen
# -------------------------------------------------------

# 🔑 Zugangsdaten werden über die Config-Klasse aus Umgebungsvariablen geladen.
# (Diese ENV-Variablen werden idealerweise per docker-compose.yml aus credentials.env injiziert)
USERNAME = Config.USERNAME
PASSWORD = Config.PASSWORD
SCHOOL = Config.SCHOOL
SERVER = Config.SERVER
MYCLASS = Config.MYCLASS

# -------------------------------------------------------
# Logging Setup
# -------------------------------------------------------
logger = logging.getLogger("webuntis_app")
logger.setLevel(logging.INFO) # Setze auf INFO oder DEBUG für ausführlichere Logs

# Konfiguriere einen einfachen Handler für die Konsole
if not logger.handlers:
    console_handler = logging.StreamHandler()
    console_formatter = logging.Formatter(
        "%(asctime)s [%(levelname)s] %(message)s"
    )
    console_handler.setFormatter(console_formatter)
    logger.addHandler(console_handler)

# -------------------------------------------------------
# Flask Setup
# -------------------------------------------------------
app = Flask(__name__)

# Du könntest hier app.config.from_object(Config) nutzen, wenn du Flask-spezifische
# Konfigurationsvariablen hättest. Für globale Daten wie USERNAME etc. ist die
# direkte Zuweisung (siehe oben) ausreichend und direkter.

# -------------------------------------------------------
# Hilfsfunktionen
# -------------------------------------------------------

def untis_int_to_time(t: int) -> time:
    """Konvertiert Untis-Zeit (z.B. 715) zu datetime.time (7:15 Uhr)."""
    return time(t // 100, t % 100)

def get_week_dates(start_date: date = None) -> tuple[date, date]:
    """
    Berechnet den Montag und Samstag der Woche, die ein gegebenes Startdatum enthält.
    
    :param start_date: Ein Datum oder None (nimmt dann date.today()).
    :return: Ein Tupel (Montag, Samstag).
    """
    if start_date is None:
        start_date = date.today()
    
    # days_to_monday ist 0 für Montag, 1 für Dienstag, ..., 6 für Sonntag
    days_to_monday = start_date.weekday()
    
    # Berechne den Montag
    monday = start_date - timedelta(days=days_to_monday) 
    
    # WebUntis-Zeitplan läuft oft von Montag bis Samstag (5 Tage später)
    saturday = monday + timedelta(days=5) 
    
    return monday, saturday

def resolve_ids(raw: dict, key: str, lookup: dict, fallback="n/a") -> str:
    """
    Löst die IDs (z.B. von Fächern, Räumen) in einem rohen WebUntis-Eintrag 
    zu ihren Namen (aus dem Lookup-Dictionary) auf.
    
    :param raw: Der rohe Stundenplan-Eintrag (p._data).
    :param key: Der Schlüssel für die IDs im Eintrag ('su', 'ro', etc.).
    :param lookup: Das Dictionary {ID: Name}.
    :param fallback: Fallback-String bei fehlendem Eintrag.
    :return: Eine kommaseparierte Liste der Namen.
    """
    try:
        # IDs können unter verschiedenen Schlüsseln oder Formaten vorliegen
        ids = raw.get(key, [])
        resolved = []
        
        for entry in ids:
            entity_id = None
            if isinstance(entry, dict):
                # Versuche, 'id' oder 'orgid' zu bekommen
                entity_id = entry.get('id') or entry.get('orgid')
            
            if entity_id is not None:
                name = lookup.get(entity_id, f"#{entity_id}")
                resolved.append(str(name))
            elif not isinstance(entry, dict):
                 # Fallback für unerwartete Formate, falls der Eintrag selbst der Name/ID ist
                resolved.append(str(entry))

        return ", ".join(resolved)
    except Exception as e:
        logger.warning("Konnte %s nicht auflösen: %s", key, e)
        return fallback

# Die 'resolve_teacher_data' Funktion ist komplexer, aber notwendig für die 
# erweiterten Lehrer-Details. Wir lassen sie hier, da sie die Lehrer-Details 
# (name, vornamen, nachnamen) als Liste von Dictionaries zurückgibt.
# Die ursprüngliche 'resolve_ids' (oben) gibt nur einen String zurück.
def resolve_teacher_data(raw: dict, key: str, lookup: dict, fallback=None) -> list | str:
    """
    Löst Lehrer-IDs in eine Liste von Lehrer-Dictionaries mit 'name', 'vornamen' etc. auf.
    """
    if fallback is None:
        fallback = []
    
    try:
        ids = raw.get(key, [])
        if not ids:
            return fallback

        resolved_data = []
        for entry in ids:
            if isinstance(entry, dict):
                teacher_id = entry.get('orgid') or entry.get('id')
                
                if teacher_id is not None:
                    teacher_data = lookup.get(teacher_id)
                    
                    if teacher_data and isinstance(teacher_data, dict):
                        resolved_data.append(teacher_data)
                    else:
                        resolved_data.append({'id': teacher_id, 'name': f"Unbekannt (#{teacher_id})"})
                
        return resolved_data

    except Exception as e:
        logger.warning("Konnte %s (Lehrer) nicht auflösen: %s", key, e)
        return "Fehler beim Auflösen"

# -------------------------------------------------------
# Routen
# -------------------------------------------------------

@app.route("/json")
def timetable_json():
    """
    Gibt den Stundenplan für die konfigurierte Klasse als JSON-Tabelle zurück.
    Der Starttag der Woche kann optional per Query-Parameter 'date' (ISO-Format: YYYY-MM-DD) 
    angegeben werden.
    """
    
    # 1. Datum ermitteln
    date_str = request.args.get("date")
    start_date = None
    if date_str:
        try:
            start_date = date.fromisoformat(date_str)
        except ValueError:
            logger.warning(f"Ungültiges Datumsformat '{date_str}'. Verwende heute.")
            pass 
    
    # Berechne den Wochenanfang (Montag) und das Ende (Samstag)
    monday, saturday = get_week_dates(start_date)

    try:
        # 2. WebUntis-Session starten
        # Die Zugangsdaten werden aus den globalen Variablen geladen (siehe oben)
        with webuntis.Session(
            username=USERNAME,
            password=PASSWORD,
            school=SCHOOL,
            server=SERVER,
            useragent="WebUntis API"
        ).login() as s:

            # 3. Klasse finden
            klassen = s.klassen().filter(name=MYCLASS)
            if not klassen:
                logger.error(f"Klasse {MYCLASS} nicht gefunden. Prüfe MYCLASS-Variable.")
                return jsonify({"error": f"Klasse '{MYCLASS}' nicht gefunden"}), 404

            klasse = klassen[0]

            # 4. Lookups für schnelle Namensauflösung laden
            # Fächer (su)
            subjects_lookup = {su.id: su.long_name or su.name for su in s.subjects()}
            # Lehrer (te) - Erweitert für Vor-/Nachnamen
            teachers_lookup_extend = {
                t.id: {'name': t.name, 'fore_name': t.fore_name, 'long_name': t.long_name} 
                for t in s.teachers()
            }
            # Räume (ro)
            rooms_lookup = {r.id: r.name for r in s.rooms()}

            # 5. Stundenplan abrufen (mit der to_table()-Methode)
            tabelle = s.timetable_extended(
                klasse=klasse,
                start=monday,
                end=saturday
            ).to_table()

            # 6. Daten aufbereiten
            days = {}
            all_times = set()

            for zeitstempel, data in tabelle:
                for datum, period_objs in data:
                    datum_str = datum.isoformat()
                    if datum_str not in days:
                        days[datum_str] = []

                    right_periods = []
                    
                    for p in period_objs:
                        # Uhrzeiten aus WebUntis-Integer konvertieren, falls nötig
                        if isinstance(p.start, int):
                            p.start = untis_int_to_time(p.start)
                        if isinstance(p.end, int):
                            p.end = untis_int_to_time(p.end)

                        # IDs auflösen
                        subject = resolve_ids(p._data, "su", subjects_lookup, "Kein Fach")
                        teacher = resolve_teacher_data(p._data, "te", teachers_lookup_extend, "Kein Lehrer")
                        room    = resolve_ids(p._data, "ro", rooms_lookup, "Kein Raum")

                        # Stunden-Details zusammenstellen
                        period_data = {
                            "id": p.id,
                            "time_start": p.start.strftime('%H:%M'),
                            "time_end": p.end.strftime('%H:%M'),
                            "subject": subject,
                            "teacher": teacher, # Liste von Lehrer-Dicts
                            "room": room,
                            "status": p.code or "regular", # Z.B. "cancelled"
                            "info": p.info or None # Zusätzliche Informationen
                        }
                        
                        # WebUntis to_table() gruppiert nach Stunden-Slots. 
                        # Wir fügen alle Perioden eines Slots (einer Zelle) zur Liste hinzu.
                        right_periods.append(period_data)
                    
                    # Den Zeitstempel des Slots (z.B. 08:00) zur Liste der Slot-Zeiten hinzufügen
                    time_str = zeitstempel.strftime("%H:%M")
                    all_times.add(time_str)

                    # Hinzufügen des gesamten Blocks zum Tag
                    # Der ursprüngliche Code enthielt eine Unterscheidung "left_block" / "right_periods" 
                    # basierend auf p.code == "irregular". Das war ein spezifisches Format für 
                    # die Darstellung (linke Spalte vs. rechte Spalte). Hier wird das vereinfacht 
                    # zu einer Liste von Perioden pro Zeit-Slot.
                    days[datum_str].append({
                        "slot_time": time_str,
                        "periods": right_periods
                    })

            # 7. Endgültige JSON-Antwort erstellen
            response = {
                "class": MYCLASS,
                "from": monday.isoformat(),
                "to": saturday.isoformat(),
                "times": sorted(list(all_times)), # Liste aller Startzeiten im Stundenplan
                "days": days # { Datum: [Perioden-Listen] }
            }

            return jsonify(response)

    except webuntis.errors.UntisError as ue:
        # Fängt spezifische Untis-Fehler ab (z.B. falsche Login-Daten)
        logger.error(f"WebUntis Fehler: {ue}")
        return jsonify({"error": f"Fehler bei der Untis-Verbindung: {ue}"}), 502 # Bad Gateway/Service Unavailable
        
    except Exception as e:
        logger.exception("Ein unerwarteter Fehler ist aufgetreten:")
        # Gib den Fehler nicht im Detail an den Nutzer weiter
        return jsonify({"error": "Interner Serverfehler beim Abrufen der Daten"}), 500

# -------------------------------------------------------
# Main
# -------------------------------------------------------
if __name__ == '__main__':
    # Prüfe kritische Variablen, bevor der Server gestartet wird
    if not all([USERNAME, PASSWORD, SCHOOL, SERVER, MYCLASS]):
        logger.error("❌ ERROR: Eine oder mehrere WebUntis-Zugangsdaten (USERNAME, PASSWORD, SCHOOL, SERVER, MYCLASS) fehlen.")
        logger.error("Bitte 'credentials.env' prüfen und sicherstellen, dass sie über docker-compose geladen werden.")
        exit(1)
        
    # '0.0.0.0' bedeutet, auf allen verfügbaren IP-Adressen zu lauschen (wichtig für Docker)
    # debug=True sollte im Produktivbetrieb ausgeschaltet sein!
    app.run(host='0.0.0.0', port=5000, debug=False)