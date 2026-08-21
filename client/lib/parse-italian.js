// client/lib/parse-italian.js
//
// Trasforma una frase in italiano ("ricordami dal dentista martedì alle tre")
// in un appuntamento strutturato, senza chiamare nessun servizio esterno:
// tutto avviene sul dispositivo, gratis, offline e senza che il testo esca
// dal telefono.
//
// Restituisce la stessa forma che l'app si aspetta dalla scheda di conferma:
//   { title, type, category, all_day, start_at, rrule, badges, notes,
//     confidence, clarification_question }
//
// Se non riesce a interpretare qualcosa lo dice (confidence: 'low') invece
// di indovinare: la scheda di conferma è sempre modificabile a mano.

const ACCENTS = { "à": "a", "á": "a", "è": "e", "é": "e", "ì": "i", "í": "i", "î": "i", "ò": "o", "ó": "o", "ù": "u", "ú": "u" };

// Sostituzione 1:1 così gli indici restano allineati al testo originale
function normalize(s) {
  return s.toLowerCase().replace(/[àáèéìíîòóùú]/g, (c) => ACCENTS[c] || c);
}

const WEEKDAYS = [
  { re: "domenica", dow: 0, byday: "SU" },
  { re: "lunedi", dow: 1, byday: "MO" },
  { re: "martedi", dow: 2, byday: "TU" },
  { re: "mercoledi", dow: 3, byday: "WE" },
  { re: "giovedi", dow: 4, byday: "TH" },
  { re: "venerdi", dow: 5, byday: "FR" },
  { re: "sabato", dow: 6, byday: "SA" },
];

const MONTHS = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

const NUM_WORDS = {
  un: 1, uno: 1, una: 1, due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6, sette: 7,
  otto: 8, nove: 9, dieci: 10, undici: 11, dodici: 12, tredici: 13, quattordici: 14,
  quindici: 15, sedici: 16, diciassette: 17, diciotto: 18, diciannove: 19, venti: 20,
  ventuno: 21, ventidue: 22, ventitre: 23, ventiquattro: 24,
};
const NUM_WORD_RE = Object.keys(NUM_WORDS).sort((a, b) => b.length - a.length).join("|");

// Parole che indicano il tipo di elemento
const RADAR_HINTS = /\b(ogni tanto|di tanto in tanto|tenere d'occhio|tenere d occhio|dare un'occhiata|dare un occhiata|controllare se|verificare se|monitorare)\b/;
// Parole che indicano una scadenza. Alcune vanno tolte dal titolo perché
// sono solo connettivi ("entro il 30" → "il 30"), altre no perché sono il
// cuore della frase ("pagare la bolletta" resta "pagare la bolletta").
const DEADLINE_STRIP = /\b(entro il|entro|scade il|scade|scadenza|termine ultimo)\b/;
const DEADLINE_KEEP = /\b(consegna|consegnare|pagare|pagamento|rinnovo|rinnovare|bolletta|rata|tasse)\b/;

// Parole di comando da togliere dal titolo
const FILLER = /\b(ricordami di|ricordami|ricordati di|non dimenticare di|segnami|segna|aggiungi|metti|crea|inserisci|devo|ho|un appuntamento per|appuntamento per|appuntamento)\b/g;

// Suggerimenti per indovinare la categoria — applicati solo se l'utente ha
// davvero una categoria con quel nome
const CATEGORY_HINTS = {
  Salute: /\b(dentista|medico|dottore|dottoressa|visita|analisi|farmacia|palestra|fisioterapista|oculista|ospedale|vaccino|check.?up|esami)\b/,
  Lavoro: /\b(riunione|meeting|call|cliente|ufficio|progetto|report|collega|colloquio|presentazione|scadenza lavoro)\b/,
  Finanze: /\b(banca|bolletta|pagamento|pagare|rata|mutuo|tasse|commercialista|assicurazione|fattura|f24|bonifico)\b/,
  Casa: /\b(idraulico|elettricista|cas[ae]|appartament[oi]|affitto|condominio|pulizie|giardino|trasloco|manutenzione|caldaia|annunci|immobiliare|in vendita)\b/,
  Personale: /\b(compleanno|cena|pranzo|aperitivo|amici|famiglia|vacanza|cinema|teatro|concerto|matrimonio)\b/,
};

