// client/lib/parse-it.js
//
// Interpreta un comando vocale in italiano e ne ricava un appuntamento
// strutturato. Gira interamente sul telefono: nessuna chiamata di rete,
// nessuna chiave API, nessun dato che esce dal dispositivo.
//
// Riconosce le espressioni di uso quotidiano (vedi i test in
// __tests__/parse-it.test.js). Quando non è sicuro lo dichiara, invece
// di indovinare: l'app mostra comunque la scheda con quello che ha
// capito, e tu correggi a mano i campi mancanti.

const WEEKDAYS = {
  lunedi: 1, martedi: 2, mercoledi: 3, giovedi: 4, venerdi: 5, sabato: 6, domenica: 0,
};
const MONTHS = {
  gennaio: 0, febbraio: 1, marzo: 2, aprile: 3, maggio: 4, giugno: 5,
  luglio: 6, agosto: 7, settembre: 8, ottobre: 9, novembre: 10, dicembre: 11,
};
const NUMBER_WORDS = {
  zero: 0, una: 1, uno: 1, un: 1, due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6,
  sette: 7, otto: 8, nove: 9, dieci: 10, undici: 11, dodici: 12, tredici: 13,
  quattordici: 14, quindici: 15, sedici: 16, diciassette: 17, diciotto: 18,
  diciannove: 19, venti: 20, ventuno: 21, ventidue: 22, ventitre: 23,
  ventiquattro: 24, venticinque: 25, ventisei: 26, ventisette: 27,
  ventotto: 28, ventinove: 29, trenta: 30, trentuno: 31,
};
const BYDAY = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

// Parole che introducono il comando e non fanno parte del titolo
const FILLER = [
  "ricordami di", "ricordami che devo", "ricordami", "promemoria per", "promemoria",
  "aggiungi appuntamento", "aggiungi", "crea appuntamento", "crea", "segna", "metti",
  "devo andare a", "devo andare", "devo", "ho un appuntamento", "appuntamento",
  "fissa", "prenota", "scadenza", "controllare", "controlla", "verificare", "verifica",
  "tenere d occhio", "tieni d occhio",
];

// Parole che indicano una scadenza piuttosto che un appuntamento
const DEADLINE_HINTS = ["scadenza", "scade", "entro", "consegna", "consegnare", "pagare", "pagamento", "rinnovo", "rinnovare", "bolletta", "rata", "termine"];
// Parole che indicano un'attività da tenere d'occhio, senza data fissa
const RADAR_HINTS = ["ogni tanto", "di tanto in tanto", "tenere d occhio", "tieni d occhio", "controllare se", "controlla se", "verificare se", "monitorare", "dare un occhiata"];

// Suggerimento di categoria: applicato solo se quella categoria esiste
const CATEGORY_HINTS = {
  Salute: ["dentista", "medico", "dottore", "visita", "analisi", "farmacia", "ospedale", "palestra", "fisioterapista", "oculista", "vaccino"],
  Lavoro: ["riunione", "meeting", "call", "cliente", "ufficio", "collega", "progetto", "presentazione", "colloquio"],
  Finanze: ["bolletta", "rata", "mutuo", "banca", "commercialista", "tasse", "fattura", "bonifico", "assicurazione"],
  Casa: ["idraulico", "elettricista", "casa", "affitto", "trasloco", "condominio", "manutenzione"],
  Personale: ["compleanno", "cena", "pranzo", "vacanza", "viaggio", "amici", "famiglia"],
};

