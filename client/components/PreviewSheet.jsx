// client/components/PreviewSheet.jsx
import { useState } from "react";
import { Check, X } from "lucide-react";
import { tokens } from "../lib/tokens.js";
import { extractionToDraft, draftToItem } from "../lib/item-draft.js";
import ItemFields from "./ItemFields.jsx";

// `extraction` arriva dall'interprete locale (lib/parse-italian.js).
// Tutti i campi restano modificabili prima di confermare: l'interprete
// propone, non decide.
export default function PreviewSheet({ extraction, categories, badges, defaultReminderMinutes, onCancel, onConfirm }) {
  const [draft, setDraft] = useState(() => extractionToDraft(extraction, categories, defaultReminderMinutes));

  return (
    <div className="absolute inset-0 z-30 flex items-end" style={{ background: "rgba(8,11,18,0.55)" }}>
      <div role="dialog" aria-modal="true" aria-label="Conferma quanto riconosciuto dalla voce" className="w-full rounded-t-[2rem] px-6 pt-5 pb-8 overflow-y-auto" style={{ background: tokens.surface, borderTop: `1px solid ${tokens.border}`, maxHeight: "88vh" }}>
        <div className="w-10 h-1 rounded-full mx-auto mb-3" style={{ background: tokens.border }} />
        <p className="f-mono text-[11px] uppercase tracking-wider" style={{ color: tokens.textSecondary }}>Ho capito questo — modifica se serve</p>
        <p className="text-xs mb-4 mt-1 italic" style={{ color: tokens.textSecondary }}>&quot;{extraction.transcript}&quot;</p>

        <ItemFields draft={draft} setDraft={setDraft} categories={categories} badges={badges} />

        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 rounded-xl py-3 flex items-center justify-center gap-2 text-sm font-medium" style={{ background: "transparent", border: `1px solid ${tokens.border}`, color: tokens.textSecondary }}>
            <X size={16} /> Annulla
          </button>
          <button onClick={() => onConfirm(draftToItem(draft))} disabled={!draft.title.trim()} className="flex-1 rounded-xl py-3 flex items-center justify-center gap-2 text-sm font-semibold" style={{ background: tokens.amber, color: tokens.bg, opacity: draft.title.trim() ? 1 : 0.5 }}>
            <Check size={16} /> Conferma
          </button>
        </div>
      </div>
    </div>
  );
}
