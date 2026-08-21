// client/lib/item-draft.js
//
// Traduce tra il "draft" (i campi così come li vede il form) e l'item
// (i campi così come vengono salvati). Sta qui e non dentro i componenti
// perché lo usano tutte e tre le schede — creazione, conferma vocale e
// modifica — e devono comportarsi in modo identico.

import { buildRRule, parseRRule } from "./recurrence.js";
import { dateKey } from "./date-utils.js";

export function emptyDraft(categories, defaultReminderMinutes, today) {
  return {
    type: "appuntamento",
    title: "",
    category: categories[0]?.name || "",
    badges: [],
    notes: "",
    allDay: false,
    dateKey: dateKey(today),
    endDateKey: "",
    time: "09:00",
    repeats: false,
    recurInterval: 1,
    recurUnit: "settimane",
    byday: null,
    cadenceInterval: 2,
    cadenceUnit: "settimane",
    // Array: vuoto = nessun promemoria, più valori = più promemoria
    reminders: defaultReminderMinutes != null ? [defaultReminderMinutes] : [],
  };
}

// Legge i promemoria accettando anche il vecchio formato a valore singolo
// (`reminder_minutes`), usato dagli elementi creati prima della 0.5.0
export function readReminders(item) {
  if (Array.isArray(item?.reminders)) return item.reminders;
  if (typeof item?.reminder_minutes === "number") return [item.reminder_minutes];
  return [];
}

export function itemToDraft(item, categories = []) {
  const rec = parseRRule(item.rrule);
  const isRadar = item.type === "radar";

  return {
    type: item.type || "appuntamento",
    title: item.title || "",
    category: item.category || categories[0]?.name || "",
    badges: item.badges || [],
    notes: item.notes || "",
    allDay: item.all_day ?? !item.time,
    dateKey: item.date || "",
    endDateKey: item.end_date || "",
    time: item.time || "09:00",
    repeats: !isRadar && !!item.rrule,
    recurInterval: !isRadar && rec ? rec.interval : 1,
    recurUnit: !isRadar && rec ? rec.unitKey : "settimane",
    byday: !isRadar && rec ? rec.byday : null,
    cadenceInterval: isRadar && rec ? rec.interval : 2,
    cadenceUnit: isRadar && rec ? rec.unitKey : "settimane",
    reminders: readReminders(item),
  };
}

export function draftToItem(d) {
  if (d.type === "radar") {
    return {
      type: "radar",
      title: d.title.trim(),
      category: d.category,
      notes: d.notes || null,
      rrule: buildRRule(d.cadenceInterval, d.cadenceUnit),
      // un'attività radar non ha data né promemoria a orario fisso
      date: null,
      end_date: null,
      time: null,
      all_day: true,
      deadline: false,
      badges: [],
      reminders: [],
    };
  }

  return {
    type: d.type,
    title: d.title.trim(),
    category: d.category,
    date: d.dateKey,
    end_date: d.endDateKey && d.endDateKey !== d.dateKey ? d.endDateKey : null,
    time: d.allDay ? null : d.time,
    all_day: d.allDay,
    deadline: d.type === "scadenza",
    rrule: d.repeats ? buildRRule(d.recurInterval, d.recurUnit, d.byday) : null,
    badges: d.badges,
    notes: d.notes || null,
    reminders: d.allDay ? d.reminders : d.reminders,
  };
}

// L'estrazione vocale produce una forma diversa (start_at ISO invece di
// data + ora separate): la riporta alla forma dei campi del form.
export function extractionToDraft(extraction, categories, defaultReminderMinutes) {
  const start = extraction.start_at ? new Date(extraction.start_at) : new Date();
  const rec = parseRRule(extraction.rrule);
  const isRadar = extraction.type === "radar";
  const pad = (n) => String(n).padStart(2, "0");

  return {
    type: extraction.type || "appuntamento",
    title: extraction.title || "",
    category: extraction.category || categories[0]?.name || "",
    badges: extraction.badges || [],
    notes: extraction.notes || "",
    allDay: !!extraction.all_day,
    dateKey: dateKey(start),
    endDateKey: "",
    time: extraction.all_day ? "09:00" : `${pad(start.getHours())}:${pad(start.getMinutes())}`,
    repeats: !isRadar && !!extraction.rrule,
    recurInterval: !isRadar && rec ? rec.interval : 1,
    recurUnit: !isRadar && rec ? rec.unitKey : "settimane",
    byday: !isRadar && rec ? rec.byday : null,
    cadenceInterval: isRadar && rec ? rec.interval : 2,
    cadenceUnit: isRadar && rec ? rec.unitKey : "settimane",
    reminders: defaultReminderMinutes != null ? [defaultReminderMinutes] : [],
  };
}
