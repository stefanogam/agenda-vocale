# Changelog

Ogni modifica al progetto incrementa il numero di versione qui sotto e in
`package.json`. Formato: `MAJOR.MINOR.PATCH`
- **PATCH** (0.0.X): correzioni, piccoli aggiustamenti
- **MINOR** (0.X.0): nuove funzionalità che non rompono quelle esistenti
- **MAJOR** (X.0.0): cambiamenti che rompono la compatibilità con l'uso precedente

## [0.9.1] — 2026-08-22

Correzione.

- Nel calendario settimanale, gli eventi "tutto il giorno" del **lunedì**
  comparivano nella settimana precedente. La finestra di ricerca partiva
  dal lunedì *all'ora corrente* invece che da mezzanotte, così un evento
  che inizia alle 00:00 restava appena fuori dalla settimana giusta e
  ricadeva in quella prima
- Stesso difetto corretto nella vista **Lista**, dove gli eventi "tutto
  il giorno" di oggi non comparivano affatto
- Le finestre ora vanno da mezzanotte a fine giornata, senza creare
  doppioni al passaggio da una settimana o un mese all'altro

## [0.9.0] — 2026-08-22

Eventi su più giorni disegnati come barre.

- Nei calendari **Mese** e **Settimana** gli eventi che durano più giorni
  sono ora una **barra continua** sui giorni interessati, non più un
  puntino sul solo giorno iniziale. Gli eventi di un giorno solo
  continuano ad avere il puntino
- La barra si spezza correttamente a cavallo di due settimane, con gli
  angoli squadrati dal lato in cui prosegue
- Eventi lunghi che si sovrappongono vengono messi su corsie diverse,
  così restano tutti leggibili
- Nella vista Settimana la barra mostra anche il titolo ed è toccabile
  per aprire il dettaglio

**Corretti** due problemi emersi lavorandoci
- Toccando un giorno *intermedio* di un evento lungo, l'evento non
  compariva nell'elenco sotto: risultava solo nel giorno iniziale
- Un evento iniziato prima del periodo visualizzato non veniva caricato
  affatto: una vacanza a cavallo di fine mese spariva dal mese successivo

## [0.9.1] — 2026-08-22

Correzione.

- Nel calendario settimanale, gli eventi "tutto il giorno" del **lunedì**
  comparivano nella settimana precedente. La finestra di ricerca partiva
  dal lunedì *all'ora corrente* invece che da mezzanotte, così un evento
  che inizia alle 00:00 restava appena fuori dalla settimana giusta e
  ricadeva in quella prima
- Stesso difetto corretto nella vista **Lista**, dove gli eventi "tutto
  il giorno" di oggi non comparivano affatto
- Le finestre ora vanno da mezzanotte a fine giornata, senza creare
  doppioni al passaggio da una settimana o un mese all'altro

## [0.9.0] — 2026-08-22

Eventi su più giorni disegnati come barra.

- Nei calendari **Mese** e **Settimana**, un evento che dura più giorni
  consecutivi è ora una **barra continua** lungo i giorni che occupa,
  invece di un puntino sul solo giorno iniziale
- La barra prosegue oltre il bordo della settimana quando l'evento
  attraversa più righe, con gli angoli squadrati dal lato in cui continua
- Se più eventi lunghi si sovrappongono vengono messi su corsie separate,
  i più lunghi in alto
- Gli eventi di un solo giorno restano puntini, come prima
- L'elenco sotto al calendario mostra ora un evento lungo in **tutti** i
  giorni che copre, non solo il primo

**Corretto**
- Un evento ricorrente che dura più giorni (es. 3 giorni ogni mese)
  manteneva la data di fine della prima occorrenza: ora ogni ripetizione
  dura correttamente lo stesso numero di giorni

## [0.8.0] — 2026-08-21

Ricorrenze sui giorni della settimana e data di fine.

- **Scelta dei giorni**: un evento può ripetersi in più giorni specifici
  (es. lunedì *e* martedì), combinabile con l'intervallo — "ogni 2
  settimane il lunedì e il martedì". Disponibile per ricorrenze
  settimanali e mensili, dove ha senso; per minuti/ore/giorni/anni i
  giorni si azzerano da soli
- **Fino al (opzionale)**: la ricorrenza può terminare a una data scelta.
  Senza, prosegue indefinitamente come prima
- La data di fine è interpretata come fine giornata locale, così
  l'ultima occorrenza non viene tagliata fuori
- Le etichette ora descrivono i giorni: "Ogni 2 settimane (lun, mar)"

## [0.7.0] — 2026-08-21

Nuova sezione To-do.

- Quinta scheda **To-do**, dopo Radar: attività da fare con spunta;
  una volta fatte compaiono **barrate**
- **Sotto-attività annidate** senza limite di profondità, numerate
  automaticamente (1, 1.1, 1.1.1, 1.2, 2, 2.1 …). La numerazione si
  ricalcola da sola: spostare o cancellare un'attività non lascia buchi
