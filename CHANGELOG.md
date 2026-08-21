# Changelog

Ogni modifica al progetto incrementa il numero di versione qui sotto e in
`package.json`. Formato: `MAJOR.MINOR.PATCH`
- **PATCH** (0.0.X): correzioni, piccoli aggiustamenti
- **MINOR** (0.X.0): nuove funzionalità che non rompono quelle esistenti
- **MAJOR** (X.0.0): cambiamenti che rompono la compatibilità con l'uso precedente

## [0.0.3] — 2026-08-08

Correzione.

- Risolto lo scorrimento orizzontale (l'app "si spaginava" scorrendo
  verso destra): la pillola con la trascrizione vocale aveva una
  larghezza minima fissa (250px) che su schermi stretti superava la
  larghezza disponibile. Ora si adatta allo schermo
- Aggiunta una protezione generale (`overflow-x: hidden`) per evitare
  che problemi simili in futuro causino scorrimento orizzontale invece
  di restare semplicemente invisibili

## [0.0.2] — 2026-08-08

Correzioni.

- Corretto l'allineamento dei 4 pulsanti Lista/Settimana/Mese/Radar (erano
  dimensionati in base al testo, ora a larghezza uguale)
- Aumentato lo spazio in fondo alle liste per evitare che i pulsanti
  flottanti (crea/microfono) coprano l'ultimo elemento
- Aggiornata la versione della cache del service worker (v1 → v2): forza
  il telefono a scaricare i file nuovi invece di riusare quelli vecchi
  salvati in cache — se un problema sembra "già risolto ma non lo è",
  è spesso questo il motivo

## [0.0.1] — 2026-08-08

Prima versione funzionante.

- Agenda con viste Lista, Settimana, Mese, Radar
- Creazione manuale e vocale (Web Speech API + funzione serverless con Claude)
- Categorie e badge personalizzabili
- Ricorrenze (RRULE) con modifica/eliminazione per singola occorrenza,
  "questo e i successivi", o intera serie
- Ricerca testuale
- Dati salvati localmente (IndexedDB), nessun backend esterno
- Promemoria "best effort" mentre l'app è aperta
- PWA installabile con service worker
