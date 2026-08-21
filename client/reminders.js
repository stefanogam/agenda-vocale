// client/reminders.js
//
// Senza un server che pianifica le notifiche, l'unica cosa possibile è
// controllare periodicamente MENTRE l'app è aperta (o nella scheda in
// background). Non è affidabile quanto una push vera: se il telefono
// resta spento o la scheda è chiusa per giorni, il promemoria non parte.
// È il compromesso accettato per non avere un backend.
//
// Limite noto: controlla solo la prima occorrenza di ogni appuntamento
// (item.date), non le occorrenze successive di quelli ricorrenti.

import { listItems } from "./lib/store.js";
import { readReminders } from "./lib/item-draft.js";

const notified = new Set(); // evita doppioni nella stessa sessione del browser

export async function checkDueReminders() {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const items = await listItems();
  const now = new Date();

  for (const item of items) {
    if (item.type === "radar" || !item.date) continue;

    const offsets = readReminders(item);
    if (offsets.length === 0) continue; // nessun promemoria richiesto

    const start = new Date(`${item.date}T${item.time || "00:00"}:00`);

    for (const offset of offsets) {
      const fireAt = new Date(start.getTime() - offset * 60000);
      const key = `${item.id}-${item.date}-${offset}`;
      if (now >= fireAt && now < start && !notified.has(key)) {
        notified.add(key);
        new Notification(item.title, {
          body: `${describeOffset(offset)} — ${start.toLocaleString("it-IT", { weekday: "long", hour: "2-digit", minute: "2-digit" })}`,
          icon: "/icons/icon.svg",
          tag: key,
        });
      }
    }
  }
}

function describeOffset(min) {
  if (min < 60) return `Tra ${min} minuti`;
  if (min < 1440) return `Tra ${min / 60} ${min === 60 ? "ora" : "ore"}`;
  return `Tra ${min / 1440} ${min === 1440 ? "giorno" : "giorni"}`;
}

export function startReminderLoop(intervalMs = 60000) {
  checkDueReminders();
  return setInterval(checkDueReminders, intervalMs);
}

export async function requestNotificationPermission() {
  if (!("Notification" in window)) return "unsupported";
  return Notification.requestPermission();
}
