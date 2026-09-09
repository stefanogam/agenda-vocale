// api/voice-extract.js
//
// Unica funzione server dell'app: interpreta la frase dettata e la
// trasforma in un elemento strutturato, usando Gemini Flash.
// Deve girare su un server perché la chiave GEMINI_API_KEY non può stare
// nel codice del browser — chiunque potrebbe copiarla e usarla a tue spese.
//
// Su Vercel ogni file in /api diventa un endpoint: questo risponde su
// POST /api/voice-extract.
//
// Variabili d'ambiente:
//   GEMINI_API_KEY  (obbligatoria)
//   GEMINI_MODEL    (facoltativa, default "gemini-2.5-flash")

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

// Il catalogo dei modelli di Google cambia spesso e i nomi vengono
// ritirati: fissarne uno nel codice porta prima o poi a un 404.
// Qui si chiede a Google cosa è davvero disponibile per questa chiave e
// se ne sceglie uno, memorizzandolo finché la funzione resta calda.
let modelloRisolto = null;

async function elencaModelli(key) {
  const r = await fetch(`${API_BASE}/models`, { headers: { "x-goog-api-key": key } });
  if (!r.ok) return [];
  const d = await r.json();
  return (d.models || [])
    .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
    .map((m) => String(m.name).replace(/^models\//, ""));
}

function scegliModello(nomi) {
  const flash = nomi.filter((n) => n.includes("flash"));
  // via le varianti non adatte: anteprime, sperimentali, immagini, audio
  const stabili = flash.filter((n) => !/(preview|exp|image|tts|audio|thinking|live|embedding)/.test(n));
  const pool = (stabili.length ? stabili : flash).slice().sort().reverse(); // il più recente per primo
  const pieni = pool.filter((n) => !n.includes("lite"));
  return pieni[0] || pool[0] || nomi[0] || null;
}

async function risolviModello(key) {
  if (process.env.GEMINI_MODEL) return process.env.GEMINI_MODEL;
  if (modelloRisolto) return modelloRisolto;
  const nomi = await elencaModelli(key);
  modelloRisolto = scegliModello(nomi);
  return modelloRisolto;
}

// Gemini vuole i tipi in maiuscolo e non accetta tutto lo schema JSON
// standard: niente null, si usano stringhe vuote per i campi assenti e
// si normalizza qui sotto.
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING", description: "Titolo breve e chiaro, senza le formule di comando (niente 'ricordami di')." },
    type: {
      type: "STRING",
      enum: ["appuntamento", "scadenza", "radar", "todo"],
      description:
        "'scadenza' se c'è una data limite (consegna, pagamento, rinnovo). " +
        "'radar' se va solo tenuto d'occhio senza data precisa ('ogni tanto', 'controllare se'). " +
        "'todo' se è un'attività da fare senza orario. 'appuntamento' per tutto il resto.",
    },
    category: { type: "STRING", description: "Una delle categorie esistenti dell'utente. Stringa vuota se nessuna è pertinente." },
    all_day: { type: "BOOLEAN", description: "true se non è stato indicato un orario preciso." },
    start_at: { type: "STRING", description: "Data e ora locali in formato YYYY-MM-DDTHH:MM. Stringa vuota se non deducibile o per i radar." },
    end_date: { type: "STRING", description: "YYYY-MM-DD, solo per eventi su più giorni consecutivi. Stringa vuota altrimenti." },
    rrule: { type: "STRING", description: "Regola RFC5545 se si ripete, es. 'FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,TU'. Per i radar è la cadenza di controllo. Stringa vuota se non si ripete." },
    recurrence_ends_at: { type: "STRING", description: "YYYY-MM-DD se la ripetizione ha una fine dichiarata. Stringa vuota altrimenti." },
    badges: { type: "ARRAY", items: { type: "STRING" }, description: "Badge esistenti pertinenti. Array vuoto se nessuno." },
    notes: { type: "STRING", description: "Dettagli aggiuntivi detti dall'utente. Stringa vuota se non ce ne sono." },
    confidence: { type: "STRING", enum: ["high", "medium", "low"], description: "'low' se qualcosa è ambiguo: l'app chiederà di ripetere invece di indovinare." },
    clarification_question: { type: "STRING", description: "Obbligatoria se confidence è 'low': domanda breve su cosa non è chiaro. Stringa vuota altrimenti." },
  },
  required: ["title", "type", "all_day", "confidence"],
  propertyOrdering: ["title", "type", "category", "all_day", "start_at", "end_date", "rrule", "recurrence_ends_at", "badges", "notes", "confidence", "clarification_question"],
};

const GIORNI = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];

