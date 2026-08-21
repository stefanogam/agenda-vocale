// client/components/TodoSheet.jsx
import { useState } from "react";
import { Check, X, Trash2, CalendarDays } from "lucide-react";
import { tokens } from "../lib/tokens.js";
import { useEscapeClose } from "../lib/use-escape-close.js";

const inputStyle = { background: tokens.surface2, color: tokens.textPrimary, border: `1px solid ${tokens.border}` };

export default function TodoSheet({ todo, onClose, onSave, onDelete }) {
  const [title, setTitle] = useState(todo.title || "");
  const [date, setDate] = useState(todo.date || "");
  const [notes, setNotes] = useState(todo.notes || "");
  useEscapeClose(onClose);

  function save() {
    if (!title.trim()) return;
    onSave(todo.id, {
      title: title.trim(),
      date: date || null,
      // con una scadenza l'attività compare nei calendari, senza no
      deadline: !!date,
      all_day: true,
      time: null,
      notes: notes.trim() || null,
    });
  }

  function remove() {
    const n = todo.childTotal ?? 0;
    const msg = n > 0
      ? `Eliminare "${todo.title}" e le ${n} sotto-attività che contiene?`
      : `Eliminare "${todo.title}"?`;
    if (window.confirm(msg)) onDelete(todo.id);
  }

  return (
    <div className="absolute inset-0 z-30 flex items-end" style={{ background: "rgba(8,11,18,0.55)" }} onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Modifica attività" className="w-full rounded-t-[2rem] px-6 pt-5 pb-8 overflow-y-auto" style={{ background: tokens.surface, borderTop: `1px solid ${tokens.border}`, maxHeight: "88vh" }} onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: tokens.border }} />

        <div className="flex items-center justify-between mb-4">
          <span className="f-mono text-[11px] uppercase tracking-wider" style={{ color: tokens.textSecondary }}>
            Attività {todo.number}
          </span>
          <button onClick={onClose} aria-label="Chiudi" className="rounded-full p-2" style={{ background: tokens.surface2 }}>
            <X size={14} color={tokens.textPrimary} />
          </button>
        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-transparent outline-none f-display text-xl mb-4 pb-1"
          style={{ color: tokens.textPrimary, borderBottom: `1px solid ${tokens.border}` }}
        />

        <p className="f-mono text-[10px] uppercase tracking-wider mb-2" style={{ color: tokens.textSecondary }}>Scadenza (opzionale)</p>
        <div className="flex gap-2 mb-1">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="flex-1 rounded-xl px-3 py-2.5 text-sm f-mono outline-none" style={inputStyle} />
          {date && (
            <button onClick={() => setDate("")} className="rounded-xl px-3 text-xs f-mono" style={{ background: tokens.surface2, color: tokens.textSecondary, border: `1px solid ${tokens.border}` }}>
              Togli
            </button>
          )}
        </div>
        <p className="text-xs mb-4 flex items-center gap-1.5" style={{ color: tokens.textSecondary }}>
          <CalendarDays size={11} />
          {date ? "Comparirà nei calendari alla data indicata." : "Senza scadenza resta solo in questa lista."}
        </p>

        <p className="f-mono text-[10px] uppercase tracking-wider mb-2" style={{ color: tokens.textSecondary }}>Note</p>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Aggiungi un dettaglio…" className="w-full rounded-xl px-3 py-2.5 text-sm f-body outline-none mb-5 resize-none" style={inputStyle} />

        <div className="flex gap-3">
          <button onClick={remove} aria-label="Elimina" className="rounded-xl py-3 px-4 flex items-center justify-center" style={{ background: "transparent", border: `1px solid ${tokens.coral}` }}>
            <Trash2 size={16} color={tokens.coral} />
          </button>
          <button onClick={onClose} className="flex-1 rounded-xl py-3 text-sm font-medium" style={{ background: "transparent", border: `1px solid ${tokens.border}`, color: tokens.textSecondary }}>
            Annulla
          </button>
          <button onClick={save} disabled={!title.trim()} className="flex-1 rounded-xl py-3 flex items-center justify-center gap-2 text-sm font-semibold" style={{ background: tokens.amber, color: tokens.bg, opacity: title.trim() ? 1 : 0.5 }}>
            <Check size={16} /> Salva
          </button>
        </div>
      </div>
    </div>
  );
}
