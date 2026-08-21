// client/lib/db.js
//
// Livello più basso: parla solo con IndexedDB, non sa nulla di
// "appuntamenti" o "categorie". store.js costruisce sopra a questo.
//
// Gli "store" (tabelle) rispecchiano deliberatamente i nomi e i campi
// dello schema Postgres progettato (schema.sql) — quando un giorno si
// passerà a Supabase, la forma dei dati sarà già quella giusta.

const DB_NAME = "agenda-local";
const DB_VERSION = 1;

const STORES = {
  items: { keyPath: "id", indexes: [["type", "type"], ["date", "date"]] },
  categories: { keyPath: "id", indexes: [["name", "name", { unique: true }]] },
  badges: { keyPath: "id", indexes: [["name", "name", { unique: true }]] },
  item_overrides: { keyPath: "id", indexes: [["master_item_id", "master_item_id"]] },
  settings: { keyPath: "key" }, // un'unica riga, key = 'user-settings'
};

let dbPromise = null;

export function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      for (const [name, config] of Object.entries(STORES)) {
        if (db.objectStoreNames.contains(name)) continue;
        const store = db.createObjectStore(name, { keyPath: config.keyPath });
        for (const [indexName, keyPath, opts] of config.indexes ?? []) {
          store.createIndex(indexName, keyPath, opts);
        }
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(db, storeName, mode) {
  return db.transaction(storeName, mode).objectStore(storeName);
}

export async function getAll(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = tx(db, storeName, "readonly").getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getByIndex(storeName, indexName, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = tx(db, storeName, "readonly").index(indexName).getAll(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function get(storeName, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = tx(db, storeName, "readonly").get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function put(storeName, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = tx(db, storeName, "readwrite").put(value);
    req.onsuccess = () => resolve(value);
    req.onerror = () => reject(req.error);
  });
}

export async function remove(storeName, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = tx(db, storeName, "readwrite").delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function removeByIndex(storeName, indexName, value) {
  const rows = await getByIndex(storeName, indexName, value);
  await Promise.all(rows.map((r) => remove(storeName, r.id)));
}

export function newId() {
  return crypto.randomUUID();
}

export async function clear(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(storeName, "readwrite").objectStore(storeName).clear();
    t.onsuccess = () => resolve();
    t.onerror = () => reject(t.error);
  });
}
