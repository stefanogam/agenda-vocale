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

L'unica eccezione è la voce: capire un comando vocale richiede una
chiamata a un modello AI (Claude), e la chiave per farlo non può stare
nel codice del browser. Per questo un'unica funzione serverless
([`api/voice-extract.js`](./api/voice-extract.js)) fa da tramite sicuro —
il resto dell'app non tocca mai un server.

```
├── index.html              punto di ingresso
├── client/                 tutto il codice React
│   ├── App.jsx              orchestratore principale
│   ├── main.jsx              entry point
│   ├── components/           schermate e componenti UI
│   ├── lib/                  store dati (IndexedDB), date, ricorrenza
│   └── __tests__/             unit test
├── api/
│   └── voice-extract.js     unica funzione serverless (Vercel)
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

Apri `http://localhost:5173`. La voce non funzionerà finché non configuri
anche `/api/voice-extract` (vedi sotto) — il resto dell'app sì.

## Configurare la voce

1. Crea una chiave API su [console.anthropic.com](https://console.anthropic.com)
2. In locale: installa la [Vercel CLI](https://vercel.com/docs/cli)
   (`npm i -g vercel`) e lancia `vercel dev` invece di `npm run dev` — fa
   girare anche `/api/voice-extract` in locale. Serve un file `.env.local`
   con:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```
3. In produzione (Vercel): Project Settings → Environment Variables →
   aggiungi `ANTHROPIC_API_KEY` lì.

Il riconoscimento vocale (speech-to-text) usa la Web Speech API del
browser — gratis, nessuna configurazione, ma disponibile solo su
Chrome/Edge/Safari recenti (non su Firefox). Se il browser non la
supporta, il pulsante del microfono lo segnala e resta comunque
disponibile la creazione manuale.

## Deploy

Collega il repository a [Vercel](https://vercel.com) (New Project →
Import Git Repository). Vercel rileva automaticamente Vite e la cartella
`api/`, senza configurazione aggiuntiva a parte la variabile d'ambiente
`ANTHROPIC_API_KEY`. Ogni push su `main` fa deploy da solo.

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
