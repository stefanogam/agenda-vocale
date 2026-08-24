// client/components/WeekView.jsx
import { useState, useEffect } from "react";
import { tokens } from "../lib/tokens.js";
import { dateKey, parseKey, weekDatesFor, diffDays, isoWeekNumber, startOfDay, endOfDay, WEEKDAY_LONG, MONTH_LONG } from "../lib/date-utils.js";
import * as store from "../lib/store.js";
import EventRow from "./EventRow.jsx";
import PeriodNav from "./PeriodNav.jsx";
import { useSwipe } from "../lib/use-swipe.js";
import { segmentsForWeek, occursOn, isMultiDay } from "../lib/multi-day.js";

const WEEKDAY_SHORT = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

export default function WeekView({ catColor, catIcon, badgeColor, settings, today, selectedKey, setSelectedKey, anchor, setAnchor, dataVersion, onOpen }) {
  const [occurrences, setOccurrences] = useState([]);
  const days = weekDatesFor(anchor);

  useEffect(() => {
    (async () => {
      const from = startOfDay(days[0]);
      const to = endOfDay(days[6]);
      setOccurrences(await store.getOccurrencesInRange(from, to));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor, dataVersion]);

  const visible = occurrences.filter((o) => o.type !== "radar");
  const dayOccurrences = visible.filter((o) => occursOn(o, selectedKey));
  // il puntino segnala solo gli eventi di un giorno: quelli lunghi
  // hanno già la loro barra sotto la striscia
  const countFor = (key) => visible.filter((o) => !isMultiDay(o) && o.date === key).length;
  const { segments, laneCount } = segmentsForWeek(visible, days);

  // Scegliendo una data (dal calendario nativo o da "Oggi") salta anche
  // alla settimana che la contiene, non solo alla selezione del giorno.
  function pickDate(key) {
    setSelectedKey(key);
    setAnchor(parseKey(key));
  }

  const goPrev = () => { const d = new Date(anchor); d.setDate(d.getDate() - 7); setAnchor(d); };
  const goNext = () => { const d = new Date(anchor); d.setDate(d.getDate() + 7); setAnchor(d); };
  const swipe = useSwipe(goNext, goPrev);

  return (
    <div className="px-6 pb-44 flex-1 overflow-y-auto">
      <PeriodNav
        label={`${MONTH_LONG[days[0].getMonth()]} ${days[0].getFullYear()}`}
        badge={`WK:${String(isoWeekNumber(days[0])).padStart(2, "0")}`}
        onPrev={goPrev}
        onNext={goNext}
        prevLabel="Settimana precedente"
        nextLabel="Settimana successiva"
        selectedKey={selectedKey}
        onPickDate={pickDate}
        today={today}
      />

      <div {...swipe} className="mb-5">
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const key = dateKey(d);
          const isToday = diffDays(d, today) === 0;
          const isSel = key === selectedKey;
          return (
            <button key={key} onClick={() => setSelectedKey(key)} className="rounded-xl py-2 flex flex-col items-center gap-1" style={{ background: isSel ? tokens.amber : tokens.surface, border: isToday && !isSel ? `1px solid ${tokens.amber}` : "1px solid transparent" }}>
              <span className="f-mono text-[9px] uppercase" style={{ color: isSel ? tokens.bg : tokens.textSecondary }}>{WEEKDAY_SHORT[(d.getDay() + 6) % 7]}</span>
              <span className="text-sm font-medium" style={{ color: isSel ? tokens.bg : tokens.textPrimary }}>{d.getDate()}</span>
              <span className="w-1 h-1 rounded-full" style={{ background: countFor(key) ? (isSel ? tokens.bg : tokens.amber) : "transparent" }} />
            </button>
          );
        })}
      </div>

      {/* eventi su più giorni: una barra continua sotto la striscia */}
      {laneCount > 0 && (
        <div className="relative mt-1.5" style={{ height: laneCount * 16 }}>
          {segments.map((seg) => (
            <div
              key={`${seg.occ.id}-${seg.occ.occurrence_at}`}
              onClick={() => onOpen(seg.occ)}
              role="button"
              tabIndex={0}
              className="flex items-center px-2 cursor-pointer overflow-hidden"
              style={{
                position: "absolute",
                top: seg.lane * 16,
                left: `calc(${(seg.startCol / 7) * 100}% + 2px)`,
                width: `calc(${(seg.span / 7) * 100}% - 4px)`,
                height: 14,
                background: `${catColor(seg.occ.category)}33`,
                borderLeft: seg.continuesLeft ? "none" : `2px solid ${catColor(seg.occ.category)}`,
                borderTopLeftRadius: seg.continuesLeft ? 0 : 4,
                borderBottomLeftRadius: seg.continuesLeft ? 0 : 4,
                borderTopRightRadius: seg.continuesRight ? 0 : 4,
                borderBottomRightRadius: seg.continuesRight ? 0 : 4,
              }}
            >
              <span className="text-[9px] truncate" style={{ color: tokens.textPrimary }}>
                {seg.continuesLeft ? "‹ " : ""}{seg.occ.title}
              </span>
            </div>
          ))}
        </div>
      )}
      </div>

      <p className="f-mono text-[11px] uppercase tracking-wider mb-2.5" style={{ color: tokens.textSecondary }}>
        {WEEKDAY_LONG[parseKey(selectedKey).getDay()]} {parseKey(selectedKey).getDate()} {MONTH_LONG[parseKey(selectedKey).getMonth()]}
      </p>
      <div className="flex flex-col gap-2">
        {dayOccurrences.length ? dayOccurrences.map((occ) => (
          <EventRow key={`${occ.id}-${occ.occurrence_at}`} occ={occ} Icon={catIcon(occ.category)} color={catColor(occ.category)} badgeColor={badgeColor} timeFormat={settings.timeFormat} today={today} onOpen={onOpen} />
        )) : <p className="text-xs py-6 text-center" style={{ color: tokens.textSecondary }}>Nessun impegno in programma</p>}
      </div>
    </div>
  );
}
