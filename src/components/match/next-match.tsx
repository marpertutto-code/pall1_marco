import Link from "next/link";
import { AttendanceControl } from "@/components/match/attendance-control";
import { CapacityBar } from "@/components/match/match-row";
import { StatusChip } from "@/components/ui/badge";
import { humanDay, formatTime } from "@/lib/format";
import { FORMAT_LABELS } from "@/lib/positions";
import { IconChevronRight, IconPin } from "@/components/icons";
import type { Attendance, MatchListItem } from "@/types/domain";

export function NextMatchPanel({
  match,
  myAttendance,
}: {
  match: MatchListItem;
  myAttendance: Attendance | null;
}) {
  const closed = match.status === "played" || match.status === "cancelled";

  return (
    <section className="rounded-card border border-rule bg-surface p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[12.5px] text-muted">{humanDay(match.match_date)}</p>
          <p className="num mt-0.5 text-[36px] font-semibold leading-none tracking-[-0.03em] text-ink md:text-[42px]">
            {formatTime(match.match_date)}
          </p>
          <p className="mt-3 flex items-center gap-1.5 text-[13.5px] text-muted">
            <IconPin className="size-4 shrink-0" />
            <span className="truncate">{match.location}</span>
          </p>
          <p className="mt-1 text-[12.5px] text-muted">{FORMAT_LABELS[match.format]}</p>
        </div>
        <StatusChip status={match.status} />
      </div>

      <div className="mt-6 border-t border-rule pt-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-[170px] flex-1">
            <p className="text-[13.5px] text-muted">
              <span className="num text-[15px] font-semibold text-ink">{match.present_count}</span> su{" "}
              <span className="num">{match.max_players}</span> hanno confermato
            </p>
            <CapacityBar
              present={match.present_count}
              max={match.max_players}
              className="mt-3 max-w-[280px]"
            />
          </div>

          <AttendanceControl
            matchId={match.id}
            value={myAttendance}
            disabled={closed}
            className="sm:w-auto sm:shrink-0"
          />
        </div>

        <Link
          href={`/matches/${match.id}`}
          className="mt-5 inline-flex items-center gap-1 text-[13px] font-medium text-accent-text hover:underline"
        >
          Dettagli e squadre
          <IconChevronRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}
