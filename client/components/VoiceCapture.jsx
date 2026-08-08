// client/components/VoiceCapture.jsx
import { useState, useRef } from "react";
import { Mic, Square, X } from "lucide-react";
import { tokens } from "../lib/tokens.js";
import PreviewSheet from "./PreviewSheet.jsx";

// Riconoscimento vocale del browser: gratis, nessuna chiave API, ma non
// disponibile ovunque (bene su Chrome/Edge/Safari recenti, assente su
// Firefox) — da qui il ramo "unsupported".
const SpeechRecognitionAPI =
  typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

export default function VoiceCapture({ categories, badges, settings, today, onConfirm }) {
  const [phase, setPhase] = useState("idle"); // idle | listening | processing | preview | clarify | unsupported
  const [transcript, setTranscript] = useState("");
  const [extraction, setExtraction] = useState(null);
  const recognitionRef = useRef(null);
  const finalTextRef = useRef("");

  function startListening() {
    if (!SpeechRecognitionAPI) { setPhase("unsupported"); return; }

    const rec = new SpeechRecognitionAPI();
    rec.lang = "it-IT";
    rec.interimResults = true;
    rec.continuous = false;
    finalTextRef.current = "";

    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalTextRef.current += r[0].transcript;
        else interim += r[0].transcript;
      }
      setTranscript(finalTextRef.current + interim);
    };
    rec.onerror = () => setPhase("idle");
    rec.onend = async () => {
      const text = finalTextRef.current.trim();
      if (!text) { setPhase("idle"); return; }
      setPhase("processing");
      await runExtraction(text);
    };

    recognitionRef.current = rec;
    setTranscript("");
    setExtraction(null);
    setPhase("listening");
    rec.start();
  }

  function stopListening() {
    recognitionRef.current?.stop(); // fa scattare onend -> avvia l'estrazione
  }

  function cancel() {
    recognitionRef.current?.abort();
    setPhase("idle");
    setTranscript("");
    setExtraction(null);
  }

  async function runExtraction(text) {
    try {
      const res = await fetch("/api/voice-extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: text,
          timezone: settings.timezone,
          now: today.toISOString(),
          categories: categories.map((c) => c.name),
          badges: badges.map((b) => b.name),
        }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      setExtraction({ ...data, transcript: text });
      setPhase(data.confidence === "low" ? "clarify" : "preview");
    } catch (err) {
      console.error("Estrazione vocale fallita:", err);
      setPhase("idle");
    }
  }

  function handleConfirm(itemData) {
    onConfirm(itemData);
    setPhase("idle");
    setExtraction(null);
    setTranscript("");
  }

  return (
    <>
      <div className="flex flex-col items-center">
        {phase === "idle" && (
          <button onClick={startListening} aria-label="Crea con la voce" className="rounded-full flex items-center justify-center shadow-lg" style={{ width: 60, height: 60, background: tokens.amber }}>
            <Mic size={22} color={tokens.bg} strokeWidth={2} />
          </button>
        )}

        {phase === "unsupported" && (
          <p className="f-mono text-[10px] text-center px-6 max-w-[220px]" style={{ color: tokens.textSecondary }}>
            Il tuo browser non supporta il riconoscimento vocale. Usa "+" per creare manualmente.
          </p>
        )}

        {(phase === "listening" || phase === "processing") && (
          <div className="rounded-full flex items-center gap-2 px-5 shadow-lg" style={{ height: 60, background: tokens.surface2, border: `1px solid ${tokens.border}`, minWidth: 250 }}>
            {phase === "listening" ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: tokens.coral }} />
                <span className="f-mono text-xs" style={{ color: tokens.textSecondary }}>Ti ascolto…</span>
                <button onClick={stopListening} aria-label="Interrompi e interpreta" className="ml-auto rounded-full p-1.5" style={{ background: tokens.amber }}>
                  <Square size={12} color={tokens.bg} fill={tokens.bg} />
                </button>
              </>
            ) : (
              <p className="f-mono text-xs w-full text-center" style={{ color: tokens.textSecondary }}>Sto interpretando…</p>
            )}
          </div>
        )}

        {phase === "listening" && (
          <p aria-live="polite" className="f-body text-sm mt-3 px-8 text-center" style={{ color: tokens.textPrimary, minHeight: 20 }}>{transcript}</p>
        )}
      </div>

      {phase === "clarify" && extraction && (
        <div className="absolute inset-0 z-30 flex items-end" style={{ background: "rgba(8,11,18,0.55)" }}>
          <div role="dialog" aria-modal="true" aria-label="Comando vocale non chiaro" className="w-full rounded-t-[2rem] px-6 pt-5 pb-8" style={{ background: tokens.surface, borderTop: `1px solid ${tokens.border}` }}>
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: tokens.border }} />
            <div className="flex items-center gap-2 mb-3">
              <div className="rounded-full p-1.5" style={{ background: "rgba(240,168,104,0.15)" }}><Mic size={13} color={tokens.amber} /></div>
              <p className="f-mono text-[11px] uppercase tracking-wider" style={{ color: tokens.amber }}>Non ho capito bene</p>
            </div>
            <p className="text-xs mb-1" style={{ color: tokens.textSecondary }}>Ho sentito:</p>
            <p className="text-sm mb-4 italic" style={{ color: tokens.textPrimary }}>"{extraction.transcript}"</p>
            <div className="rounded-xl px-3.5 py-3 mb-6" style={{ background: tokens.surface2 }}>
              <p className="text-sm" style={{ color: tokens.textPrimary }}>{extraction.clarification_question || "Puoi ripetere in modo più preciso?"}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={cancel} className="flex-1 rounded-xl py-3 flex items-center justify-center gap-2 text-sm font-medium" style={{ background: "transparent", border: `1px solid ${tokens.border}`, color: tokens.textSecondary }}><X size={16} /> Annulla</button>
              <button onClick={startListening} className="flex-1 rounded-xl py-3 flex items-center justify-center gap-2 text-sm font-semibold" style={{ background: tokens.amber, color: tokens.bg }}><Mic size={16} /> Riprova</button>
            </div>
          </div>
        </div>
      )}

      {phase === "preview" && extraction && (
        <PreviewSheet extraction={extraction} categories={categories} badges={badges} onCancel={cancel} onConfirm={handleConfirm} />
      )}
    </>
  );
}
