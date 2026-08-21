// client/components/CreateSheet.jsx
import { Check, X } from "lucide-react";
import { tokens } from "../lib/tokens.js";
import { draftToItem } from "../lib/item-draft.js";
import ItemFields from "./ItemFields.jsx";

export default function CreateSheet({ draft, setDraft, categories, badges, onCancel, onSave }) {
  return (
    <div className="absolute inset-0 z-30 flex items-end" style={{ background: "rgba(8,11,18,0.55)" }}>
      <div role="dialog" aria-modal="true" aria-label="Nuovo elemento" className="w-full rounded-t-[2rem] px-6 pt-5 pb-8 overflow-y-auto" style={{ background: tokens.surface, borderTop: `1px solid ${tokens.border}`, maxHeight: "88vh" }}>
        <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: tokens.border }} />
        <p className="f-mono text-[11px] uppercase tracking-wider mb-3" style={{ color: tokens.textSecondary }}>Nuovo, manuale</p>

        <ItemFields draft={draft} setDraft={setDraft} categories={categories} badges={badges} />

        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 rounded-xl py-3 flex items-center justify-center gap-2 text-sm font-medium" style={{ background: "transparent", border: `1px solid ${tokens.border}`, color: tokens.textSecondary }}>
            <X size={16} /> Annulla
          </button>
          <button onClick={() => onSave(draftToItem(draft))} disabled={!draft.title.trim()} className="flex-1 rounded-xl py-3 flex items-center justify-center gap-2 text-sm font-semibold" style={{ background: tokens.amber, color: tokens.bg, opacity: draft.title.trim() ? 1 : 0.5 }}>
            <Check size={16} /> Crea
          </button>
        </div>
      </div>
    </div>
  );
}
