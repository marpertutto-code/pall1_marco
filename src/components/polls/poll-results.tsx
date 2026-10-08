"use client";

import { startTransition, useOptimistic, useState } from "react";
import Link from "next/link";
import { setVoteAction } from "@/lib/actions/polls";
import { autoCheckedDayId, dayTimeBlocker } from "@/lib/poll-day-time";
import { Avatar } from "@/components/ui/avatar";
import { FormMessage } from "@/components/ui/form-message";
import { IconCheck, IconPoll, IconSpinner } from "@/components/icons";
import { formatMatchDate } from "@/lib/format";
import type { FormState } from "@/lib/form-state";
import type { PollDetail, PollOptionResult, PollSubPoll, PollVoter } from "@/types/domain";

/* ------------------------------------------------------------------ */
/* Voto ottimistico                                                    */
/* ------------------------------------------------------------------ */

/** Voti dell'utente corrente, per sondaggio: `pollId → opzioni scelte`. */
type VoteMap = Record<string, string[]>;

type VoteIntent = {
  pollId: string;
  optionId: string;
  add: boolean;
  /** Sondaggio a scelta singola: la nuova scelta sostituisce la precedente. */
  single: boolean;
};

/**
 * Idempotente di proposito. React riapplica le intenzioni ottimistiche sopra i
 * dati appena arrivati dal server: un toggle le invertirebbe, un "metti/togli"
 * no.
 */
function applyVote(votes: VoteMap, intent: VoteIntent): VoteMap {
  const current = votes[intent.pollId] ?? [];

  if (!intent.add) {
    return { ...votes, [intent.pollId]: current.filter((id) => id !== intent.optionId) };
  }
  if (intent.single) return { ...votes, [intent.pollId]: [intent.optionId] };
  if (current.includes(intent.optionId)) return votes;
  return { ...votes, [intent.pollId]: [...current, intent.optionId] };
}

/** Dati minimi per calcolare l'effetto ottimistico di un voto. */
type VoteTarget = {
  id: string;
  allowMultiple: boolean;
  closed: boolean;
  /** Voti già salvati sul server (base dell'ottimismo). */
  baseVotes: string[];
  baseVoterCount: number;
};

/** Stato di un'opzione dopo l'eventuale voto non ancora salvato. */
type OptionVote = {
  selected: boolean;
  voters: PollVoter[];
  voterCount: number;
  percentage: number;
};

type Board = {
  targets: Record<string, VoteTarget>;
  baseVotes: VoteMap;
};

/** Tutti i sondaggi votabili dentro la pagina: il padre e i sottosondaggi orari. */
function boardOf(poll: PollDetail): Board {
  const targets: Record<string, VoteTarget> = {
    [poll.id]: {
      id: poll.id,
      allowMultiple: poll.allowMultiple,
      closed: poll.closed,
      baseVotes: poll.myVotes,
      baseVoterCount: poll.voterCount,
    },
  };

  for (const option of poll.options) {
    const subPoll = option.subPoll;
    if (!subPoll) continue;
    targets[subPoll.id] = {
      id: subPoll.id,
      allowMultiple: subPoll.allowMultiple,
      closed: subPoll.closed,
      baseVotes: subPoll.myVotes,
      baseVoterCount: subPoll.voterCount,
    };
  }

  return {
    targets,
    baseVotes: Object.fromEntries(Object.values(targets).map((target) => [target.id, target.baseVotes])),
  };
}

/**
 * Il "mio" voto appena cliccato vale subito: spunta, bordo, contatore e
 * percentuale si aggiornano senza aspettare il server.
 */
function optionVote(
  target: VoteTarget,
  myVotes: string[],
  option: PollOptionResult,
  me: PollVoter,
): OptionVote {
  const wasSelected = target.baseVotes.includes(option.id);
  const selected = myVotes.includes(option.id);

  let voters = option.voters;
  if (selected && !wasSelected) {
    voters = [...voters, me].sort((a, b) => a.nickname.localeCompare(b.nickname));
  } else if (!selected && wasSelected) {
    voters = voters.filter((voter) => voter.profileId !== me.profileId);
  }

    const voterCount = voterCountOf(target, myVotes);

  return {
    selected,
    voters,
    voterCount,
    percentage: voterCount > 0 ? Math.round((voters.length / voterCount) * 100) : 0,
  };
}

/**
 * Votanti del sondaggio: il conteggio del server più il mio voto ottimistico,
 * se non era già dentro.
 */
function voterCountOf(target: VoteTarget, myVotes: string[]) {
  return Math.max(
    0,
    target.baseVoterCount + (myVotes.length > 0 ? 1 : 0) - (target.baseVotes.length > 0 ? 1 : 0),
  );
}

/** Voto in corso di salvataggio (spinner) e azione di voto condivisa con i sottosondaggi. */
type VoteSession = {
  votes: VoteMap;
  savingKeys: string[];
  vote: (target: VoteTarget, optionId: string) => void;
};

