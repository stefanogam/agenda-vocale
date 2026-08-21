// client/lib/date-utils.js
//
// Estratte dal mockup: sono le funzioni che decidono come si raggruppano
// gli appuntamenti, come si calcolano le scadenze e i countdown. Nessuna
// tocca il DOM o React — per questo sono le prime candidate per i test.

export const MONTH_LONG = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
export const MONTH_SHORT = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
export const WEEKDAY_LONG = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];

const pad2 = (n) => String(n).padStart(2, "0");

export const dateKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
export const parseKey = (k) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };

export function diffDays(d, today) {
  const a = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const b = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((a - b) / 86400000);
}

export const shortDate = (d) => `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;

export function countdownLabel(ev, today) {
  const diff = diffDays(parseKey(ev.date), today);
  if (diff === 0) return "oggi";
  if (diff === 1) return "domani";
  if (diff < 14) return `tra ${diff} giorni`;
  return `tra ${Math.round(diff / 7)} settimane`;
}

export function bucketLabel(diff, d) {
  if (diff === 0) return `Oggi · ${WEEKDAY_LONG[d.getDay()]} ${d.getDate()} ${MONTH_LONG[d.getMonth()]}`;
  if (diff === 1) return `Domani · ${WEEKDAY_LONG[d.getDay()]} ${d.getDate()} ${MONTH_LONG[d.getMonth()]}`;
  if (diff <= 7) return "Questa settimana";
  return "Più avanti";
}

export function buildListaGroups(events, today) {
  const sorted = [...events].sort((a, b) => (a.date === b.date ? (a.time || "99:99").localeCompare(b.time || "99:99") : a.date.localeCompare(b.date)));
  const map = new Map();
  sorted.forEach((ev) => {
    const d = parseKey(ev.date);
    const diff = diffDays(d, today);
    if (diff < 0) return;
    const label = bucketLabel(diff, d);
    if (!map.has(label)) map.set(label, []);
    map.get(label).push(ev);
  });
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

// Numero di settimana secondo lo standard ISO 8601 (quello usato in
// Italia e in Europa): la settimana inizia di lunedì, e la settimana 1
// è quella che contiene il primo giovedì dell'anno.
export function isoWeekNumber(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = t.getUTCDay() || 7; // domenica = 7, non 0
  t.setUTCDate(t.getUTCDate() + 4 - dayNum); // vai al giovedì di quella settimana
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - yearStart) / 86400000 + 1) / 7);
}

export function weekDatesFor(anchor) {
  const dow = (anchor.getDay() + 6) % 7; // 0 = lunedì
  const monday = new Date(anchor);
  monday.setDate(anchor.getDate() - dow);
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d; });
}

export function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const dow = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - dow);
  const weeks = [];
  let cur = new Date(start);
  for (let w = 0; w < 6; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) { week.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
    weeks.push(week);
  }
  return weeks;
}

export function reminderLabel(min) {
  if (min < 60) return `${min} min prima`;
  if (min < 1440) return `${min / 60} ora prima`;
  return `${min / 1440} giorno prima`;
}

export function formatTime12h(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}
