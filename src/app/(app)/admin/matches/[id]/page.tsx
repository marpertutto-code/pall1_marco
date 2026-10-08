import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { MatchAdminPanel } from "@/components/admin/match-admin-panel";
import { StatusChip } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { formatMatchDate, toDatetimeLocalValue } from "@/lib/format";
import { getMatchDetail, listProfiles } from "@/lib/queries";
import { IconPin } from "@/components/icons";

export const metadata: Metadata = { title: "Gestione partita" };

export default async function AdminMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin();

  const [detail, profiles] = await Promise.all([getMatchDetail(id), listProfiles()]);
  if (!detail) notFound();

  const { match, roster, result } = detail;

  return (
    <>
      <PageHeader
        back={
          <Link href="/admin/matches" className="text-[13px] text-muted hover:text-ink">
            ← Tutte le partite
          </Link>
        }
        title={`${match.team_a_name} vs ${match.team_b_name}`}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13.5px] text-muted">
            <span>{formatMatchDate(match.match_date)}</span>
            <span className="inline-flex items-center gap-1.5">
              <IconPin className="size-4" />
              {match.location}
            </span>
          </span>
        }
        action={
          <div className="flex items-center gap-2">
            <StatusChip status={match.status} />
            <Link
              href={`/matches/${match.id}`}
              className={buttonClass({ variant: "secondary", size: "sm" })}
            >
              Vista pubblica
            </Link>
          </div>
        }
      />

      <MatchAdminPanel
        match={match}
        roster={roster}
        profiles={profiles}
        result={result}
        defaultDateLocal={toDatetimeLocalValue(match.match_date)}
      />
    </>
  );
}
