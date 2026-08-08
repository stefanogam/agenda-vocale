// client/App.jsx
import { useState, useEffect, useCallback } from "react";
import { Bell, Plus, CalendarDays, Settings as SettingsIcon, Star, List, CalendarRange, Calendar as CalendarIcon, Eye, Search as SearchIcon } from "lucide-react";
import { tokens, SWATCHES } from "./lib/tokens.js";
import { ICONS } from "./lib/icons.js";
import * as store from "./lib/store.js";
import { registerServiceWorker } from "./pwa.js";
import { startReminderLoop, requestNotificationPermission } from "./reminders.js";
import CreateSheet, { emptyDraft } from "./components/CreateSheet.jsx";
import DetailSheet from "./components/DetailSheet.jsx";
import EventRow from "./components/EventRow.jsx";
import WeekView from "./components/WeekView.jsx";
import MonthView from "./components/MonthView.jsx";
import RadarView from "./components/RadarView.jsx";
import SearchScreen from "./components/SearchScreen.jsx";
import VoiceCapture from "./components/VoiceCapture.jsx";
import ManageScreen from "./components/ManageScreen.jsx";

const OCCURRENCE_WINDOW_DAYS = 60; // quanto avanti espandere le ricorrenze per le viste

export default function App() {
  const today = new Date();

  const [items, setItems] = useState([]);
  const [occurrences, setOccurrences] = useState([]);
  const [categories, setCategories] = useState([]);
  const [badges, setBadges] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const [screen, setScreen] = useState("agenda");
  const [agendaView, setAgendaView] = useState("lista");
  const [creating, setCreating] = useState(false);
  const [createDraft, setCreateDraft] = useState(null);
  const [detail, setDetail] = useState(null); // { occ, isRadar } | null

  const reload = useCallback(async () => {
    const [allItems, cats, bdgs, cfg] = await Promise.all([
      store.listItems(), store.listCategories(), store.listBadges(), store.getSettings(),
    ]);
    setItems(allItems);
    setCategories(cats);
    setBadges(bdgs);
    setSettings(cfg);
  }, []);

  useEffect(() => {
    (async () => {
      await store.seedDefaultsIfEmpty();
      await reload();
      setLoading(false);
    })();
    registerServiceWorker();
    requestNotificationPermission();
    const intervalId = startReminderLoop();
    return () => clearInterval(intervalId);
  }, [reload]);

  // ricalcola le occorrenze (espansione RRULE) ogni volta che gli item cambiano
  useEffect(() => {
    (async () => {
      const from = today;
      const to = new Date(today.getTime() + OCCURRENCE_WINDOW_DAYS * 86400000);
      setOccurrences(await store.getOccurrencesInRange(from, to));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  function catColor(name) { return categories.find((c) => c.name === name)?.color || tokens.textSecondary; }
  function catIcon(name) { return ICONS[categories.find((c) => c.name === name)?.icon] || Star; }
  function badgeColor(name) { return badges.find((b) => b.name === name)?.color || tokens.textSecondary; }

  async function handleCreate(itemData) {
    await store.createItem(itemData);
    setCreating(false);
    await reload();
  }

  // Come handleCreate, ma prima crea al volo categoria/badge che il
  // comando vocale ha proposto e non esistevano ancora
  async function handleVoiceConfirm(itemData) {
    if (itemData.category && !categories.find((c) => c.name === itemData.category)) {
      await store.createCategory({ name: itemData.category, color: SWATCHES[categories.length % SWATCHES.length], icon: "Star" });
    }
    for (const b of itemData.badges || []) {
      if (!badges.find((x) => x.name === b)) {
        await store.createBadge({ name: b, color: SWATCHES[badges.length % SWATCHES.length] });
      }
    }
    await store.createItem(itemData);
    await reload();
  }

  async function handleSave(occ, patch, scope) {
    if (occ.type === "radar") {
      await store.updateItem(occ.id, patch);
    } else if (scope === "occurrence") {
      await store.updateItemOccurrence(occ.id, occ.occurrence_at, patch);
    } else if (scope === "following") {
      await store.updateItemFollowing(occ.id, occ.occurrence_at, patch);
    } else {
      await store.updateItem(occ.id, patch);
    }
    setDetail(null);
    await reload();
  }

  async function handleDelete(occ, scope) {
    if (occ.type === "radar" || scope === "series") {
      await store.deleteItemSeries(occ.id);
    } else if (scope === "occurrence") {
      await store.deleteItemOccurrence(occ.id, occ.occurrence_at);
    } else if (scope === "following") {
      await store.deleteItemFollowing(occ.id, occ.occurrence_at);
    }
    setDetail(null);
    await reload();
  }

  async function handleMarkChecked(id) {
    await store.updateItem(id, { last_checked_at: new Date().toISOString() });
    await reload();
  }

  if (loading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center" style={{ background: tokens.bg }}>
        <p className="f-mono text-sm" style={{ color: tokens.textSecondary }}>Caricamento…</p>
      </div>
    );
  }

  // Lista: raggruppa le occorrenze future per Oggi/Domani/Questa settimana/Più avanti
  const nonRadar = occurrences
    .filter((o) => o.type !== "radar")
    .sort((a, b) => a.occurrence_at.localeCompare(b.occurrence_at));

  return (
    <div className="w-full min-h-screen flex flex-col" style={{ background: tokens.bg }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        .f-display { font-family: 'Fraunces', serif; } .f-body { font-family: 'Inter', sans-serif; } .f-mono { font-family: 'IBM Plex Mono', monospace; }
      `}</style>

      {screen === "agenda" && (
        <div className="relative flex-1 flex flex-col f-body">
          <div className="px-6 pt-9 pb-4 flex items-start justify-between">
            <div>
              <p className="text-xs tracking-widest uppercase" style={{ color: tokens.textSecondary }}>Agenda</p>
              <h1 className="f-display text-2xl mt-1" style={{ color: tokens.textPrimary }}>
                {today.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}
              </h1>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setScreen("search")} aria-label="Cerca" className="rounded-full p-2.5" style={{ background: tokens.surface }}>
                <SearchIcon size={18} color={tokens.textPrimary} strokeWidth={1.8} />
              </button>
              <button aria-label="Notifiche" className="rounded-full p-2.5" style={{ background: tokens.surface }}>
                <Bell size={18} color={tokens.textPrimary} strokeWidth={1.8} />
              </button>
            </div>
          </div>

          <div className="flex gap-1.5 px-6 mb-3">
            {[{ k: "lista", l: "Lista", i: List }, { k: "settimana", l: "Settimana", i: CalendarRange }, { k: "mese", l: "Mese", i: CalendarIcon }, { k: "radar", l: "Radar", i: Eye }].map(({ k, l, i: Ic }) => (
              <button key={k} onClick={() => setAgendaView(k)} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs f-mono" style={{ background: agendaView === k ? tokens.amber : tokens.surface, color: agendaView === k ? tokens.bg : tokens.textSecondary }}>
                <Ic size={12} /> {l}
              </button>
            ))}
          </div>

          {agendaView === "lista" && (
            <div className="flex-1 overflow-y-auto px-6 pb-32">
              {nonRadar.length === 0 && (
                <p className="text-xs text-center py-16" style={{ color: tokens.textSecondary }}>
                  Nessun appuntamento in programma. Tocca "+" per crearne uno.
                </p>
              )}
              {nonRadar.map((occ) => (
                <div key={`${occ.id}-${occ.occurrence_at}`} className="mb-2">
                  <EventRow
                    occ={occ}
                    Icon={catIcon(occ.category)}
                    color={catColor(occ.category)}
                    badgeColor={badgeColor}
                    timeFormat={settings.timeFormat}
                    today={today}
                    onOpen={(o) => setDetail({ occ: o, isRadar: false })}
                  />
                </div>
              ))}
            </div>
          )}

          {agendaView === "settimana" && (
            <WeekView catColor={catColor} catIcon={catIcon} badgeColor={badgeColor} settings={settings} today={today} onOpen={(o) => setDetail({ occ: o, isRadar: false })} />
          )}

          {agendaView === "mese" && (
            <MonthView catColor={catColor} catIcon={catIcon} badgeColor={badgeColor} settings={settings} today={today} onOpen={(o) => setDetail({ occ: o, isRadar: false })} />
          )}

          {agendaView === "radar" && (
            <RadarView
              items={items}
              catColor={catColor}
              catIcon={catIcon}
              onOpen={(r) => setDetail({ occ: r, isRadar: true })}
              onMarkChecked={handleMarkChecked}
              onNew={() => { setCreateDraft({ ...emptyDraft(categories, settings.defaultReminderMinutes, today), type: "radar" }); setCreating(true); }}
            />
          )}

          <div className="absolute left-0 right-0 flex items-center justify-center gap-3" style={{ bottom: 96 }}>
            <button
              onClick={() => { setCreateDraft(emptyDraft(categories, settings.defaultReminderMinutes, today)); setCreating(true); }}
              aria-label="Crea manualmente"
              className="rounded-full flex items-center justify-center"
              style={{ width: 44, height: 44, background: tokens.surface, border: `1px solid ${tokens.border}` }}
            >
              <Plus size={18} color={tokens.textPrimary} />
            </button>
            <VoiceCapture categories={categories} badges={badges} settings={settings} today={today} onConfirm={handleVoiceConfirm} />
            <div style={{ width: 44 }} />
          </div>

          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-around px-8" style={{ height: 88, background: tokens.surface, borderTop: `1px solid ${tokens.border}` }}>
            <button onClick={() => setScreen("agenda")} className="flex flex-col items-center gap-1">
              <CalendarDays size={20} color={tokens.amber} strokeWidth={1.8} />
              <span className="f-mono text-[10px]" style={{ color: tokens.amber }}>Agenda</span>
            </button>
            <button onClick={() => setScreen("manage")} className="flex flex-col items-center gap-1">
              <SettingsIcon size={20} color={tokens.textSecondary} strokeWidth={1.8} />
              <span className="f-mono text-[10px]" style={{ color: tokens.textSecondary }}>Impostazioni</span>
            </button>
          </div>

          {creating && (
            <CreateSheet
              draft={createDraft}
              setDraft={setCreateDraft}
              categories={categories}
              badges={badges}
              onCancel={() => setCreating(false)}
              onSave={handleCreate}
            />
          )}

          {detail && (
            <DetailSheet
              occ={detail.occ}
              isRadar={detail.isRadar}
              onClose={() => setDetail(null)}
              catColor={catColor}
              catIcon={catIcon}
              badgeColor={badgeColor}
              categories={categories}
              badges={badges}
              today={today}
              onDelete={handleDelete}
              onSave={handleSave}
              onMarkChecked={handleMarkChecked}
            />
          )}
        </div>
      )}

      {screen === "search" && (
        <div className="flex-1 f-body">
          <SearchScreen
            onBack={() => setScreen("agenda")}
            catColor={catColor}
            catIcon={catIcon}
            onOpen={(item) => {
              if (item.type === "radar") {
                setDetail({ occ: item, isRadar: true });
              } else {
                const occurrence_at = new Date(`${item.date}T${item.time || "00:00"}:00`).toISOString();
                setDetail({ occ: { ...item, occurrence_at }, isRadar: false });
              }
              setScreen("agenda");
            }}
          />
        </div>
      )}

      {screen === "manage" && (
        <div className="flex-1">
          <ManageScreen
            onBack={() => setScreen("agenda")}
            categories={categories}
            badges={badges}
            settings={settings}
            onAddCategory={async (c) => { await store.createCategory(c); await reload(); }}
            onAddBadge={async (b) => { await store.createBadge(b); await reload(); }}
            onUpdateSettings={async (patch) => { await store.updateSettings(patch); await reload(); }}
          />
        </div>
      )}
    </div>
  );
}
