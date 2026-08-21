# Agenda — Assistente vocale

App di agenda con appuntamenti, scadenze e attività "radar" (senza data
fissa), con creazione anche a voce. Progressive Web App: gira nel browser,
si installa sul telefono, funziona offline.

## Architettura

**Nessun backend/database esterno.** I dati vivono solo nel browser
(IndexedDB) — niente account, niente login, niente sincronizzazione tra
dispositivi. È una scelta deliberata per iniziare con la minima
complessità possibile; un percorso di upgrade verso un vero backend
(Supabase, sincronizzazione multi-dispositivo, notifiche push affidabili)
è già progettato e pronto in [`future-upgrade/`](./future-upgrade),
non collegato a questa versione.

Anche la voce è interamente locale: il browser trascrive, e un
interprete scritto su misura per l'italiano ricava data, ora e ricorrenza
dalla frase. L'app non contatta nessun server, mai.

```
├── index.html              punto di ingresso
├── client/                 tutto il codice React
│   ├── App.jsx              orchestratore principale
│   ├── main.jsx              entry point
│   ├── components/           schermate e componenti UI
│   ├── lib/                  store dati (IndexedDB), date, ricorrenza
│   └── __tests__/             unit test
├── public/                 manifest, service worker, icone
├── e2e/                    test end-to-end (Playwright)
└── future-upgrade/         progettazione completa per l'upgrade a
                             Supabase (schema, edge function, CI/CD) —
                             non collegata, solo di riferimento
```

## Avvio in locale

```bash
npm install
npm run dev
```

Apri `http://localhost:5173`. Funziona tutto, voce compresa: non c'è
niente da configurare.

## La voce

Non serve nessuna chiave API, nessun account e nessun costo: funziona
tutto sul dispositivo.

- **Trascrizione**: la Web Speech API del browser converte la voce in
  testo. Gratis, ma disponibile solo su Chrome/Edge/Safari recenti (non
  su Firefox). Se manca, il pulsante lo segnala e resta la creazione manuale.
- **Interpretazione**: [`client/lib/parse-italian.js`](./client/lib/parse-italian.js)
  riconosce le espressioni italiane comuni — *"domani alle 15"*,
  *"martedì alle tre"*, *"ogni lunedì"*, *"tra due settimane"*,
  *"entro il 30 agosto"*, *"ogni tanto"* — e ne ricava data, ora,
  ricorrenza, tipo, categoria e badge.

Il testo non esce mai dal telefono. Quando l'interprete non capisce, lo
dice invece di indovinare: la scheda di conferma è comunque sempre
modificabile a mano prima di salvare.

## Deploy

Collega il repository a [Vercel](https://vercel.com) (New Project →
Import Git Repository). Vercel rileva automaticamente Vite: nessuna
configurazione, nessuna variabile d'ambiente da impostare. Ogni push su
`main` fa deploy da solo.

## Limiti noti di questa versione

- **Nessuna sincronizzazione tra dispositivi**: i dati restano sul
  browser/dispositivo dove li hai creati
- **Notifiche best-effort**: senza un server che le programma, i
  promemoria vengono controllati solo mentre l'app è aperta (vedi
  [`client/reminders.js`](./client/reminders.js)); se il telefono resta
  spento per giorni o l'app è chiusa, si perdono. Riguardano anche solo
  la prima occorrenza degli appuntamenti ricorrenti, non le successive
- **iOS**: le notifiche richiedono che l'app sia stata "aggiunta alla
  schermata Home" (non basta Safari), da iOS 16.4 in poi; IndexedDB può
  essere svuotato dal sistema se l'app resta inutilizzata a lungo
- **Icone segnaposto**: `public/icons/icon.svg` è un'icona semplice
  generata per far funzionare il manifest — vale la pena sostituirla con
  un'icona vera, e aggiungere un PNG per `apple-touch-icon` (iOS non usa
  sempre l'SVG del manifest)

Tutti questi limiti nascono dalla scelta "senza backend" e sono
risolvibili passando alla versione progettata in `future-upgrade/`.

## Test

```bash
npm test              # unit test (Vitest)
npx playwright test   # end-to-end (richiede npm run build && npm run preview attivo)
```

## Script disponibili

| Comando | Cosa fa |
|---|---|
| `npm run dev` | server di sviluppo |
| `npm run build` | build di produzione in `dist/` |
| `npm run preview` | serve la build di produzione in locale |
| `npm run lint` | controllo statico del codice |
| `npm test` | unit test |
