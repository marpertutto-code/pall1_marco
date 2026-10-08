import type { Attendance, MatchStatus } from "@/types/domain";
import { ATTENDANCE_LABELS, STATUS_LABELS } from "@/lib/format";

const CHIP =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide";

const STATUS_TONE: Record<MatchStatus, string> = {
  scheduled: "bg-surface-2 text-muted",
  teams_set: "bg-surface-2 text-ink",
  played: "bg-surface-2 text-ink",
  cancelled: "bg-surface-2 text-muted line-through decoration-1",
};

const STATUS_DOT: Record<MatchStatus, string> = {
  scheduled: "bg-muted",
  teams_set: "bg-accent",
  played: "bg-win",
  cancelled: "bg-loss",
};

export function StatusChip({ status }: { status: MatchStatus }) {
  return (
    <span className={`${CHIP} ${STATUS_TONE[status]}`}>
      <span className={`size-1.5 rounded-full ${STATUS_DOT[status]}`} aria-hidden />
      {STATUS_LABELS[status]}
    </span>
  );
}

const ATTENDANCE_DOT: Record<Attendance, string> = {
  present: "bg-win",
  maybe: "bg-draw",
  absent: "bg-loss",
};

export function AttendanceChip({ attendance }: { attendance: Attendance }) {
  return (
    <span className={`${CHIP} bg-surface-2 text-muted`}>
      <span className={`size-1.5 rounded-full ${ATTENDANCE_DOT[attendance]}`} aria-hidden />
      {ATTENDANCE_LABELS[attendance]}
    </span>
  );
}

export function JerseyNumber({ value }: { value: number | null }) {
  if (value === null) return null;
  return (
    <span className="num text-[11px] font-semibold text-muted" title="Numero di maglia">
      #{value}
    </span>
  );
}

/** Esito di una partita dal punto di vista di un giocatore. */
export function OutcomeMark({
  outcome,
}: {
  outcome: "win" | "draw" | "loss";
}) {
  const map = {
    win: { label: "V", className: "text-win" },
    draw: { label: "P", className: "text-draw" },
    loss: { label: "S", className: "text-loss" },
  } as const;
  const { label, className } = map[outcome];
  return (
    <span className={`num text-xs font-semibold ${className}`} aria-label={outcome}>
      {label}
    </span>
  );
}
