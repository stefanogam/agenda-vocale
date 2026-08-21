# Changelog

Ogni modifica al progetto incrementa il numero di versione qui sotto e in
`package.json`. Formato: `MAJOR.MINOR.PATCH`
- **PATCH** (0.0.X): correzioni, piccoli aggiustamenti
- **MINOR** (0.X.0): nuove funzionalità che non rompono quelle esistenti
- **MAJOR** (X.0.0): cambiamenti che rompono la compatibilità con l'uso precedente

## [0.2.0] — 2026-08-21

Miglioramenti alle viste calendario.

- Il pulsante "+" ora crea l'evento nel **giorno selezionato** quando sei
  in vista Settimana o Mese (prima partiva sempre da oggi). In Lista e
  Radar resta oggi, dato che lì non c'è un giorno selezionato
- Nuovo pulsante **"Oggi"** per tornare alla data corrente da qualsiasi
  punto del calendario
- **Toccando il nome del mese** si apre il calendario del telefono per
  saltare direttamente a una data specifica
- Corretto un difetto nel cambio mese: partendo da un giorno 29–31,
  passare al mese precedente/successivo poteva far saltare un mese
  (es. dal 31 marzo si finiva in marzo invece che in febbraio)

## [0.1.1] — 2026-08-21

Rimosso Mistral, tornati a solo Anthropic.

- Il microfono usa di nuovo solo la Web Speech API del browser (gratis)
  per trascrivere, e Claude per interpretare — architettura più semplice,
  una sola chiave API da gestire
- Rimossa la registrazione audio con MediaRecorder e la chiamata a Mistral

## [0.1.0] — 2026-08-21

Nuova funzionalità: trascrizione vocale con Mistral.

- Sostituita la sola Web Speech API con un doppio sistema: il
  riconoscimento del browser mostra le parole dal vivo mentre parli
  (solo visivo), ma l'audio viene registrato e trascritto per davvero
  da **Mistral (Voxtral)** — più accurato, ed è il testo che arriva
  a Claude
- Richiede una nuova chiave: `MISTRAL_API_KEY` (vedi README)
- Effetto collaterale positivo: funziona anche su Firefox, che non
  supporta il riconoscimento vocale del browser ma supporta comunque
  la registrazione audio

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