const voteKey = (pollId: string, optionId: string) => `${pollId}:${optionId}`;

/* ------------------------------------------------------------------ */
/* Componente                                                          */
/* ------------------------------------------------------------------ */

export function PollResults({
  poll,
  me,
  matchCreatePath = null,
}: {
  poll: PollDetail;
  me: PollVoter;
  /** Base per creare la partita da un'opzione con data (admin o organizzatore). */
  matchCreatePath?: string | null;
}) {
  const { targets, baseVotes } = boardOf(poll);
  const [votes, applyOptimisticVote] = useOptimistic(baseVotes, applyVote);
  const [state, setState] = useState<FormState>(null);
  // Chiavi dei voti ancora in volo: il salvataggio può essere multiplo.
  const [savingKeys, setSavingKeys] = useState<string[]>([]);

  const canVote = !poll.closed;
  const isMine = poll.createdBy === me.profileId;
  const mainTarget = targets[poll.id];

  function stopSaving(key: string) {
    setSavingKeys((keys) => keys.filter((item) => item !== key));
  }

  function vote(target: VoteTarget, optionId: string) {
    const key = voteKey(target.id, optionId);
    if (target.closed) return;
    if (savingKeys.includes(key)) return;

    const add = !(votes[target.id] ?? []).includes(optionId);

    const blocker = dayTimeBlocker({
      poll,
      myVotes: votes,
      targetPollId: target.id,
      optionId,
      add,
    });
    if (blocker) {
      setState({ error: blocker });
      return;
    }

    setSavingKeys((keys) => [...keys, key]);

    // Votando un orario il giorno padre si spunta da solo: una sola intenzione
    // per l'utente, due voti da salvare.
    const autoDayId = autoCheckedDayId({
      poll,
      myVotes: votes,
      targetPollId: target.id,
      add,
    });
    const autoDayKey = autoDayId ? voteKey(poll.id, autoDayId) : null;
    if (autoDayKey && !mainTarget.closed) setSavingKeys((keys) => [...keys, autoDayKey]);

    startTransition(async () => {
      applyOptimisticVote({
        pollId: target.id,
        optionId,
        add,
        single: !target.allowMultiple,
      });
      if (autoDayId && !mainTarget.closed) {
        applyOptimisticVote({
          pollId: poll.id,
          optionId: autoDayId,
          add: true,
          single: !mainTarget.allowMultiple,
        });
      }

      const result = await setVoteAction({
        poll_id: target.id,
        option_id: optionId,
        voted: add,
      });
      if (autoDayId && !mainTarget.closed) {
        await setVoteAction({ poll_id: poll.id, option_id: autoDayId, voted: true });
      }
      setState(result ?? null);
      stopSaving(key);
      if (autoDayKey) stopSaving(autoDayKey);
    });
  }

  const session: VoteSession = { votes, savingKeys, vote };
  const mainVotes = votes[poll.id] ?? [];
  const mainVoterCount = voterCountOf(mainTarget, mainVotes);

  return (
    <div className="space-y-4">
      <ul className="space-y-2.5">
        {poll.options.map((option) => {
          const view = optionVote(mainTarget, mainVotes, option, me);
          const saving = savingKeys.includes(voteKey(poll.id, option.id));

          return (
            <li key={option.id}>
              <button
                type="button"
                onClick={() => vote(mainTarget, option.id)}
                disabled={!canVote}
                aria-pressed={view.selected}
                aria-busy={saving}
                className={[
                  "relative w-full overflow-hidden rounded-card border bg-surface text-left transition-colors duration-150",
                  view.selected ? "border-accent-solid" : "border-rule hover:border-line-strong",
                  canVote ? "" : "cursor-default",
                ].join(" ")}
              >
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-0 bg-accent/12"
                  style={{ width: `${view.percentage}%` }}
                />

                <span className="relative flex items-center gap-3 px-3.5 py-3">
                  <span
                    aria-hidden
                    className={[
                      "flex size-[18px] shrink-0 items-center justify-center border transition-colors duration-150",
                      poll.allowMultiple ? "rounded-[5px]" : "rounded-full",
                      view.selected
                        ? "border-accent-solid bg-accent-solid text-accent-on"
                        : "border-line-strong bg-surface",
                    ].join(" ")}
                  >
                    {view.selected ? <IconCheck className="size-3" strokeWidth={2.6} /> : null}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium text-ink">
                      {option.label}
                    </span>
                    {option.startsAt ? (
                      <span className="mt-0.5 block text-[12px] text-muted">
                        {formatMatchDate(option.startsAt)}
                      </span>
                    ) : null}
                  </span>

                  {saving ? <IconSpinner className="size-3.5 shrink-0 text-muted" /> : null}
                  <span className="num shrink-0 text-[13px] font-semibold text-ink">
                    {view.voters.length}
                  </span>
                  <span className="num w-9 shrink-0 text-right text-[12.5px] text-muted">
                    {view.percentage}%
                  </span>
                </span>
              </button>

              {view.voters.length > 0 ? (
                <ul className="mt-2 flex flex-wrap gap-1.5 pl-1">
                  {view.voters.map((voter) => (
                    <li
                      key={voter.profileId}
                      className="inline-flex items-center gap-1.5 rounded-full border border-rule px-2 py-0.5 text-[11.5px] text-muted"
                    >
                      <Avatar
                        name={voter.nickname}
                        src={voter.avatarUrl}
                        size="sm"
                        className="size-5 text-[9px]"
                      />
                      {voter.nickname}
                      {voter.profileId === me.profileId ? (
                        <span className="text-accent-text">(tu)</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 pl-1 text-[11.5px] text-muted">Nessun voto su questa opzione.</p>
              )}

              {matchCreatePath && option.startsAt ? (
                <p className="mt-2 pl-1">
                  <Link
                    href={`${matchCreatePath}?date=${encodeURIComponent(option.startsAt)}`}
                    className="text-[11.5px] font-medium text-accent-text hover:underline"
                  >
                    Crea una partita con questa data
                  </Link>
                </p>
              ) : null}

              {option.subPoll ? (
                <SubPollVotes subPoll={option.subPoll} me={me} session={session} />
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="space-y-3">
        <FormMessage state={state} />

        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
          <span>
            <span className="num font-semibold text-ink">{mainVoterCount}</span>{" "}
            {mainVoterCount === 1 ? "votante" : "votanti"}
          </span>
          <span>{poll.allowMultiple ? "Risposta multipla" : "Una sola scelta"}</span>
          {savingKeys.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-accent-text">
              <IconSpinner className="size-3.5" />
              Salvataggio…
            </span>
          ) : canVote ? (
            <span>Tocca un&apos;opzione per votare o ritirare il voto.</span>
          ) : null}
        </p>

        {isMine ? (
          <Link
            href={`/polls/new?from=${poll.id}`}
            className="inline-flex items-center gap-2 text-[12px] font-medium text-accent-text hover:underline"
          >
            <IconPoll className="size-3.5" />
            Crea il sondaggio successivo (es. l&apos;orario)
          </Link>
        ) : null}
      </div>
    </div>
  );
}

/** Elenco orari sotto un giorno: è un sondaggio a sé, votabile in linea. */
function SubPollVotes({
  subPoll,
  me,
  session,
}: {
  subPoll: PollSubPoll;
  me: PollVoter;
  session: VoteSession;
}) {
  const target: VoteTarget = {
    id: subPoll.id,
    allowMultiple: subPoll.allowMultiple,
    closed: subPoll.closed,
    baseVotes: subPoll.myVotes,
    baseVoterCount: subPoll.voterCount,
  };

  const myVotes = session.votes[subPoll.id] ?? [];
  const canVote = !subPoll.closed;
  const voterCount = voterCountOf(target, myVotes);

  return (
    <div className="mt-2 ml-1 rounded-card border border-rule bg-paper p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
        <p className="text-[12px] font-medium text-ink">Orari preferiti</p>
        <p className="text-[11px] text-muted">
          <span className="num">{voterCount}</span> {voterCount === 1 ? "votante" : "votanti"}
          {subPoll.allowMultiple ? " · più scelte" : " · una scelta"}
        </p>
      </div>

      <ul className="mt-2 flex flex-wrap gap-1.5">
        {subPoll.options.map((option) => {
          const view = optionVote(target, myVotes, option, me);
          const saving = session.savingKeys.includes(voteKey(subPoll.id, option.id));

          return (
            <li key={option.id}>
              <button
                type="button"
                onClick={() => session.vote(target, option.id)}
                disabled={!canVote}
                aria-pressed={view.selected}
                aria-busy={saving}
                title={
                  view.voters.length > 0
                    ? view.voters.map((voter) => voter.nickname).join(", ")
                    : "Nessun voto"
                }
                className={[
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] transition-colors duration-150",
                  view.selected
                    ? "border-accent-solid bg-accent-solid text-accent-on"
                    : "border-rule text-muted hover:border-line-strong hover:text-ink",
                  canVote ? "" : "cursor-default",
                ].join(" ")}
              >
                {saving ? <IconSpinner className="size-3" /> : null}
                <span className="num font-medium">{option.label}</span>
                {view.voters.length > 0 ? (
                  <span className="num text-[11px] opacity-80">{view.voters.length}</span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-2 text-[11px] text-muted">
        {canVote
          ? "Scegli almeno un orario: il giorno si spunta da solo. Puoi sceglierne più di uno."
          : "Votazione degli orari chiusa."}
      </p>
    </div>
  );
}
