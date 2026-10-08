import { formatTime } from "@/lib/format";
import { dayLabel, romeDateKey } from "@/lib/week";
import type { PollDetail, PollOptionResult, PollVoter } from "@/types/domain";

/**
 * A sondaggio concluso, calcola le fasce (giorno + orario) in cui ci sono più
 * persone disponibili.
 *
 * Un sondaggio-settimana chiede i giorni e, dentro ogni giorno, un
 * sottosondaggio chiede gli orari. Le persone davvero disponibili per una
 * fascia sono quelle che hanno votato **sia** il giorno **sia** quell'orario:
 * è l'intersezione dei due gruppi, non la somma dei voti.
 *
 * Le fasce sono ordinate per numero di persone (decrescente), poi per giorno e
 * orario come appaiono nel sondaggio. Le fasce senza nessun disponibile sono
 * scartate.
 */

export type PollBestSlot = {
  /** Chiave stabile per React. */
  key: string;
  /** Giorno della fascia: "Lun 5 ott", o l'etichetta dell'opzione. */
  primary: string;
  /** Orario "18:30", oppure `null` per un'opzione senza orari. */
  time: string | null;
  /** `datetime-local` per precompilare la creazione partita, se disponibile. */
  startsAt: string | null;
  /** Chi ha votato il giorno e l'orario (o solo l'opzione, senza sottosondaggio). */
  voters: PollVoter[];
  /** Percentuale di disponibili sui votanti del sondaggio. */
  percentage: number;
};

const HOURS = /^\d{1,2}:\d{2}$/;

/** Giorno di Roma (`YYYY-MM-DD`) di un istante, non il giorno UTC della stringa. */
function dayOf(startsAt: string | null): string | null {
  if (!startsAt) return null;
  const date = new Date(startsAt);
  return Number.isNaN(date.getTime()) ? null : romeDateKey(date);
}

/** "Lun 5 ott" se l'opzione ha una data, altrimenti la sua etichetta. */
function dayName(option: PollOptionResult): string {
  const key = dayOf(option.startsAt);
  return key ? dayLabel(key) : option.label;
}

/**
 * "18:30" in ora di Roma. `starts_at` arriva dal DB in UTC: leggerne i primi
 * caratteri mostrerebbe l'ora sbagliata (es. 17:30Z invece di 19:30).
 */
function timeOf(option: PollOptionResult): string | null {
  if (option.startsAt) {
    const date = new Date(option.startsAt);
    if (!Number.isNaN(date.getTime())) return formatTime(option.startsAt);
  }
  const label = option.label.trim();
  return HOURS.test(label) ? label : null;
}

export function bestPollSlots(poll: PollDetail, limit = 3): PollBestSlot[] {
  const total = poll.voterCount;
  const candidates: { slot: PollBestSlot; dayOrder: number; timeOrder: number }[] = [];

  const push = (
    slot: Omit<PollBestSlot, "percentage">,
    dayOrder: number,
    timeOrder: number,
  ) => {
    candidates.push({
      slot: {
        ...slot,
        percentage: total > 0 ? Math.round((slot.voters.length / total) * 100) : 0,
      },
      dayOrder,
      timeOrder,
    });
  };

  poll.options.forEach((option, dayOrder) => {
    const dayVoters = option.voters;

    // Giorno senza sottosondaggio orari: la fascia è il giorno stesso.
    if (!option.subPoll || option.subPoll.options.length === 0) {
      if (dayVoters.length === 0) return;
      push(
        {
          key: option.id,
          primary: dayName(option),
          time: null,
          startsAt: option.startsAt,
          voters: dayVoters,
        },
        dayOrder,
        0,
      );
      return;
    }

    const dayIds = new Set(dayVoters.map((voter) => voter.profileId));

    option.subPoll.options.forEach((timeOption, timeOrder) => {
      // Disponibili solo se hanno votato anche il giorno.
      const voters = timeOption.voters.filter((voter) => dayIds.has(voter.profileId));
      if (voters.length === 0) return;

      push(
        {
          key: `${option.id}:${timeOption.id}`,
          primary: dayName(option),
          time: timeOf(timeOption),
          startsAt: timeOption.startsAt ?? option.startsAt,
          voters,
        },
        dayOrder,
        timeOrder,
      );
    });
  });

  return candidates
    .sort(
      (a, b) =>
        b.slot.voters.length - a.slot.voters.length ||
        a.dayOrder - b.dayOrder ||
        a.timeOrder - b.timeOrder,
    )
    .slice(0, limit)
    .map((candidate) => candidate.slot);
}
