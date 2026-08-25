// client/components/ManageScreen.jsx
import { useState, useRef } from "react";
import { ArrowLeft, Star, Download, Upload, Bell, BellOff, Send } from "lucide-react";
import { tokens, SWATCHES, REMINDER_OPTIONS, reminderLabel } from "../lib/tokens.js";
import { ICONS, ICON_KEYS } from "../lib/icons.js";
import { FormCard, AddButton } from "./ui.jsx";
import { APP_VERSION } from "../lib/version.js";
import * as store from "../lib/store.js";
import { notificationStatus, requestNotificationPermission, sendTestNotification } from "../reminders.js";

const TIMEZONES = ["Europe/Rome", "Europe/London", "America/New_York", "America/Los_Angeles", "Asia/Tokyo", "UTC"];

export default function ManageScreen({ onBack, categories, badges, settings, onAddCategory, onAddBadge, onUpdateSettings, onDataRestored }) {
  const [tab, setTab] = useState("categorie");
  const [backupMsg, setBackupMsg] = useState(null);
  const [notifState, setNotifState] = useState(() => notificationStatus());
  const [notifMsg, setNotifMsg] = useState(null);

  async function enableNotifications() {
    const res = await requestNotificationPermission();
    setNotifState(notificationStatus());
    if (res === "granted") setNotifMsg({ ok: true, text: "Permesso concesso." });
    else if (res === "denied") setNotifMsg({ ok: false, text: "Permesso negato: va riattivato dalle impostazioni del browser per questo sito." });
    else if (res === "unsupported") setNotifMsg({ ok: false, text: "Questo browser non supporta le notifiche." });
    else setNotifMsg({ ok: false, text: "Permesso non concesso." });
  }

  async function testNotification() {
    const ok = await sendTestNotification();
    setNotifMsg(ok
      ? { ok: true, text: "Notifica inviata: dovresti vederla ora." }
      : { ok: false, text: "Invio fallito. Su iPhone l'app va prima aggiunta alla schermata Home." });
  }
  const fileRef = useRef(null);

  async function saveCategory() {
    if (!catForm?.name?.trim()) return;
    if (catForm.id) await store.updateCategory(catForm.id, { name: catForm.name.trim(), color: catForm.color, icon: catForm.icon });
    else await onAddCategory({ ...catForm, name: catForm.name.trim() });
    setCatForm(null);
    onDataRestored?.();
  }

  async function removeCategory() {
    const n = await store.countItemsWithCategory(catForm.originalName);
    const msg = n > 0
      ? `${n} element${n === 1 ? "o usa" : "i usano"} la categoria "${catForm.originalName}".\nEliminandola resteranno senza categoria. Procedere?`
      : `Eliminare la categoria "${catForm.originalName}"?`;
    if (!window.confirm(msg)) return;
    await store.deleteCategory(catForm.id);
    setCatForm(null);
    onDataRestored?.();
  }

  async function saveBadge() {
    if (!badgeForm?.name?.trim()) return;
    if (badgeForm.id) await store.updateBadge(badgeForm.id, { name: badgeForm.name.trim(), color: badgeForm.color });
    else await onAddBadge({ ...badgeForm, name: badgeForm.name.trim() });
    setBadgeForm(null);
    onDataRestored?.();
  }

  async function removeBadge() {
    const n = await store.countItemsWithBadge(badgeForm.originalName);
    const msg = n > 0
      ? `${n} element${n === 1 ? "o ha" : "i hanno"} il badge "${badgeForm.originalName}".\nEliminandolo verrà tolto da tutti. Procedere?`
      : `Eliminare il badge "${badgeForm.originalName}"?`;
    if (!window.confirm(msg)) return;
    await store.deleteBadge(badgeForm.id);
    setBadgeForm(null);
    onDataRestored?.();
  }

  async function handleExport() {
    try {
      const backup = await store.exportBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `agenda-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setBackupMsg({ ok: true, text: `Salvati ${backup.counts.items} elementi.` });
    } catch (err) {
      setBackupMsg({ ok: false, text: `Esportazione fallita: ${err.message}` });
    }
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permette di riselezionare lo stesso file
    if (!file) return;
    try {
      const backup = JSON.parse(await file.text());
      const n = backup?.counts?.items ?? backup?.data?.items?.length ?? "?";
      const conferma = window.confirm(
        `Stai per ripristinare ${n} elementi da questo backup.\n\n` +
        "TUTTI i dati attualmente sull'app verranno sostituiti. L'operazione non è annullabile.\n\nProcedere?"
      );
      if (!conferma) return;
      const res = await store.importBackup(backup);
      setBackupMsg({ ok: true, text: `Ripristinati ${res.items} elementi, ${res.categories} categorie.` });
      onDataRestored?.();
    } catch (err) {
      setBackupMsg({ ok: false, text: err.message });
    }
  }

  const [catForm, setCatForm] = useState(null);
  const [badgeForm, setBadgeForm] = useState(null);

  return (
    <div className="px-6 pt-9 pb-4 overflow-y-auto" style={{ height: "100%" }}>
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onBack} aria-label="Indietro" className="rounded-full p-2" style={{ background: tokens.surface }}><ArrowLeft size={16} color={tokens.textPrimary} /></button>
        <h1 className="f-display text-xl" style={{ color: tokens.textPrimary }}>Impostazioni</h1>
      </div>

      <div className="flex rounded-full p-1 mb-5" style={{ background: tokens.surface }}>
        {["categorie", "badge", "preferenze"].map((t) => (
          <button key={t} onClick={() => setTab(t)} className="flex-1 rounded-full py-2 text-xs f-mono capitalize" style={{ background: tab === t ? tokens.amber : "transparent", color: tab === t ? tokens.bg : tokens.textSecondary }}>{t}</button>
        ))}
      </div>

      {tab === "categorie" && (
        <>
          <p className="text-xs mb-3" style={{ color: tokens.textSecondary }}>Tocca una categoria per modificarla o eliminarla.</p>
          <div className="flex flex-col gap-2 mb-4">
            {categories.map((c) => { const Icon = ICONS[c.icon] || Star; return (
              <button
                key={c.id}
                onClick={() => setCatForm({ id: c.id, name: c.name, color: c.color, icon: c.icon, originalName: c.name })}
                className="rounded-2xl px-4 py-3 flex items-center gap-3 w-full text-left"
                style={{ background: tokens.surface, border: `1px solid ${catForm?.id === c.id ? tokens.amber : tokens.border}` }}
              >
                <div className="rounded-full p-2" style={{ background: `${c.color}22` }}><Icon size={15} color={c.color} /></div>
                <span className="text-sm" style={{ color: tokens.textPrimary }}>{c.name}</span>
                <span className="ml-auto w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
              </button>
            ); })}
          </div>
          {catForm ? (
            <FormCard
              value={catForm}
              onChange={setCatForm}
              showIcons
              placeholder="Nome categoria (es. Viaggi)"
              cta={catForm.id ? "Salva" : "Crea categoria"}
              onCancel={() => setCatForm(null)}
              onSubmit={saveCategory}
              onDelete={catForm.id ? removeCategory : undefined}
            />
          ) : (
            <AddButton label="Nuova categoria" onClick={() => setCatForm({ name: "", color: SWATCHES[0], icon: ICON_KEYS[0] })} />
          )}
        </>
      )}

      {tab === "badge" && (
        <>
          <p className="text-xs mb-3" style={{ color: tokens.textSecondary }}>Tocca un badge per modificarlo o eliminarlo.</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {badges.map((b) => (
              <button
                key={b.id}
                onClick={() => setBadgeForm({ id: b.id, name: b.name, color: b.color, originalName: b.name })}
                className="f-mono text-xs rounded-full px-3 py-1.5"
                style={{ background: `${b.color}22`, color: b.color, border: `1px solid ${badgeForm?.id === b.id ? b.color : "transparent"}` }}
              >
                {b.name}
              </button>
            ))}
          </div>
          {badgeForm ? (
            <FormCard
              value={badgeForm}
              onChange={setBadgeForm}
              placeholder="Nome badge (es. Rimandato)"
              cta={badgeForm.id ? "Salva" : "Crea badge"}
              onCancel={() => setBadgeForm(null)}
              onSubmit={saveBadge}
              onDelete={badgeForm.id ? removeBadge : undefined}
            />
          ) : (
            <AddButton label="Nuovo badge" onClick={() => setBadgeForm({ name: "", color: SWATCHES[0] })} />
          )}
        </>
      )}

      {tab === "preferenze" && (
        <>
          <p className="f-mono text-[10px] uppercase tracking-wider mb-2" style={{ color: tokens.textSecondary }}>Fuso orario</p>
          <select value={settings.timezone} onChange={(e) => onUpdateSettings({ timezone: e.target.value })} className="w-full rounded-xl px-3 py-2.5 text-sm f-mono outline-none mb-1" style={{ background: tokens.surface, color: tokens.textPrimary, border: `1px solid ${tokens.border}` }}>
            {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
          </select>
          <p className="text-xs mb-5" style={{ color: tokens.textSecondary }}>Rilevato automaticamente al primo avvio, puoi cambiarlo qui.</p>

          <p className="f-mono text-[10px] uppercase tracking-wider mb-2" style={{ color: tokens.textSecondary }}>Formato ora</p>
          <div className="flex gap-2 mb-5">
            {[{ k: "24h", l: "24 ore (18:00)" }, { k: "12h", l: "12 ore (6:00 PM)" }].map((o) => (
              <button key={o.k} onClick={() => onUpdateSettings({ timeFormat: o.k })} className="flex-1 rounded-xl py-2.5 text-xs f-mono" style={{ background: settings.timeFormat === o.k ? tokens.amber : tokens.surface, color: settings.timeFormat === o.k ? tokens.bg : tokens.textSecondary, border: `1px solid ${settings.timeFormat === o.k ? tokens.amber : tokens.border}` }}>{o.l}</button>
            ))}
          </div>

          <p className="f-mono text-[10px] uppercase tracking-wider mb-2" style={{ color: tokens.textSecondary }}>Promemoria predefinito</p>
          <div className="flex gap-2 flex-wrap">
            {REMINDER_OPTIONS.map((min) => (
              <button key={min} onClick={() => onUpdateSettings({ defaultReminderMinutes: min })} className="f-mono text-[10px] rounded-full px-3 py-1.5" style={{ background: settings.defaultReminderMinutes === min ? tokens.amber : tokens.surface, color: settings.defaultReminderMinutes === min ? tokens.bg : tokens.textSecondary, border: `1px solid ${settings.defaultReminderMinutes === min ? tokens.amber : tokens.border}` }}>{reminderLabel(min)}</button>
            ))}
          </div>

          <div className="mt-8 pt-4" style={{ borderTop: `1px solid ${tokens.border}` }}>
            <p className="f-mono text-[10px] uppercase tracking-wider mb-2" style={{ color: tokens.textSecondary }}>Notifiche</p>
            <p className="text-xs mb-3" style={{ color: tokens.textSecondary }}>
              {notifState === "granted"
                ? "Attive. Gli avvisi arrivano mentre l'app è aperta o in secondo piano; se resta chiusa a lungo possono saltare."
                : notifState === "denied"
                  ? "Bloccate per questo sito. Vanno riattivate dalle impostazioni del browser."
                  : notifState === "unsupported"
                    ? "Questo browser non supporta le notifiche."
                    : "Non ancora attive: il permesso va concesso da qui."}
            </p>
            <div className="flex gap-2 mb-2">
              {notifState !== "granted" && (
                <button onClick={enableNotifications} disabled={notifState === "unsupported" || notifState === "denied"} className="flex-1 rounded-xl py-2.5 flex items-center justify-center gap-2 text-xs f-mono" style={{ background: tokens.amber, color: tokens.bg, opacity: (notifState === "unsupported" || notifState === "denied") ? 0.5 : 1 }}>
                  <Bell size={14} /> Attiva notifiche
                </button>
              )}
              {notifState === "granted" && (
                <button onClick={testNotification} className="flex-1 rounded-xl py-2.5 flex items-center justify-center gap-2 text-xs f-mono" style={{ background: tokens.surface, border: `1px solid ${tokens.border}`, color: tokens.textPrimary }}>
                  <Send size={14} /> Prova una notifica
                </button>
              )}
              {notifState === "denied" && (
                <div className="flex-1 rounded-xl py-2.5 flex items-center justify-center gap-2 text-xs f-mono" style={{ background: tokens.surface, border: `1px solid ${tokens.border}`, color: tokens.textSecondary }}>
                  <BellOff size={14} /> Bloccate dal browser
                </div>
              )}
            </div>
            {notifMsg && <p className="text-xs mb-2" style={{ color: notifMsg.ok ? tokens.sage : tokens.coral }}>{notifMsg.text}</p>}
          </div>

          <div className="mt-6 pt-4" style={{ borderTop: `1px solid ${tokens.border}` }}>
            <p className="f-mono text-[10px] uppercase tracking-wider mb-2" style={{ color: tokens.textSecondary }}>Backup</p>
            <p className="text-xs mb-3" style={{ color: tokens.textSecondary }}>
              I dati stanno solo su questo dispositivo. Salva un backup ogni tanto: serve
              anche per spostare tutto su un altro telefono.
            </p>
            <div className="flex gap-2 mb-2">
              <button onClick={handleExport} className="flex-1 rounded-xl py-2.5 flex items-center justify-center gap-2 text-xs f-mono" style={{ background: tokens.surface, border: `1px solid ${tokens.border}`, color: tokens.textPrimary }}>
                <Download size={14} /> Esporta
              </button>
              <button onClick={() => fileRef.current?.click()} className="flex-1 rounded-xl py-2.5 flex items-center justify-center gap-2 text-xs f-mono" style={{ background: tokens.surface, border: `1px solid ${tokens.border}`, color: tokens.textPrimary }}>
                <Upload size={14} /> Importa
              </button>
              <input ref={fileRef} type="file" accept="application/json,.json" onChange={handleImportFile} className="hidden" />
            </div>
            {backupMsg && (
              <p className="text-xs mb-2" style={{ color: backupMsg.ok ? tokens.sage : tokens.coral }}>{backupMsg.text}</p>
            )}
          </div>

          <div className="mt-6 pt-4" style={{ borderTop: `1px solid ${tokens.border}` }}>
            <p className="f-mono text-[10px]" style={{ color: tokens.textSecondary }}>
              Versione installata: <span style={{ color: tokens.amber }}>v{APP_VERSION}</span>
            </p>
          </div>
        </>
      )}
    </div>
  );
}
