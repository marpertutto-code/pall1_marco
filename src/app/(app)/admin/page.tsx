import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { MatchRow } from "@/components/match/match-row";
import { EmptyState, SectionTitle } from "@/components/ui/empty-state";
import { StatCell } from "@/components/admin/stat-cell";
import { buttonClass } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { listMatches, listProfilePositions, listProfiles, matchesToClose, splitMatches } from "@/lib/queries";

export const metadata: Metadata = { title: "Gestione" };

export default async function AdminHomePage() {
  await requireAdmin();

  const [matches, players, positionsByProfile] = await Promise.all([
    listMatches(),
    listProfiles(),
    listProfilePositions(),
  ]);
  const { upcoming } = splitMatches(matches);

  const activePlayers = players.filter((player) => player.is_active).length;
  const toClose = matchesToClose(matches);
  const withoutPositions = players.filter(
    (player) => player.is_active && (positionsByProfile.get(player.id) ?? []).length === 0,
  ).length;

  return (
    <>
      <PageHeader
        title="Gestione"
        description="Partite, iscritti, squadre e risultati."
        action={
          <Link href="/admin/matches" className={buttonClass({ size: "sm" })}>
            Nuova partita
          </Link>
        }
      />

      <div className="grid grid-cols-2 divide-rule overflow-hidden rounded-card border border-rule bg-surface sm:grid-cols-4 sm:divide-x">
        <StatCell label="In programma" value={upcoming.length} />
        <StatCell label="Giocatori attivi" value={activePlayers} />
        <StatCell label="Da chiudere" value={toClose.length} tone={toClose.length > 0 ? "text-accent-text" : undefined} />
        <StatCell label="Senza ruolo" value={withoutPositions} tone={withoutPositions > 0 ? "text-accent-text" : undefined} />
      </div>

      <section className="mt-8">
        <SectionTitle
          action={
            <Link href="/admin/players" className="text-[13px] font-medium text-accent-text hover:underline">
              Gestisci giocatori
            </Link>
          }
        >
          Prossime partite
        </SectionTitle>

        {upcoming.length > 0 ? (
          <div className="divide-y divide-rule overflow-hidden rounded-card border border-rule bg-surface">
            {upcoming.map((match) => (
              <MatchRow key={match.id} match={match} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Nessuna partita in programma"
            description="Creane una per aprire le iscrizioni del gruppo."
            action={
              <Link href="/admin/matches" className={buttonClass({ size: "sm" })}>
                Crea partita
              </Link>
            }
          />
        )}
      </section>

      {toClose.length > 0 ? (
        <section className="mt-8">
          <SectionTitle>Da chiudere</SectionTitle>
          <div className="divide-y divide-rule overflow-hidden rounded-card border border-rule bg-surface">
            {toClose.map((match) => (
              <MatchRow key={match.id} match={match} />
            ))}
          </div>
        </section>
      ) : null}

      <p className="mt-6 text-[12px] text-muted">
        Il pannello di gestione è visibile solo agli amministratori. I permessi sono verificati dal
        database, non dal browser.
      </p>
    </>
  );
}
