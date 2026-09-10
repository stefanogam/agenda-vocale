// client/components/ui.jsx
import { Plus, Trash2 } from "lucide-react";
import { tokens, SWATCHES } from "../lib/tokens.js";
import { ICON_KEYS, ICONS } from "../lib/icons.js";

export function Chip({ icon, label, dot }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs f-mono" style={{ background: tokens.surface2, color: tokens.textPrimary, border: `1px solid ${tokens.border}` }}>
      {dot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: dot }} />}
      {icon}{label}
    </span>
  );
}

export function AddButton({ label, onClick }) {
  return (
    <button onClick={onClick} className="w-full rounded-2xl py-3 flex items-center justify-center gap-2 text-sm f-mono" style={{ border: `1px dashed ${tokens.border}`, color: tokens.textSecondary }}>
      <Plus size={15} /> {label}
    </button>
  );
}

function Interruttore({ etichetta, attivo, coloreAttivo, spiegazione, onToggle }) {
  return (
    <>
      <div className="flex items-center justify-between mb-1">
        <p className="f-mono text-[10px] uppercase tracking-wider" style={{ color: tokens.textSecondary }}>{etichetta}</p>
        <button
          onClick={onToggle}
          aria-label={etichetta}
          className="w-10 h-6 rounded-full relative shrink-0"
          style={{ background: attivo ? coloreAttivo : tokens.surface2 }}
        >
          <span className="absolute top-0.5 w-5 h-5 rounded-full transition-all" style={{ background: tokens.bg, left: attivo ? 18 : 2 }} />
        </button>
      </div>
      <p className="text-xs mb-4" style={{ color: tokens.textSecondary }}>{spiegazione}</p>
    </>
  );
}

export function FormCard({ value, onChange, onSubmit, onCancel, onDelete, showIcons, showCategoryOptions, placeholder, cta }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: tokens.surface, border: `1px solid ${tokens.border}` }}>
      <input autoFocus value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} placeholder={placeholder}
        className="w-full bg-transparent outline-none text-sm mb-3 pb-2 f-body" style={{ color: tokens.textPrimary, borderBottom: `1px solid ${tokens.border}` }} />

      <p className="f-mono text-[10px] uppercase tracking-wider mb-2" style={{ color: tokens.textSecondary }}>Colore</p>
      <div className="flex gap-2 mb-3 flex-wrap">
        {SWATCHES.map((s) => (
          <button key={s} onClick={() => onChange({ ...value, color: s })} className="w-7 h-7 rounded-full"
            style={{ background: s, boxShadow: value.color === s ? `0 0 0 2px ${tokens.surface}, 0 0 0 4px ${s}` : "none" }} />
        ))}
      </div>

      {showIcons && (
        <>
          <p className="f-mono text-[10px] uppercase tracking-wider mb-2" style={{ color: tokens.textSecondary }}>Icona</p>
          <div className="flex gap-2 mb-4 flex-wrap">
            {ICON_KEYS.map((k) => {
              const Ic = ICONS[k];
              const active = value.icon === k;
              return (
                <button key={k} onClick={() => onChange({ ...value, icon: k })} className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: active ? value.color : tokens.surface2 }}>
                  <Ic size={15} color={active ? tokens.bg : tokens.textSecondary} />
                </button>
              );
            })}
          </div>
        </>
      )}

      {showCategoryOptions && (
        <>
          <Interruttore
            etichetta="Barra nel calendario"
            attivo={!!value.bar_display}
            coloreAttivo={value.color}
            onToggle={() => onChange({ ...value, bar_display: !value.bar_display })}
            spiegazione={value.bar_display
              ? "Anche gli appuntamenti di un solo giorno saranno mostrati con una barra colorata, come quelli di più giorni."
              : "Gli appuntamenti di un solo giorno sono mostrati con un puntino."}
          />
          <Interruttore
            etichetta="Nascondi nella lista"
            attivo={!!value.hide_in_list}
            coloreAttivo={value.color}
            onToggle={() => onChange({ ...value, hide_in_list: !value.hide_in_list })}
            spiegazione={value.hide_in_list
              ? "Gli elementi di questa categoria non compaiono nella vista Lista. Restano visibili in Mese, Settimana e nella ricerca."
              : "Gli elementi di questa categoria compaiono nella vista Lista."}
          />
        </>
      )}

      <div className="flex gap-2 mt-1">
        {onDelete && (
          <button onClick={onDelete} aria-label="Elimina" className="rounded-xl py-2.5 px-3" style={{ border: `1px solid ${tokens.coral}` }}>
            <Trash2 size={14} color={tokens.coral} />
          </button>
        )}
        <button onClick={onCancel} className="flex-1 rounded-xl py-2.5 text-xs f-mono" style={{ border: `1px solid ${tokens.border}`, color: tokens.textSecondary }}>Annulla</button>
        <button onClick={onSubmit} className="flex-1 rounded-xl py-2.5 text-xs f-mono font-semibold" style={{ background: value.color, color: tokens.bg }}>{cta}</button>
      </div>
    </div>
  );
}
