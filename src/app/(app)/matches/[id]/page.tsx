import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { AttendanceControl } from "@/components/match/attendance-control";
import { CapacityBar } from "@/components/match/match-row";
import { TeamColumn } from "@/components/match/team-column";
import { AttendanceChip, StatusChip } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClass } from "@/components/ui/button";
import { requireProfile } from "@/lib/auth";
import { FORMAT_SHORT, positionByCode, roleGroupsOf } from "@/lib/positions";
import { formatMatchDate, ROLE_ORDER } from "@/lib/format";
import { getMatchDetail } from "@/lib/queries";
import { IconArrowLeft, IconPin } from "@/components/icons";
import type { RosterEntry } from "@/types/domain";
import { Avatar } from "@/components/ui/avatar";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const detail = await getMatchDetail(id);
  if (!detail) return { title: "Partita non trovata" };
  return { title: `${detail.match.team_a_name} vs ${detail.match.team_b_name}` };
}

function outcome(entry: RosterEntry | undefined, detail: NonNullable<Awaited<ReturnType<typeof getMatchDetail>>>) {
  if (!entry || !detail.result || !entry.team) return null;
  const { team_a_score: a, team_b_score: b } = detail.result;
  if (a === b) return "Pareggio";
  const won = entry.team === "a" ? a > b : b > a;
  return won ? "Vittoria" : "Sconfitta";
}

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireProfile();
  const detail = await getMatchDetail(id);

  if (!detail) notFound();

  const { match, roster, result } = detail;
  const closed = match.status === "played" || match.status === "cancelled";
  const mine = roster.find((entry) => entry.profileId === profile.id);
  const myOutcome = outcome(mine, detail);

  const teamA = roster.filter((entry) => entry.team === "a");
  const teamB = roster.filter((entry) => entry.team === "b");
  const unassigned = roster
    .filter((entry) => entry.team === null && entry.attendance !== "absent")
    .sort((a, b) => {
      const groupsA = roleGroupsOf(
        a.positions.filter((code) => positionByCode(code)?.format === match.format),
      );
      const groupsB = roleGroupsOf(
        b.positions.filter((code) => positionByCode(code)?.format === match.format),
      );
      const left = groupsA.length > 0 ? ROLE_ORDER.indexOf(groupsA[0]) : ROLE_ORDER.length;
      const right = groupsB.length > 0 ? ROLE_ORDER.indexOf(groupsB[0]) : ROLE_ORDER.length;
      if (left !== right) return left - right;
      return a.nickname.localeCompare(b.nickname);
    });
  const teamsFormed = teamA.length > 0 || teamB.length > 0;

  return (
    <>
      <PageHeader
        back={
          <Link href="/matches" className="inline-flex items-center gap-2 text-[13px] text-muted hover:text-ink">
            <IconArrowLeft className="size-4" />
            Tutte le partite
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
            <span className="num">{FORMAT_SHORT[match.format]}</span>
          </span>
        }
        action={<StatusChip status={match.status} />}
      />

      {result ? (
        <section className="mb-6 rounded-card border border-rule bg-surface px-5 py-6">
          <div className="flex items-center justify-center gap-5 md:gap-8">
            <span className="min-w-0 flex-1 truncate text-right text-[14px] font-medium text-ink md:text-[16px]">
              {match.team_a_name}
            </span>
            <span className="num shrink-0 text-[40px] font-bold leading-none tracking-[-0.04em] text-ink md:text-[52px]">
              {result.team_a_score}
              <span className="px-1.5 text-muted">–</span>
              {result.team_b_score}
            </span>
            <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-ink md:text-[16px]">
              {match.team_b_name}
            </span>
          </div>

          {myOutcome ? (
            <p className="mt-4 text-center text-[13px] text-muted">
              Per te: <span className="font-medium text-ink">{myOutcome}</span>
            </p>
          ) : null}

          {result.notes ? (
            <p className="mt-3 text-center text-[13px] text-muted">{result.notes}</p>
          ) : null}
        </section>
      ) : null}

      <section className="mb-8 rounded-card border border-rule bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-[170px] flex-1">
            <p className="text-[13.5px] text-muted">
              <span className="num text-[15px] font-semibold text-ink">
                {roster.filter((entry) => entry.attendance === "present").length}
              </span>{" "}
              su <span className="num">{match.max_players}</span> hanno confermato
            </p>
            <CapacityBar
              present={roster.filter((entry) => entry.attendance === "present").length}
              max={match.max_players}
              className="mt-3 max-w-[280px]"
            />
            {mine ? (
              <div className="mt-3">
                <AttendanceChip attendance={mine.attendance} />
              </div>
            ) : null}
          </div>

          <AttendanceControl matchId={match.id} value={mine?.attendance ?? null} disabled={closed} />
        </div>

        {match.notes ? (
          <p className="mt-5 border-t border-rule pt-4 text-[13px] text-muted">{match.notes}</p>
        ) : null}
      </section>

      {teamsFormed ? (
        <div className="grid gap-4 md:grid-cols-2">
          <TeamColumn
            name={match.team_a_name}
            entries={teamA}
            format={match.format}
            showContributions={match.status === "played"}
          />
          <TeamColumn
            name={match.team_b_name}
            entries={teamB}
            format={match.format}
            showContributions={match.status === "played"}
          />
        </div>
      ) : null}

      {!teamsFormed && unassigned.length > 0 ? (
        <section className="rounded-card border border-rule bg-surface p-4 md:p-5">
          <header className="flex items-baseline justify-between border-b border-rule pb-3">
            <h3 className="text-[14px] font-semibold text-ink">Iscritti</h3>
            <span className="num text-[12px] text-muted">{unassigned.length}</span>
          </header>
          <ul className="mt-1 divide-y divide-rule/70">
            {unassigned.map((entry) => (
              <li key={entry.matchPlayerId} className="flex items-center gap-3 py-2.5">
                <Avatar name={entry.nickname} src={entry.avatarUrl} size="sm" />
                <span className="min-w-0 flex-1 truncate text-[14px] text-ink">{entry.nickname}</span>
                <AttendanceChip attendance={entry.attendance} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!teamsFormed && unassigned.length === 0 ? (
        <EmptyState
          title="Nessun iscritto"
          description="Ancora nessuno ha confermato la presenza. Tocca un pulsante qui sopra per iscriverti."
        />
      ) : null}

      {unassigned.length > 0 && teamsFormed ? (
        <section className="mt-6">
          <h3 className="mb-3 text-[13px] font-semibold text-muted">Presenti senza squadra</h3>
          <ul className="flex flex-wrap gap-2">
            {unassigned.map((entry) => (
              <li
                key={entry.matchPlayerId}
                className="inline-flex items-center gap-2 rounded-full border border-rule px-3 py-1.5 text-[13px] text-muted"
              >
                {entry.nickname}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {profile.is_admin ? (
        <div className="mt-8">
          <Link href={`/admin/matches/${match.id}`} className={buttonClass({ variant: "secondary", size: "md" })}>
            Gestisci questa partita
          </Link>
        </div>
      ) : null}
    </>
  );
}
