// client/components/RadarView.jsx
import { Repeat, RotateCw, Plus, Star } from "lucide-react";
import { tokens } from "../lib/tokens.js";
import { describeRRule } from "../lib/recurrence.js";

export default function RadarView({ items, catColor, catIcon, onOpen, onMarkChecked, onNew }) {
  const radarItems = items.filter((i) => i.type === "radar");

  return (
    <div className="px-6 pb-44 flex-1 overflow-y-auto">
      <p className="text-xs mb-4 mt-2" style={{ color: tokens.textSecondary }}>
        Attività da tenere d'occhio, senza data fissa. Segna quando le controlli per tracciare l'ultima volta.
      </p>

      <div className="flex flex-col gap-2.5">
        {radarItems.map((r) => {
          const Icon = catIcon(r.category) || Star;
          return (
            <div key={r.id} role="button" tabIndex={0} onClick={() => onOpen(r)} className="rounded-2xl px-4 py-3.5 cursor-pointer" style={{ background: tokens.surface, border: `1px dashed ${tokens.border}` }}>
              <div className="flex items-start gap-3">
                <div className="rounded-full p-2 shrink-0 mt-0.5" style={{ background: `${catColor(r.category)}22` }}>
                  <Icon size={14} color={catColor(r.category)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: tokens.textPrimary }}>{r.title}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-xs" style={{ color: tokens.textSecondary }}>{r.category}</span>
                    <span className="flex items-center gap-1 f-mono text-[10px] rounded-full px-2 py-0.5" style={{ background: tokens.surface2, color: tokens.textSecondary }}>
                      <Repeat size={9} /> {describeRRule(r.rrule)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: `1px solid ${tokens.border}` }}>
                <span className="f-mono text-[10px]" style={{ color: tokens.textSecondary }}>
                  Ultimo controllo: <span style={{ color: tokens.textPrimary }}>{r.last_checked_at ? new Date(r.last_checked_at).toLocaleDateString("it-IT") : "mai"}</span>
                </span>
                <button onClick={(e) => { e.stopPropagation(); onMarkChecked(r.id); }} className="flex items-center gap-1.5 rounded-full pl-2.5 pr-3 py-1.5" style={{ background: tokens.sage }}>
                  <RotateCw size={12} color={tokens.bg} />
                  <span className="f-mono text-[10px] font-semibold" style={{ color: tokens.bg }}>Segna come controllato</span>
                </button>
              </div>
            </div>
          );
        })}
        {radarItems.length === 0 && (
          <p className="text-xs text-center py-10" style={{ color: tokens.textSecondary }}>Nessuna attività radar ancora.</p>
        )}
      </div>

      <button onClick={onNew} className="w-full rounded-2xl py-3 flex items-center justify-center gap-2 text-sm f-mono mt-4" style={{ border: `1px dashed ${tokens.border}`, color: tokens.textSecondary }}>
        <Plus size={15} /> Nuova attività radar
      </button>
    </div>
  );
}
