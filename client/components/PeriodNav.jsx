// client/components/PeriodNav.jsx
import { ChevronLeft, ChevronRight } from "lucide-react";
import { tokens } from "../lib/tokens.js";
import { dateKey, parseKey, diffDays } from "../lib/date-utils.js";

// Barra usata da WeekView e MonthView: frecce avanti/indietro, titolo
// cliccabile che apre il selettore data del telefono, e "Oggi" che
// riporta tutto alla data corrente.
export default function PeriodNav({ label, onPrev, onNext, selectedKey, onPickDate, today, prevLabel, nextLabel }) {
  const isOnToday = diffDays(parseKey(selectedKey), today) === 0;

  return (
    <div className="flex items-center gap-2 mb-3 mt-2">
      <button onClick={onPrev} aria-label={prevLabel} className="rounded-full p-1.5 shrink-0" style={{ background: tokens.surface }}>
        <ChevronLeft size={14} color={tokens.textPrimary} />
      </button>

      {/* Il titolo è un input date invisibile sovrapposto: toccandolo si
          apre il calendario nativo del telefono, senza dover costruire
          un selettore custom. */}
      <div className="relative flex-1 flex justify-center">
        <span className="f-display text-sm text-center" style={{ color: tokens.textPrimary }}>{label}</span>
        <input
          type="date"
          value={selectedKey}
          onChange={(e) => e.target.value && onPickDate(e.target.value)}
          aria-label="Scegli una data"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>

      <button
        onClick={() => onPickDate(dateKey(today))}
        disabled={isOnToday}
        className="rounded-full px-3 py-1.5 text-[10px] f-mono shrink-0"
        style={{
          background: isOnToday ? "transparent" : tokens.surface,
          border: `1px solid ${isOnToday ? "transparent" : tokens.border}`,
          color: isOnToday ? tokens.textSecondary : tokens.amber,
          opacity: isOnToday ? 0.4 : 1,
        }}
      >
        Oggi
      </button>

      <button onClick={onNext} aria-label={nextLabel} className="rounded-full p-1.5 shrink-0" style={{ background: tokens.surface }}>
        <ChevronRight size={14} color={tokens.textPrimary} />
      </button>
    </div>
  );
}
