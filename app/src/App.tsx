import { useState, useEffect } from "react";
import { getMondayOfDate } from "./utils";

import Footer from "./Footer";


// Typen für die WebUntis API
interface Teacher {
  nachnamen: string;
  name: string;
  vornamen: string;
}

interface Lesson {
  room: string;
  status: 'regular' | 'cancelled';
  subject: string;
  teacher: Teacher[];
  time: string;
}

interface TimeSlot {
  left: Lesson | null;
  right: Lesson[];
  time: string;
}

interface WebUntisData {
  class: string;
  days: {
    [date: string]: TimeSlot[];
  };
  from: string;
  to: string;
  times: string[];
  metadata: {
    id: string;
    private: boolean;
    createdAt: string;
    name: string;
  };
}

interface ProcessedLesson {
  id: string;
  lehrer: string;
  fach: string;
  raum: string;
  datum: string;
  von: string;
  bis: string;
  cancelled: boolean;
  kompetenzen: string[];
  eintrag: string;
}

const bloecke = [
  { nr: 1, von: "07:15", bis: "08:45" },
  { nr: 2, von: "09:05", bis: "10:35" },
  { nr: 3, von: "10:55", bis: "12:25" },
  { nr: 4, von: "12:50", bis: "14:20" },
  { nr: 5, von: "14:40", bis: "16:10" },
  { nr: 6, von: "17:00", bis: "18:30" },
  { nr: 7, von: "18:45", bis: "20:15" },
];

