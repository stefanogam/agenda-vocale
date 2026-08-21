// client/components/MonthView.jsx
import { useState, useEffect } from "react";
import { tokens } from "../lib/tokens.js";
import { dateKey, parseKey, buildMonthGrid, diffDays, WEEKDAY_LONG, MONTH_LONG } from "../lib/date-utils.js";
import * as store from "../lib/store.js";
import EventRow from "./EventRow.jsx";
import PeriodNav from "./PeriodNav.jsx";

const WEEKDAY_SHORT = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

export default function MonthView({ catColor, catIcon, badgeColor, settings, today, selectedKey, setSelectedKey, anchor, setAnchor, dataVersion, onOpen }) {
  const [occurrences, setOccurrences] = useState([]);
  const weeks = buildMonthGrid(anchor.getFullYear(), anchor.getMonth());

  useEffect(() => {
    (async () => {
      const from = weeks[0][0];
      const to = new Date(weeks[5][6].getTime() + 86400000);
      setOccurrences(await store.getOccurrencesInRange(from, to));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor, dataVersion]);

  const dayOccurrences = occurrences.filter((o) => o.type !== "radar" && o.date === selectedKey);
  const occsFor = (key) => occurrences.filter((o) => o.type !== "radar" && o.date === key);

  // Scegliendo una data (dal calendario nativo o da "Oggi") salta anche
  // al mese che la contiene, non solo alla selezione del giorno.
  function pickDate(key) {
    setSelectedKey(key);
    setAnchor(parseKey(key));
  }

  return (
    <div className="px-6 pb-44 flex-1 overflow-y-auto">
      <PeriodNav
        label={`${MONTH_LONG[anchor.getMonth()]} ${anchor.getFullYear()}`}
        onPrev={() => { const d = new Date(anchor); d.setDate(1); d.setMonth(d.getMonth() - 1); setAnchor(d); }}
        onNext={() => { const d = new Date(anchor); d.setDate(1); d.setMonth(d.getMonth() + 1); setAnchor(d); }}
        prevLabel="Mese precedente"
        nextLabel="Mese successivo"
        selectedKey={selectedKey}
        onPickDate={pickDate}
        today={today}
      />

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAY_SHORT.map((w) => <p key={w} className="f-mono text-[9px] text-center uppercase" style={{ color: tokens.textSecondary }}>{w[0]}</p>)}
      </div>
      <div className="flex flex-col gap-1 mb-4">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((d) => {
              const key = dateKey(d);
              const inMonth = d.getMonth() === anchor.getMonth();
              const dayOccs = occsFor(key).slice(0, 3);
              const isToday = diffDays(d, today) === 0;
              const isSel = key === selectedKey;
              return (
                <button key={key} onClick={() => setSelectedKey(key)} className="rounded-lg py-1.5 flex flex-col items-center gap-1" style={{ background: isSel ? tokens.amber : "transparent", border: isToday && !isSel ? `1px solid ${tokens.amber}` : "1px solid transparent", opacity: inMonth ? 1 : 0.35 }}>
                  <span className="text-xs" style={{ color: isSel ? tokens.bg : tokens.textPrimary }}>{d.getDate()}</span>
                  <div className="flex gap-0.5 h-1">{dayOccs.map((occ) => <span key={`${occ.id}-${occ.occurrence_at}`} className="w-1 h-1 rounded-full" style={{ background: isSel ? tokens.bg : catColor(occ.category) }} />)}</div>
                </button>
              );
            })}
          </div>
        ))}
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
