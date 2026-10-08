import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { MatchRow } from "@/components/match/match-row";
import { EmptyState, SectionTitle } from "@/components/ui/empty-state";
import { buttonClass } from "@/components/ui/button";
import { requireProfile } from "@/lib/auth";
import { listMatches, splitMatches } from "@/lib/queries";

export const metadata = { title: "Partite" };

export default async function MatchesPage() {
  const profile = await requireProfile();
  const matches = await listMatches();
  const { upcoming, past } = splitMatches(matches);

  return (
    <>
      <PageHeader
        title="Partite"
        description="In programma e già giocate."
        action={
          profile.is_admin || profile.is_organizer ? (
            <Link
              href={profile.is_admin ? "/admin/matches" : "/matches/new"}
              className={buttonClass({ variant: "secondary", size: "sm" })}
            >
              Nuova partita
            </Link>
          ) : null
        }
      />

      <section>
        <SectionTitle>In programma</SectionTitle>
        {upcoming.length > 0 ? (
          <div className="divide-y divide-rule overflow-hidden rounded-card border border-rule bg-surface">
            {upcoming.map((match) => (
              <MatchRow key={match.id} match={match} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Nessuna partita in programma"
            description="Non ci sono date fissate. Organizzate la prossima."
          />
        )}
      </section>

      <section className="mt-8">
        <SectionTitle>Giocate e annullate</SectionTitle>
        {past.length > 0 ? (
          <div className="divide-y divide-rule overflow-hidden rounded-card border border-rule bg-surface">
            {past.map((match) => (
              <MatchRow key={match.id} match={match} />
            ))}
          </div>
        ) : (
          <EmptyState title="Ancora nulla" description="Qui finirà lo storico delle partite passate." />
        )}
      </section>
    </>
  );
}
