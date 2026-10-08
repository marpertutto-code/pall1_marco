import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { PollCard } from "@/components/polls/poll-card";
import { EmptyState, SectionTitle } from "@/components/ui/empty-state";
import { buttonClass } from "@/components/ui/button";
import { requireProfile } from "@/lib/auth";
import { relativeWeekLabel, startOfWeek, weekRangeShort } from "@/lib/week";
import { listPolls } from "@/lib/queries";
import type { PollSummary } from "@/types/domain";

export const metadata: Metadata = { title: "Sondaggi" };

/** Distanza in giorni fra due lunedì: serve solo per ordinare i gruppi. */
function weeksApart(a: string, b: string) {
  return Math.abs((Date.parse(a) - Date.parse(b)) / 86_400_000);
}

export default async function PollsPage() {
  const profile = await requireProfile();
  const polls = await listPolls(profile.id);

  const open = polls.filter((poll) => !poll.closed);
  const closed = polls.filter((poll) => poll.closed);
  const waitingForMe = open.filter((poll) => poll.myVotes.length === 0);

  // I sondaggi aperti si raggruppano per settimana, dalla più vicina a oggi.
  const byWeek = new Map<string, PollSummary[]>();
  const withoutWeek: PollSummary[] = [];

  for (const poll of open) {
    if (poll.weekStart) {
      const list = byWeek.get(poll.weekStart) ?? [];
      list.push(poll);
      byWeek.set(poll.weekStart, list);
    } else {
      withoutWeek.push(poll);
    }
  }

  const today = startOfWeek();
  const weekGroups = [...byWeek.entries()]
    .sort(([a], [b]) => weeksApart(a, today) - weeksApart(b, today))
    .map(([week, items]) => ({ week, polls: items }));

  return (
    <>
      <PageHeader
        title="Sondaggi"
        description={`${profile.nickname}, qui si decide quando e come giocare.`}
        action={
          <Link href="/polls/new" className={buttonClass({ size: "sm" })}>
            Nuovo sondaggio
          </Link>
        }
      />

      <section>
        <SectionTitle
          action={
            waitingForMe.length > 0 ? (
              <span className="text-[12px] text-accent-text">
                {waitingForMe.length} in attesa del tuo voto
              </span>
            ) : null
          }
        >
          Aperti
        </SectionTitle>

        {open.length > 0 ? (
          <div className="space-y-6">
            {weekGroups.map(({ week, polls: items }) => (
              <div key={week}>
                <h3 className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-[13px] font-medium text-ink">
                    {relativeWeekLabel(week)}
                  </span>
                  <span className="num text-[12px] text-muted">{weekRangeShort(week)}</span>
                </h3>
                <div className="divide-y divide-rule overflow-hidden rounded-card border border-rule bg-surface">
                  {items.map((poll) => (
                    <PollCard key={poll.id} poll={poll} />
                  ))}
                </div>
              </div>
            ))}

            {withoutWeek.length > 0 ? (
              <div>
                <h3 className="mb-2 text-[13px] font-medium text-ink">Senza settimana</h3>
                <div className="divide-y divide-rule overflow-hidden rounded-card border border-rule bg-surface">
                  {withoutWeek.map((poll) => (
                    <PollCard key={poll.id} poll={poll} />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <EmptyState
            title="Nessun sondaggio aperto"
            description="Crea un sondaggio per scegliere il giorno della partita, poi uno per l'orario."
            action={
              <Link href="/polls/new" className={buttonClass({ size: "sm" })}>
                Crea il primo sondaggio
              </Link>
            }
          />
        )}
      </section>

      {closed.length > 0 ? (
        <section className="mt-8">
          <SectionTitle>Chiusi</SectionTitle>
          <div className="divide-y divide-rule overflow-hidden rounded-card border border-rule bg-surface">
            {closed.map((poll) => (
              <PollCard key={poll.id} poll={poll} />
            ))}
          </div>
        </section>
      ) : null}

      <p className="mt-6 text-[12px] text-muted">
        Un sondaggio può riferirsi a una settimana — le opzioni diventano i suoi giorni (lunedì–sabato)
        con la data vera, e ogni giorno porta il suo sottosondaggio sugli orari — e i sondaggi aperti si
        raggruppano per settimana. Tutti vedono chi ha votato cosa.
      </p>
    </>
  );
}
