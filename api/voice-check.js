// api/voice-check.js
//
// Endpoint di diagnostica: aprendo /api/voice-check nel browser si vede
// se la chiave è configurata, se Google la accetta, e quali modelli sono
// realmente disponibili. Serve a capire in pochi secondi dove si inceppa
// la dettatura, invece di procedere per tentativi.

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

export default async function handler(req, res) {
  const key = process.env.GEMINI_API_KEY;

  if (!key) {
    return res.status(200).json({
      chiave: "MANCANTE",
      spiegazione:
        "La variabile GEMINI_API_KEY non è configurata su Vercel, oppure è stata aggiunta ma non è ancora stato fatto il Redeploy.",
    });
  }

  try {
    const r = await fetch(`${API_BASE}/models`, { headers: { "x-goog-api-key": key } });

    if (!r.ok) {
      return res.status(200).json({
        chiave: `presente (inizia con ${key.slice(0, 6)}…)`,
        google: `RIFIUTATA — codice ${r.status}`,
        spiegazione:
          r.status === 400 || r.status === 403
            ? "Google non accetta questa chiave: potrebbe essere sbagliata, revocata, o l'API Generative Language non è abilitata sul progetto."
            : "Google ha risposto con un errore. Riprova tra poco.",
      });
    }

    const d = await r.json();
    const utilizzabili = (d.models || [])
      .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
      .map((m) => String(m.name).replace(/^models\//, ""));

    return res.status(200).json({
      chiave: `presente (inizia con ${key.slice(0, 6)}…)`,
      google: "OK",
      modello_forzato: process.env.GEMINI_MODEL || "(nessuno: scelta automatica)",
      modelli_flash: utilizzabili.filter((n) => n.includes("flash")),
      totale_utilizzabili: utilizzabili.length,
      spiegazione:
        "Se qui compaiono dei modelli Flash, la dettatura dovrebbe funzionare. In caso contrario, imposta GEMINI_MODEL su Vercel con uno dei nomi elencati.",
    });
  } catch (err) {
    return res.status(200).json({
      chiave: "presente",
      google: "IRRAGGIUNGIBILE",
      spiegazione: String(err),
    });
  }
}
