"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PendingBadge, pendingPollsLabel } from "@/components/ui/pending-badge";

const ITEMS = [
  { href: "/matches", label: "Partite" },
  { href: "/polls", label: "Sondaggi" },
] as const;

/**
 * Sezione condivisa partite/sondaggi: sta in cima al contenuto, subito sotto la
 * topbar, e usa lo stesso vetro della barra di navigazione in basso.
 *
 * Vive nel layout e non nelle pagine: così, passando da /matches a /polls,
 * l'indicatore accent è lo stesso elemento e può scivolare da una voce
 * all'altra invece di rimontare già a destinazione.
 */
export function SectionTabs({ pendingPolls = 0 }: { pendingPolls?: number }) {
  const pathname = usePathname();
  const index = ITEMS.findIndex(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  // Fuori da partite e sondaggi la barra non serve e non deve rubare spazio.
  if (index < 0) return null;

  return (
    <div
      role="tablist"
      aria-label="Partite e sondaggi"
      className="glass-strong glass-pop sticky top-[calc(env(safe-area-inset-top)+3.5rem)] z-30 mb-5 flex rounded-full border border-rule p-1.5 md:top-4 md:max-w-[280px]"
    >
      {/*
       * Cursore: lo strato esterno scivola (transition), quello interno rimbalza
       * (`.squish-pop`, rimontato con `key` a ogni cambio di voce).
       */}
      <span aria-hidden className="pointer-events-none absolute inset-1.5">
        <span
          className="absolute inset-y-0 left-0 w-1/2 px-[3px] transition-transform duration-300 ease-out-soft"
          style={{ transform: `translateX(${index * 100}%)` }}
        >
          <span key={index} className="squish-pop block size-full rounded-full bg-accent-solid" />
        </span>
      </span>

      {ITEMS.map((item, i) => {
        const selected = i === index;
        // Sui sondaggi il pallino serve finché non ci sei: una volta dentro, il
        // conteggio lo dice già il titolo della sezione.
        const badge = item.href === "/polls" && !selected ? pendingPolls : 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            role="tab"
            aria-selected={selected}
            className={[
              "relative flex flex-1 items-center justify-center gap-1.5 rounded-full px-3.5 py-2.5",
              "text-[13px] font-medium transition-colors duration-150",
              selected ? "text-accent-on" : "text-muted hover:text-ink",
            ].join(" ")}
          >
            {item.label}
            <PendingBadge count={badge} />
            {badge > 0 ? <span className="sr-only">{pendingPollsLabel(badge)}</span> : null}
          </Link>
        );
      })}
    </div>
  );
}