function buildPrompt({ transcript, now, timezone, categories, badges }) {
  const d = new Date(now);
  const pad = (n) => String(n).padStart(2, "0");
  const adesso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

  return `Sei il motore di interpretazione vocale di un'app di agenda personale italiana.
Converti la frase dell'utente in un elemento strutturato.

Adesso è ${GIORNI[d.getDay()]} ${adesso} (fuso orario ${timezone || "Europe/Rome"}).
Categorie esistenti dell'utente: ${(categories || []).join(", ") || "nessuna"}.
Badge esistenti: ${(badges || []).join(", ") || "nessuno"}.

Regole:
- Le date sono SEMPRE ora locale: non convertire in UTC, non aggiungere fusi orari.
- "martedì" senza altre indicazioni significa il prossimo martedì futuro, mai uno passato.
- "alle tre" nel linguaggio comune sono le 15:00, non le 3 di notte, a meno che non si dica "di mattina".
- Se non viene detto un orario, all_day = true e l'ora è 00:00.
- Riconosci le ripetizioni: "ogni lunedì" → FREQ=WEEKLY;INTERVAL=1;BYDAY=MO, "ogni 3 mesi" → FREQ=MONTHLY;INTERVAL=3, "il lunedì e il giovedì" → BYDAY=MO,TH.
- Usa solo le categorie e i badge esistenti; lascia vuoto se nessuno corrisponde davvero, non inventarne.
- Il titolo non deve contenere le formule di comando né i riferimenti temporali già estratti.
- Se qualcosa è davvero ambiguo, metti confidence a "low" e scrivi la domanda di chiarimento, invece di tirare a indovinare.

Frase dettata: "${transcript}"`;
}

// Converte le stringhe vuote nei null che il client si aspetta
function normalize(raw, transcript) {
  const vuoto = (v) => (typeof v === "string" && v.trim() === "" ? null : v);
  return {
    title: raw.title || "",
    type: raw.type || "appuntamento",
    category: vuoto(raw.category),
    all_day: raw.all_day !== false,
    start_at: vuoto(raw.start_at),
    end_date: vuoto(raw.end_date),
    rrule: vuoto(raw.rrule),
    recurrence_ends_at: vuoto(raw.recurrence_ends_at),
    badges: Array.isArray(raw.badges) ? raw.badges.filter(Boolean) : [],
    notes: vuoto(raw.notes),
    confidence: raw.confidence || "medium",
    clarification_question: vuoto(raw.clarification_question),
    transcript,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { transcript, timezone, now, categories, badges } = req.body ?? {};
  if (!transcript || typeof transcript !== "string") {
    return res.status(400).json({ error: "Campo 'transcript' mancante o non valido" });
  }
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "GEMINI_API_KEY non configurata" });
  }

  const key = process.env.GEMINI_API_KEY;

  async function chiama(model) {
    return fetch(`${API_BASE}/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt({ transcript, now, timezone, categories, badges }) }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0,
        },
      }),
    });
  }

  try {
    let model = await risolviModello(key);
    if (!model) {
      return res.status(502).json({ error: "Nessun modello disponibile per questa chiave API." });
    }

    let resp = await chiama(model);

    // 404 = il nome del modello non è più valido: si rilegge il catalogo
    // e si riprova una volta, invece di fallire finché non si mette mano
    // al codice
    if (resp.status === 404 && !process.env.GEMINI_MODEL) {
      modelloRisolto = null;
      const model2 = await risolviModello(key);
      if (model2 && model2 !== model) {
        model = model2;
        resp = await chiama(model);
      }
    }

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("Errore Gemini:", resp.status, "modello:", model, errText);

      if (resp.status === 429) {
        return res.status(502).json({ error: "Limite giornaliero di richieste raggiunto. Riprova più tardi o crea l'elemento manualmente." });
      }
      if (resp.status === 404) {
        const disponibili = (await elencaModelli(key)).filter((n) => n.includes("flash")).slice(0, 6);
        return res.status(502).json({
          error: `Modello "${model}" non disponibile.` +
            (disponibili.length
              ? ` Modelli utilizzabili: ${disponibili.join(", ")}. Impostane uno nella variabile GEMINI_MODEL su Vercel.`
              : " Nessun modello Flash disponibile per questa chiave."),
        });
      }
      if (resp.status === 400 || resp.status === 403) {
        return res.status(502).json({ error: "Chiave API rifiutata da Google. Controlla che sia corretta e attiva." });
      }
      return res.status(502).json({ error: "Interpretazione non riuscita, riprova." });
    }

    const data = await resp.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return res.status(502).json({ error: "Risposta vuota dal modello" });
    }

    return res.status(200).json(normalize(JSON.parse(text), transcript));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Errore interno" });
  }
}
