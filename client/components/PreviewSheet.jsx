// client/components/PreviewSheet.jsx
import { useState } from "react";
import { Check, X, Star } from "lucide-react";
import { tokens, REMINDER_OPTIONS, reminderLabel } from "../lib/tokens.js";
import { ICONS } from "../lib/icons.js";

// `extraction` arriva dall'interprete locale (lib/parse-italian.js):
// { title, type, category,
// all_day, start_at, rrule, badges, notes, confidence, transcript }
export default function PreviewSheet({ extraction, categories, badges, onCancel, onConfirm }) {
  const startDate = extraction.start_at ? new Date(extraction.start_at) : new Date();
  const [draft, setDraft] = useState({
    title: extraction.title || "",
    type: extraction.type || "appuntamento",
    category: extraction.category || categories[0]?.name || "",
    dateKey: startDate.toISOString().slice(0, 10),
    time: extraction.all_day ? "09:00" : `${String(startDate.getHours()).padStart(2, "0")}:${String(startDate.getMinutes()).padStart(2, "0")}`,
    allDay: !!extraction.all_day,
    reminderMinutes: 60,
    badges: extraction.badges || [],
    notes: extraction.notes || "",
  });

  const set = (patch) => setDraft({ ...draft, ...patch });
  function toggleBadge(name) {
    set({ badges: draft.badges.includes(name) ? draft.badges.filter((b) => b !== name) : [...draft.badges, name] });
  }

  function confirm() {
    onConfirm({
      type: draft.type,
      title: draft.title,
      category: draft.category,
      date: draft.dateKey,
      time: draft.allDay ? null : draft.time,
      all_day: draft.allDay,
      deadline: draft.type === "scadenza",
      rrule: extraction.rrule || null,
      badges: draft.badges,
      notes: draft.notes || null,
      reminder_minutes: draft.type === "radar" ? null : draft.reminderMinutes,
      created_via: "voice",
      raw_transcript: extraction.transcript,
    });
  }

  return (
    <div className="absolute inset-0 z-30 flex items-end" style={{ background: "rgba(8,11,18,0.55)" }}>
      <div role="dialog" aria-modal="true" aria-label="Conferma appuntamento riconosciuto dalla voce" className="w-full rounded-t-[2rem] px-6 pt-5 pb-8 overflow-y-auto" style={{ background: tokens.surface, borderTop: `1px solid ${tokens.border}`, maxHeight: "85vh" }}>
        <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: tokens.border }} />
        <p className="f-mono text-[11px] uppercase tracking-wider mb-3" style={{ color: tokens.textSecondary }}>Ho capito questo — modifica se serve</p>

        <input value={draft.title} onChange={(e) => set({ title: e.target.value })} className="w-full bg-transparent outline-none f-display text-xl mb-4 pb-1" style={{ color: tokens.textPrimary, borderBottom: `1px solid ${tokens.border}` }} />

        <div className="flex rounded-full p-1 mb-4" style={{ background: tokens.surface2 }}>
          {[{ k: "appuntamento", l: "Appuntamento" }, { k: "scadenza", l: "Scadenza" }, { k: "radar", l: "Radar" }].map(({ k, l }) => (
            <button key={k} onClick={() => set({ type: k })} className="flex-1 rounded-full py-2 text-xs f-mono" style={{ background: draft.type === k ? tokens.amber : "transparent", color: draft.type === k ? tokens.bg : tokens.textSecondary }}>{l}</button>
          ))}
        </div>

        <p className="f-mono text-[10px] uppercase tracking-wider mb-2" style={{ color: tokens.textSecondary }}>Categoria</p>
        <div className="flex gap-2 flex-wrap mb-4">
          {categories.map((c) => {
            const CIcon = ICONS[c.icon] || Star;
            const active = draft.category === c.name;
            return (
              <button key={c.id} onClick={() => set({ category: c.name })} className="flex items-center gap-1.5 rounded-full pl-2 pr-3 py-1.5" style={{ background: active ? c.color : tokens.surface2 }}>
                <CIcon size={12} color={active ? tokens.bg : tokens.textSecondary} />
                <span className="text-xs f-mono" style={{ color: active ? tokens.bg : tokens.textSecondary }}>{c.name}</span>
              </button>
            );
          })}
          {draft.category && !categories.find((c) => c.name === draft.category) && (
            <span className="f-mono text-[10px] rounded-full px-3 py-1.5" style={{ background: tokens.surface2, color: tokens.amber, border: `1px dashed ${tokens.amber}` }}>
              "{draft.category}" — nuova, verrà creata
            </span>
          )}
        </div>

        {draft.type !== "radar" && (
          <>
            <p className="f-mono text-[10px] uppercase tracking-wider mb-2" style={{ color: tokens.textSecondary }}>Data e ora</p>
            <div className="flex gap-2 mb-4">
              <input type="date" value={draft.dateKey} onChange={(e) => set({ dateKey: e.target.value })} className="flex-1 rounded-xl px-3 py-2.5 text-sm f-mono outline-none" style={{ background: tokens.surface2, color: tokens.textPrimary, border: `1px solid ${tokens.border}` }} />
              <input type="time" value={draft.time} onChange={(e) => set({ time: e.target.value })} disabled={draft.allDay} className="w-28 rounded-xl px-3 py-2.5 text-sm f-mono outline-none" style={{ background: tokens.surface2, color: tokens.textPrimary, border: `1px solid ${tokens.border}`, opacity: draft.allDay ? 0.5 : 1 }} />
            </div>

            <p className="f-mono text-[10px] uppercase tracking-wider mb-2" style={{ color: tokens.textSecondary }}>Promemoria</p>
            <div className="flex gap-2 flex-wrap mb-4">
              {REMINDER_OPTIONS.map((min) => (
                <button key={min} onClick={() => set({ reminderMinutes: min })} className="f-mono text-[10px] rounded-full px-3 py-1.5" style={{ background: draft.reminderMinutes === min ? tokens.amber : tokens.surface2, color: draft.reminderMinutes === min ? tokens.bg : tokens.textSecondary }}>{reminderLabel(min)}</button>
              ))}
            </div>

            <p className="f-mono text-[10px] uppercase tracking-wider mb-2" style={{ color: tokens.textSecondary }}>Badge</p>
            <div className="flex gap-2 flex-wrap mb-4">
              {badges.map((b) => {
                const active = draft.badges.includes(b.name);
                return (
                  <button key={b.id} onClick={() => toggleBadge(b.name)} className="f-mono text-[10px] rounded-full px-3 py-1.5" style={{ background: active ? b.color : tokens.surface2, color: active ? tokens.bg : tokens.textSecondary, border: `1px solid ${active ? b.color : tokens.border}` }}>{b.name}</button>
                );
              })}
              {draft.badges.filter((b) => !badges.find((x) => x.name === b)).map((b) => (
                <span key={b} className="f-mono text-[10px] rounded-full px-3 py-1.5" style={{ background: tokens.surface2, color: tokens.amber, border: `1px dashed ${tokens.amber}` }}>"{b}" — nuovo</span>
              ))}
            </div>
          </>
        )}

        <p className="f-mono text-[10px] uppercase tracking-wider mb-2" style={{ color: tokens.textSecondary }}>Note</p>
        <textarea value={draft.notes} onChange={(e) => set({ notes: e.target.value })} rows={2} placeholder="Aggiungi un dettaglio…" className="w-full rounded-xl px-3 py-2.5 text-sm f-body outline-none mb-5 resize-none" style={{ background: tokens.surface2, color: tokens.textPrimary, border: `1px solid ${tokens.border}` }} />

        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 rounded-xl py-3 flex items-center justify-center gap-2 text-sm font-medium" style={{ background: "transparent", border: `1px solid ${tokens.border}`, color: tokens.textSecondary }}><X size={16} /> Annulla</button>
          <button onClick={confirm} disabled={!draft.title.trim()} className="flex-1 rounded-xl py-3 flex items-center justify-center gap-2 text-sm font-semibold" style={{ background: tokens.amber, color: tokens.bg, opacity: draft.title.trim() ? 1 : 0.5 }}><Check size={16} /> Conferma</button>
        </div>
      </div>
    </div>
  );
}
