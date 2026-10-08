import Link from "next/link";
import { StatusChip } from "@/components/ui/badge";
import { humanDay, formatTime } from "@/lib/format";
import { FORMAT_SHORT } from "@/lib/positions";
import { IconPin } from "@/components/icons";
import type { MatchListItem } from "@/types/domain";

export function CapacityBar({
  present,
  max,
  className,
}: {
  present: number;
  max: number;
  className?: string;
}) {
  const ratio = max > 0 ? Math.min(1, present / max) : 0;
  return (
    <div
      className={["h-[3px] w-full overflow-hidden rounded-full bg-surface-2", className]
        .filter(Boolean)
        .join(" ")}
      role="img"
      aria-label={`${present} iscritti su ${max} posti`}
    >
      <div
        className="h-full rounded-full bg-accent"
        style={{ width: `${Math.max(ratio * 100, present > 0 ? 4 : 0)}%` }}
      />
    </div>
  );
}

export function MatchRow({ match }: { match: MatchListItem }) {
  const played = match.status === "played" && match.result;

  return (
    <Link
      href={`/matches/${match.id}`}
      className="flex items-center gap-4 px-4 py-3.5 transition-colors duration-150 hover:bg-surface-2 aria-[current=page]:bg-surface-2"
    >
      <div className="w-[68px] shrink-0">
        <p className="text-[11.5px] text-muted">{humanDay(match.match_date)}</p>
        <p className="num text-[15px] font-semibold leading-tight text-ink">
          {formatTime(match.match_date)}
        </p>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium text-ink">
          {match.team_a_name} <span className="text-muted">vs</span> {match.team_b_name}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 truncate text-[12.5px] text-muted">
          <IconPin className="size-3.5 shrink-0" />
          <span className="truncate">{match.location}</span>
          <span className="num shrink-0">· {FORMAT_SHORT[match.format]}</span>
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        {played && match.result ? (
          <span className="num text-[17px] font-semibold leading-none text-ink">
            {match.result.team_a_score}
            <span className="px-0.5 text-muted">–</span>
            {match.result.team_b_score}
          </span>
        ) : (
          <span className="num text-[13px] font-medium text-muted">
            {match.present_count}/{match.max_players}
          </span>
        )}
        <StatusChip status={match.status} />
      </div>
    </Link>
  );
}
