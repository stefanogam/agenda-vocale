// client/components/RecurrenceChoice.jsx
import { Repeat } from "lucide-react";
import { tokens } from "../lib/tokens.js";

export default function RecurrenceChoice({ action, onClose, onChoose }) {
  const verb = action === "edit" ? "Modificare" : "Eliminare";
  const options = [
    { key: "occurrence", label: "Solo questo evento", desc: "Le altre occorrenze della serie restano invariate" },
    { key: "following", label: "Questo e i successivi", desc: "La serie si divide da qui in poi" },
    { key: "series", label: "Tutta la serie", desc: "Si applica a tutte le occorrenze, passate e future" },
  ];
  return (
    <div className="absolute inset-0 z-30 flex items-end" style={{ background: "rgba(8,11,18,0.55)" }} onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={`${verb} l'evento ricorrente`} className="w-full rounded-t-[2rem] px-6 pt-5 pb-8" style={{ background: tokens.surface, borderTop: `1px solid ${tokens.border}` }} onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: tokens.border }} />
        <div className="flex items-center gap-2 mb-1">
          <Repeat size={14} color={tokens.amber} />
          <p className="f-mono text-[11px] uppercase tracking-wider" style={{ color: tokens.textSecondary }}>Evento ricorrente</p>
        </div>
        <h2 className="f-display text-lg mb-4" style={{ color: tokens.textPrimary }}>{verb} cosa?</h2>
        <div className="flex flex-col gap-2">
          {options.map((o) => (
            <button key={o.key} onClick={() => onChoose(o.key)} className="text-left rounded-2xl px-4 py-3" style={{ background: tokens.surface2, border: `1px solid ${tokens.border}` }}>
              <p className="text-sm font-medium" style={{ color: tokens.textPrimary }}>{o.label}</p>
              <p className="text-xs mt-0.5" style={{ color: tokens.textSecondary }}>{o.desc}</p>
            </button>
          ))}
        </div>
        <button onClick={onClose} className="w-full rounded-xl py-3 mt-3 text-sm f-mono" style={{ color: tokens.textSecondary }}>Annulla</button>
      </div>
    </div>
  );
}
