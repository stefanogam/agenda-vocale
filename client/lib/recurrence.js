// client/src/lib/recurrence.js
//
// Converte tra "ogni 2 settimane" (quello che sceglie l'utente nel form)
// e la sintassi RRULE che lo store/le occorrenze sanno interpretare.

export const RECUR_UNITS = [
  { key: "minuti", freq: "MINUTELY" },
  { key: "ore", freq: "HOURLY" },
  { key: "giorni", freq: "DAILY" },
  { key: "settimane", freq: "WEEKLY" },
  { key: "mesi", freq: "MONTHLY" },
  { key: "anni", freq: "YEARLY" },
];

export function buildRRule(interval, unitKey, byday = null) {
  const unit = RECUR_UNITS.find((u) => u.key === unitKey);
  if (!unit) throw new Error(`Unità di ricorrenza sconosciuta: ${unitKey}`);
  const base = `FREQ=${unit.freq};INTERVAL=${interval}`;
  // BYDAY ha senso solo per le ricorrenze settimanali ("ogni lunedì")
  return byday && unit.freq === "WEEKLY" ? `${base};BYDAY=${byday}` : base;
}

// Scompone una RRULE nei valori che i campi del form sanno mostrare
export function parseRRule(rrule) {
  if (!rrule) return null;
  const freq = rrule.match(/FREQ=(\w+)/)?.[1];
  const interval = Number(rrule.match(/INTERVAL=(\d+)/)?.[1] ?? 1);
  const byday = rrule.match(/BYDAY=([A-Z,]+)/)?.[1] ?? null;
  const unit = RECUR_UNITS.find((u) => u.freq === freq);
  if (!unit) return null;
  return { interval, unitKey: unit.key, byday };
}

// Per mostrare "Ogni 2 settimane" leggibile a partire dalla RRULE salvata
export function describeRRule(rrule) {
  if (!rrule) return null;
  const freq = rrule.match(/FREQ=(\w+)/)?.[1];
  const interval = Number(rrule.match(/INTERVAL=(\d+)/)?.[1] ?? 1);
  const unit = RECUR_UNITS.find((u) => u.freq === freq);
  if (!unit) return rrule;
  return `Ogni ${interval} ${unit.key}`;
}
