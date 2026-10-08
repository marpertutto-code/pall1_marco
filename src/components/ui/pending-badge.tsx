/**
 * Contatore dei sondaggi in attesa di voto, per i pallini delle barre di
 * navigazione. Il numero è decorativo (`aria-hidden`): ai lettori di schermo lo
 * racconta il testo `sr-only` accanto, così il nome accessibile del link resta
 * "Programma: 2 sondaggi in attesa del tuo voto" e non un numero orfano.
 */
export function PendingBadge({ count, className = "" }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span
      aria-hidden
      className={[
        "num flex h-4 min-w-4 items-center justify-center rounded-full",
        "bg-accent-solid px-1 text-[9.5px] font-semibold leading-none text-accent-on",
        className,
      ].join(" ")}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

/** Coda per il testo `sr-only`: "2 sondaggi in attesa del tuo voto". */
export function pendingPollsLabel(count: number) {
  const noun = count === 1 ? "sondaggio" : "sondaggi";
  return `: ${count} ${noun} in attesa del tuo voto`;
}
