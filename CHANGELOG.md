# Changelog

Ogni modifica al progetto incrementa il numero di versione qui sotto e in
`package.json`. Formato: `MAJOR.MINOR.PATCH`
- **PATCH** (0.0.X): correzioni, piccoli aggiustamenti
- **MINOR** (0.X.0): nuove funzionalità che non rompono quelle esistenti
- **MAJOR** (X.0.0): cambiamenti che rompono la compatibilità con l'uso precedente

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
