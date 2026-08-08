// client/__tests__/date-utils.test.js
//
// Esegui con: npx vitest run

import { describe, it, expect } from "vitest";
import {
  dateKey, parseKey, diffDays, countdownLabel, bucketLabel,
  buildListaGroups, weekDatesFor, buildMonthGrid, reminderLabel, formatTime12h,
} from "../lib/date-utils.js";

const TODAY = new Date(2026, 7, 8); // sabato 8 agosto 2026, stessa data fissa del mockup

describe("dateKey / parseKey", () => {
  it("fa il round-trip senza perdere la data", () => {
    const d = new Date(2026, 0, 5); // 5 gennaio, mese a due cifre da testare
    expect(dateKey(d)).toBe("2026-01-05");
    expect(parseKey(dateKey(d)).getTime()).toBe(d.getTime());
  });
});

describe("diffDays", () => {
  it("oggi è 0, domani è 1, ieri è -1", () => {
    expect(diffDays(TODAY, TODAY)).toBe(0);
    expect(diffDays(new Date(2026, 7, 9), TODAY)).toBe(1);
    expect(diffDays(new Date(2026, 7, 7), TODAY)).toBe(-1);
  });

  it("ignora l'orario, conta solo il giorno di calendario", () => {
    const stessogiorno = new Date(2026, 7, 8, 23, 59);
    expect(diffDays(stessogiorno, TODAY)).toBe(0);
  });
});

describe("countdownLabel", () => {
  it("usa le etichette speciali per oggi e domani", () => {
    expect(countdownLabel({ date: "2026-08-08" }, TODAY)).toBe("oggi");
    expect(countdownLabel({ date: "2026-08-09" }, TODAY)).toBe("domani");
  });

  it("passa ai giorni sotto le due settimane", () => {
    expect(countdownLabel({ date: "2026-08-14" }, TODAY)).toBe("tra 6 giorni");
  });

  it("passa alle settimane da 14 giorni in su", () => {
    expect(countdownLabel({ date: "2026-08-25" }, TODAY)).toBe("tra 2 settimane");
  });
});

describe("buildListaGroups", () => {
  const events = [
    { id: 1, date: "2026-08-08", time: "09:00", title: "Oggi mattina" },
    { id: 2, date: "2026-08-08", time: "18:00", title: "Oggi sera" },
    { id: 3, date: "2026-08-09", time: "10:00", title: "Domani" },
    { id: 4, date: "2026-08-25", time: null, title: "Lontano" },
    { id: 5, date: "2026-08-01", time: null, title: "Nel passato — non deve comparire" },
  ];

  it("esclude gli eventi passati", () => {
    const groups = buildListaGroups(events, TODAY);
    const allTitles = groups.flatMap((g) => g.items.map((i) => i.title));
    expect(allTitles).not.toContain("Nel passato — non deve comparire");
  });

  it("ordina gli eventi dello stesso giorno per orario", () => {
    const groups = buildListaGroups(events, TODAY);
    const oggi = groups.find((g) => g.label.startsWith("Oggi"));
    expect(oggi.items.map((i) => i.title)).toEqual(["Oggi mattina", "Oggi sera"]);
  });

  it("raggruppa correttamente in Oggi / Domani / Più avanti", () => {
    const groups = buildListaGroups(events, TODAY);
    const labels = groups.map((g) => g.label);
    expect(labels.some((l) => l.startsWith("Oggi"))).toBe(true);
    expect(labels.some((l) => l.startsWith("Domani"))).toBe(true);
    expect(labels).toContain("Più avanti");
  });
});

describe("weekDatesFor", () => {
  it("restituisce sempre 7 giorni a partire dal lunedì", () => {
    const week = weekDatesFor(TODAY); // 8 agosto 2026 è sabato
    expect(week).toHaveLength(7);
    expect(week[0].getDay()).toBe(1); // lunedì
    expect(week[6].getDay()).toBe(0); // domenica
    // il sabato di partenza deve comparire nella settimana calcolata
    expect(week.some((d) => dateKey(d) === dateKey(TODAY))).toBe(true);
  });
});

describe("buildMonthGrid", () => {
  it("produce 6 settimane complete che coprono tutto il mese", () => {
    const weeks = buildMonthGrid(2026, 7); // agosto 2026 (0-indexed)
    expect(weeks).toHaveLength(6);
    weeks.forEach((w) => expect(w).toHaveLength(7));

    const allDays = weeks.flat();
    for (let day = 1; day <= 31; day++) {
      const found = allDays.some((d) => d.getFullYear() === 2026 && d.getMonth() === 7 && d.getDate() === day);
      expect(found).toBe(true);
    }
  });
});

describe("reminderLabel", () => {
  it("usa minuti sotto l'ora, ore sotto il giorno, giorni oltre", () => {
    expect(reminderLabel(15)).toBe("15 min prima");
    expect(reminderLabel(60)).toBe("1 ora prima");
    expect(reminderLabel(1440)).toBe("1 giorno prima");
  });
});

describe("formatTime12h", () => {
  it("converte correttamente mezzanotte, mezzogiorno e orari normali", () => {
    expect(formatTime12h("00:00")).toBe("12:00 AM");
    expect(formatTime12h("12:00")).toBe("12:00 PM");
    expect(formatTime12h("18:30")).toBe("6:30 PM");
    expect(formatTime12h("09:05")).toBe("9:05 AM");
  });
});
