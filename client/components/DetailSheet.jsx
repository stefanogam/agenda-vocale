// client/components/DetailSheet.jsx
import { useState } from "react";
import { Check, X, Clock, CalendarDays, AlarmClock, Repeat, Eye, RotateCw, Star } from "lucide-react";
import { tokens } from "../lib/tokens.js";
import { ICONS } from "../lib/icons.js";
import { parseKey, shortDate } from "../lib/date-utils.js";
import { describeRRule } from "../lib/recurrence.js";
import { Chip } from "./ui.jsx";
import RecurrenceChoice from "./RecurrenceChoice.jsx";
import { useEscapeClose } from "../lib/use-escape-close.js";

function countdownLabel(occ, today) {
  const diff = Math.round((new Date(occ.occurrence_at) - new Date(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000);
  if (diff === 0) return "oggi";
  if (diff === 1) return "domani";
  if (diff < 14) return `tra ${diff} giorni`;
  return `tra ${Math.round(diff / 7)} settimane`;
}

// `occ` = un'occorrenza espansa per gli appuntamenti, oppure l'item grezzo per i radar
export default function DetailSheet({ occ, isRadar, onClose, catColor, catIcon, badgeColor, categories, badges, today, onDelete, onSave, onMarkChecked }) {
  const isRecurring = !isRadar && !!occ.rrule;
  const Icon = catIcon(occ.category);
  const color = catColor(occ.category);
  const [editing, setEditing] = useState(false);
  const [pendingAction, setPendingAction] = useState(null); // 'edit' | 'delete'
  const [editScope, setEditScope] = useState("series");
  const [draft, setDraft] = useState(isRadar
    ? { title: occ.title, category: occ.category, cadence: describeRRule(occ.rrule) }
    : { title: occ.title, category: occ.category, date: occ.date, time: occ.time || "", badges: occ.badges || [] }
  );

  useEscapeClose(onClose);

  function toggleBadge(name) {
    setDraft((d) => ({ ...d, badges: d.badges.includes(name) ? d.badges.filter((b) => b !== name) : [...d.badges, name] }));
  }
  function save() {
    if (isRadar) onSave(occ, { title: draft.title, category: draft.category }, "series");
    else onSave(occ, { title: draft.title, category: draft.category, date: draft.date, time: draft.time || null, badges: draft.badges }, editScope);
  }
  function requestEdit() { isRecurring ? setPendingAction("edit") : setEditing(true); }
  function requestDelete() { isRecurring ? setPendingAction("delete") : onDelete(occ, "series"); }

  if (pendingAction) {
    return (
      <RecurrenceChoice
        action={pendingAction}
        onClose={() => setPendingAction(null)}
        onChoose={(scope) => {
          setPendingAction(null);
          if (pendingAction === "edit") { setEditScope(scope); setEditing(true); }
          else onDelete(occ, scope);
        }}
      />
    );
  }

  return (
    <div className="absolute inset-0 z-30 flex items-end" style={{ background: "rgba(8,11,18,0.55)" }} onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={isRadar ? "Dettaglio attività radar" : "Dettaglio appuntamento"} className="w-full rounded-t-[2rem] px-6 pt-5 pb-8 overflow-y-auto" style={{ background: tokens.surface, borderTop: `1px solid ${tokens.border}`, maxHeight: "85vh" }} onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: tokens.border }} />

        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="rounded-full p-2" style={{ background: `${color}22` }}><Icon size={15} color={color} /></div>
            <span className="text-xs f-mono" style={{ color: tokens.textSecondary }}>{editing ? "Modifica" : occ.category}</span>
          </div>
          <button onClick={onClose} aria-label="Chiudi" className="rounded-full p-2" style={{ background: tokens.surface2 }}><X size={14} color={tokens.textPrimary} /></button>
        </div>

        {!editing ? (
          <>
            <h2 className="f-display text-xl mb-4" style={{ color: tokens.textPrimary }}>{occ.title}</h2>

            <div className="flex flex-wrap gap-2 mb-2">
              {isRadar ? (
                <>
                  <Chip icon={<Repeat size={13} />} label={describeRRule(occ.rrule)} />
                  <Chip icon={<Eye size={13} />} label={occ.last_checked_at ? `Controllato ${new Date(occ.last_checked_at).toLocaleDateString("it-IT")}` : "Mai controllato"} />
                </>
              ) : (
                <>
                  <Chip icon={<CalendarDays size={13} />} label={occ.end_date ? `${shortDate(parseKey(occ.date))} – ${shortDate(parseKey(occ.end_date))}` : shortDate(parseKey(occ.date))} />
                  {occ.time && <Chip icon={<Clock size={13} />} label={occ.time} />}
                  {occ.deadline && <Chip icon={<AlarmClock size={13} />} label={countdownLabel(occ, today)} />}
                  {occ.rrule && <Chip icon={<Repeat size={13} />} label={describeRRule(occ.rrule)} />}
                </>
              )}
            </div>

            {!isRadar && occ.badges?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {occ.badges.map((b) => <span key={b} className="f-mono text-[10px] rounded-full px-2.5 py-1" style={{ background: `${badgeColor(b)}22`, color: badgeColor(b) }}>{b}</span>)}
              </div>
            )}

            {occ.notes && (
              <div className="rounded-xl px-3.5 py-3 mt-3 mb-6" style={{ background: tokens.surface2 }}>
                <p className="f-mono text-[10px] uppercase tracking-wider mb-1" style={{ color: tokens.textSecondary }}>Note</p>
                <p className="text-xs" style={{ color: tokens.textPrimary }}>{occ.notes}</p>
              </div>
            )}

            <div className="flex gap-3 mt-4">
              {isRadar && (
                <button onClick={() => onMarkChecked(occ.id)} className="flex-1 rounded-xl py-3 flex items-center justify-center gap-2 text-sm font-semibold" style={{ background: tokens.sage, color: tokens.bg }}>
                  <RotateCw size={16} /> Segna controllato
                </button>
              )}
              <button onClick={requestEdit} className="flex-1 rounded-xl py-3 flex items-center justify-center gap-2 text-sm font-medium" style={{ background: "transparent", border: `1px solid ${tokens.border}`, color: tokens.textSecondary }}>
                Modifica
              </button>
              <button onClick={requestDelete} aria-label="Elimina" className="rounded-xl py-3 px-4 flex items-center justify-center" style={{ background: "transparent", border: `1px solid ${tokens.coral}` }}>
                <X size={16} color={tokens.coral} />
              </button>
            </div>
          </>
        ) : (
          <>
            <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="w-full bg-transparent outline-none f-display text-xl mb-4 pb-1" style={{ color: tokens.textPrimary, borderBottom: `1px solid ${tokens.border}` }} />

            <p className="f-mono text-[10px] uppercase tracking-wider mb-2" style={{ color: tokens.textSecondary }}>Categoria</p>
            <div className="flex gap-2 flex-wrap mb-4">
              {categories.map((c) => {
                const CIcon = ICONS[c.icon] || Star;
                const active = draft.category === c.name;
                return (
                  <button key={c.id} onClick={() => setDraft({ ...draft, category: c.name })} className="flex items-center gap-1.5 rounded-full pl-2 pr-3 py-1.5" style={{ background: active ? c.color : tokens.surface2 }}>
                    <CIcon size={12} color={active ? tokens.bg : tokens.textSecondary} />
                    <span className="text-xs f-mono" style={{ color: active ? tokens.bg : tokens.textSecondary }}>{c.name}</span>
                  </button>
                );
              })}
            </div>

            {!isRadar && (
              <>
                <p className="f-mono text-[10px] uppercase tracking-wider mb-2" style={{ color: tokens.textSecondary }}>Data e ora</p>
                <div className="flex gap-2 mb-4">
                  <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className="flex-1 rounded-xl px-3 py-2.5 text-sm f-mono outline-none" style={{ background: tokens.surface2, color: tokens.textPrimary, border: `1px solid ${tokens.border}` }} />
                  <input type="time" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} className="w-28 rounded-xl px-3 py-2.5 text-sm f-mono outline-none" style={{ background: tokens.surface2, color: tokens.textPrimary, border: `1px solid ${tokens.border}` }} />
                </div>

                <p className="f-mono text-[10px] uppercase tracking-wider mb-2" style={{ color: tokens.textSecondary }}>Badge</p>
                <div className="flex gap-2 flex-wrap mb-2">
                  {badges.map((b) => {
                    const active = draft.badges.includes(b.name);
                    return (
                      <button key={b.id} onClick={() => toggleBadge(b.name)} className="f-mono text-[10px] rounded-full px-3 py-1.5" style={{ background: active ? b.color : tokens.surface2, color: active ? tokens.bg : tokens.textSecondary, border: `1px solid ${active ? b.color : tokens.border}` }}>
                        {b.name}
                      </button>
                    );
                  })}
                </div>
                {isRecurring && (
                  <p className="text-xs mt-3 mb-2 flex items-center gap-1.5" style={{ color: tokens.amber }}>
                    <Repeat size={12} />
                    {editScope === "occurrence" && "Stai modificando solo questa occorrenza — il resto della serie resta invariato."}
                    {editScope === "following" && "Stai modificando questa e le occorrenze successive — quelle passate restano invariate."}
                    {editScope === "series" && "Stai modificando l'intera serie ricorrente."}
                  </p>
                )}
              </>
            )}

            <div className="flex gap-3 mt-4">
              <button onClick={() => setEditing(false)} className="flex-1 rounded-xl py-3 flex items-center justify-center gap-2 text-sm font-medium" style={{ background: "transparent", border: `1px solid ${tokens.border}`, color: tokens.textSecondary }}>
                Annulla
              </button>
              <button onClick={save} className="flex-1 rounded-xl py-3 flex items-center justify-center gap-2 text-sm font-semibold" style={{ background: tokens.amber, color: tokens.bg }}>
                <Check size={16} /> Salva
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
