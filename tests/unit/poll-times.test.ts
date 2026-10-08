import { describe, expect, it } from "vitest";
import { timeSlotsForDay } from "@/lib/poll-times";
import { pollDays } from "@/lib/week";

describe("orari dei sottosondaggi", () => {
  it("i giorni del sondaggio sono lunedì → sabato, senza domenica", () => {
    // 5 ottobre 2026 è un lunedì, 11 è domenica
    expect(pollDays("2026-10-05")).toEqual([
      "2026-10-05",
      "2026-10-06",
      "2026-10-07",
      "2026-10-08",
      "2026-10-09",
      "2026-10-10",
    ]);
  });

  it("nei feriali propone 18:00 → 21:00 ogni 30 minuti", () => {
    const slots = timeSlotsForDay("2026-10-05"); // lunedì
    expect(slots.map((slot) => slot.label)).toEqual([
      "18:00",
      "18:30",
      "19:00",
      "19:30",
      "20:00",
      "20:30",
      "21:00",
    ]);
    expect(slots[0].startsAt).toBe("2026-10-05T18:00");
    expect(slots[6].startsAt).toBe("2026-10-05T21:00");
  });

  it("il sabato propone 15:30 → 18:30 ogni 30 minuti", () => {
    const slots = timeSlotsForDay("2026-10-10"); // sabato
    expect(slots.map((slot) => slot.label)).toEqual([
      "15:30",
      "16:00",
      "16:30",
      "17:00",
      "17:30",
      "18:00",
      "18:30",
    ]);
  });

  it("la domenica non ha orari", () => {
    expect(timeSlotsForDay("2026-10-11")).toEqual([]);
  });
});
