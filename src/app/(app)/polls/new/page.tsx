import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { CreatePollForm } from "@/components/polls/create-poll-form";
import { requireProfile } from "@/lib/auth";
import { getPollDetail } from "@/lib/queries";
import { startOfWeek } from "@/lib/week";
import { IconArrowLeft } from "@/components/icons";

export const metadata: Metadata = { title: "Nuovo sondaggio" };

export default async function NewPollPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const profile = await requireProfile();
  const params = await searchParams;

  const source = params.from ? await getPollDetail(params.from, profile.id) : null;

  const prefillQuestion = source
    ? `Orario per: ${source.question}`.slice(0, 160)
    : undefined;

  // Se nasce da un altro sondaggio, eredita la sua settimana.
  const defaultWeekStart = source ? source.weekStart : startOfWeek();

  return (
    <>
      <PageHeader
        back={
          <Link href="/polls" className="inline-flex items-center gap-2 text-[13px] text-muted hover:text-ink">
            <IconArrowLeft className="size-4" />
            Tutti i sondaggi
          </Link>
        }
        title="Nuovo sondaggio"
        description={
          source
            ? `Sondaggio successivo a «${source.question}»: l'ora è a scelta singola.`
            : "Scegli una domanda, le opzioni e chi può rispondere."
        }
      />

      <section className="rounded-card border border-rule bg-surface p-4 md:p-6">
        <CreatePollForm
          prefillQuestion={prefillQuestion}
          prefillSingleChoice={Boolean(source)}
          defaultWeekStart={defaultWeekStart}
        />
      </section>
    </>
  );
}
