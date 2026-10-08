import { describe, expect, it } from "vitest";
import {
  addDays,
  dayLabel,
  endOfWeek,
  longDate,
  relativeWeekLabel,
  romeDateKey,
  startOfWeek,
  weekDays,
  weekRangeLabel,
  weekRangeShort,
  weekdayName,
} from "@/lib/week";

describe("settimane", () => {
  it("il lunedì della settimana, per ogni giorno della settimana", () => {
    // 5 ottobre 2026 è un lunedì
    const monday = "2026-10-05";
    for (let index = 0; index < 7; index += 1) {
      const day = `${monday}T12:00:00Z`;
      expect(startOfWeek(new Date(day)), `giorno +${index}`).toBe(monday);
    }
  });

  it("la domenica chiude la settimana iniziata il lunedì", () => {
    expect(startOfWeek(new Date("2026-10-11T12:00:00Z"))).toBe("2026-10-05");
    expect(startOfWeek(new Date("2026-10-12T12:00:00Z"))).toBe("2026-10-12");
  });

  it("usa il fuso italiano, non UTC", () => {
    // 05/10/2026 00:30 a Roma è ancora il 5 (e quindi lunedì); in UTC sarebbe
    // già il 4 alle 22:30, cioè domenica della settimana prima.
    expect(romeDateKey(new Date("2026-10-04T22:30:00Z"))).toBe("2026-10-05");
    expect(startOfWeek(new Date("2026-10-04T22:30:00Z"))).toBe("2026-10-05");
  });

  it("i sette giorni sono consecutivi e finiscono di domenica", () => {
    const days = weekDays("2026-10-05");
    expect(days).toHaveLength(7);
    expect(days[0]).toBe("2026-10-05");
    expect(days[6]).toBe("2026-10-11");
    expect(endOfWeek("2026-10-05")).toBe("2026-10-11");
    expect(addDays("2026-10-05", 7)).toBe("2026-10-12");
  });

  it("formatta le etichette in italiano", () => {
    expect(weekdayName("2026-10-05")).toBe("Lunedì");
    expect(dayLabel("2026-10-06")).toBe("Mar 6 ott");
    expect(longDate("2026-10-11")).toBe("11 ottobre 2026");
  });

  it("intervallo di settimana dentro lo stesso mese e a cavallo", () => {
    expect(weekRangeLabel("2026-10-05")).toBe("5–11 ottobre 2026");
    expect(weekRangeLabel("2026-09-28")).toBe("28 settembre – 4 ottobre 2026");
    expect(weekRangeShort("2026-10-05")).toBe("5–11 ott");
    expect(weekRangeShort("2026-09-28")).toBe("28 set – 4 ott");
  });

  it("etichetta relativa rispetto a oggi", () => {
    const today = new Date("2026-10-07T12:00:00Z"); // mercoledì
    expect(relativeWeekLabel("2026-10-05", today)).toBe("Questa settimana");
    expect(relativeWeekLabel("2026-10-12", today)).toBe("La prossima settimana");
    expect(relativeWeekLabel("2026-09-28", today)).toBe("Settimana scorsa");
    expect(relativeWeekLabel("2026-11-16", today)).toBe("Settimana 16–22 novembre 2026");
  });

  it("non si sposta con l'ora legale", () => {
    // ultima domenica di ottobre 2026: alle 03:00 si torna alle 02:00
    expect(startOfWeek(new Date("2026-10-25T01:30:00Z"))).toBe("2026-10-19");
    expect(weekDays("2026-10-19")[6]).toBe("2026-10-25");
  });
});
