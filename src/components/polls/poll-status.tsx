import { IconClock, IconLock } from "@/components/icons";
import { formatMatchDate } from "@/lib/format";

const CHIP = "inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-0.5 text-[11px] font-medium";

export function PollStatus({ closed }: { closed: boolean }) {
  if (closed) {
    return (
      <span className={`${CHIP} text-muted`}>
        <IconLock className="size-3" />
        Chiuso
      </span>
    );
  }

  return (
    <span className={`${CHIP} text-ink`}>
      <span className="size-1.5 rounded-full bg-accent" aria-hidden />
      Aperto
    </span>
  );
}

export function PollDeadline({ closesAt }: { closesAt: string | null }) {
  if (!closesAt) return null;

  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-muted">
      <IconClock className="size-3" />
      {formatMatchDate(closesAt)}
    </span>
  );
}