// Toglie gli accenti mantenendo la stessa lunghezza, così gli indici
// calcolati sul testo normalizzato valgono anche sull'originale
function normalize(s) {
  return s.toLowerCase()
    .replace(/[àá]/g, "a").replace(/[èé]/g, "e").replace(/[ìí]/g, "i")
    .replace(/[òó]/g, "o").replace(/[ùú]/g, "u").replace(/['’]/g, " ");
}

const pad2 = (n) => String(n).padStart(2, "0");
const toKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// Prossima occorrenza di un giorno della settimana (oggi escluso)
function nextWeekday(from, targetDow, forceNextWeek) {
  const d = startOfDay(from);
  let delta = (targetDow - d.getDay() + 7) % 7;
  if (delta === 0) delta = 7;             // "martedì" detto di martedì = il prossimo
  if (forceNextWeek && delta < 7) delta += 7; // "martedì prossimo"
  d.setDate(d.getDate() + delta);
  return d;
}

export function parseItalianCommand(rawText, now = new Date(), knownCategories = []) {
  const text = normalize(rawText);
  const spans = []; // porzioni consumate da data/ora/ricorrenza: non finiscono nel titolo
  const take = (m) => { if (m) spans.push([m.index, m.index + m[0].length]); };

  let date = null;          // Date | null
  let time = null;          // { h, m } | null
  let rrule = null;
  let dateWasExplicit = false;
  let ambiguousHour = false;

  // ---------------------------------------------------------------
  // RICORRENZA — cercata per prima: "ogni lunedì" contiene un giorno
  // della settimana che altrimenti verrebbe letto come data singola
  // ---------------------------------------------------------------
  let m;

  // "ogni lunedì" / "tutti i lunedì"
  m = text.match(new RegExp(`\\b(?:ogni|tutti i|tutte le)\\s+(${Object.keys(WEEKDAYS).join("|")})\\b`));
  if (m) {
    rrule = `FREQ=WEEKLY;INTERVAL=1;BYDAY=${BYDAY[WEEKDAYS[m[1]]]}`;
    date = nextWeekday(now, WEEKDAYS[m[1]], false);
    dateWasExplicit = true;
    take(m);
  }

  // "ogni 2 settimane" / "ogni due mesi" / "ogni giorno" / "tutti i giorni"
  if (!rrule) {
    const unitRe = "giorn[oi]|settiman[ae]|mes[ei]|ann[oi]|or[ae]|minut[oi]";
    const numRe = `\\d+|${Object.keys(NUMBER_WORDS).join("|")}`;
    m = text.match(new RegExp(`\\b(?:ogni|tutti i|tutte le)\\s+(?:(${numRe})\\s+)?(${unitRe})\\b`));
    if (m) {
      const n = m[1] ? (NUMBER_WORDS[m[1]] ?? parseInt(m[1], 10)) : 1;
      const u = m[2];
      const freq = /^giorn/.test(u) ? "DAILY" : /^settiman/.test(u) ? "WEEKLY"
        : /^mes/.test(u) ? "MONTHLY" : /^ann/.test(u) ? "YEARLY"
        : /^or/.test(u) ? "HOURLY" : "MINUTELY";
      rrule = `FREQ=${freq};INTERVAL=${n}`;
      take(m);
    }
  }

  // ---------------------------------------------------------------
  // DATA
  // ---------------------------------------------------------------

  // "12/08" oppure "12/08/2026"
  if (!dateWasExplicit) {
    m = text.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
    if (m) {
      const y = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : now.getFullYear();
      const cand = new Date(y, +m[2] - 1, +m[1]);
      if (cand.getMonth() === +m[2] - 1) { // scarta date inesistenti tipo 31/02
        date = cand;
        if (!m[3] && cand < startOfDay(now)) date.setFullYear(y + 1); // già passata: anno prossimo
        dateWasExplicit = true;
        take(m);
      }
    }
  }

  // "12 agosto" / "il 12 di agosto" / "3 marzo 2027"
  if (!dateWasExplicit) {
    const numRe = `\\d{1,2}|${Object.keys(NUMBER_WORDS).join("|")}`;
    m = text.match(new RegExp(`\\b(?:il\\s+|l\\s+)?(${numRe})\\s+(?:di\\s+)?(${Object.keys(MONTHS).join("|")})(?:\\s+(\\d{4}))?\\b`));
    if (m) {
      const day = NUMBER_WORDS[m[1]] ?? parseInt(m[1], 10);
      const month = MONTHS[m[2]];
      const year = m[3] ? +m[3] : now.getFullYear();
      const cand = new Date(year, month, day);
      if (cand.getMonth() === month) {
        date = cand;
        if (!m[3] && cand < startOfDay(now)) date.setFullYear(year + 1);
        dateWasExplicit = true;
        take(m);
      }
    }
  }

  // "tra 3 giorni" / "fra due settimane"
  if (!dateWasExplicit) {
    const numRe = `\\d+|${Object.keys(NUMBER_WORDS).join("|")}`;
    m = text.match(new RegExp(`\\b(?:tra|fra)\\s+(${numRe})\\s+(giorn[oi]|settiman[ae]|mes[ei]|ann[oi])\\b`));
    if (m) {
      const n = NUMBER_WORDS[m[1]] ?? parseInt(m[1], 10);
      const d = startOfDay(now);
      if (/^giorn/.test(m[2])) d.setDate(d.getDate() + n);
      else if (/^settiman/.test(m[2])) d.setDate(d.getDate() + n * 7);
      else if (/^mes/.test(m[2])) d.setMonth(d.getMonth() + n);
      else d.setFullYear(d.getFullYear() + n);
      date = d;
      dateWasExplicit = true;
      take(m);
    }
  }

  // "oggi" / "domani" / "dopodomani" / "stasera" / "stamattina"
  if (!dateWasExplicit) {
    m = text.match(/\b(dopodomani|domani mattina|domattina|domani sera|domani|oggi pomeriggio|oggi|stamattina|stamane|stasera|stanotte|stanotte)\b/);
    if (m) {
      const d = startOfDay(now);
      const w = m[1];
      if (w === "dopodomani") d.setDate(d.getDate() + 2);
      else if (/^domani|^domattina/.test(w)) d.setDate(d.getDate() + 1);
      date = d;
      dateWasExplicit = true;
      // le forme composte suggeriscono anche la fascia oraria
      if (/mattina|mattino|domattina|stamattina|stamane/.test(w)) time = { h: 9, m: 0 };
      else if (/pomeriggio/.test(w)) time = { h: 15, m: 0 };
      else if (/sera/.test(w)) time = { h: 20, m: 0 };
      take(m);
    }
  }

  // "lunedì" / "martedì prossimo"
  {
    const wdRe = new RegExp(`\\b(?:di\\s+|il\\s+)?(${Object.keys(WEEKDAYS).join("|")})(\\s+prossim[oa])?\\b`);
    m = text.match(wdRe);
    if (m) {
      if (!dateWasExplicit) {
        date = nextWeekday(now, WEEKDAYS[m[1]], !!m[2]);
        dateWasExplicit = true;
      }
      // anche se la data era già nota ("martedì 12 agosto"), il giorno
      // della settimana è ridondante e non deve finire nel titolo
      take(m);
    }
  }

  // "la prossima settimana" / "il mese prossimo"
  if (!dateWasExplicit) {
    m = text.match(/\b(?:la\s+)?prossima\s+settimana\b|\bsettimana\s+prossima\b/);
    if (m) { const d = startOfDay(now); d.setDate(d.getDate() + 7); date = d; dateWasExplicit = true; take(m); }
    else {
      m = text.match(/\b(?:il\s+)?(?:prossimo\s+mese|mese\s+prossimo)\b/);
      if (m) { const d = startOfDay(now); d.setMonth(d.getMonth() + 1); date = d; dateWasExplicit = true; take(m); }
    }
  }

  // ---------------------------------------------------------------
  // ORARIO
  // ---------------------------------------------------------------

  // "mezzogiorno" / "mezzanotte"
  m = text.match(/\bmezzogiorno\b|\bmezzanotte\b/);
  if (m) {
    time = m[0] === "mezzogiorno" ? { h: 12, m: 0 } : { h: 0, m: 0 };
    take(m);
  }

  if (!time || time.m === 0) {
    const numRe = `\\d{1,2}|${Object.keys(NUMBER_WORDS).join("|")}`;
    // "alle 15:30" / "alle 15.30" / "alle tre e mezza" / "alle 8 e un quarto" / "alle 15"
    const timeRe = new RegExp(
      `\\b(?:alle|all\\s|alla|ore|verso le|per le)\\s*(${numRe})` +
      `(?:\\s*[:.]\\s*(\\d{2})|\\s+e\\s+(mezza|mezzo|un quarto|tre quarti|${numRe}))?` +
      `(?:\\s*(di mattina|del mattino|di pomeriggio|del pomeriggio|di sera|della sera|di notte))?\\b`
    );
    m = text.match(timeRe);
    if (m) {
      let h = NUMBER_WORDS[m[1]] ?? parseInt(m[1], 10);
      let min = 0;
      if (m[2]) min = parseInt(m[2], 10);
      else if (m[3]) {
        if (/mezz/.test(m[3])) min = 30;
        else if (m[3] === "un quarto") min = 15;
        else if (m[3] === "tre quarti") min = 45;
        else min = NUMBER_WORDS[m[3]] ?? parseInt(m[3], 10);
      }
      const part = m[4];
      if (part) {
        if (/pomeriggio|sera/.test(part) && h < 12) h += 12;
        else if (/notte/.test(part) && h < 12 && h !== 0) h += 12;
        // "di mattina" lascia l'ora com'è
      } else if (h >= 1 && h <= 6) {
        h += 12; // "alle tre" in italiano è quasi sempre il pomeriggio
      } else if (h === 7 || h === 8) {
        ambiguousHour = true; // "alle otto" può essere mattina o sera: lo segnaliamo
      }
      if (h >= 0 && h <= 24 && min >= 0 && min < 60) {
        time = { h: h === 24 ? 0 : h, m: min };
        take(m);
      }
    }
  }

  // Fasce orarie senza ora precisa: "di mattina", "nel pomeriggio"
  if (!time) {
    m = text.match(/\b(?:di|nel|la|in)\s+(mattina|mattino|pomeriggio|serata|sera)\b/);
    if (m) {
      time = /mattin/.test(m[1]) ? { h: 9, m: 0 } : /pomeriggio/.test(m[1]) ? { h: 15, m: 0 } : { h: 20, m: 0 };
      take(m);
    }
  }

  // ---------------------------------------------------------------
  // TIPO
  // ---------------------------------------------------------------
  const isRadar = RADAR_HINTS.some((h) => text.includes(h)) || (!dateWasExplicit && !!rrule);
  const isDeadline = !isRadar && DEADLINE_HINTS.some((h) => text.includes(h));
  const type = isRadar ? "radar" : isDeadline ? "scadenza" : "appuntamento";

  // Un radar non ha data fissa: la ricorrenza diventa cadenza di controllo
  if (isRadar) {
    date = null;
    time = null;
    if (!rrule) rrule = "FREQ=WEEKLY;INTERVAL=2"; // cadenza di partenza, modificabile
  }

  // ---------------------------------------------------------------
  // TITOLO — testo originale meno le parti già interpretate
  // ---------------------------------------------------------------
  let title = buildTitle(rawText, spans);

  // ---------------------------------------------------------------
  // CATEGORIA suggerita (solo se esiste tra quelle dell'utente)
  // ---------------------------------------------------------------
  let category = null;
  for (const [cat, words] of Object.entries(CATEGORY_HINTS)) {
    if (knownCategories.includes(cat) && words.some((w) => text.includes(w))) { category = cat; break; }
  }

  // ---------------------------------------------------------------
  // ESITO
  // ---------------------------------------------------------------
  let confidence = "high";
  let clarification_question = null;

  if (!title) {
    confidence = "low";
    clarification_question = "Non ho capito di cosa si tratta, puoi ripetere dicendo anche l'oggetto dell'appuntamento?";
  } else if (type !== "radar" && !dateWasExplicit) {
    confidence = "low";
    clarification_question = `Ho capito "${title}", ma non quando. Puoi ripetere indicando il giorno?`;
  } else if (ambiguousHour) {
    confidence = "medium";
  }

  const all_day = !time;
  const start_at = date
    ? `${toKey(date)}T${pad2(time ? time.h : 0)}:${pad2(time ? time.m : 0)}:00`
    : null;

  return {
    title: title || rawText.trim(),
    type,
    category,
    all_day,
    start_at,
    rrule,
    badges: [],
    notes: null,
    confidence,
    clarification_question,
  };
}

// Rimuove dal testo le porzioni già interpretate e ripulisce le parole
// di servizio, per ottenere un titolo leggibile
function buildTitle(rawText, spans) {
  let chars = rawText.split("");
  for (const [s, e] of spans) for (let i = s; i < e && i < chars.length; i++) chars[i] = " ";
  let t = chars.join("").replace(/\s+/g, " ").trim();

  const tn = normalize(t);
  for (const f of FILLER) {
    if (tn.startsWith(f + " ") || tn === f) { t = t.slice(f.length).trim(); break; }
  }

  // preposizioni e articoli rimasti orfani a inizio o fine
  t = t.replace(/^(?:di|a|al|allo|alla|ai|agli|alle|da|dal|dallo|dalla|per|il|lo|la|i|gli|le|un|uno|una|che|e|in|con)\s+/i, "");
  t = t.replace(/\s+(?:di|a|al|allo|alla|da|dal|per|il|lo|la|e|in|con|the)$/i, "");
  t = t.replace(/\s{2,}/g, " ").trim();

  if (!t) return "";
  return t.charAt(0).toUpperCase() + t.slice(1);
}
