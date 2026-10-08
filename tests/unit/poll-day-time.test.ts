import { describe, expect, it } from "vitest";
import { autoCheckedDayId, dayTimeBlocker, dayTimeMaps } from "@/lib/poll-day-time";
import type { PollOptionResult, PollSubPoll } from "@/types/domain";

function subPoll(id: string): PollSubPoll {
  return { id, question: "Orari", allowMultiple: true, closed: false, voterCount: 0, myVotes: [], options: [] };
}

function day(id: string, label: string, subPollId: string | null = "sub"): PollOptionResult {
  return {
    id,
    label,
    startsAt: null,
    sortOrder: 0,
    voters: [],
    subPoll: subPollId ? subPoll(subPollId) : null,
  };
}

const poll = { id: "p1", options: [day("d1", "Lunedì", "s1")] };

describe("dayTimeBlocker", () => {
  it("blocca il giorno quando non c'è nessun orario scelto", () => {
    const error = dayTimeBlocker({
      poll,
      myVotes: {},
      targetPollId: "p1",
      optionId: "d1",
      add: true,
    });

    expect(error).toBe("Scegli almeno un orario per Lunedì.");
  });

  it("lascia passare il giorno se ha già un orario scelto", () => {
    const error = dayTimeBlocker({
      poll,
      myVotes: { s1: ["t1"] },
      targetPollId: "p1",
      optionId: "d1",
      add: true,
    });

    expect(error).toBeNull();
  });

  it("blocca la rimozione dell'ultimo orario se il giorno resta spuntato", () => {
    const error = dayTimeBlocker({
      poll,
      myVotes: { p1: ["d1"], s1: ["t1"] },
      targetPollId: "s1",
      optionId: "t1",
      add: false,
    });

    expect(error).toBe("Lascia almeno un orario, oppure togli prima la spunta al giorno.");
  });

  it("lascia rimuovere un orario se ne restano altri", () => {
    const error = dayTimeBlocker({
      poll,
      myVotes: { p1: ["d1"], s1: ["t1", "t2"] },
      targetPollId: "s1",
      optionId: "t1",
      add: false,
    });

    expect(error).toBeNull();
  });

  it("lascia rimuovere l'ultimo orario se il giorno non è spuntato", () => {
    const error = dayTimeBlocker({
      poll,
      myVotes: { s1: ["t1"] },
      targetPollId: "s1",
      optionId: "t1",
      add: false,
    });

    expect(error).toBeNull();
  });

  it("non impone nulla per opzioni senza orari", () => {
    const without = { id: "p2", options: [day("d2", "Sabato", null)] };
    expect(
      dayTimeBlocker({ poll: without, myVotes: {}, targetPollId: "p2", optionId: "d2", add: true }),
    ).toBeNull();
  });

  it("mappa i legami giorno↔orari", () => {
    const { dayToSub, subToDay } = dayTimeMaps(poll);
    expect(dayToSub.d1).toEqual({ subPollId: "s1", label: "Lunedì" });
    expect(subToDay.s1).toEqual({ dayOptionId: "d1", dayLabel: "Lunedì" });
  });
});

describe("autoCheckedDayId", () => {
  it("spunta il giorno quando si vota un orario, se non era già spuntato", () => {
    expect(
      autoCheckedDayId({ poll, myVotes: {}, targetPollId: "s1", add: true }),
    ).toBe("d1");
  });

  it("non spunta nulla se il giorno è già votato", () => {
    expect(
      autoCheckedDayId({ poll, myVotes: { p1: ["d1"] }, targetPollId: "s1", add: true }),
    ).toBeNull();
  });

  it("non spunta nulla quando si toglie un orario", () => {
    expect(autoCheckedDayId({ poll, myVotes: {}, targetPollId: "s1", add: false })).toBeNull();
  });

  it("non spunta nulla votando il giorno stesso", () => {
    expect(autoCheckedDayId({ poll, myVotes: {}, targetPollId: "p1", add: true })).toBeNull();
  });

  it("non spunta nulla per un sondaggio senza giorno padre", () => {
    expect(autoCheckedDayId({ poll, myVotes: {}, targetPollId: "p9", add: true })).toBeNull();
  });
});
