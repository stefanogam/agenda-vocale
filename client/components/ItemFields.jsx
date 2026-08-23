// client/components/ItemFields.jsx
//
// Unico blocco di campi, usato da CreateSheet, PreviewSheet e DetailSheet.
// Sta tutto qui apposta: se i campi fossero duplicati in tre schede,
// prima o poi una resterebbe indietro (è esattamente quello che era
// successo alla scheda di modifica, a cui mancavano note, ricorrenza,
// promemoria e durata).

import { Star } from "lucide-react";
import { tokens, REMINDER_OPTIONS, reminderLabel } from "../lib/tokens.js";
import { ICONS } from "../lib/icons.js";
import { RECUR_UNITS, WEEKDAY_CODES, supportsWeekdays } from "../lib/recurrence.js";

const Label = ({ children }) => (
  <p className="f-mono text-[10px] uppercase tracking-wider mb-2" style={{ color: tokens.textSecondary }}>{children}</p>
);

const inputStyle = { background: tokens.surface2, color: tokens.textPrimary, border: `1px solid ${tokens.border}` };

export default function ItemFields({ draft, setDraft, categories, badges, showTypeSelector = true }) {
  const d = draft;
  const set = (patch) => setDraft({ ...d, ...patch });

  const toggleBadge = (name) =>
    set({ badges: d.badges.includes(name) ? d.badges.filter((b) => b !== name) : [...d.badges, name] });

  const toggleReminder = (min) =>
    set({ reminders: d.reminders.includes(min) ? d.reminders.filter((r) => r !== min) : [...d.reminders, min].sort((a, b) => a - b) });

  const toggleWeekday = (code) => {
    const cur = d.byday || [];
    const next = cur.includes(code) ? cur.filter((c) => c !== code) : [...cur, code];
    // mantiene l'ordine lunedì→domenica, non quello di selezione
    set({ byday: WEEKDAY_CODES.filter((w) => next.includes(w.code)).map((w) => w.code) });
  };

  return (
    <>
      {showTypeSelector && (
        <div className="flex rounded-full p-1 mb-4" style={{ background: tokens.surface2 }}>
          {[{ k: "appuntamento", l: "Appuntamento" }, { k: "scadenza", l: "Scadenza" }, { k: "radar", l: "Radar" }].map(({ k, l }) => (
            <button key={k} onClick={() => set({ type: k })} className="flex-1 rounded-full py-2 text-xs f-mono" style={{ background: d.type === k ? tokens.amber : "transparent", color: d.type === k ? tokens.bg : tokens.textSecondary }}>{l}</button>
          ))}
        </div>
      )}

      <input
        value={d.title}
        onChange={(e) => set({ title: e.target.value })}
        placeholder="Titolo"
        className="w-full bg-transparent outline-none f-display text-xl mb-4 pb-1"
        style={{ color: tokens.textPrimary, borderBottom: `1px solid ${tokens.border}` }}
      />

      <Label>Categoria</Label>
      <div className="flex gap-2 flex-wrap mb-4">
        {categories.map((c) => {
          const CIcon = ICONS[c.icon] || Star;
          const active = d.category === c.name;
          return (
            <button key={c.id ?? c.name} onClick={() => set({ category: c.name })} className="flex items-center gap-1.5 rounded-full pl-2 pr-3 py-1.5" style={{ background: active ? c.color : tokens.surface2 }}>
              <CIcon size={12} color={active ? tokens.bg : tokens.textSecondary} />
              <span className="text-xs f-mono" style={{ color: active ? tokens.bg : tokens.textSecondary }}>{c.name}</span>
            </button>
          );
        })}
        {d.category && !categories.find((c) => c.name === d.category) && (
          <span className="f-mono text-[10px] rounded-full px-3 py-1.5" style={{ background: tokens.surface2, color: tokens.amber, border: `1px dashed ${tokens.amber}` }}>
            &quot;{d.category}&quot; — nuova, verrà creata
          </span>
        )}
      </div>

      {d.type === "radar" ? (
        <>
          <Label>Cadenza di controllo</Label>
          <div className="flex gap-2 mb-4">
            <input type="number" min={1} value={d.cadenceInterval} onChange={(e) => set({ cadenceInterval: Math.max(1, Number(e.target.value)) })} className="w-16 rounded-xl px-3 py-2.5 text-sm f-mono outline-none text-center" style={inputStyle} />
            <select value={d.cadenceUnit} onChange={(e) => set({ cadenceUnit: e.target.value })} className="flex-1 rounded-xl px-3 py-2.5 text-sm f-mono outline-none" style={inputStyle}>
              {RECUR_UNITS.map((u) => <option key={u.key} value={u.key}>{u.key}</option>)}
            </select>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="f-mono text-[10px] uppercase tracking-wider" style={{ color: tokens.textSecondary }}>Tutto il giorno</p>
            <button onClick={() => set({ allDay: !d.allDay })} aria-label="Tutto il giorno" className="w-10 h-6 rounded-full relative" style={{ background: d.allDay ? tokens.amber : tokens.surface2 }}>
              <span className="absolute top-0.5 w-5 h-5 rounded-full transition-all" style={{ background: tokens.bg, left: d.allDay ? 18 : 2 }} />
            </button>
          </div>

          <Label>Data {d.allDay ? "" : "e ora"}</Label>
          <div className="flex gap-2 mb-2">
            <input type="date" value={d.dateKey} onChange={(e) => set({ dateKey: e.target.value })} className="flex-1 rounded-xl px-3 py-2.5 text-sm f-mono outline-none" style={inputStyle} />
            {!d.allDay && <input type="time" value={d.time} onChange={(e) => set({ time: e.target.value })} className="w-28 rounded-xl px-3 py-2.5 text-sm f-mono outline-none" style={inputStyle} />}
          </div>
          <p className="text-xs mb-2" style={{ color: tokens.textSecondary }}>fino al (opzionale, per eventi su più giorni)</p>
          <input type="date" value={d.endDateKey} onChange={(e) => set({ endDateKey: e.target.value })} className="w-full rounded-xl px-3 py-2.5 text-sm f-mono outline-none mb-4" style={inputStyle} />

          <div className="flex items-center justify-between mb-3">
            <p className="f-mono text-[10px] uppercase tracking-wider" style={{ color: tokens.textSecondary }}>Si ripete</p>
            <button onClick={() => set({ repeats: !d.repeats })} aria-label="Si ripete" className="w-10 h-6 rounded-full relative" style={{ background: d.repeats ? tokens.amber : tokens.surface2 }}>
              <span className="absolute top-0.5 w-5 h-5 rounded-full transition-all" style={{ background: tokens.bg, left: d.repeats ? 18 : 2 }} />
            </button>
          </div>
          {d.repeats && (
            <div className="mb-4">
              <div className="flex gap-2 mb-3">
                <span className="text-xs self-center f-mono" style={{ color: tokens.textSecondary }}>ogni</span>
                <input type="number" min={1} value={d.recurInterval} onChange={(e) => set({ recurInterval: Math.max(1, Number(e.target.value)) })} className="w-16 rounded-xl px-3 py-2.5 text-sm f-mono outline-none text-center" style={inputStyle} />
                <select
                  value={d.recurUnit}
                  onChange={(e) => {
                    const unit = e.target.value;
                    // i giorni non hanno senso per minuti/ore/giorni/anni: si azzerano
                    set({ recurUnit: unit, byday: supportsWeekdays(unit) ? d.byday : [] });
                  }}
                  className="flex-1 rounded-xl px-3 py-2.5 text-sm f-mono outline-none"
                  style={inputStyle}
                >
                  {RECUR_UNITS.map((u) => <option key={u.key} value={u.key}>{u.key}</option>)}
                </select>
              </div>

              {supportsWeekdays(d.recurUnit) && (
                <>
                  <p className="f-mono text-[10px] uppercase tracking-wider mb-2" style={{ color: tokens.textSecondary }}>
                    In quali giorni
                  </p>
                  <div className="flex gap-1.5 mb-2">
                    {WEEKDAY_CODES.map((w) => {
                      const active = (d.byday || []).includes(w.code);
                      return (
                        <button
                          key={w.code}
                          onClick={() => toggleWeekday(w.code)}
                          aria-label={w.label}
                          className="flex-1 rounded-lg py-2 text-xs f-mono"
                          style={{ background: active ? tokens.amber : tokens.surface2, color: active ? tokens.bg : tokens.textSecondary }}
                        >
                          {w.short}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs mb-3" style={{ color: tokens.textSecondary }}>
                    {(d.byday || []).length === 0
                      ? "Nessun giorno scelto: si ripete nello stesso giorno della data di partenza."
                      : `Si ripete ${(d.byday || []).length === 1 ? "il" : "nei giorni"} ${WEEKDAY_CODES.filter((w) => d.byday.includes(w.code)).map((w) => w.label).join(", ")}.`}
                  </p>
                </>
              )}

              <p className="f-mono text-[10px] uppercase tracking-wider mb-2" style={{ color: tokens.textSecondary }}>Fino al (opzionale)</p>
              <div className="flex gap-2">
                <input type="date" value={d.recurEndDate || ""} onChange={(e) => set({ recurEndDate: e.target.value })} className="flex-1 rounded-xl px-3 py-2.5 text-sm f-mono outline-none" style={inputStyle} />
                {d.recurEndDate && (
                  <button onClick={() => set({ recurEndDate: "" })} className="rounded-xl px-3 text-xs f-mono" style={{ background: tokens.surface2, color: tokens.textSecondary, border: `1px solid ${tokens.border}` }}>
                    Togli
                  </button>
                )}
              </div>
              <p className="text-xs mt-1" style={{ color: tokens.textSecondary }}>
                {d.recurEndDate ? "Dopo questa data l'evento non si ripete più." : "Senza data di fine si ripete indefinitamente."}
              </p>
            </div>
          )}

          <Label>Promemoria</Label>
          <div className="flex gap-2 flex-wrap mb-1">
            <button
              onClick={() => set({ reminders: [] })}
              className="f-mono text-[10px] rounded-full px-3 py-1.5"
              style={{
                background: d.reminders.length === 0 ? tokens.amber : tokens.surface2,
                color: d.reminders.length === 0 ? tokens.bg : tokens.textSecondary,
              }}
            >
              Nessuno
            </button>
            {REMINDER_OPTIONS.map((min) => {
              const active = d.reminders.includes(min);
              return (
                <button key={min} onClick={() => toggleReminder(min)} className="f-mono text-[10px] rounded-full px-3 py-1.5" style={{ background: active ? tokens.amber : tokens.surface2, color: active ? tokens.bg : tokens.textSecondary }}>
                  {reminderLabel(min)}
                </button>
              );
            })}
          </div>
          <p className="text-xs mb-4" style={{ color: tokens.textSecondary }}>
            {d.reminders.length === 0
              ? "Nessun avviso per questo elemento."
              : d.reminders.length === 1
                ? "Un avviso prima dell'orario."
                : `${d.reminders.length} avvisi: puoi sceglierne più di uno.`}
          </p>

          <Label>Badge</Label>
          <div className="flex gap-2 flex-wrap mb-4">
            {badges.map((b) => {
              const active = d.badges.includes(b.name);
              return (
                <button key={b.id ?? b.name} onClick={() => toggleBadge(b.name)} className="f-mono text-[10px] rounded-full px-3 py-1.5" style={{ background: active ? b.color : tokens.surface2, color: active ? tokens.bg : tokens.textSecondary, border: `1px solid ${active ? b.color : tokens.border}` }}>
                  {b.name}
                </button>
              );
            })}
            {d.badges.filter((b) => !badges.find((x) => x.name === b)).map((b) => (
              <span key={b} className="f-mono text-[10px] rounded-full px-3 py-1.5" style={{ background: tokens.surface2, color: tokens.amber, border: `1px dashed ${tokens.amber}` }}>&quot;{b}&quot; — nuovo</span>
            ))}
          </div>
        </>
      )}

      <Label>Note</Label>
      <textarea value={d.notes} onChange={(e) => set({ notes: e.target.value })} rows={2} placeholder="Aggiungi un dettaglio…" className="w-full rounded-xl px-3 py-2.5 text-sm f-body outline-none mb-5 resize-none" style={inputStyle} />
    </>
  );
}
