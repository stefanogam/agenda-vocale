// client/lib/multi-day.js
//
// Trasforma gli eventi che durano più giorni in "segmenti" disegnabili:
// per ogni riga di calendario (una settimana) dice da quale colonna a
// quale colonna deve estendersi la barra, e su quale corsia metterla
// quando più eventi lunghi si sovrappongono.
//
// Un evento di più giorni con un puntino sul solo giorno iniziale non si
// capisce: la barra continua rende visibile a colpo d'occhio quanto dura.

import { dateKey } from "./date-utils.js";

export function isMultiDay(occ) {
  return !!(occ.date && occ.end_date && occ.end_date > occ.date);
}

// true se l'occorrenza copre quel giorno (estremi compresi)
export function occursOn(occ, key) {
  if (!occ.date) return false;
  if (!isMultiDay(occ)) return occ.date === key;
  return key >= occ.date && key <= occ.end_date;
}

// Segmenti da disegnare sotto una riga di 7 giorni.
// Un evento che attraversa più settimane produce un segmento per riga,
// con gli angoli squadrati dal lato in cui prosegue.
export function segmentsForWeek(occurrences, weekDates) {
  const keys = weekDates.map(dateKey);
  const weekStart = keys[0];
  const weekEnd = keys[6];

  const candidates = occurrences
    .filter(isMultiDay)
    .filter((o) => o.date <= weekEnd && o.end_date >= weekStart)
    // i più lunghi in alto: le barre corte sotto restano leggibili
    .sort((a, b) => a.date.localeCompare(b.date) || b.end_date.localeCompare(a.end_date));

  const lanes = []; // per ogni corsia, l'ultima colonna occupata
  const segments = [];

  for (const occ of candidates) {
    const startKey = occ.date > weekStart ? occ.date : weekStart;
    const endKey = occ.end_date < weekEnd ? occ.end_date : weekEnd;
    const startCol = keys.indexOf(startKey);
    const endCol = keys.indexOf(endKey);
    if (startCol < 0 || endCol < 0) continue;

    let lane = lanes.findIndex((lastCol) => lastCol < startCol);
    if (lane === -1) { lane = lanes.length; lanes.push(-1); }
    lanes[lane] = endCol;

    segments.push({
      occ,
      lane,
      startCol,
      span: endCol - startCol + 1,
      continuesLeft: occ.date < weekStart,
      continuesRight: occ.end_date > weekEnd,
    });
  }

  return { segments, laneCount: lanes.length };
}
