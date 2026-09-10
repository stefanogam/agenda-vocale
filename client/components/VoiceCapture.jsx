// client/components/VoiceCapture.jsx
import { useState, useRef } from "react";
import { Mic, Square, X, Check, Trash2 } from "lucide-react";
import { tokens } from "../lib/tokens.js";
import PreviewSheet from "./PreviewSheet.jsx";

// Riconoscimento vocale del browser: gratis, nessuna chiave API, ma non
// disponibile ovunque (bene su Chrome/Edge/Safari recenti, assente su
// Firefox) — da qui il ramo "unsupported".
const SpeechRecognitionAPI =
  typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

export default function VoiceCapture({
  categories, badges, settings, defaultReminderMinutes, context,
  todoRows = [], onAddSubtask, onToggleTodo, onDeleteTodo, onRefresh, onConfirm,
}) {
  // idle | listening | processing | preview | clarify | confermaEliminazione | done | error | unsupported
  const [phase, setPhase] = useState("idle");
  const [errorMsg, setErrorMsg] = useState(null);
  const [doneMsg, setDoneMsg] = useState(null);
  const [transcript, setTranscript] = useState("");
  const [extraction, setExtraction] = useState(null);
  const [operazioniInAttesa, setOperazioniInAttesa] = useState([]);
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
    setErrorMsg(null);
    setDoneMsg(null);
    setOperazioniInAttesa([]);
  }

  const trovaBersaglio = (op) =>
    todoRows.find((t) => t.number === op.target_number) ||
    todoRows.find((t) => t.title.toLowerCase() === (op.title || "").toLowerCase());

  async function eseguiOperazioni(operations) {
    const aggiunte = [], completate = [], riaperte = [], eliminate = [], nonTrovate = [];

    // in sequenza: l'ordine conta per la numerazione delle nuove voci
    for (const op of operations) {
      const bersaglio = trovaBersaglio(op);
      if (!bersaglio) { nonTrovate.push(op.title || op.target_number || "?"); continue; }

      if (op.action === "aggiungi_sotto") {
        if (!op.title) continue;
        await onAddSubtask?.(bersaglio.id, op.title);
        aggiunte.push({ titolo: op.title, sotto: bersaglio.title });
      } else if (op.action === "elimina") {
        await onDeleteTodo?.(bersaglio.id);
        eliminate.push(bersaglio.title);
      } else {
        const vuoleFatta = op.action === "completa";
        if (!!bersaglio.done !== vuoleFatta) await onToggleTodo?.(bersaglio.id);
        (vuoleFatta ? completate : riaperte).push(bersaglio.title);
      }
    }

    await onRefresh?.();

    if (!aggiunte.length && !completate.length && !riaperte.length && !eliminate.length) {
      setPhase("clarify");
      return;
    }

    const elenca = (v) => v.map((x) => `"${x}"`).join(", ");
    const parti = [];
    if (aggiunte.length) {
      const genitori = [...new Set(aggiunte.map((a) => a.sotto))];
      parti.push(
        genitori.length === 1
          ? `${elenca(aggiunte.map((a) => a.titolo))} ${aggiunte.length === 1 ? "aggiunta" : "aggiunte"} sotto "${genitori[0]}".`
          : `${aggiunte.length} sotto-attività aggiunte.`
      );
    }
    if (completate.length) parti.push(`${elenca(completate)} ${completate.length === 1 ? "segnata" : "segnate"} come ${completate.length === 1 ? "fatta" : "fatte"}.`);
    if (riaperte.length) parti.push(`${elenca(riaperte)} ${riaperte.length === 1 ? "rimessa" : "rimesse"} tra le cose da fare.`);
    if (eliminate.length) parti.push(`${elenca(eliminate)} ${eliminate.length === 1 ? "eliminata" : "eliminate"}.`);
    if (nonTrovate.length) parti.push(`Non ho trovato: ${elenca(nonTrovate)}.`);

    setDoneMsg(parti.join(" "));
    setPhase("done");
  }

  async function runExtraction(text) {
    // L'interpretazione avviene sul server (Gemini Flash): serve la rete.
    try {
      const res = await fetch("/api/voice-extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: text,
          timezone: settings?.timezone,
          now: new Date().toISOString(),
          categories: categories.map((c) => c.name),
          badges: badges.map((b) => b.name),
          context, // la sezione aperta: radar, todo, o una vista calendario
          // nella sezione To-do si manda anche l'elenco, così il comando
          // può riferirsi a un'attività già presente
          todos: context === "todo"
            ? todoRows.map((t) => ({ number: t.number, title: t.title, done: !!t.done }))
            : undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErrorMsg(body.error || "Interpretazione non riuscita.");
        setExtraction({ transcript: text });
        setPhase("error");
        return;
      }

      const data = await res.json();
      setExtraction(data);

      // Comandi su attività esistenti: si eseguono subito, senza passare
      // dalla scheda di conferma. Un solo comando può contenerne più di uno.
      if (Array.isArray(data.operations) && data.operations.length > 0) {
        // Le eliminazioni fanno eccezione: il riconoscimento vocale può
        // fraintendere e non si torna indietro, quindi si chiede conferma
        if (data.operations.some((o) => o.action === "elimina")) {
          setOperazioniInAttesa(data.operations);
          setPhase("confermaEliminazione");
          return;
        }
        await eseguiOperazioni(data.operations);
        return;
      }

      setPhase(data.confidence === "low" ? "clarify" : "preview");
    } catch {
      setErrorMsg("Nessuna connessione: la dettatura richiede la rete. Usa \"+\" per creare manualmente.");
      setExtraction({ transcript: text });
      setPhase("error");
    }
  }

  function handleConfirm(itemData) {
    onConfirm(itemData);
    setPhase("idle");
    setExtraction(null);
    setTranscript("");
  }

  // Riepilogo di cosa verrà eliminato, sotto-attività comprese
  const daEliminare = operazioniInAttesa
    .filter((o) => o.action === "elimina")
    .map((o) => trovaBersaglio(o))
    .filter(Boolean);

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
            Il tuo browser non supporta il riconoscimento vocale. Usa &quot;+&quot; per creare manualmente.
          </p>
        )}

        {(phase === "listening" || phase === "processing") && (
          <div className="rounded-full flex items-center gap-2 px-5 shadow-lg" style={{ height: 60, background: tokens.surface2, border: `1px solid ${tokens.border}`, width: "min(70vw, 260px)" }}>
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

      {phase === "confermaEliminazione" && (
        <div className="absolute inset-0 z-30 flex items-end" style={{ background: "rgba(8,11,18,0.55)" }}>
          <div role="dialog" aria-modal="true" aria-label="Conferma eliminazione" className="w-full rounded-t-[2rem] px-6 pt-5 pb-8" style={{ background: tokens.surface, borderTop: `1px solid ${tokens.border}` }}>
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: tokens.border }} />
            <div className="flex items-center gap-2 mb-3">
              <div className="rounded-full p-1.5" style={{ background: "rgba(232,115,95,0.2)" }}><Trash2 size={13} color={tokens.coral} /></div>
              <p className="f-mono text-[11px] uppercase tracking-wider" style={{ color: tokens.coral }}>Confermi l&apos;eliminazione?</p>
            </div>
            <div className="flex flex-col gap-1 mb-4">
              {daEliminare.map((t) => (
                <p key={t.id} className="text-sm" style={{ color: tokens.textPrimary }}>
                  {t.number} {t.title}
                  {t.childTotal > 0 && (
                    <span style={{ color: tokens.coral }}> — con {t.childTotal} sotto-attività</span>
                  )}
                </p>
              ))}
              {daEliminare.length === 0 && (
                <p className="text-sm" style={{ color: tokens.textSecondary }}>Non ho trovato l&apos;attività da eliminare.</p>
              )}
            </div>
            <p className="text-xs mb-6" style={{ color: tokens.textSecondary }}>L&apos;operazione non è annullabile.</p>
            <div className="flex gap-3">
              <button onClick={cancel} className="flex-1 rounded-xl py-3 text-sm font-medium" style={{ background: "transparent", border: `1px solid ${tokens.border}`, color: tokens.textSecondary }}>Annulla</button>
              <button
                onClick={async () => { const ops = operazioniInAttesa; setOperazioniInAttesa([]); await eseguiOperazioni(ops); }}
                disabled={daEliminare.length === 0}
                className="flex-1 rounded-xl py-3 flex items-center justify-center gap-2 text-sm font-semibold"
                style={{ background: tokens.coral, color: tokens.bg, opacity: daEliminare.length ? 1 : 0.5 }}
              >
                <Trash2 size={16} /> Elimina
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === "done" && (
        <div className="absolute inset-0 z-30 flex items-end" style={{ background: "rgba(8,11,18,0.55)" }} onClick={cancel}>
          <div role="status" className="w-full rounded-t-[2rem] px-6 pt-5 pb-8" style={{ background: tokens.surface, borderTop: `1px solid ${tokens.border}` }} onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: tokens.border }} />
            <div className="flex items-center gap-2 mb-3">
              <div className="rounded-full p-1.5" style={{ background: "rgba(127,168,127,0.2)" }}><Check size={13} color={tokens.sage} /></div>
              <p className="f-mono text-[11px] uppercase tracking-wider" style={{ color: tokens.sage }}>Fatto</p>
            </div>
            <p className="text-sm mb-6" style={{ color: tokens.textPrimary }}>{doneMsg}</p>
            <div className="flex gap-3">
              <button onClick={cancel} className="flex-1 rounded-xl py-3 text-sm font-medium" style={{ background: "transparent", border: `1px solid ${tokens.border}`, color: tokens.textSecondary }}>Chiudi</button>
              <button onClick={startListening} className="flex-1 rounded-xl py-3 flex items-center justify-center gap-2 text-sm font-semibold" style={{ background: tokens.amber, color: tokens.bg }}><Mic size={16} /> Ancora</button>
            </div>
          </div>
        </div>
      )}

      {phase === "error" && (
        <div className="absolute inset-0 z-30 flex items-end" style={{ background: "rgba(8,11,18,0.55)" }}>
          <div role="dialog" aria-modal="true" aria-label="Interpretazione non riuscita" className="w-full rounded-t-[2rem] px-6 pt-5 pb-8" style={{ background: tokens.surface, borderTop: `1px solid ${tokens.border}` }}>
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: tokens.border }} />
            <p className="f-mono text-[11px] uppercase tracking-wider mb-3" style={{ color: tokens.coral }}>Non riuscito</p>
            {extraction?.transcript && (
              <>
                <p className="text-xs mb-1" style={{ color: tokens.textSecondary }}>Ho sentito:</p>
                <p className="text-sm mb-4 italic" style={{ color: tokens.textPrimary }}>&quot;{extraction.transcript}&quot;</p>
              </>
            )}
            <div className="rounded-xl px-3.5 py-3 mb-6" style={{ background: tokens.surface2 }}>
              <p className="text-sm" style={{ color: tokens.textPrimary }}>{errorMsg}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={cancel} className="flex-1 rounded-xl py-3 flex items-center justify-center gap-2 text-sm font-medium" style={{ background: "transparent", border: `1px solid ${tokens.border}`, color: tokens.textSecondary }}><X size={16} /> Chiudi</button>
              <button onClick={startListening} className="flex-1 rounded-xl py-3 flex items-center justify-center gap-2 text-sm font-semibold" style={{ background: tokens.amber, color: tokens.bg }}><Mic size={16} /> Riprova</button>
            </div>
          </div>
        </div>
      )}

      {phase === "clarify" && extraction && (
        <div className="absolute inset-0 z-30 flex items-end" style={{ background: "rgba(8,11,18,0.55)" }}>
          <div role="dialog" aria-modal="true" aria-label="Comando vocale non chiaro" className="w-full rounded-t-[2rem] px-6 pt-5 pb-8" style={{ background: tokens.surface, borderTop: `1px solid ${tokens.border}` }}>
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: tokens.border }} />
            <div className="flex items-center gap-2 mb-3">
              <div className="rounded-full p-1.5" style={{ background: "rgba(240,168,104,0.15)" }}><Mic size={13} color={tokens.amber} /></div>
              <p className="f-mono text-[11px] uppercase tracking-wider" style={{ color: tokens.amber }}>Non ho capito bene</p>
            </div>
            <p className="text-xs mb-1" style={{ color: tokens.textSecondary }}>Ho sentito:</p>
            <p className="text-sm mb-4 italic" style={{ color: tokens.textPrimary }}>&quot;{extraction.transcript}&quot;</p>
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
        <PreviewSheet extraction={extraction} categories={categories} badges={badges} defaultReminderMinutes={defaultReminderMinutes} onCancel={cancel} onConfirm={handleConfirm} />
      )}
    </>
  );
}
