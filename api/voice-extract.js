// api/voice-extract.js
//
// Unica funzione server di tutta l'app. Fa solo una cosa: chiama Claude
// per trasformare il testo (già trascritto nel browser con la Web Speech
// API, gratis) in un appuntamento strutturato. Deve girare su un server
// perché la chiave ANTHROPIC_API_KEY non può stare nel codice del browser
// — chiunque potrebbe copiarla dal codice sorgente e usarla a tue spese.
//
// Su Vercel, ogni file in /api diventa automaticamente un endpoint:
// questo risponde su POST /api/voice-extract. Configura la chiave in
// Vercel -> Project Settings -> Environment Variables -> ANTHROPIC_API_KEY.

const EXTRACTION_TOOL = {
  name: "create_item",
  description: "Crea un appuntamento, una scadenza o un'attività radar a partire dal comando vocale dell'utente.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Titolo breve e chiaro dell'elemento." },
      type: {
        type: "string",
        enum: ["appuntamento", "scadenza", "radar"],
        description:
          "'scadenza' se ha una data limite (consegna, pagamento, rinnovo). " +
          "'radar' se l'utente vuole solo tenerlo d'occhio, senza una data precisa. " +
          "'appuntamento' per tutto il resto.",
      },
      category: { type: "string", description: "Una delle categorie esistenti dell'utente; una nuova solo se nessuna corrisponde davvero." },
      all_day: { type: "boolean", description: "true se non è stato specificato un orario preciso." },
      start_at: { type: ["string", "null"], description: "Data/ora ISO 8601 nel timezone dell'utente. Null solo per i radar." },
      rrule: {
        type: ["string", "null"],
        description:
          "Regola RFC5545 se l'evento è ricorrente (es. 'FREQ=WEEKLY;INTERVAL=1'), " +
          "oppure la cadenza di controllo se type='radar' (es. 'FREQ=WEEKLY;INTERVAL=2'). Null se non applicabile.",
      },
      badges: { type: "array", items: { type: "string" }, description: "Badge esistenti pertinenti. Array vuoto se nessuno si applica." },
      notes: { type: ["string", "null"] },
      confidence: {
        type: "string",
        enum: ["high", "medium", "low"],
        description: "Quanto sei sicuro dell'interpretazione. 'low' se qualcosa è ambiguo — l'app chiederà di ripetere.",
      },
      clarification_question: {
        type: ["string", "null"],
        description: "Obbligatorio se confidence='low': una domanda breve e specifica su cosa non è chiaro. Null altrimenti.",
      },
    },
    required: ["title", "type", "all_day", "confidence"],
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { transcript, timezone, now, categories, badges } = req.body ?? {};
  if (!transcript || typeof transcript !== "string") {
    return res.status(400).json({ error: "Campo 'transcript' mancante o non valido" });
  }

  const system = `Sei il motore di interpretazione vocale di un'app di agenda personale. Converti il comando dell'utente in una chiamata allo strumento create_item.

Data e ora attuali: ${now ?? new Date().toISOString()} (timezone ${timezone ?? "Europe/Rome"}).
Categorie esistenti dell'utente: ${(categories ?? []).join(", ") || "nessuna"}.
Badge esistenti: ${(badges ?? []).join(", ") || "nessuno"}.

Regole:
- Preferisci sempre le categorie e i badge esistenti; proponine uno nuovo solo se nessuno corrisponde davvero.
- Se l'utente non specifica un orario, imposta all_day=true e start_at alla mezzanotte del giorno indicato.
- Se la ricorrenza è implicita ("ogni lunedì", "ogni anno", "ogni tanto"), genera la RRULE corrispondente.
- Se qualcosa è ambiguo (data poco chiara, categoria incerta), abbassa "confidence" a 'low' invece di indovinare, e scrivi in "clarification_question" cosa esattamente non è chiaro.`;

  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 500,
        system,
        messages: [{ role: "user", content: transcript }],
        tools: [EXTRACTION_TOOL],
        tool_choice: { type: "tool", name: "create_item" },
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("Errore Anthropic:", errText);
      return res.status(502).json({ error: "Estrazione fallita, riprova" });
    }

    const data = await anthropicRes.json();
    const toolUse = data.content.find((c) => c.type === "tool_use");
    const extracted = toolUse?.input ?? {
      title: transcript,
      type: "appuntamento",
      all_day: true,
      confidence: "low",
      clarification_question: "Non sono riuscito a interpretare bene il comando, puoi ripetere?",
    };

    return res.status(200).json(extracted);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Errore interno" });
  }
}
