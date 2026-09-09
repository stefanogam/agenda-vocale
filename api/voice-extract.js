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
//   GEMINI_MODEL    (facoltativa: senza, il modello viene scelto
//                    automaticamente tra quelli disponibili)

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

// Il catalogo dei modelli di Google cambia spesso e i nomi vengono
// ritirati: fissarne uno nel codice porta prima o poi a un 404.
// Qui si chiede a Google cosa è davvero disponibile per questa chiave e
// se ne sceglie uno, memorizzandolo finché la funzione resta calda.
let modelliCandidati = null;   // elenco ordinato, dal più conveniente
let modelloFunzionante = null; // il primo che ha risposto bene

async function elencaModelli(key) {
  const r = await fetch(`${API_BASE}/models`, { headers: { "x-goog-api-key": key } });
  if (!r.ok) return [];
  const d = await r.json();
  return (d.models || [])
    .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
    .map((m) => String(m.name).replace(/^models\//, ""));
}

// Ordine di preferenza pensato per il piano gratuito: le varianti
// "Flash-Lite" concedono centinaia di richieste al giorno, mentre i Flash
// pieni ne concedono una ventina. Per interpretare una frase di agenda la
// differenza di qualità è trascurabile, quella di quota no.
function ordinaCandidati(nomi) {
  const flash = nomi.filter((n) => n.includes("flash"));
  const escludi = /(image|tts|audio|thinking|live|embedding)/;
  const utili = flash.filter((n) => !escludi.test(n));

  const stabili = utili.filter((n) => !/(preview|exp)/.test(n));
  const anteprime = utili.filter((n) => /(preview|exp)/.test(n));
  const recentiPrima = (a) => a.slice().sort().reverse();

  const lite = recentiPrima(stabili.filter((n) => n.includes("lite")));
  const pieni = recentiPrima(stabili.filter((n) => !n.includes("lite")));

  return [...lite, ...pieni, ...recentiPrima(anteprime)];
}

async function candidati(key) {
  if (process.env.GEMINI_MODEL) return [process.env.GEMINI_MODEL];
  if (modelliCandidati) return modelliCandidati;
  modelliCandidati = ordinaCandidati(await elencaModelli(key));
  return modelliCandidati;
}

// Gemini vuole i tipi in maiuscolo e non accetta tutto lo schema JSON
// standard: niente null, si usano stringhe vuote per i campi assenti e
// si normalizza poi in normalize().
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
    operations: {
      type: "ARRAY",
      description:
        "Operazioni su attività GIÀ ESISTENTI. Array vuoto se l'utente vuole creare qualcosa di nuovo " +
        "(in quel caso valgono i campi qui sopra). Un solo comando può contenere PIÙ operazioni: " +
        "\"aggiungi pane, latte e uova sotto la spesa\" produce tre elementi, uno per ciascun prodotto.",
      items: {
        type: "OBJECT",
        properties: {
          action: { type: "STRING", enum: ["aggiungi_sotto", "completa", "riapri"] },
          target_number: { type: "STRING", description: "Numero dell'attività esistente coinvolta (es. '1.2'), copiato esattamente dall'elenco fornito. Per 'aggiungi_sotto' è il genitore." },
          title: { type: "STRING", description: "Titolo della nuova sotto-attività. Solo per 'aggiungi_sotto', altrimenti stringa vuota." },
        },
        required: ["action", "target_number"],
        propertyOrdering: ["action", "target_number", "title"],
      },
    },
  },
  required: ["title", "type", "all_day", "confidence"],
  propertyOrdering: ["operations", "title", "type", "category", "all_day", "start_at", "end_date", "rrule", "recurrence_ends_at", "badges", "notes", "confidence", "clarification_question"],
};

const GIORNI = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];

