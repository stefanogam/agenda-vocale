// client/components/EventRow.jsx
import { Repeat, AlarmClock } from "lucide-react";
import { tokens } from "../lib/tokens.js";
import { parseKey, shortDate, formatTime12h, diffDays } from "../lib/date-utils.js";
import { describeRRule } from "../lib/recurrence.js";

function countdown(occ, today) {
  const diff = diffDays(new Date(occ.occurrence_at), today);
  if (diff === 0) return "oggi";
  if (diff === 1) return "domani";
  if (diff < 14) return `tra ${diff} giorni`;
  return `tra ${Math.round(diff / 7)} settimane`;
}

function timeBox(occ, timeFormat) {
  const occDate = new Date(occ.occurrence_at);
  if (occ.end_date) {
    const s = parseKey(occ.date), e = parseKey(occ.end_date);
    return `${s.getDate()}–${e.getDate()} ${shortDate(s).split(" ")[1]}`;
  }
  if (occ.time) {
    const hhmm = `${String(occDate.getHours()).padStart(2, "0")}:${String(occDate.getMinutes()).padStart(2, "0")}`;
    return timeFormat === "12h" ? formatTime12h(hhmm) : hhmm;
  }
  return shortDate(occDate);
}

// `occ` = un'occorrenza espansa (store.getOccurrencesInRange), non l'item grezzo:
// ha sia i campi dell'item (title, cat...) sia occurrence_at (QUALE occorrenza è)
export default function EventRow({ occ, Icon, color, badgeColor, timeFormat, today, onOpen }) {
  return (
    <button onClick={() => onOpen(occ)} className="rounded-2xl px-4 py-3 flex items-start gap-3 text-left w-full" style={{ background: tokens.surface, border: `1px solid ${tokens.border}` }}>
      <div className="f-mono text-xs rounded-lg px-2 py-1.5 shrink-0" style={{ background: tokens.surface2, color: tokens.textPrimary, minWidth: 52, textAlign: "center" }}>
        {timeBox(occ, timeFormat)}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium truncate"
          style={{
            color: occ.done ? tokens.textSecondary : tokens.textPrimary,
            textDecoration: occ.done ? "line-through" : "none",
          }}
        >
          {occ.title}
        </p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <span className="flex items-center gap-1">
            <Icon size={11} color={color} />
            <span className="text-xs" style={{ color: tokens.textSecondary }}>{occ.category}</span>
          </span>
          {occ.deadline && (
            <span className="flex items-center gap-1 f-mono text-[10px] rounded-full px-2 py-0.5" style={{ background: "rgba(240,168,104,0.15)", color: tokens.amber }}>
              <AlarmClock size={9} /> {countdown(occ, today)}
            </span>
          )}
          {occ.rrule && (
            <span className="flex items-center gap-1 f-mono text-[10px] rounded-full px-2 py-0.5" style={{ background: tokens.surface2, color: tokens.textSecondary }}>
              <Repeat size={9} /> {describeRRule(occ.rrule)}
            </span>
          )}
          {occ.badges?.map((b) => (
            <span key={b} className="f-mono text-[10px] rounded-full px-2 py-0.5" style={{ background: `${badgeColor(b)}22`, color: badgeColor(b) }}>{b}</span>
          ))}
        </div>
      </div>
    </button>
  );
}
