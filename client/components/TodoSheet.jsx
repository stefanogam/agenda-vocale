// client/components/TodoSheet.jsx
import { useState } from "react";
import { Check, X, Trash2, CalendarDays, CornerDownRight } from "lucide-react";
import { tokens } from "../lib/tokens.js";
import { useEscapeClose } from "../lib/use-escape-close.js";

const inputStyle = { background: tokens.surface2, color: tokens.textPrimary, border: `1px solid ${tokens.border}` };

export default function TodoSheet({ todo, subtasks = [], onClose, onSave, onDelete, onToggleChild, onAddChild }) {
  const [title, setTitle] = useState(todo.title || "");
  const [date, setDate] = useState(todo.date || "");
  const [notes, setNotes] = useState(todo.notes || "");
  const [nuovaSotto, setNuovaSotto] = useState("");
  useEscapeClose(onClose);

  async function aggiungiSotto() {
    const t = nuovaSotto.trim();
    if (!t) return;
    await onAddChild?.(todo.id, t);
    setNuovaSotto(""); // il campo resta pronto: di solito se ne aggiungono più di una
  }

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

        <p className="f-mono text-[10px] uppercase tracking-wider mb-2" style={{ color: tokens.textSecondary }}>
          Sotto-attività{subtasks.length > 0 ? ` (${subtasks.filter((c) => c.done).length}/${subtasks.length})` : ""}
        </p>
        <div className="flex flex-col mb-2">
          {subtasks.map((c) => (
            <div key={c.id} className="flex items-center gap-2 py-1.5" style={{ borderBottom: `1px solid ${tokens.border}` }}>
              <button
                onClick={() => onToggleChild?.(c.id)}
                aria-label={c.done ? "Segna da fare" : "Segna come fatta"}
                className="rounded-full shrink-0 flex items-center justify-center"
                style={{ width: 18, height: 18, background: c.done ? tokens.sage : "transparent", border: `1.5px solid ${c.done ? tokens.sage : tokens.border}` }}
              >
                {c.done && <Check size={11} color={tokens.bg} strokeWidth={3} />}
              </button>
              <span className="f-mono text-[10px] shrink-0" style={{ color: tokens.textSecondary, minWidth: 26 }}>{c.number}</span>
              <span className="text-sm flex-1 min-w-0" style={{ color: c.done ? tokens.textSecondary : tokens.textPrimary, textDecoration: c.done ? "line-through" : "none" }}>
                {c.title}
              </span>
            </div>
          ))}
          {subtasks.length === 0 && (
            <p className="text-xs py-1" style={{ color: tokens.textSecondary }}>Nessuna sotto-attività.</p>
          )}
        </div>
        <div className="flex gap-2 items-center mb-5">
          <CornerDownRight size={13} color={tokens.textSecondary} className="shrink-0" />
          <input
            value={nuovaSotto}
            onChange={(e) => setNuovaSotto(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") aggiungiSotto(); }}
            placeholder="Aggiungi una sotto-attività"
            className="flex-1 rounded-xl px-3 py-2 text-sm f-body outline-none"
            style={inputStyle}
          />
          <button onClick={aggiungiSotto} disabled={!nuovaSotto.trim()} aria-label="Aggiungi" className="rounded-full p-2 shrink-0" style={{ background: tokens.amber, opacity: nuovaSotto.trim() ? 1 : 0.4 }}>
            <Check size={14} color={tokens.bg} />
          </button>
        </div>

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