function find(norm, pattern) {
  const re = new RegExp(pattern, "i");
  const m = re.exec(norm);
  return m ? { m, span: [m.index, m.index + m[0].length] } : null;
}

function stripSpans(original, spans) {
  const sorted = [...spans].sort((a, b) => a[0] - b[0]);
  let out = "", last = 0;
  for (const [s, e] of sorted) {
    if (s < last) { last = Math.max(last, e); continue; }
    out += original.slice(last, s) + " ";
    last = e;
  }
  out += original.slice(last);
  return out;
}

function toNumber(token) {
  if (!token) return null;
  const t = token.trim();
  if (/^\d+$/.test(t)) return parseInt(t, 10);
  return NUM_WORDS[t] ?? null;
}

function atMidnight(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function parseItalianCommand(text, { now = new Date(), categories = [], badges = [] } = {}) {
  const norm = normalize(text);
  const spans = [];
  const take = (hit) => { if (hit) spans.push(hit.span); return hit; };

  const today = atMidnight(now);
  let date = null;      // Date a mezzanotte
  let hour = null, minute = 0;
  let rrule = null;
  let type = "appuntamento";

  // ---------------------------------------------------------
  // 1. TIPO — radar e scadenza si riconoscono da parole spia
  // ---------------------------------------------------------
  const radarHit = find(norm, RADAR_HINTS.source);
  if (radarHit) { type = "radar"; take(radarHit); }
  else {
    const stripHit = find(norm, DEADLINE_STRIP.source);
    if (stripHit) { type = "scadenza"; take(stripHit); }
    else if (find(norm, DEADLINE_KEEP.source)) type = "scadenza";
  }

  // ---------------------------------------------------------
  // 2. RICORRENZA
  // ---------------------------------------------------------
  // "ogni lunedì", "tutti i lunedì"
  for (const w of WEEKDAYS) {
    const hit = find(norm, `\\b(?:ogni|tutti i|tutte le)\\s+${w.re}\\b`);
    if (hit) { rrule = `FREQ=WEEKLY;INTERVAL=1;BYDAY=${w.byday}`; take(hit); break; }
  }
  // "ogni 2 settimane", "ogni tre mesi", "ogni giorno"
  if (!rrule) {
    const hit = find(norm, `\\bogni\\s+(?:(\\d+|${NUM_WORD_RE})\\s+)?(minut[oi]|or[ae]|giorn[oi]|settiman[ae]|mes[ei]|ann[oi])\\b`);
    if (hit) {
      const n = toNumber(hit.m[1]) ?? 1;
      const unit = hit.m[2];
      const freq = /^minut/.test(unit) ? "MINUTELY"
        : /^or/.test(unit) ? "HOURLY"
        : /^giorn/.test(unit) ? "DAILY"
        : /^settiman/.test(unit) ? "WEEKLY"
        : /^mes/.test(unit) ? "MONTHLY" : "YEARLY";
      rrule = `FREQ=${freq};INTERVAL=${n}`;
      take(hit);
    }
  }
  // "tutti i giorni"
  if (!rrule) {
    const hit = find(norm, `\\b(tutti i giorni|ogni giorno|quotidianamente)\\b`);
    if (hit) { rrule = "FREQ=DAILY;INTERVAL=1"; take(hit); }
  }
  // "ogni tanto" senza cadenza esplicita: due settimane come punto di partenza
  if (type === "radar" && !rrule) rrule = "FREQ=WEEKLY;INTERVAL=2";

  // ---------------------------------------------------------
  // 3. DATA
  // ---------------------------------------------------------
  const relDay = take(find(norm, "\\b(dopodomani|domani|stasera|stanotte|stamattina|stamane|oggi)\\b"));
  if (relDay) {
    const w = relDay.m[1];
    const offset = w === "dopodomani" ? 2 : w === "domani" ? 1 : 0;
    date = new Date(today); date.setDate(date.getDate() + offset);
    if (w === "stasera") { hour = 20; }
    if (w === "stamattina" || w === "stamane") { hour = 9; }
    if (w === "stanotte") { hour = 23; }
  }

  // "tra due settimane", "fra 3 giorni"
  if (!date) {
    const hit = take(find(norm, `\\b(?:tra|fra)\\s+(\\d+|${NUM_WORD_RE})\\s+(giorn[oi]|settiman[ae]|mes[ei]|ann[oi])\\b`));
    if (hit) {
      const n = toNumber(hit.m[1]) ?? 1;
      const unit = hit.m[2];
      date = new Date(today);
      if (/^giorn/.test(unit)) date.setDate(date.getDate() + n);
      else if (/^settiman/.test(unit)) date.setDate(date.getDate() + n * 7);
      else if (/^mes/.test(unit)) date.setMonth(date.getMonth() + n);
      else date.setFullYear(date.getFullYear() + n);
    }
  }

  // "12/08", "12-08-2026"
  if (!date) {
    const hit = take(find(norm, "\\b(\\d{1,2})[\\/\\-](\\d{1,2})(?:[\\/\\-](\\d{2,4}))?\\b"));
    if (hit) {
      const d = parseInt(hit.m[1], 10), mo = parseInt(hit.m[2], 10) - 1;
      let y = hit.m[3] ? parseInt(hit.m[3], 10) : today.getFullYear();
      if (y < 100) y += 2000;
      date = new Date(y, mo, d);
      if (!hit.m[3] && date < today) date.setFullYear(y + 1);
    }
  }

  // "12 agosto", "il 3 marzo 2027"
  if (!date) {
    const hit = take(find(norm, `\\b(?:il\\s+|l')?(\\d{1,2})\\s+(${MONTHS.join("|")})(?:\\s+(\\d{4}))?\\b`));
    if (hit) {
      const d = parseInt(hit.m[1], 10);
      const mo = MONTHS.indexOf(hit.m[2]);
      const y = hit.m[3] ? parseInt(hit.m[3], 10) : today.getFullYear();
      date = new Date(y, mo, d);
      if (!hit.m[3] && date < today) date.setFullYear(y + 1);
    }
  }

  // giorno della settimana: "martedì", "martedì prossimo"
  if (!date) {
    for (const w of WEEKDAYS) {
      const hit = find(norm, `\\b(?:il\\s+|di\\s+)?${w.re}(\\s+prossim[oa])?\\b`);
      if (!hit) continue;
      take(hit);
      const nextWeek = !!hit.m[1];
      const d = new Date(today);
      let delta = (w.dow - d.getDay() + 7) % 7;
      if (delta === 0) delta = 7;          // "martedì" detto di martedì = il prossimo
      if (nextWeek && delta < 7) delta += 7;
      d.setDate(d.getDate() + delta);
      date = d;
      break;
    }
  }

  // ---------------------------------------------------------
  // 4. ORARIO
  // ---------------------------------------------------------
  const timePrefix = "(?:alle|all'|alla|ore|verso le|per le)\\s*";
  if (hour === null) {
    // "alle 15:30" / "alle 15.30"
    const hit = take(find(norm, `\\b${timePrefix}(\\d{1,2})[:.](\\d{2})\\b`));
    if (hit) { hour = parseInt(hit.m[1], 10); minute = parseInt(hit.m[2], 10); }
  }
  if (hour === null) {
    // "alle tre e mezza", "alle 3 e un quarto"
    const hit = take(find(norm, `\\b${timePrefix}(\\d{1,2}|${NUM_WORD_RE})(?:\\s+e\\s+(mezza|mezzo|un quarto|tre quarti))?\\b`));
    if (hit) {
      hour = toNumber(hit.m[1]);
      const frac = hit.m[2];
      if (frac === "mezza" || frac === "mezzo") minute = 30;
      else if (frac === "un quarto") minute = 15;
      else if (frac === "tre quarti") minute = 45;
    }
  }
  if (hour === null) {
    const noon = take(find(norm, "\\b(mezzogiorno|mezzanotte)\\b"));
    if (noon) hour = noon.m[1] === "mezzogiorno" ? 12 : 0;
  }
  if (hour === null) {
    const part = take(find(norm, "\\b(di mattina|mattina|mattino|nel pomeriggio|pomeriggio|di sera|sera)\\b"));
    if (part) hour = /mattin|mattino/.test(part.m[1]) ? 9 : /pomeriggio/.test(part.m[1]) ? 15 : 20;
  }

  // "alle tre" quasi sempre vuol dire le 15, non le 3 di notte
  const saysMorning = /\b(di mattina|mattina|mattino|stamattina|stamane)\b/.test(norm);
  const saysAfternoon = /\b(pomeriggio|di sera|sera|stasera|notte)\b/.test(norm);
  if (hour !== null && hour >= 1 && hour <= 7 && !saysMorning) hour += 12;
  else if (hour !== null && hour >= 8 && hour <= 11 && saysAfternoon) hour += 12;

  // ---------------------------------------------------------
  // 5. DATA DI RIPIEGO
  // ---------------------------------------------------------
  const all_day = hour === null;
  if (!date && type !== "radar") {
    date = new Date(today);
    // se è stata detta solo l'ora ed è già passata, si intende domani
    if (hour !== null) {
      const candidate = new Date(date); candidate.setHours(hour, minute, 0, 0);
      if (candidate < now) date.setDate(date.getDate() + 1);
    }
  }

  // ---------------------------------------------------------
  // 6. TITOLO
  // ---------------------------------------------------------
  let title = stripSpans(text, spans)
    .replace(FILLER, " ")
    .replace(/\s+/g, " ")
    .trim()
    // via preposizioni e congiunzioni rimaste appese ai bordi
    .replace(/^(?:di|a|al|allo|alla|ai|agli|alle|per|con|e|il|lo|la|i|gli|le|un|uno|una)\s+/i, "")
    .replace(/\s+(?:di|a|al|allo|alla|per|con|e|il|lo|la|del|dello|della|nel|nella)$/i, "")
    .trim();
  if (title) title = title[0].toUpperCase() + title.slice(1);

  // ---------------------------------------------------------
  // 7. CATEGORIA E BADGE
  // ---------------------------------------------------------
  const catNames = categories.map((c) => (typeof c === "string" ? c : c.name));
  let category = catNames.find((n) => new RegExp(`\\b${normalize(n)}\\b`, "i").test(norm)) || null;
  if (!category) {
    // Se più categorie corrispondono, vince quella con la parola più
    // specifica: "visita dal commercialista" contiene sia "visita" (Salute)
    // che "commercialista" (Finanze) — la seconda è più indicativa.
    let best = null;
    for (const [name, re] of Object.entries(CATEGORY_HINTS)) {
      if (!catNames.includes(name)) continue;
      const m = re.exec(norm);
      if (m && (!best || m[0].length > best.len)) best = { name, len: m[0].length };
    }
    if (best) category = best.name;
  }
  if (!category && type === "scadenza" && catNames.includes("Scadenza")) category = "Scadenza";
  if (!category) category = catNames[0] || null;

  const badgeNames = badges.map((b) => (typeof b === "string" ? b : b.name));
  const foundBadges = badgeNames.filter((n) => new RegExp(`\\b${normalize(n)}\\b`, "i").test(norm));
  if (/\burgent[ei]\b/.test(norm) && badgeNames.includes("Urgente") && !foundBadges.includes("Urgente")) {
    foundBadges.push("Urgente");
  }

  // ---------------------------------------------------------
  // 8. ESITO
  // ---------------------------------------------------------
  const start = date ? new Date(date) : null;
  if (start) start.setHours(hour ?? 0, minute, 0, 0);

  let confidence = "high";
  let clarification_question = null;

  if (!title) {
    confidence = "low";
    clarification_question = "Non ho capito cosa devo segnare. Puoi ripetere dicendo prima l'impegno e poi quando?";
  } else if (type !== "radar" && !relDay && spans.length === 0) {
    // titolo riconosciuto ma nessun riferimento temporale: proposto oggi
    confidence = "medium";
  }

  return {
    title,
    type,
    category,
    all_day,
    start_at: start ? start.toISOString() : null,
    rrule,
    badges: foundBadges,
    notes: null,
    confidence,
    clarification_question,
    transcript: text,
  };
}
