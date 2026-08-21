// client/__tests__/parse-italian.test.js
//
// Esegui con: npx vitest run
//
// "Adesso" è fissato a venerdì 21 agosto 2026 ore 10:00, così i test
// restano validi nel tempo invece di dipendere dal giorno in cui girano.

import { describe, it, expect } from "vitest";
import { parseItalianCommand } from "../lib/parse-italian.js";

const NOW = new Date(2026, 7, 21, 10, 0);
const CATS = ["Lavoro", "Salute", "Personale", "Scadenza", "Finanze", "Casa"];
const BADGES = ["Urgente", "Da confermare", "In attesa"];

const parse = (t) => parseItalianCommand(t, { now: NOW, categories: CATS, badges: BADGES });
const at = (r) => new Date(r.start_at);

describe("date relative", () => {
  it("riconosce domani", () => {
    expect(at(parse("domani riunione")).getDate()).toBe(22);
  });
  it("riconosce dopodomani", () => {
    expect(at(parse("dopodomani visita")).getDate()).toBe(23);
  });
  it("riconosce 'tra due settimane'", () => {
    const d = at(parse("tra due settimane controllo"));
    expect(d.getDate()).toBe(4);
    expect(d.getMonth()).toBe(8); // settembre
  });
});

describe("giorni della settimana", () => {
  it("martedì punta al martedì successivo", () => {
    const d = at(parse("dentista martedì"));
    expect(d.getDay()).toBe(2);
    expect(d.getDate()).toBe(25);
  });
  it("'lunedì prossimo' salta alla settimana dopo", () => {
    const d = at(parse("riunione lunedì prossimo"));
    expect(d.getDay()).toBe(1);
    expect(d.getDate()).toBe(31);
  });
});

describe("date esplicite", () => {
  it("legge '12 settembre'", () => {
    const d = at(parse("scade il rinnovo il 12 settembre"));
    expect(d.getDate()).toBe(12);
    expect(d.getMonth()).toBe(8);
  });
  it("una data già passata si intende l'anno prossimo", () => {
    expect(at(parse("compleanno di Sara il 3 marzo")).getFullYear()).toBe(2027);
  });
  it("legge il formato 12/09", () => {
    const d = at(parse("appuntamento 12/09"));
    expect(d.getDate()).toBe(12);
    expect(d.getMonth()).toBe(8);
  });
});

describe("orari", () => {
  it("legge 'alle 15:30'", () => {
    const d = at(parse("domani alle 15:30 riunione"));
    expect(d.getHours()).toBe(15);
    expect(d.getMinutes()).toBe(30);
  });
  it("'alle tre' vuol dire le 15, non le 3 di notte", () => {
    expect(at(parse("dentista martedì alle tre")).getHours()).toBe(15);
  });
  it("'alle tre di mattina' resta le 3", () => {
    expect(at(parse("sveglia domani alle tre di mattina")).getHours()).toBe(3);
  });
  it("legge 'alle sette e mezza'", () => {
    const d = at(parse("cena domani alle sette e mezza"));
    expect(d.getHours()).toBe(19);
    expect(d.getMinutes()).toBe(30);
  });
  it("solo l'ora, se già passata, vale per domani", () => {
    // sono le 10:00: "alle 9" non può essere oggi
    expect(at(parse("ricordami di chiamare alle 9")).getDate()).toBe(22);
  });
  it("senza orario l'evento è per tutto il giorno", () => {
    expect(parse("chiamare l'idraulico").all_day).toBe(true);
  });
});

describe("ricorrenze", () => {
  it("'ogni lunedì' diventa una regola settimanale sul lunedì", () => {
    expect(parse("palestra ogni lunedì alle 18").rrule).toBe("FREQ=WEEKLY;INTERVAL=1;BYDAY=MO");
  });
  it("'ogni 3 mesi' diventa una regola mensile con intervallo 3", () => {
    expect(parse("ogni 3 mesi cambio olio").rrule).toBe("FREQ=MONTHLY;INTERVAL=3");
  });
  it("'tutti i giorni' diventa una regola giornaliera", () => {
    expect(parse("tutti i giorni meditazione").rrule).toBe("FREQ=DAILY;INTERVAL=1");
  });
});

describe("tipo di elemento", () => {
  it("'ogni tanto' crea un'attività radar senza data", () => {
    const r = parse("controllare ogni tanto le case in vendita");
    expect(r.type).toBe("radar");
    expect(r.start_at).toBe(null);
    expect(r.rrule).toBe("FREQ=WEEKLY;INTERVAL=2");
  });
  it("'entro il' crea una scadenza", () => {
    expect(parse("pagare la bolletta entro il 30 agosto").type).toBe("scadenza");
  });
  it("per il resto crea un appuntamento", () => {
    expect(parse("cena con Marco stasera").type).toBe("appuntamento");
  });
});

describe("titolo", () => {
  it("toglie le formule di comando", () => {
    expect(parse("ricordami di chiamare il commercialista domani").title).toBe("Chiamare il commercialista");
  });
  it("toglie i connettivi di scadenza ma tiene il verbo", () => {
    expect(parse("pagare la bolletta entro il 30 agosto").title).toBe("Pagare la bolletta");
  });
  it("senza titolo riconoscibile chiede di ripetere", () => {
    const r = parse("domani");
    expect(r.confidence).toBe("low");
    expect(r.clarification_question).toBeTruthy();
  });
});

describe("categoria e badge", () => {
  it("indovina Salute dal contesto", () => {
    expect(parse("dentista martedì").category).toBe("Salute");
  });
  it("sceglie la parola più specifica quando ce ne sono due", () => {
    // "visita" suggerirebbe Salute, "commercialista" è più indicativo
    expect(parse("visita dal commercialista").category).toBe("Finanze");
  });
  it("riconosce il badge Urgente", () => {
    expect(parse("riunione urgente lunedì").badges).toContain("Urgente");
  });
});
