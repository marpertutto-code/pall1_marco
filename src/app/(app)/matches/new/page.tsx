import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { CreateMatchForm } from "@/components/admin/create-match-form";
import { IconArrowLeft } from "@/components/icons";
import { requireOrganizer } from "@/lib/auth";
import { defaultMatchDateLocal, toDatetimeLocalValue } from "@/lib/format";

/**
 * Creazione partita per gli **organizzatori** (e per gli admin, che di solito
 * passano dal pannello). L'organizzatore non vede iscritti, squadre e risultati:
 * dopo la creazione finisce sulla partita pubblica.
 */

export const metadata: Metadata = { title: "Nuova partita" };

export default async function NewMatchPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const profile = await requireOrganizer();
  const params = await searchParams;

  const fromPoll = params.date && !Number.isNaN(Date.parse(params.date)) ? params.date : null;
  const defaultDateLocal = fromPoll ? toDatetimeLocalValue(fromPoll) : defaultMatchDateLocal();

  return (
    <>
      <PageHeader
        title="Nuova partita"
        description="Data, campo e posti: le iscrizioni si aprono subito."
        back={
          <Link
            href="/matches"
            className="inline-flex items-center gap-2 text-[13px] text-muted hover:text-ink"
          >
            <IconArrowLeft className="size-4" />
            Tutte le partite
          </Link>
        }
      />

      <section className="rounded-card border border-rule bg-surface p-4 md:p-6">
        {fromPoll ? (
          <p className="mb-4 rounded-control border border-rule bg-paper px-3 py-2 text-[12.5px] text-muted">
            Data precompilata dall&apos;opzione del sondaggio. Controlla l&apos;orario e il campo.
          </p>
        ) : null}

        <CreateMatchForm defaultDateLocal={defaultDateLocal} />
      </section>

      {profile.is_admin ? null : (
        <p className="mt-4 text-[12px] text-muted">
          Squadre, iscritti e risultato li gestisce un amministratore.
        </p>
      )}
    </>
  );
}
