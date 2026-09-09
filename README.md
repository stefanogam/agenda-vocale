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

L'unica eccezione è l'interpretazione della voce: capire un comando
dettato richiede un modello AI (Gemini Flash), e la chiave per usarlo non
può stare nel codice del browser. Per questo un'unica funzione serverless
([`api/voice-extract.js`](./api/voice-extract.js)) fa da tramite sicuro —
il resto dell'app non tocca mai un server.

```
├── index.html              punto di ingresso
├── api/
│   └── voice-extract.js    unica funzione serverless (Gemini Flash)
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

Due passaggi:

- **Trascrizione**: la Web Speech API del browser converte la voce in
  testo. Gratis, ma disponibile solo su Chrome/Edge/Safari recenti (non
  su Firefox). Se manca, il pulsante lo segnala e resta la creazione manuale.
- **Interpretazione**: [`api/voice-extract.js`](./api/voice-extract.js)
  manda il testo a **Gemini Flash**, che ne ricava data, ora, ricorrenza,
  tipo, categoria e badge. La chiave API non può stare nel browser, quindi
  passa da questa funzione serverless.

Serve una connessione: **la dettatura non funziona offline**. Il resto
dell'app sì.

### Configurare la chiave

1. Vai su [aistudio.google.com](https://aistudio.google.com) → *Get API key*
   → crea una chiave (non serve carta di credito per il piano gratuito)
2. In locale: installa la [Vercel CLI](https://vercel.com/docs/cli)
   (`npm i -g vercel`) e lancia `vercel dev` invece di `npm run dev`, con
   un file `.env.local`:
   ```
   GEMINI_API_KEY=...
   ```
3. In produzione (Vercel): Project Settings → Environment Variables →
   aggiungi `GEMINI_API_KEY`, poi fai "Redeploy" perché venga letta

Il modello **non è fissato nel codice**: la funzione chiede a Google
quali sono disponibili per la tua chiave e ne sceglie uno (il Flash più
recente tra quelli stabili). I nomi dei modelli vengono ritirati spesso,
e fissarne uno porterebbe prima o poi a un errore 404.

Se vuoi imporne uno preciso, aggiungi la variabile `GEMINI_MODEL` con il
nome esatto. Le varianti *Flash-Lite* concedono molte più richieste
giornaliere sul piano gratuito, a fronte di una qualità un po' inferiore.

### Se la dettatura non funziona

Apri **`/api/voice-check`** sull'indirizzo dell'app (es.
`https://tuo-progetto.vercel.app/api/voice-check`): dice se la chiave è
configurata, se Google la accetta e quali modelli sono disponibili.

### Due avvertenze sul piano gratuito

- Sul piano gratuito Google può usare i contenuti inviati per migliorare i
  propri modelli. Attivando la fatturazione questo non avviene, e per un
  uso personale il costo reale è di pochi centesimi al mese.
- Le condizioni aggiuntive dell'API prevedono l'uso dei soli servizi a
  pagamento quando si rendono disponibili client API a utenti in
  EEA/Svizzera/Regno Unito. La documentazione dice però che il piano
  gratuito è disponibile in quelle aree: il punto sembra riguardare la
  distribuzione a terzi più che l'uso personale, ma non è del tutto chiaro.
  Attivare la fatturazione risolve anche questo dubbio.

## Deploy

Collega il repository a [Vercel](https://vercel.com) (New Project →
Import Git Repository). Vercel rileva automaticamente Vite e la cartella
`api/`. L'unica variabile d'ambiente da impostare è `GEMINI_API_KEY`.
Ogni push su `main` fa deploy da solo.

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
