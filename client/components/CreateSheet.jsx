// client/components/CreateSheet.jsx
import { useState } from "react";
import { Check, X, Star } from "lucide-react";
import { tokens, REMINDER_OPTIONS, reminderLabel } from "../lib/tokens.js";
import { ICONS } from "../lib/icons.js";
import { RECUR_UNITS, buildRRule } from "../lib/recurrence.js";
import { dateKey } from "../lib/date-utils.js";

export function emptyDraft(categories, defaultReminderMinutes, today) {
  return {
    type: "appuntamento", title: "", category: categories[0]?.name || "", badges: [], notes: "",
    allDay: false, dateKey: dateKey(today), endDateKey: "", time: "09:00",
    repeats: false, recurInterval: 1, recurUnit: "settimane",
    cadenceInterval: 2, cadenceUnit: "settimane",
    reminderMinutes: defaultReminderMinutes,
  };
}

// Converte il draft del form nella forma che si aspetta lo store (store.createItem)
export function draftToItem(d) {
  if (d.type === "radar") {
    return {
      type: "radar",
      title: d.title,
      category: d.category,
      notes: d.notes || null,
      rrule: buildRRule(d.cadenceInterval, d.cadenceUnit),
      last_checked_at: null,
    };
  }
  return {
    type: d.type,
    title: d.title,
    category: d.category,
    date: d.dateKey,
    end_date: d.endDateKey && d.endDateKey !== d.dateKey ? d.endDateKey : null,
    time: d.allDay ? null : d.time,
    all_day: d.allDay,
    deadline: d.type === "scadenza",
    rrule: d.repeats ? buildRRule(d.recurInterval, d.recurUnit) : null,
    badges: d.badges,
    notes: d.notes || null,
    reminder_minutes: d.reminderMinutes,
  };
}

