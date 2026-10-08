import { describe, expect, it } from "vitest";
import { bestPollSlots } from "@/lib/poll-best-slots";
import type { PollDetail, PollOptionResult, PollSubPoll, PollVoter } from "@/types/domain";

function voter(nickname: string): PollVoter {
  return { profileId: nickname, nickname, avatarUrl: null };
}

function option(
  id: string,
  label: string,
  voters: PollVoter[],
  subPoll: PollSubPoll | null = null,
  startsAt: string | null = null,
): PollOptionResult {
  return { id, label, startsAt, sortOrder: 0, voters, subPoll };
}

function timeOption(id: string, label: string, voters: PollVoter[]): PollOptionResult {
  // Come dal DB: `starts_at` è in UTC. Le 20:00 di Roma (ora legale) sono le 18:00Z.
  return {
    id,
    label,
    startsAt: `2026-10-05T${label}:00+02:00`,
    sortOrder: 0,
    voters,
    subPoll: null,
  };
}

function subPoll(id: string, options: PollOptionResult[]): PollSubPoll {
  return {
    id,
    question: "Orari",
    allowMultiple: true,
    closed: true,
    voterCount: 0,
    myVotes: [],
    options,
  };
}

function poll(options: PollOptionResult[]): PollDetail {
  const voterIds = new Set(options.flatMap((o) => o.voters.map((v) => v.profileId)));
  return {
    id: "p1",
    question: "Giorno?",
    details: null,
    allowMultiple: true,
    closesAt: null,
    isClosed: true,
    closed: true,
    weekStart: "2026-10-05",
    parentOptionId: null,
    createdAt: "2026-10-01T10:00:00Z",
    createdBy: "me",
    creatorNickname: "Me",
    creatorAvatarUrl: null,
    optionCount: options.length,
    voterCount: voterIds.size,
    myVotes: [],
    options,
  };
}

describe("bestPollSlots", () => {
  it("incrocia i voti del giorno e dell'orario: contano solo le persone che hanno votato entrambi", () => {
    const slots = bestPollSlots(
      poll([
        option("d1", "Lunedì", [voter("A"), voter("B"), voter("C")], subPoll("s1", [
          timeOption("t1", "20:00", [voter("A"), voter("B"), voter("D")]),
        ])),
      ]),
    );

    expect(slots).toHaveLength(1);
    expect(slots[0].voters.map((v) => v.nickname)).toEqual(["A", "B"]);
    expect(slots[0].time).toBe("20:00");
  });

  it("ordina per numero di persone e restituisce al massimo 3 fasce", () => {
    const slots = bestPollSlots(
      poll([
        option("d1", "Lunedì", [voter("A"), voter("B")], subPoll("s1", [timeOption("t1", "20:00", [voter("A")])]), "2026-10-05T20:00+02:00"),
        option("d2", "Martedì", [voter("A"), voter("B"), voter("C")], subPoll("s2", [
          timeOption("t2", "21:00", [voter("A"), voter("B"), voter("C")]),
          timeOption("t3", "18:00", [voter("A"), voter("B")]),
        ]), "2026-10-06T20:00+02:00"),
      ]),
    );

    expect(slots.map((slot) => `${slot.primary} ${slot.time}`)).toEqual([
      "Mar 6 ott 21:00",
      "Mar 6 ott 18:00",
      "Lun 5 ott 20:00",
    ]);
  });

  it("a pari merito vince la fascia proposta prima nel sondaggio", () => {
    const slots = bestPollSlots(
      poll([
        option("d1", "Lunedì", [voter("A")], subPoll("s1", [
          timeOption("t1", "19:00", [voter("A")]),
          timeOption("t2", "18:00", [voter("A")]),
        ])),
      ]),
    );

    expect(slots.map((slot) => slot.time)).toEqual(["19:00", "18:00"]);
  });

  it("un giorno senza sottosondaggio usa i votanti del giorno", () => {
    const slots = bestPollSlots(poll([option("d1", "Sabato", [voter("A"), voter("B")])]));

    expect(slots).toHaveLength(1);
    expect(slots[0].time).toBeNull();
    expect(slots[0].voters).toHaveLength(2);
  });

  it("mostra l'ora di Roma, non quella UTC di starts_at", () => {
    const slots = bestPollSlots(
      poll([
        option("d1", "Lunedì", [voter("A")], subPoll("s1", [
          // 17:30Z = 19:30 a Roma (ora legale).
          { id: "t1", label: "19:30", startsAt: "2026-10-05T17:30:00+00:00", sortOrder: 0, voters: [voter("A")], subPoll: null },
        ]), "2026-10-04T22:30:00+00:00"),
      ]),
    );

    expect(slots[0].time).toBe("19:30");
    expect(slots[0].primary).toBe("Lun 5 ott");
  });

  it("scarta le fasce senza nessun disponibile", () => {
    const slots = bestPollSlots(
      poll([
        option("d1", "Lunedì", [], subPoll("s1", [timeOption("t1", "20:00", [voter("A")])])),
      ]),
    );

    expect(slots).toEqual([]);
  });
});
