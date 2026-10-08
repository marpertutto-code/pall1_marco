import type { PollDetail } from "@/types/domain";

/**
 * Regola "giorno + orario": scegliendo un orario il giorno si spunta da solo,
 * un giorno non si spunta a mano senza almeno un orario in quel giorno, e non
 * si può togliere l'ultimo orario mentre il giorno resta spuntato.
 *
 * Vive fuori dal componente per essere testabile; il server ricontrolla la
 * stessa regola prima di scrivere (rete di sicurezza).
 */

/** Voti dell'utente per sondaggio: `pollId → opzioni scelte`. */
export type MyVotes = Record<string, string[]>;

export type DayTimeMaps = {
  /** `opzione-giorno → sottosondaggio degli orari`. */
  dayToSub: Record<string, { subPollId: string; label: string }>;
  /** `sottosondaggio → opzione-giorno`. */
  subToDay: Record<string, { dayOptionId: string; dayLabel: string }>;
};

export function dayTimeMaps(poll: Pick<PollDetail, "options">): DayTimeMaps {
  const dayToSub: DayTimeMaps["dayToSub"] = {};
  const subToDay: DayTimeMaps["subToDay"] = {};

  for (const option of poll.options) {
    if (!option.subPoll) continue;
    dayToSub[option.id] = { subPollId: option.subPoll.id, label: option.label };
    subToDay[option.subPoll.id] = { dayOptionId: option.id, dayLabel: option.label };
  }

  return { dayToSub, subToDay };
}

/**
 * Giorno da spuntare in automatico quando si vota un orario in un
 * sottosondaggio: `null` se non è un orario, se il voto si sta togliendo o se
 * il giorno è già votato.
 */
export function autoCheckedDayId(input: {
  poll: Pick<PollDetail, "id" | "options">;
  myVotes: MyVotes;
  /** Sondaggio su cui si sta votando: il padre per un giorno, il figlio per un orario. */
  targetPollId: string;
  add: boolean;
}): string | null {
  const { poll, myVotes, targetPollId, add } = input;
  if (!add || targetPollId === poll.id) return null;

  const parent = dayTimeMaps(poll).subToDay[targetPollId];
  if (!parent) return null;
  if ((myVotes[poll.id] ?? []).includes(parent.dayOptionId)) return null;

  return parent.dayOptionId;
}

export function dayTimeBlocker(input: {
  poll: Pick<PollDetail, "id" | "options">;
  myVotes: MyVotes;
  /** Sondaggio su cui si sta votando: il padre per un giorno, il figlio per un orario. */
  targetPollId: string;
  optionId: string;
  add: boolean;
}): string | null {
  const { poll, myVotes, targetPollId, optionId, add } = input;
  const { dayToSub, subToDay } = dayTimeMaps(poll);

  // Spunto un giorno: deve esserci già un orario scelto per quel giorno.
  if (add && targetPollId === poll.id) {
    const day = dayToSub[optionId];
    if (day && (myVotes[day.subPollId] ?? []).length === 0) {
      return `Scegli almeno un orario per ${day.label}.`;
    }
    return null;
  }

  // Tolgo un orario: se era l'ultimo e il giorno è ancora spuntato, blocco.
  if (!add && targetPollId !== poll.id) {
    const parent = subToDay[targetPollId];
    if (!parent) return null;

    const remaining = (myVotes[targetPollId] ?? []).filter((id) => id !== optionId);
    const daySelected = (myVotes[poll.id] ?? []).includes(parent.dayOptionId);
    if (remaining.length === 0 && daySelected) {
      return "Lascia almeno un orario, oppure togli prima la spunta al giorno.";
    }
  }

  return null;
}
