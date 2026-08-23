// client/lib/recurrence.js
//
// Converte tra "ogni 2 settimane il lunedì e il martedì" (quello che
// sceglie l'utente nel form) e la sintassi RRULE che lo store sa
// interpretare per generare le occorrenze.

export const RECUR_UNITS = [
  { key: "minuti", freq: "MINUTELY" },
  { key: "ore", freq: "HOURLY" },
  { key: "giorni", freq: "DAILY" },
  { key: "settimane", freq: "WEEKLY" },
  { key: "mesi", freq: "MONTHLY" },
  { key: "anni", freq: "YEARLY" },
];

// Giorni della settimana in ordine italiano (lunedì per primo)
export const WEEKDAY_CODES = [
  { code: "MO", short: "L", label: "lun" },
  { code: "TU", short: "M", label: "mar" },
  { code: "WE", short: "M", label: "mer" },
  { code: "TH", short: "G", label: "gio" },
  { code: "FR", short: "V", label: "ven" },
  { code: "SA", short: "S", label: "sab" },
  { code: "SU", short: "D", label: "dom" },
];

// La scelta dei giorni ha senso solo per ricorrenze settimanali o mensili:
// "ogni 10 minuti di lunedì" non vuol dire niente di utile.
export function supportsWeekdays(unitKey) {
  return unitKey === "settimane" || unitKey === "mesi";
}

export function buildRRule(interval, unitKey, byday = null) {
  const unit = RECUR_UNITS.find((u) => u.key === unitKey);
  if (!unit) throw new Error(`Unità di ricorrenza sconosciuta: ${unitKey}`);

  const days = Array.isArray(byday) ? byday : byday ? String(byday).split(",") : [];
  const base = `FREQ=${unit.freq};INTERVAL=${interval}`;
  return days.length && supportsWeekdays(unitKey) ? `${base};BYDAY=${days.join(",")}` : base;
}

// Scompone una RRULE nei valori che i campi del form sanno mostrare
export function parseRRule(rrule) {
  if (!rrule) return null;
  const freq = rrule.match(/FREQ=(\w+)/)?.[1];
  const interval = Number(rrule.match(/INTERVAL=(\d+)/)?.[1] ?? 1);
  const bydayRaw = rrule.match(/BYDAY=([A-Z,]+)/)?.[1] ?? null;
  const unit = RECUR_UNITS.find((u) => u.freq === freq);
  if (!unit) return null;
  return { interval, unitKey: unit.key, byday: bydayRaw ? bydayRaw.split(",") : [] };
}

// Descrizione leggibile, es. "Ogni 2 settimane (lun, mar)"
export function describeRRule(rrule) {
  const rec = parseRRule(rrule);
  if (!rec) return rrule || null;

  let text = `Ogni ${rec.interval} ${rec.unitKey}`;
  if (rec.byday.length) {
    const labels = rec.byday
      .map((c) => WEEKDAY_CODES.find((w) => w.code === c)?.label)
      .filter(Boolean);
    if (labels.length) text += ` (${labels.join(", ")})`;
  }
  return text;
}

// "Fino al 31 dicembre" viene salvato come data semplice (YYYY-MM-DD),
// ma va interpretato come fine giornata locale, non come mezzanotte UTC:
// altrimenti l'ultima occorrenza sparirebbe.
export function parseRecurrenceEnd(value) {
  if (!value) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T23:59:59`) : new Date(value);
}
