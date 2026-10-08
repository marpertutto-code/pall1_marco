import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { MatchRow } from "@/components/match/match-row";
import { CreateMatchForm } from "@/components/admin/create-match-form";
import { EmptyState, SectionTitle } from "@/components/ui/empty-state";
import { requireAdmin } from "@/lib/auth";
import { defaultMatchDateLocal, toDatetimeLocalValue } from "@/lib/format";
import { listMatches, splitMatches } from "@/lib/queries";

export const metadata: Metadata = { title: "Partite · Gestione" };

export default async function AdminMatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const fromPoll = params.date && !Number.isNaN(Date.parse(params.date)) ? params.date : null;
  const defaultDateLocal = fromPoll
    ? toDatetimeLocalValue(fromPoll)
    : defaultMatchDateLocal();

  const matches = await listMatches();
  const { upcoming, past } = splitMatches(matches);

  return (
    <>
      <PageHeader
        title="Partite"
        description="Crea una partita e gestisci iscritti, squadre e risultati."
        back={
          <Link href="/admin" className="text-[13px] text-muted hover:text-ink">
            ← Gestione
          </Link>
        }
      />

      <section className="rounded-card border border-rule bg-surface p-4 md:p-5">
        <h2 className="mb-4 text-[15px] font-semibold text-ink">Nuova partita</h2>
        {fromPoll ? (
          <p className="mb-4 rounded-control border border-rule bg-paper px-3 py-2 text-[12.5px] text-muted">
            Data precompilata dall&apos;opzione del sondaggio. Controlla l&apos;orario e il campo.
          </p>
        ) : null}
        <CreateMatchForm defaultDateLocal={defaultDateLocal} />
      </section>

      <section className="mt-8">
        <SectionTitle>In programma</SectionTitle>
        {upcoming.length > 0 ? (
          <div className="divide-y divide-rule overflow-hidden rounded-card border border-rule bg-surface">
            {upcoming.map((match) => (
              <MatchRow key={match.id} match={match} />
            ))}
          </div>
        ) : (
          <EmptyState title="Nessuna partita in programma" />
        )}
      </section>

      <section className="mt-8">
        <SectionTitle>Storico</SectionTitle>
        {past.length > 0 ? (
          <div className="divide-y divide-rule overflow-hidden rounded-card border border-rule bg-surface">
            {past.map((match) => (
              <MatchRow key={match.id} match={match} />
            ))}
          </div>
        ) : (
          <EmptyState title="Nessuna partita passata" />
        )}
      </section>
    </>
  );
}