// Skeleton Loading Component
const TimetableSkeleton = () => {
  // Simuliere 5 Tage für das Skeleton
  const skeletonDays = Array(5).fill(null);

  return (
    <div className="grid border border-gray-300 rounded-2xl overflow-hidden shadow-lg bg-white"
      style={{ gridTemplateColumns: `160px repeat(5, 1fr)` }}>

      {/* Skeleton Header */}
      <div className="bg-gray-200 p-3 animate-pulse">
        <div className="h-4 bg-gray-300 rounded"></div>
      </div>
      {skeletonDays.map((_, i) => (
        <div key={i} className="bg-gray-200 p-3 animate-pulse">
          <div className="h-4 bg-gray-300 rounded mb-2"></div>
          <div className="h-3 bg-gray-300 rounded"></div>
        </div>
      ))}

      {/* Skeleton Rows */}
      {bloecke.map((blockIndex) => (
        <div className="contents" key={`skeleton-row-${blockIndex}`}>
          {/* Time Column Skeleton */}
          <div className="border-t border-gray-300 p-3 bg-gray-50 animate-pulse">
            <div className="h-4 bg-gray-300 rounded mb-1"></div>
            <div className="h-2 bg-gray-300 rounded mx-auto w-3 mb-1"></div>
            <div className="h-4 bg-gray-300 rounded"></div>
          </div>

          {/* Day Cells Skeleton */}
          {skeletonDays.map((_, dayIndex) => (
            <div key={`skeleton-cell-${blockIndex}-${dayIndex}`}
              className="border-t border-l border-gray-300 bg-white min-h-24 p-1">
              {/* Zufällige Skeleton-Inhalte für mehr Realismus */}
              {Math.random() > 0.3 ? (
                <div className="h-full flex gap-1">
                  {Math.random() > 0.5 && (
                    <div className="flex-1 animate-pulse">
                      <div className="h-full bg-gray-200 rounded-lg flex flex-col justify-center items-center p-2">
                        <div className="h-3 bg-gray-300 rounded w-16 mb-1"></div>
                        <div className="h-2 bg-gray-300 rounded w-12 mb-1"></div>
                        <div className="h-2 bg-gray-300 rounded w-8"></div>
                      </div>
                    </div>
                  )}
                  <div className={Math.random() > 0.5 ? "flex-1" : "w-full"}>
                    <div className="h-full animate-pulse">
                      <div className="h-full bg-gray-200 rounded-lg flex flex-col justify-center items-center p-2">
                        <div className="h-3 bg-gray-300 rounded w-14 mb-1"></div>
                        <div className="h-2 bg-gray-300 rounded w-10 mb-1"></div>
                        <div className="h-2 bg-gray-300 rounded w-6"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="h-2 bg-gray-200 rounded w-8 animate-pulse"></div>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

// Loading Spinner Component
const LoadingSpinner = ({ text = "Lade..." }) => (
  <div className="flex items-center justify-center gap-3 text-indigo-600">
    <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-500 border-t-transparent"></div>
    <span className="text-sm font-medium">{text}</span>
  </div>
);

// Hilfsfunktionen
const toMinutes = (time: string): number => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const formatDate = (date: Date): string => {
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatDateForApi = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const parseTimeRange = (timeRange: string): { von: string; bis: string } => {
  const [von, bis] = timeRange.split('-');
  return { von, bis };
};

const formatTeacherNames = (teachers: Teacher[]): string => {
  return teachers.map(t => `${t.vornamen} ${t.nachnamen}`).join(", ");
};

const convertWebUntisToLessons = (data: WebUntisData): ProcessedLesson[] => {
  const lessons: ProcessedLesson[] = [];
  let idCounter = 1;

  Object.entries(data.days).forEach(([date, timeSlots]) => {
    timeSlots.forEach(timeSlot => {
      if (timeSlot.left) {
        const { von, bis } = parseTimeRange(timeSlot.left.time);
        lessons.push({
          id: `${idCounter++}`,
          lehrer: formatTeacherNames(timeSlot.left.teacher),
          fach: timeSlot.left.subject,
          raum: timeSlot.left.room,
          datum: date,
          von,
          bis,
          cancelled: timeSlot.left.status === 'cancelled',
          kompetenzen: [],
          eintrag: "",
        });
      }

      timeSlot.right.forEach(lesson => {
        const { von, bis } = parseTimeRange(lesson.time);
        lessons.push({
          id: `${idCounter++}`,
          lehrer: formatTeacherNames(lesson.teacher),
          fach: lesson.subject,
          raum: lesson.room,
          datum: date,
          von,
          bis,
          cancelled: lesson.status === 'cancelled',
          kompetenzen: [],
          eintrag: "",
        });
      });
    });
  });

  return lessons;
};

export default function App() {
  const [startDatum, setStartDatum] = useState<Date>(getMondayOfDate(new Date()));
  const [stunden, setStunden] = useState<ProcessedLesson[]>([]);
  const [data, setData] = useState<WebUntisData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ProcessedLesson | null>(null);
  const [newKompetenz, setNewKompetenz] = useState<string>("");
  const [newEintrag, setNewEintrag] = useState<string>("");
  const [className, setClassName] = useState<string>("");

  // Neuer State für besseres Loading-Management
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);

  const convertSingleLesson = (lesson: Lesson, date: string, id: string): ProcessedLesson => {
    const { von, bis } = parseTimeRange(lesson.time);
    const existingLesson = stunden.find(s => s.id === id);
    return {
      id,
      lehrer: formatTeacherNames(lesson.teacher),
      fach: lesson.subject,
      raum: lesson.room,
      datum: date,
      von,
      bis,
      cancelled: lesson.status === 'cancelled',
      kompetenzen: existingLesson ? existingLesson.kompetenzen : [],
      eintrag: existingLesson ? existingLesson.eintrag : "",
    };
  };


  useEffect(() => {
    const fetchData = async () => {
      const apiDate = formatDateForApi(startDatum);
      const url = `http://localhost:5000/json?date=${apiDate}`;

      try {
        setLoading(true);
        setError(null);

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const data: WebUntisData = await response.json();

        setData(data);
        setClassName(data.class);
        const convertedLessons = convertWebUntisToLessons(data);
        setStunden(convertedLessons);

      } catch (err) {
        console.error('Fehler beim Laden der Daten:', err);
        setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
      } finally {
        setLoading(false);
        setIsInitialLoading(false);
      }
    };

    fetchData();
  }, [startDatum]);

  const saveChanges = () => {
    setStunden((prev) =>
      prev.map((s) =>
        s.id === selected?.id
          ? { ...s, eintrag: newEintrag, kompetenzen: selected.kompetenzen }
          : s
      )
    );
    setSelected(null);
  };

  const addKompetenz = () => {
    if (!newKompetenz.trim() || !selected) return;
    setSelected({
      ...selected,
      kompetenzen: [...selected.kompetenzen, newKompetenz.trim()],
    });
    setNewKompetenz("");
  };

  const removeKompetenz = (index: number) => {
    if (!selected) return;
    setSelected({
      ...selected,
      kompetenzen: selected.kompetenzen.filter((_, i) => i !== index),
    });
  };

  // Wochennavigation mit verbessertem UX
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(startDatum);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setStartDatum(newDate);
  };

  const verfuegbareTage = Object.keys(data?.days || {}).sort();
  const woche: Date[] = verfuegbareTage.map(dateStr => new Date(dateStr));

  const anzeigeWoche = data ? `${formatDate(new Date(data.from))} – ${formatDate(new Date(data.to))}` : 'Lade Woche...';

  // Initial Loading Screen
  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Stundenplan wird geladen...</h2>
          <p className="text-gray-500 mt-2">Daten werden von WebUntis abgerufen</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error && !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Fehler beim Laden</h2>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            Neu laden
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-indigo-700 mb-2">
          📅 Stundenplan {className}
        </h1>
        <p className="text-gray-600">WebUntis Integration</p>
      </div>

      {/* Verbesserte Navigation */}
      <div className="flex justify-center items-center gap-4 mb-6">
        <button
          onClick={() => navigateWeek('prev')}
          disabled={loading}
          className="px-4 py-2 bg-indigo-500 text-white rounded-lg shadow hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ◀ Vorherige Woche
        </button>
        <div className="text-lg font-semibold text-gray-700 bg-white px-4 py-2 rounded-lg shadow min-w-64 text-center">
          {loading ? <LoadingSpinner text="Lade Woche..." /> : anzeigeWoche}
        </div>
        <button
          onClick={() => navigateWeek('next')}
          disabled={loading}
          className="px-4 py-2 bg-indigo-500 text-white rounded-lg shadow hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Nächste Woche ▶
        </button>
      </div>

      {/* Hauptinhalt mit Skeleton Loading */}
      {loading ? (
        <TimetableSkeleton />
      ) : verfuegbareTage.length === 0 ? (
        // Keine Daten verfügbar
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-xl mx-auto mt-10">
          <div className="text-yellow-500 text-6xl mb-4">☀️</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            Keine Daten verfügbar
          </h2>
          <p className="text-gray-500 mb-4">
            Für die Woche vom <strong>{anzeigeWoche}</strong> liegen keine Stundenplan-Einträge vor.
            <br />Dies könnte auf <strong>Ferien</strong>, Feiertage oder einen leeren Stundenplan hindeuten.
          </p>
          <p className="text-indigo-500 font-medium">
            Klicken Sie auf <strong>Nächste Woche ▶</strong>, um zum folgenden Zeitraum zu navigieren.
          </p>
        </div>
      ) : (
        // Regulärer Stundenplan
        <div
          className="grid border border-gray-300 rounded-2xl overflow-hidden shadow-lg bg-white"
          style={{ gridTemplateColumns: `160px repeat(${woche.length}, 1fr)` }}
        >
          {/* Kopfzeile */}
          <div className="bg-indigo-200 p-3 font-semibold text-center text-indigo-900">
            Zeit
          </div>
          {woche.map((d, i) => {
            const dayOfWeek = d.getDay();
            const dayName = dayOfWeek === 0 ? "Sonntag" :
              dayOfWeek === 1 ? "Montag" :
                dayOfWeek === 2 ? "Dienstag" :
                  dayOfWeek === 3 ? "Mittwoch" :
                    dayOfWeek === 4 ? "Donnerstag" :
                      dayOfWeek === 5 ? "Freitag" : "Samstag";

            return (
              <div
                key={i}
                className="bg-indigo-200 p-3 font-semibold text-center text-indigo-900"
              >
                <div>{dayName}</div>
                <div className="text-sm font-normal">{formatDate(d)}</div>
              </div>
            );
          })}

          {/* Stundenplan-Rows */}
          {bloecke.map((block, blockIndex) => {
            return (
              <div className="contents" key={`row-${blockIndex}`}>
                {/* Zeit-Spalte */}
                <div className="border-t border-gray-300 p-3 text-sm text-gray-700 font-medium bg-gray-50 flex flex-col justify-center items-center">
                  <div className="font-semibold">{block.von}</div>
                  <div className="text-xs text-gray-500">-</div>
                  <div className="font-semibold">{block.bis}</div>
                </div>

                {/* Zellen für jeden Tag */}
                {woche.map((d, dayIndex) => {
                  const tagDatum = formatDateForApi(d);
                  const dayTimeSlots = data?.days[tagDatum] || [];
                  const blockStartMinutes = toMinutes(block.von);
                  const blockEndMinutes = toMinutes(block.bis);
                  const slotsInBlock = dayTimeSlots.filter(slot => {
                    const slotTimeMinutes = toMinutes(slot.time);
                    return slotTimeMinutes >= blockStartMinutes && slotTimeMinutes < blockEndMinutes;
                  });

                  return (
                    <div
                      key={`cell-${blockIndex}-${dayIndex}`}
                      className="border-t border-l border-gray-300 relative bg-white min-h-24 p-1 flex flex-col gap-1"
                    >
                      {slotsInBlock.length > 0 ? (
                        slotsInBlock.map((timeSlot, slotIndex) => (
                          <div key={slotIndex} className={`flex h-full gap-1 ${!timeSlot?.left ? 'justify-center' : ''}`}>
                            {/* Left Side */}
                            {timeSlot?.left && (
                              <div className="flex-1">
                                <div
                                  className="h-full rounded-lg shadow-md text-xs flex flex-col justify-center items-center cursor-pointer transition-all hover:scale-105 hover:shadow-lg bg-green-400 text-white border-2"
                                  onClick={() => {
                                    const lesson = convertSingleLesson(timeSlot.left!, tagDatum, `left-${blockIndex}-${dayIndex}-${slotIndex}`);
                                    setSelected(lesson);
                                    setNewEintrag(lesson.eintrag);
                                  }}
                                >
                                  <div className="font-semibold text-center px-1">{timeSlot.left.subject}</div>
                                  <div className="text-center">{formatTeacherNames(timeSlot.left.teacher)}</div>
                                  <div className="text-center">{timeSlot.left.room}</div>
                                </div>
                              </div>
                            )}

                            {/* Right Side */}
                            {timeSlot?.right && timeSlot.right.length > 0 && (
                              <div className={timeSlot?.left ? "flex-1" : "w-full"}>
                                <div className="h-full flex flex-col gap-1">
                                  {timeSlot.right.map((rightLesson, idx) => (
                                    <div
                                      key={idx}
                                      className={`flex-1 rounded-lg shadow-md text-xs flex flex-col justify-center items-center cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${rightLesson.status === 'cancelled'
                                        ? "bg-red-100 text-red-600 border border-orange-500"
                                        : "bg-green-500 text-white"
                                        }`}
                                      onClick={() => {
                                        const lesson = convertSingleLesson(rightLesson, tagDatum, `right-${blockIndex}-${dayIndex}-${slotIndex}-${idx}`);
                                        setSelected(lesson);
                                        setNewEintrag(lesson.eintrag);
                                      }}
                                    >
                                      <div className="font-semibold text-center px-1">
                                        {rightLesson.subject}
                                        {rightLesson.status === 'cancelled' && <div className="text-xs">(ausgefallen)</div>}
                                      </div>
                                      <div className="text-center">{formatTeacherNames(rightLesson.teacher)}</div>
                                      <div className="text-center">{rightLesson.room}</div>
                                      <div className="text-xs text-center">
                                        {parseTimeRange(rightLesson.time).von}-{parseTimeRange(rightLesson.time).bis}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-xs">
                          Frei
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal für Stundendetails */}
      {selected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-96 overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold text-indigo-700">
                    {selected.fach}
                  </h2>
                  <p className="text-gray-600">{selected.lehrer}</p>
                  <p className="text-sm text-gray-500">
                    {selected.raum} • {selected.datum} • {selected.von}-{selected.bis}
                  </p>
                  {selected.cancelled && (
                    <p className="text-red-500 font-semibold mt-1">⚠️ Ausgefallen</p>
                  )}
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                >
                  ×
                </button>
              </div>

              <div className="mb-4">
                <label className="block font-semibold text-gray-700 mb-2">Kompetenzen</label>
                <div className="flex gap-2 flex-wrap mb-3">
                  {selected.kompetenzen.map((k, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm flex items-center gap-2"
                    >
                      {k}
                      <button
                        onClick={() => removeKompetenz(i)}
                        className="text-indigo-400 hover:text-indigo-600"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newKompetenz}
                    onChange={(e) => setNewKompetenz(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addKompetenz()}
                    className="border border-gray-300 rounded-lg px-3 py-2 flex-grow focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Neue Kompetenz hinzufügen..."
                  />
                  <button
                    onClick={addKompetenz}
                    disabled={!newKompetenz.trim()}
                    className="bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <label className="block font-semibold text-gray-700 mb-2">Notizen</label>
                <textarea
                  value={newEintrag}
                  onChange={(e) => setNewEintrag(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 w-full h-24 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Notizen zur Stunde..."
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setSelected(null)}
                  className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={saveChanges}
                  className="px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors"
                >
                  Speichern
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
}