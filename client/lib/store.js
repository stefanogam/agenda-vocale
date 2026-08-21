// client/lib/store.js
//
// QUESTO è il file che il resto dell'app usa — mai db.js direttamente.
// Il giorno dell'upgrade a Supabase, si riscrive SOLO questo file
// (stesse funzioni esportate, stessa forma dei dati restituiti):
// i componenti React che le chiamano non cambiano di una riga.
//
// Uso tipico in un componente:
//   import { listItems, createItem } from '../lib/store';
//   const items = await listItems();

import * as db from "./db.js";
import { RRule } from "rrule";

const DEFAULT_CATEGORIES = [
  { name: "Lavoro", color: "#8AA0E8", icon: "Briefcase" },
  { name: "Salute", color: "#E8735F", icon: "Heart" },
  { name: "Personale", color: "#7FA87F", icon: "Smile" },
  { name: "Scadenza", color: "#F0A868", icon: "AlarmClock" },
  { name: "Finanze", color: "#6FB3AE", icon: "Wallet" },
  { name: "Casa", color: "#B98BD6", icon: "Home" },
];
const DEFAULT_BADGES = [
  { name: "Urgente", color: "#E8735F" },
  { name: "Da confermare", color: "#8AA0E8" },
  { name: "In attesa", color: "#94A0BD" },
];
const DEFAULT_SETTINGS = { key: "user-settings", timezone: "Europe/Rome", timeFormat: "24h", defaultReminderMinutes: 60 };

// ------------------------------------------------------------
// Primo avvio: crea categorie/badge/impostazioni di default,
// stesso contenuto del trigger seed_defaults_for_new_user() in Postgres
// ------------------------------------------------------------
export async function seedDefaultsIfEmpty() {
  const existing = await db.getAll("categories");
  if (existing.length > 0) return; // già inizializzato, non sovrascrivere

  for (const c of DEFAULT_CATEGORIES) await db.put("categories", { id: db.newId(), ...c });
  for (const b of DEFAULT_BADGES) await db.put("badges", { id: db.newId(), ...b });
  await db.put("settings", DEFAULT_SETTINGS);
}

// ------------------------------------------------------------
// ITEMS — appuntamenti, scadenze, radar (stessa tabella unificata
// dello schema Postgres, distinti dal campo `type`)
// ------------------------------------------------------------

export async function listItems() {
  return db.getAll("items");
}

export async function getItem(id) {
  return db.get("items", id);
}

export async function createItem(data) {
  const item = {
    id: db.newId(),
    type: "appuntamento",
    title: "",
    notes: null,
    category: null,
    date: null,        // 'YYYY-MM-DD', null per i radar
    end_date: null,     // per eventi multi-giorno
    time: null,          // 'HH:MM', null = tutto il giorno
    all_day: false,
    rrule: null,          // ricorrenza (RRULE) o cadenza di controllo per i radar
    recurrence_ends_at: null,
    deadline: false,
    badges: [],
    reminders: [],           // minuti prima dell'orario; vuoto = nessun promemoria
    last_checked_at: null, // solo per i radar
    created_via: "manual",  // 'manual' | 'voice'
    raw_transcript: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...data,
  };
  return db.put("items", item);
}

export async function updateItem(id, patch) {
  const existing = await db.get("items", id);
  if (!existing) throw new Error(`Item ${id} non trovato`);
  const updated = { ...existing, ...patch, updated_at: new Date().toISOString() };
  return db.put("items", updated);
}

// Elimina l'intero master (e, a cascata, le sue eccezioni)
export async function deleteItemSeries(id) {
  await db.remove("items", id);
  await db.removeByIndex("item_overrides", "master_item_id", id);
}

// "Solo questo evento": registra un'eccezione, il master resta intatto
export async function deleteItemOccurrence(masterId, occurrenceAtISO) {
  await db.put("item_overrides", {
    id: db.newId(),
    master_item_id: masterId,
    occurrence_at: occurrenceAtISO,
    status: "cancelled",
  });
}

// "Questo e i successivi": chiude la serie originale a questa occorrenza
export async function deleteItemFollowing(masterId, occurrenceAtISO) {
  const cutoff = new Date(new Date(occurrenceAtISO).getTime() - 1000).toISOString();
  await updateItem(masterId, { recurrence_ends_at: cutoff });
  // le eccezioni future non hanno più senso: la serie ricorrente finisce qui
  const overrides = await db.getByIndex("item_overrides", "master_item_id", masterId);
  for (const ov of overrides) {
    if (ov.occurrence_at >= occurrenceAtISO) await db.remove("item_overrides", ov.id);
  }
}

