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

export function buildRRule(interval, unitKey) {
  const unit = RECUR_UNITS.find((u) => u.key === unitKey);
  if (!unit) throw new Error(`Unità di ricorrenza sconosciuta: ${unitKey}`);
  return `FREQ=${unit.freq};INTERVAL=${interval}`;
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