- Ogni attività con figli mostra l'avanzamento (es. `1/5`)
- **Scadenza opzionale**: impostandola, l'attività compare da sola nei
  calendari (Mese, Settimana, Lista) con categoria "To-do" e lo stesso
  titolo. Le scadenze superate sono evidenziate in rosso
- Aggiunta inline: si scrive il titolo e si preme Invio, restando sullo
  stesso livello per inserirne altre di seguito
- Eliminando un'attività si elimina anche il ramo sottostante, previa
  conferma che dice quante sotto-attività verranno rimosse
- Nuova categoria predefinita **To-do**, creata automaticamente anche per
  chi usa l'app da prima

## [0.6.0] — 2026-08-21

Scorrimento con il dito, backup, e correzione delle date.

**Corretto** — le date slittavano indietro di un giorno
- Un evento inserito per il 10 settembre veniva mostrato come 9 settembre,
  e ad ogni modifica arretrava ancora (8, 7...). La causa: la data veniva
  ricavata convertendo l'orario in formato universale, ma in Italia la
  mezzanotte locale corrisponde alle 22:00 del giorno prima in UTC.
  Ora date e orari si leggono sempre dai campi locali
- **Nota**: gli eventi già inseriti con la data sbagliata restano tali —
  vanno corretti a mano una volta. Da adesso in poi non slittano più

**Nuovo**
- **Scorrimento con il dito** nelle viste Mese e Settimana: da destra a
  sinistra si va avanti, al contrario indietro. I movimenti verticali
  (scorrere la pagina) vengono ignorati
- **Backup**: in Impostazioni → Preferenze si può esportare tutto in un
  file e reimportarlo. Serve sia come rete di sicurezza (i dati stanno
  solo su questo dispositivo) sia per spostarli su un altro telefono.
  Il ripristino sostituisce tutto e chiede conferma prima di procedere

## [0.5.0] — 2026-08-21

Promemoria flessibili e modifica completa.

- **Nessun promemoria**: si può ora creare un elemento senza alcun avviso
  (pulsante "Nessuno")
- **Promemoria multipli**: se ne possono scegliere più di uno per lo stesso
  elemento, ad esempio 1 giorno prima *e* 1 ora prima
- **Aggiornamento immediato delle viste**: creando o modificando un evento,
  il calendario mensile e settimanale si aggiornano subito. Prima bisognava
  cambiare mese e tornare indietro per vedere la modifica, perché quelle
  viste caricavano i dati per conto proprio e non si accorgevano dei
  cambiamenti fatti altrove
- **Modifica completa**: la scheda di modifica mostra ora *tutti* i campi
  (note, ricorrenza, promemoria, durata su più giorni, tipo, tutto il
  giorno), non più solo titolo, categoria, data e badge
- Sotto il cofano: i campi del form sono stati unificati in un unico
  componente condiviso da creazione, conferma vocale e modifica — era la
  causa dei campi mancanti, e ora non può ripetersi
- Gli elementi creati con le versioni precedenti continuano a funzionare:
  il vecchio promemoria singolo viene letto correttamente

## [0.4.0] — 2026-08-21

La voce ora funziona senza API esterne.

- Nuovo **interprete italiano locale** (`client/lib/parse-italian.js`):
  riconosce date ("domani", "martedì", "12 settembre", "tra due
  settimane"), orari ("alle 15:30", "alle tre", "alle sette e mezza"),
  ricorrenze ("ogni lunedì", "ogni 3 mesi", "tutti i giorni"), tipo
  (scadenza / radar) e indovina categoria e badge dal contesto
- **Nessuna chiave API, nessun account, nessun costo**: il testo non esce
  più dal dispositivo e la voce funziona anche offline
- Rimossa la funzione serverless e la dipendenza da servizi esterni
  (spostata in `future-upgrade/` come riferimento)
- Aggiunti 35 test automatici sull'interprete
- "alle tre" viene interpretato come le 15:00, non le 3 di notte, a meno
  che non si dica esplicitamente "di mattina"

## [0.3.0] — 2026-08-21

Numero di versione visibile e riordino delle viste.

- La **versione è ora mostrata nell'app**: accanto alla scritta "Agenda"
  in alto, e in Impostazioni → Preferenze. Serve a verificare a colpo
  d'occhio che il rilascio sia arrivato davvero sul telefono (se il
  numero non cambia dopo un aggiornamento, stai vedendo la cache vecchia)
- Il numero viene letto automaticamente da `package.json` in fase di
  build: non può disallinearsi da quello reale del rilascio
- Viste riordinate: **Mese** (ora predefinita), Lista, Settimana, Radar
- Nella vista settimanale, accanto al mese, il **numero di settimana**
  ISO 8601 (`WK:XX`) — lo stesso standard usato in Italia

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
