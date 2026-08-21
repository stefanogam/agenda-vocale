// public/sw.js
//
// Tre responsabilità:
// 1. Precaricare l'app shell così l'app si apre anche offline
// 2. Servire le richieste con strategie diverse per tipo di risorsa
// 3. Mostrare notifiche locali quando richiesto dalla pagina (vedi
//    client/reminders.js) — non c'è un server che le programma, quindi
//    l'affidabilità dipende dall'app aperta o rimasta in background.

const CACHE_VERSION = "v7"; // bump ad ogni release (vedi CHANGELOG.md) per invalidare la cache vecchia
const SHELL_CACHE = `shell-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;

const APP_SHELL = [
  "/",
  "/manifest.json",
  "/offline.html", // pagina minima mostrata se anche la cache fallisce
  "/icons/icon.svg",
];

// ------------------------------------------------------------
// INSTALL — precarica l'app shell
// ------------------------------------------------------------
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

// ------------------------------------------------------------
// ACTIVATE — ripulisce le cache di versioni precedenti
// ------------------------------------------------------------
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => ![SHELL_CACHE, API_CACHE].includes(k)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ------------------------------------------------------------
// FETCH — strategie diverse per tipo di richiesta
// ------------------------------------------------------------
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Asset statici (JS/CSS/icone) -> cache-first, sono immutabili tra deploy
  if (["style", "script", "image", "font"].includes(request.destination)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Navigazione (apertura app) -> network-first con fallback a offline.html
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline.html"))
    );
  }
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const fresh = await fetch(request);
  const cache = await caches.open(SHELL_CACHE);
  cache.put(request, fresh.clone());
  return fresh;
}

// ------------------------------------------------------------
// PUSH — arriva da send-reminders (Web Push)
// ------------------------------------------------------------
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || "Promemoria", {
      body: data.body || "",
      icon: "/icons/icon.svg",
      badge: "/icons/icon.svg",
      data: { item_id: data.item_id },
      tag: data.item_id, // evita doppioni se la stessa notifica arriva due volte
    })
  );
});

// Tocco sulla notifica -> apre l'app sul dettaglio dell'elemento
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const itemId = event.notification.data?.item_id;
  const targetUrl = itemId ? `/?item=${itemId}` : "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(self.location.origin));
      if (existing) { existing.focus(); existing.navigate(targetUrl); return; }
      return self.clients.openWindow(targetUrl);
    })
  );
});
