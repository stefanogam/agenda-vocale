// client/components/TodoView.jsx
import { useState } from "react";
import { Check, Plus, X, CornerDownRight, CalendarDays } from "lucide-react";
import { tokens } from "../lib/tokens.js";
import { buildTodoRows } from "../lib/todo-tree.js";
import { parseKey, shortDate, diffDays } from "../lib/date-utils.js";

export default function TodoView({ todos, today, onToggle, onCreate, onOpen }) {
  const rows = buildTodoRows(todos);
  // id del genitore sotto cui si sta scrivendo una nuova attività
  // (null = primo livello, false = nessun campo aperto)
  const [addingUnder, setAddingUnder] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  function openAdd(parentId) {
    setAddingUnder(parentId);
    setNewTitle("");
  }

  async function confirmAdd() {
    const t = newTitle.trim();
    if (!t) { setAddingUnder(false); return; }
    await onCreate({ title: t, parent_id: addingUnder === null ? null : addingUnder });
    setNewTitle("");
    // resta aperto sullo stesso livello: di solito se ne aggiungono più di una
  }

  const AddField = ({ label }) => (
    <div className="flex gap-2 items-center mt-1 mb-2">
      <input
        autoFocus
        value={newTitle}
        onChange={(e) => setNewTitle(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") confirmAdd(); if (e.key === "Escape") setAddingUnder(false); }}
        placeholder={label}
        className="flex-1 rounded-xl px-3 py-2 text-sm f-body outline-none"
        style={{ background: tokens.surface2, color: tokens.textPrimary, border: `1px solid ${tokens.amber}` }}
      />
      <button onClick={confirmAdd} aria-label="Aggiungi" className="rounded-full p-2 shrink-0" style={{ background: tokens.amber }}>
        <Check size={14} color={tokens.bg} />
      </button>
      <button onClick={() => setAddingUnder(false)} aria-label="Annulla" className="rounded-full p-2 shrink-0" style={{ background: tokens.surface2 }}>
        <X size={14} color={tokens.textSecondary} />
      </button>
    </div>
  );

  return (
    <div className="px-6 pb-44 flex-1 overflow-y-auto">
      <p className="text-xs mb-4 mt-2" style={{ color: tokens.textSecondary }}>
        Attività da fare, anche annidate. Se ne imposti una scadenza, compare anche nei calendari.
      </p>

      {rows.length === 0 && addingUnder === false && (
        <p className="text-xs text-center py-10" style={{ color: tokens.textSecondary }}>
          Nessuna attività. Tocca &quot;Nuova attività&quot; per iniziare.
        </p>
      )}

      <div className="flex flex-col">
        {rows.map((t) => {
          const overdue = t.date && !t.done && diffDays(parseKey(t.date), today) < 0;
          return (
            <div key={t.id}>
              <div
                className="flex items-start gap-2 py-2"
                style={{ paddingLeft: t.depth * 18, borderBottom: `1px solid ${tokens.border}` }}
              >
                <button
                  onClick={() => onToggle(t.id)}
                  aria-label={t.done ? "Segna da fare" : "Segna come fatta"}
                  className="rounded-full shrink-0 mt-0.5 flex items-center justify-center"
                  style={{
                    width: 20, height: 20,
                    background: t.done ? tokens.sage : "transparent",
                    border: `1.5px solid ${t.done ? tokens.sage : tokens.border}`,
                  }}
                >
                  {t.done && <Check size={12} color={tokens.bg} strokeWidth={3} />}
                </button>

                <span className="f-mono text-[10px] shrink-0 mt-1" style={{ color: tokens.textSecondary, minWidth: 26 }}>
                  {t.number}
                </span>

                <button onClick={() => onOpen(t)} className="flex-1 min-w-0 text-left">
                  <p
                    className="text-sm"
                    style={{
                      color: t.done ? tokens.textSecondary : tokens.textPrimary,
                      textDecoration: t.done ? "line-through" : "none",
                    }}
                  >
                    {t.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {t.date && (
                      <span className="flex items-center gap-1 f-mono text-[10px] rounded-full px-2 py-0.5"
                        style={{ background: overdue ? "rgba(232,115,95,0.15)" : tokens.surface2, color: overdue ? tokens.coral : tokens.textSecondary }}>
                        <CalendarDays size={9} /> {shortDate(parseKey(t.date))}{overdue ? " · scaduta" : ""}
                      </span>
                    )}
                    {t.childTotal > 0 && (
                      <span className="f-mono text-[10px]" style={{ color: tokens.textSecondary }}>
                        {t.childDone}/{t.childTotal}
                      </span>
                    )}
                  </div>
                </button>

                <button onClick={() => openAdd(t.id)} aria-label="Aggiungi sotto-attività" className="rounded-full p-1.5 shrink-0" style={{ background: tokens.surface2 }}>
                  <CornerDownRight size={12} color={tokens.textSecondary} />
                </button>
              </div>

              {addingUnder === t.id && (
                <div style={{ paddingLeft: (t.depth + 1) * 18 }}>
                  <AddField label={`Sotto-attività di "${t.title}"`} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {addingUnder === null ? (
        <AddField label="Nuova attività" />
      ) : (
        <button onClick={() => openAdd(null)} className="w-full rounded-2xl py-3 flex items-center justify-center gap-2 text-sm f-mono mt-4" style={{ border: `1px dashed ${tokens.border}`, color: tokens.textSecondary }}>
          <Plus size={15} /> Nuova attività
        </button>
      )}
    </div>
  );
}
