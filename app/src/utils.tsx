// Helper: Berechnet den Montag der Woche (korrigiert)
export const getMondayOfDate = (dateToUse: Date): Date => {
    // 1. Erstelle eine Kopie des Datums und setze die Zeit auf 00:00:00
    // Dies ist wichtig für konsistente Berechnungen.
    const date = new Date(dateToUse.getFullYear(), dateToUse.getMonth(), dateToUse.getDate());

    let dayOfWeek = date.getDay(); // 0 (Sonntag) bis 6 (Samstag)

    // ISO-Wochenstart (Montag) Logik:
    // Wenn es Sonntag (0) ist, behandle es als 7. Wir wollen 6 Tage zurück.
    // Wenn es Montag (1) ist, behandle es als 1. Wir wollen 0 Tage zurück.
    // Wenn es Dienstag (2) ist, behandle es als 2. Wir wollen 1 Tag zurück.

    // Die Anzahl der Tage, die seit Montag vergangen sind: (1=Mo, 2=Di, ...)
    const daysSinceMonday = dayOfWeek === 0 ? 5 : dayOfWeek - 1;

    // 2. Subtrahiere die Tage, um zum Montag zu gelangen
    date.setDate(date.getDate() - daysSinceMonday);

    // 3. Setze die Zeit erneut auf Mitternacht (um sicherzugehen)
    date.setHours(0, 0, 0, 0);

    return date;
};

// Helper: Formatiert das Datum als YYYY-MM-DD (für API-Aufruf)
export const formatDateISO = (date: Date): string => {
    return date.toISOString().split('T')[0];
};

