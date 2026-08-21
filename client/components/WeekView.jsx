// client/components/WeekView.jsx
import { useState, useEffect } from "react";
import { tokens } from "../lib/tokens.js";
import { dateKey, parseKey, weekDatesFor, diffDays, WEEKDAY_LONG, MONTH_LONG } from "../lib/date-utils.js";
import * as store from "../lib/store.js";
import EventRow from "./EventRow.jsx";
import PeriodNav from "./PeriodNav.jsx";

const WEEKDAY_SHORT = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

export default function WeekView({ catColor, catIcon, badgeColor, settings, today, selectedKey, setSelectedKey, anchor, setAnchor, onOpen }) {
  const [occurrences, setOccurrences] = useState([]);
  const days = weekDatesFor(anchor);

  useEffect(() => {
    (async () => {
      const from = days[0];
      const to = new Date(days[6].getTime() + 86400000);
      setOccurrences(await store.getOccurrencesInRange(from, to));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor]);

  const dayOccurrences = occurrences.filter((o) => o.type !== "radar" && o.date === selectedKey);
  const countFor = (key) => occurrences.filter((o) => o.type !== "radar" && o.date === key).length;

  // Scegliendo una data (dal calendario nativo o da "Oggi") salta anche
  // alla settimana che la contiene, non solo alla selezione del giorno.
  function pickDate(key) {
    setSelectedKey(key);
    setAnchor(parseKey(key));
  }

  return (
    <div className="px-6 pb-44 flex-1 overflow-y-auto">
      <PeriodNav
        label={`${MONTH_LONG[days[0].getMonth()]} ${days[0].getFullYear()}`}
        onPrev={() => { const d = new Date(anchor); d.setDate(d.getDate() - 7); setAnchor(d); }}
        onNext={() => { const d = new Date(anchor); d.setDate(d.getDate() + 7); setAnchor(d); }}
        prevLabel="Settimana precedente"
        nextLabel="Settimana successiva"
        selectedKey={selectedKey}
        onPickDate={pickDate}
        today={today}
      />

      <div className="grid grid-cols-7 gap-1.5 mb-5">
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
