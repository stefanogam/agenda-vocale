// client/reminders.js
//
// Senza un server che pianifica le notifiche, l'unica cosa possibile è
// controllare periodicamente MENTRE l'app è aperta (o nella scheda in
// background). Non è affidabile quanto una push vera: se il telefono
// resta spento o l'app è chiusa da giorni, il promemoria non parte.
// È il compromesso accettato per non avere un backend.

import { getOccurrencesInRange } from "./lib/store.js";
import { readReminders } from "./lib/item-draft.js";

// Evita doppioni nella stessa sessione del browser
const notified = new Set();

// Un promemoria scaduto da parecchio non va più mostrato: riaprendo
// l'app dopo giorni ci si ritroverebbe sommersi di avvisi vecchi.
const MAX_RITARDO_MIN = 60;

export function notificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationStatus() {
  if (!notificationsSupported()) return "unsupported";
  return Notification.permission; // "default" | "granted" | "denied"
}

// DEVE essere chiamata da un gesto dell'utente (tocco su un pulsante):
// i browser ignorano le richieste di permesso automatiche all'avvio.
export async function requestNotificationPermission() {
  if (!notificationsSupported()) return "unsupported";
  return Notification.requestPermission();
}

// Su Android Chrome `new Notification()` non è utilizzabile e solleva un
// errore: le notifiche vanno mostrate attraverso il service worker.
// Qui si usa quello quando c'è, con ripiego sul metodo diretto altrove.
export async function showNotification(title, options) {
  if (notificationStatus() !== "granted") return false;
  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, options);
      return true;
    }
  } catch {
    // ripiego qui sotto
  }
  try {
    new Notification(title, options);
    return true;
  } catch (err) {
    console.warn("Notifica non mostrabile:", err);
    return false;
  }
}

export async function sendTestNotification() {
  return showNotification("Notifiche attive", {
    body: "Se leggi questo, i promemoria funzioneranno.",
    icon: "/icons/icon.svg",
    tag: "test",
  });
}

function describeOffset(min) {
  if (min === 0) return "Adesso";
  if (min < 60) return `Tra ${min} minuti`;
  if (min < 1440) return `Tra ${min / 60} ${min === 60 ? "ora" : "ore"}`;
  return `Tra ${min / 1440} ${min === 1440 ? "giorno" : "giorni"}`;
}

export async function checkDueReminders() {
  if (notificationStatus() !== "granted") return;

  const now = new Date();
  // Finestra ampia due giorni: così vengono coperte anche le occorrenze
  // successive degli eventi ricorrenti, non solo la prima
  const to = new Date(now.getTime() + 2 * 86400000);

  let occurrences;
  try {
    occurrences = await getOccurrencesInRange(new Date(now.getTime() - 86400000), to);
  } catch (err) {
    console.warn("Controllo promemoria fallito:", err);
    return;
  }

  for (const occ of occurrences) {
    if (occ.type === "radar" || !occ.date) continue;

    const offsets = readReminders(occ);
    if (offsets.length === 0) continue; // nessun promemoria richiesto

    const start = new Date(`${occ.date}T${occ.time || "00:00"}:00`);

    for (const offset of offsets) {
      const fireAt = new Date(start.getTime() - offset * 60000);
      const key = `${occ.id}-${occ.occurrence_at}-${offset}`;
      if (notified.has(key)) continue;

      const inRitardoMin = (now - fireAt) / 60000;
      if (inRitardoMin < 0) continue;                 // non è ancora ora
      if (now >= start) continue;                      // l'evento è già iniziato
      if (inRitardoMin > MAX_RITARDO_MIN) continue;    // troppo vecchio

      notified.add(key);
      await showNotification(occ.title, {
        body: `${describeOffset(offset)} — ${start.toLocaleString("it-IT", { weekday: "long", hour: "2-digit", minute: "2-digit" })}`,
        icon: "/icons/icon.svg",
        tag: key,
      });
    }
  }
}

export function startReminderLoop(intervalMs = 60000) {
  checkDueReminders();
  return setInterval(checkDueReminders, intervalMs);
}