export default function CreateSheet({ draft, setDraft, categories, badges, onCancel, onSave }) {
  const d = draft;
  const set = (patch) => setDraft({ ...d, ...patch });

  function toggleBadge(name) {
    set({ badges: d.badges.includes(name) ? d.badges.filter((b) => b !== name) : [...d.badges, name] });
  }

  return (
    <div className="absolute inset-0 z-30 flex items-end" style={{ background: "rgba(8,11,18,0.55)" }}>
      <div role="dialog" aria-modal="true" aria-label="Nuovo, manuale" className="w-full rounded-t-[2rem] px-6 pt-5 pb-8 overflow-y-auto" style={{ background: tokens.surface, borderTop: `1px solid ${tokens.border}`, maxHeight: "88vh" }}>
        <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: tokens.border }} />
        <p className="f-mono text-[11px] uppercase tracking-wider mb-3" style={{ color: tokens.textSecondary }}>Nuovo, manuale</p>

        <div className="flex rounded-full p-1 mb-4" style={{ background: tokens.surface2 }}>
          {[{ k: "appuntamento", l: "Appuntamento" }, { k: "scadenza", l: "Scadenza" }, { k: "radar", l: "Radar" }].map(({ k, l }) => (
            <button key={k} onClick={() => set({ type: k })} className="flex-1 rounded-full py-2 text-xs f-mono" style={{ background: d.type === k ? tokens.amber : "transparent", color: d.type === k ? tokens.bg : tokens.textSecondary }}>{l}</button>
          ))}
        </div>

        <input value={d.title} onChange={(e) => set({ title: e.target.value })} placeholder="Titolo" className="w-full bg-transparent outline-none f-display text-xl mb-4 pb-1" style={{ color: tokens.textPrimary, borderBottom: `1px solid ${tokens.border}` }} />

        <p className="f-mono text-[10px] uppercase tracking-wider mb-2" style={{ color: tokens.textSecondary }}>Categoria</p>
        <div className="flex gap-2 flex-wrap mb-4">
          {categories.map((c) => {
            const CIcon = ICONS[c.icon] || Star;
            const active = d.category === c.name;
            return (
              <button key={c.id} onClick={() => set({ category: c.name })} className="flex items-center gap-1.5 rounded-full pl-2 pr-3 py-1.5" style={{ background: active ? c.color : tokens.surface2 }}>
                <CIcon size={12} color={active ? tokens.bg : tokens.textSecondary} />
                <span className="text-xs f-mono" style={{ color: active ? tokens.bg : tokens.textSecondary }}>{c.name}</span>
              </button>
            );
          })}
        </div>

        {d.type === "radar" ? (
          <>
            <p className="f-mono text-[10px] uppercase tracking-wider mb-2" style={{ color: tokens.textSecondary }}>Cadenza di controllo</p>
            <div className="flex gap-2 mb-4">
              <input type="number" min={1} value={d.cadenceInterval} onChange={(e) => set({ cadenceInterval: Math.max(1, Number(e.target.value)) })} className="w-16 rounded-xl px-3 py-2.5 text-sm f-mono outline-none text-center" style={{ background: tokens.surface2, color: tokens.textPrimary, border: `1px solid ${tokens.border}` }} />
              <select value={d.cadenceUnit} onChange={(e) => set({ cadenceUnit: e.target.value })} className="flex-1 rounded-xl px-3 py-2.5 text-sm f-mono outline-none" style={{ background: tokens.surface2, color: tokens.textPrimary, border: `1px solid ${tokens.border}` }}>
                {RECUR_UNITS.map((u) => <option key={u.key} value={u.key}>{u.key}</option>)}
              </select>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="f-mono text-[10px] uppercase tracking-wider" style={{ color: tokens.textSecondary }}>Tutto il giorno</p>
              <button onClick={() => set({ allDay: !d.allDay })} className="w-10 h-6 rounded-full relative" style={{ background: d.allDay ? tokens.amber : tokens.surface2 }}>
                <span className="absolute top-0.5 w-5 h-5 rounded-full transition-all" style={{ background: tokens.bg, left: d.allDay ? 18 : 2 }} />
              </button>
            </div>

            <p className="f-mono text-[10px] uppercase tracking-wider mb-2" style={{ color: tokens.textSecondary }}>Data {d.allDay ? "" : "e ora"}</p>
            <div className="flex gap-2 mb-2">
              <input type="date" value={d.dateKey} onChange={(e) => set({ dateKey: e.target.value })} className="flex-1 rounded-xl px-3 py-2.5 text-sm f-mono outline-none" style={{ background: tokens.surface2, color: tokens.textPrimary, border: `1px solid ${tokens.border}` }} />
              {!d.allDay && <input type="time" value={d.time} onChange={(e) => set({ time: e.target.value })} className="w-28 rounded-xl px-3 py-2.5 text-sm f-mono outline-none" style={{ background: tokens.surface2, color: tokens.textPrimary, border: `1px solid ${tokens.border}` }} />}
            </div>
            <p className="text-xs mb-2" style={{ color: tokens.textSecondary }}>fino al (opzionale, per eventi su più giorni)</p>
            <input type="date" value={d.endDateKey} onChange={(e) => set({ endDateKey: e.target.value })} className="w-full rounded-xl px-3 py-2.5 text-sm f-mono outline-none mb-4" style={{ background: tokens.surface2, color: tokens.textPrimary, border: `1px solid ${tokens.border}` }} />

            <div className="flex items-center justify-between mb-3">
              <p className="f-mono text-[10px] uppercase tracking-wider" style={{ color: tokens.textSecondary }}>Si ripete</p>
              <button onClick={() => set({ repeats: !d.repeats })} className="w-10 h-6 rounded-full relative" style={{ background: d.repeats ? tokens.amber : tokens.surface2 }}>
                <span className="absolute top-0.5 w-5 h-5 rounded-full transition-all" style={{ background: tokens.bg, left: d.repeats ? 18 : 2 }} />
              </button>
            </div>
            {d.repeats && (
              <div className="flex gap-2 mb-4">
                <span className="text-xs self-center f-mono" style={{ color: tokens.textSecondary }}>ogni</span>
                <input type="number" min={1} value={d.recurInterval} onChange={(e) => set({ recurInterval: Math.max(1, Number(e.target.value)) })} className="w-16 rounded-xl px-3 py-2.5 text-sm f-mono outline-none text-center" style={{ background: tokens.surface2, color: tokens.textPrimary, border: `1px solid ${tokens.border}` }} />
                <select value={d.recurUnit} onChange={(e) => set({ recurUnit: e.target.value })} className="flex-1 rounded-xl px-3 py-2.5 text-sm f-mono outline-none" style={{ background: tokens.surface2, color: tokens.textPrimary, border: `1px solid ${tokens.border}` }}>
                  {RECUR_UNITS.map((u) => <option key={u.key} value={u.key}>{u.key}</option>)}
                </select>
              </div>
            )}

            <p className="f-mono text-[10px] uppercase tracking-wider mb-2" style={{ color: tokens.textSecondary }}>Promemoria</p>
            <div className="flex gap-2 flex-wrap mb-4">
              {REMINDER_OPTIONS.map((min) => (
                <button key={min} onClick={() => set({ reminderMinutes: min })} className="f-mono text-[10px] rounded-full px-3 py-1.5" style={{ background: d.reminderMinutes === min ? tokens.amber : tokens.surface2, color: d.reminderMinutes === min ? tokens.bg : tokens.textSecondary }}>{reminderLabel(min)}</button>
              ))}
            </div>

            <p className="f-mono text-[10px] uppercase tracking-wider mb-2" style={{ color: tokens.textSecondary }}>Badge</p>
            <div className="flex gap-2 flex-wrap mb-4">
              {badges.map((b) => {
                const active = d.badges.includes(b.name);
                return (
                  <button key={b.id} onClick={() => toggleBadge(b.name)} className="f-mono text-[10px] rounded-full px-3 py-1.5" style={{ background: active ? b.color : tokens.surface2, color: active ? tokens.bg : tokens.textSecondary, border: `1px solid ${active ? b.color : tokens.border}` }}>{b.name}</button>
                );
              })}
            </div>
          </>
        )}

        <p className="f-mono text-[10px] uppercase tracking-wider mb-2" style={{ color: tokens.textSecondary }}>Note</p>
        <textarea value={d.notes} onChange={(e) => set({ notes: e.target.value })} rows={2} placeholder="Aggiungi un dettaglio…" className="w-full rounded-xl px-3 py-2.5 text-sm f-body outline-none mb-5 resize-none" style={{ background: tokens.surface2, color: tokens.textPrimary, border: `1px solid ${tokens.border}` }} />

        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 rounded-xl py-3 flex items-center justify-center gap-2 text-sm font-medium" style={{ background: "transparent", border: `1px solid ${tokens.border}`, color: tokens.textSecondary }}><X size={16} /> Annulla</button>
          <button onClick={() => onSave(draftToItem(d))} disabled={!d.title.trim()} className="flex-1 rounded-xl py-3 flex items-center justify-center gap-2 text-sm font-semibold" style={{ background: tokens.amber, color: tokens.bg, opacity: d.title.trim() ? 1 : 0.5 }}><Check size={16} /> Crea</button>
        </div>
      </div>
    </div>
  );
}
