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
