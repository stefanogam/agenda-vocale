// client/reminders.js
//
// Senza un server che pianifica le notifiche, l'unica cosa possibile è
// controllare periodicamente MENTRE l'app è aperta (o nella scheda in
// background). Non è affidabile quanto una push vera: se il telefono
// resta spento o la scheda è chiusa per giorni, il promemoria non parte.
// È il compromesso accettato per non avere un backend — vedi la
// conversazione: per averle affidabili serve tornare a un server (Supabase
// + pg_cron + Web Push, già progettati, solo non collegati in questa versione).
//
// Limite noto: controlla solo la prima occorrenza di ogni appuntamento
// (item.date), non le occorrenze successive di quelli ricorrenti.

import { listItems } from "./lib/store.js";

const notifiedIds = new Set(); // evita di notificare due volte nella stessa sessione del browser

export async function checkDueReminders() {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const items = await listItems();
  const now = new Date();

  for (const item of items) {
    if (item.type === "radar" || !item.date || !item.reminder_minutes) continue;

    const start = new Date(`${item.date}T${item.time || "00:00"}:00`);
    const fireAt = new Date(start.getTime() - item.reminder_minutes * 60000);
    const key = `${item.id}-${item.date}`;

    if (now >= fireAt && now < start && !notifiedIds.has(key)) {
      notifiedIds.add(key);
      new Notification(item.title, {
        body: start.toLocaleString("it-IT", { weekday: "long", hour: "2-digit", minute: "2-digit" }),
        icon: "/icons/icon.svg",
      });
    }
  }
}

export function startReminderLoop(intervalMs = 60000) {
  checkDueReminders();
  return setInterval(checkDueReminders, intervalMs);
}

export async function requestNotificationPermission() {
  if (!("Notification" in window)) return "unsupported";
  return Notification.requestPermission();
}