function buildPrompt({ transcript, now, timezone, categories, badges, context, todos }) {
  const d = new Date(now);
  const pad = (n) => String(n).padStart(2, "0");
  const adesso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

  // La sezione aperta dice cosa l'utente si aspetta di creare: dettando
  // dalla sezione Radar vuole quasi certamente un radar, non un appuntamento
  const perContesto = {
    radar: `L'utente sta dettando dalla sezione RADAR. Salvo indicazioni contrarie esplicite nella frase, type deve essere "radar": un'attività da tenere d'occhio senza data fissa, con rrule come cadenza di controllo (se non detta, usa FREQ=WEEKLY;INTERVAL=2) e start_at vuoto.`,
    todo: `L'utente sta dettando dalla sezione TO-DO. Salvo indicazioni contrarie esplicite nella frase, type deve essere "todo": un'attività da fare. start_at solo se viene detta una scadenza, altrimenti vuoto.`,
  }[context] || `L'utente sta dettando dalla sezione calendario: di norma si tratta di appuntamenti o scadenze.`;

  const elenco = (todos || []).length
    ? `\nAttività già presenti (numero e titolo):\n${todos.map((t) => `${t.number} ${t.title}${t.done ? " [già fatta]" : ""}`).join("\n")}\n
Se la frase si riferisce a queste, riempi "operations" copiando i numeri dall'elenco.
Un comando può generare PIÙ operazioni:
- "aggiungi il pane sotto la spesa" → una operazione: aggiungi_sotto, target il numero della spesa, title "Pane"
- "aggiungi pane, latte e uova sotto la spesa" → TRE operazioni aggiungi_sotto con lo stesso target e title diversi
- "segna pane e latte come fatti" → DUE operazioni completa, una per ciascuno
- "ho fatto il bagno" → una operazione completa
- "il pane non l'ho ancora preso" → una operazione riapri
Elenca i prodotti separati da virgole o da "e" come operazioni distinte, una per ciascuno.
Se la frase non si riferisce a nulla di esistente, lascia "operations" vuoto e compila i campi di creazione.`
    : "";

  return `Sei il motore di interpretazione vocale di un'app di agenda personale italiana.
Converti la frase dell'utente in un elemento strutturato.

${perContesto}
${elenco}

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
    operations: Array.isArray(raw.operations)
      ? raw.operations
          .filter((o) => o && o.action)
          .map((o) => ({ action: o.action, target_number: (o.target_number || "").trim(), title: (o.title || "").trim() }))
      : [],
    confidence: raw.confidence || "medium",
    clarification_question: vuoto(raw.clarification_question),
    transcript,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { transcript, timezone, now, categories, badges, context, todos } = req.body ?? {};
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
        contents: [{ parts: [{ text: buildPrompt({ transcript, now, timezone, categories, badges, context, todos }) }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0,
        },
      }),
    });
  }

  // Google indica nel corpo dell'errore se il limite superato è quello al
  // minuto o quello giornaliero: cambia molto cosa dire all'utente
  function leggiQuota(testo) {
    const perMinuto = /PerMinute|per minute|RPM/i.test(testo);
    const attesa = testo.match(/"retryDelay"\s*:\s*"(\d+)s"/);
    return { perMinuto, attesaSec: attesa ? Number(attesa[1]) : null };
  }

  try {
    let lista = await candidati(key);
    // se un modello ha già funzionato in precedenza, si riparte da quello
    if (modelloFunzionante) lista = [modelloFunzionante, ...lista.filter((m) => m !== modelloFunzionante)];
    if (lista.length === 0) {
      return res.status(502).json({ error: "Nessun modello disponibile per questa chiave API." });
    }

    let ultimoErrore = null;
    let ultimoStato = null;

    // Si prova un modello alla volta: se uno ha la quota esaurita o non
    // esiste più, si passa al successivo invece di arrendersi
    for (const model of lista.slice(0, 4)) {
      const resp = await chiama(model);

      if (resp.ok) {
        modelloFunzionante = model;
        const data = await resp.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) return res.status(502).json({ error: "Risposta vuota dal modello" });
        return res.status(200).json(normalize(JSON.parse(text), transcript));
      }

      ultimoStato = resp.status;
      ultimoErrore = await resp.text();
      console.error("Gemini:", resp.status, "modello:", model, ultimoErrore.slice(0, 300));

      if (resp.status === 429 || resp.status === 404) {
        if (model === modelloFunzionante) modelloFunzionante = null;
        modelliCandidati = null; // il catalogo verrà riletto la prossima volta
        continue;                // prova il modello successivo
      }
      break; // errori diversi (chiave, richiesta malformata) non migliorano cambiando modello
    }

    if (ultimoStato === 429) {
      const { perMinuto, attesaSec } = leggiQuota(ultimoErrore || "");
      return res.status(502).json({
        error: perMinuto
          ? `Troppe richieste ravvicinate. Riprova tra ${attesaSec || 30} secondi.`
          : "Quota giornaliera esaurita su tutti i modelli disponibili. Riprova domani, oppure crea l'elemento manualmente con \"+\".",
      });
    }
    if (ultimoStato === 404) {
      return res.status(502).json({ error: "Nessun modello utilizzabile. Apri /api/voice-check per vedere quali sono disponibili." });
    }
    if (ultimoStato === 400 || ultimoStato === 403) {
      return res.status(502).json({ error: "Chiave API rifiutata da Google. Controlla che sia corretta e attiva." });
    }
    return res.status(502).json({ error: "Interpretazione non riuscita, riprova." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Errore interno" });
  }
}
