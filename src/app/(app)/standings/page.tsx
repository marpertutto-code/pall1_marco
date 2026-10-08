import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { StandingsTable } from "@/components/stats/standings-table";
import { EmptyState } from "@/components/ui/empty-state";
import { requireProfile } from "@/lib/auth";
import { shortSummary } from "@/lib/positions";
import { listProfilePositions, listStandings } from "@/lib/queries";

export const metadata: Metadata = { title: "Classifica" };

export default async function StandingsPage() {
  await requireProfile();
  const [rows, positionsByProfile] = await Promise.all([listStandings(), listProfilePositions()]);

  const subtitleById = new Map(
    rows
      .filter((row) => row.id !== null)
      .map((row) => [row.id as string, shortSummary(positionsByProfile.get(row.id as string) ?? [])]),
  );

  return (
    <>
      <PageHeader
        title="Classifica"
        description="Ordinata per percentuale di vittorie, poi vittorie e gol. Contano solo le partite chiuse."
      />

      {rows.length > 0 ? (
        <StandingsTable rows={rows} subtitleById={subtitleById} />
      ) : (
        <EmptyState
          title="Classifica vuota"
          description="Nessuna partita è ancora stata chiusa con un risultato."
        />
      )}

      {rows.length > 0 ? (
        <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-[11.5px] text-muted">
          <div className="flex gap-1.5">
            <dt className="font-medium text-ink">G</dt>
            <dd>partite giocate</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="font-medium text-ink">V · P · S</dt>
            <dd>vittorie · pareggi · sconfitte</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="font-medium text-ink">Ass</dt>
            <dd>assist</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="font-medium text-ink">%</dt>
            <dd>percentuale vittorie</dd>
          </div>
        </dl>
      ) : null}
    </>
  );
}