// "Questo e i successivi" IN MODIFICA: split della serie, come per
// l'eliminazione, ma qui nasce una nuova serie con i campi aggiornati
// che prosegue da questa occorrenza in poi.
export async function updateItemFollowing(masterId, occurrenceAtISO, patch) {
  const master = await db.get("items", masterId);
  if (!master) throw new Error(`Item ${masterId} non trovato`);

  const cutoff = new Date(new Date(occurrenceAtISO).getTime() - 1000).toISOString();
  await updateItem(masterId, { recurrence_ends_at: cutoff });

  const { id: _oldId, created_at, updated_at, ...rest } = master;
  const newItem = await createItem({
    ...rest,
    date: occurrenceAtISO.slice(0, 10),
    time: master.time ? occurrenceAtISO.slice(11, 16) : null,
    recurrence_ends_at: master.recurrence_ends_at ?? null, // quello originale prosegue sulla nuova serie
    ...patch,
  });

  // le eccezioni future appartenevano alla vecchia serie: ora sono della nuova
  const overrides = await db.getByIndex("item_overrides", "master_item_id", masterId);
  for (const ov of overrides) {
    if (ov.occurrence_at >= occurrenceAtISO) {
      await db.remove("item_overrides", ov.id);
      await db.put("item_overrides", { ...ov, id: db.newId(), master_item_id: newItem.id });
    }
  }
  return newItem;
}

// Modifica di una singola occorrenza (senza toccare il resto della serie)
export async function updateItemOccurrence(masterId, occurrenceAtISO, fields) {
  const overrides = await db.getByIndex("item_overrides", "master_item_id", masterId);
  const existing = overrides.find((o) => o.occurrence_at === occurrenceAtISO);
  await db.put("item_overrides", {
    id: existing?.id ?? db.newId(),
    master_item_id: masterId,
    occurrence_at: occurrenceAtISO,
    status: "modified",
    ...fields,
  });
}

// ------------------------------------------------------------
// ESPANSIONE OCCORRENZE — stessa logica dell'Edge Function
// expand-occurrences, qui usata per riempire le viste Lista/
// Settimana/Mese con le occorrenze reali di ogni ricorrenza,
// eccezioni comprese.
// ------------------------------------------------------------

function toRRuleDate(d) {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function rawOccurrences(item, from, to) {
  if (item.type === "radar" || !item.date) return [];
  const start = new Date(`${item.date}T${item.time ?? "00:00"}:00`);
  if (!item.rrule) return start >= from && start <= to ? [start] : [];
  const rule = RRule.fromString(`DTSTART:${toRRuleDate(start)}\nRRULE:${item.rrule}`);
  const until = item.recurrence_ends_at ? new Date(item.recurrence_ends_at) : to;
  const effectiveEnd = until < to ? until : to;
  return rule.between(from, effectiveEnd, true);
}

// Restituisce le occorrenze "espanse" nell'intervallo, con le eccezioni
// già applicate (cancellate escluse, modificate con i campi sovrascritti)
export async function getOccurrencesInRange(from, to) {
  const [items, allOverrides] = await Promise.all([listItems(), db.getAll("item_overrides")]);
  const overridesByMaster = new Map();
  for (const ov of allOverrides) {
    if (!overridesByMaster.has(ov.master_item_id)) overridesByMaster.set(ov.master_item_id, []);
    overridesByMaster.get(ov.master_item_id).push(ov);
  }

  const result = [];
  for (const item of items) {
    const occurrences = rawOccurrences(item, from, to);
    const overrides = overridesByMaster.get(item.id) ?? [];

    for (const occAt of occurrences) {
      const occAtISO = occAt.toISOString();
      const override = overrides.find((o) => o.occurrence_at === occAtISO);
      if (override?.status === "cancelled") continue;

      result.push({
        ...item,
        date: occAtISO.slice(0, 10),                 // data DI QUESTA occorrenza, non del primo verificarsi
        time: item.time ? occAtISO.slice(11, 16) : null,
        ...(override?.status === "modified" ? override : {}),
        id: item.id,               // l'id resta quello del master, sempre
        occurrence_at: occAtISO,    // identifica QUALE occorrenza è
        is_override: !!override,
      });
    }
  }
  return result;
}

// ------------------------------------------------------------
// CATEGORIE
// ------------------------------------------------------------
export async function listCategories() { return db.getAll("categories"); }
export async function createCategory(data) { return db.put("categories", { id: db.newId(), ...data }); }
export async function updateCategory(id, patch) {
  const existing = await db.get("categories", id);
  return db.put("categories", { ...existing, ...patch });
}
export async function deleteCategory(id) { return db.remove("categories", id); }

// ------------------------------------------------------------
// BADGE
// ------------------------------------------------------------
export async function listBadges() { return db.getAll("badges"); }
export async function createBadge(data) { return db.put("badges", { id: db.newId(), ...data }); }
export async function deleteBadge(id) { return db.remove("badges", id); }

// ------------------------------------------------------------
// IMPOSTAZIONI (una sola riga)
// ------------------------------------------------------------
export async function getSettings() {
  return (await db.get("settings", "user-settings")) ?? DEFAULT_SETTINGS;
}
export async function updateSettings(patch) {
  const current = await getSettings();
  return db.put("settings", { ...current, ...patch });
}

// ------------------------------------------------------------
// RICERCA — sostituibile 1:1 con la RPC search_items() di Postgres
// mantenendo la stessa firma e la stessa forma del risultato
// ------------------------------------------------------------
export async function searchItems(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const items = await listItems();
  return items
    .filter((i) => i.title.toLowerCase().includes(q) || i.notes?.toLowerCase().includes(q))
    .sort((a, b) => a.title.toLowerCase().indexOf(q) - b.title.toLowerCase().indexOf(q));
}
