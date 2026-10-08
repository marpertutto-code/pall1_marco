"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconCalendar,
  IconChat,
  IconHome,
  IconPitch,
  IconShield,
  IconUser,
  IconUsers,
} from "@/components/icons";
import { PendingBadge, pendingPollsLabel } from "@/components/ui/pending-badge";

/*
 * «Programma» è la sezione che contiene il calendario delle partite *e* i
 * sondaggi con cui si decide quando giocare: da qui l'icona del calendario,
 * non quella del campo. La sotto-navigazione (barra sotto la topbar) tiene i
 * nomi delle due pagine.
 */
const ITEMS = [
  { href: "/", label: "Home", Icon: IconHome, exact: true, also: [] },
  { href: "/matches", label: "Programma", Icon: IconCalendar, exact: false, also: ["/polls"] },
  { href: "/chat", label: "Chat", Icon: IconChat, exact: false, also: [] },
  { href: "/players", label: "Giocatori", Icon: IconUsers, exact: false, also: [] },
  { href: "/profile", label: "Profilo", Icon: IconUser, exact: false, also: [] },
] as const;

function isActive(pathname: string, href: string, exact: boolean, also: readonly string[] = []) {
  if (exact) return pathname === href;
  if (pathname === href || pathname.startsWith(`${href}/`)) return true;
  return also.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function RailNav({
  isAdmin,
  isOrganizer = false,
  pendingPolls = 0,
}: {
  isAdmin: boolean;
  isOrganizer?: boolean;
  pendingPolls?: number;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5" aria-label="Navigazione principale">
      {ITEMS.map(({ href, label, Icon, exact, also }) => {
        const active = isActive(pathname, href, exact, also);
        const badge = href === "/matches" ? pendingPolls : 0;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={[
              "group flex h-10 items-center gap-3 rounded-control px-3 text-sm transition-colors duration-150",
              active ? "bg-surface-2 font-medium text-ink" : "text-muted hover:bg-surface-2 hover:text-ink",
            ].join(" ")}
          >
            <Icon className={["size-[18px]", active ? "text-accent-text" : "text-muted group-hover:text-ink"].join(" ")} />
            {label}
            <span className="ml-auto flex items-center gap-2">
              <PendingBadge count={badge} />
              {active ? <span className="size-1.5 rounded-full bg-accent" aria-hidden /> : null}
            </span>
            {badge > 0 ? <span className="sr-only">{pendingPollsLabel(badge)}</span> : null}
          </Link>
        );
      })}

      {isAdmin ? (
        <Link
          href="/admin"
          aria-current={pathname.startsWith("/admin") ? "page" : undefined}
          className={[
            "mt-2 flex h-10 items-center gap-3 rounded-control px-3 text-sm transition-colors duration-150",
            pathname.startsWith("/admin")
              ? "bg-surface-2 font-medium text-ink"
              : "text-muted hover:bg-surface-2 hover:text-ink",
          ].join(" ")}
        >
          <IconShield className="size-[18px] text-accent-text" />
          Gestione
          <span className="ml-auto rounded-full border border-rule px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted">
            ADMIN
          </span>
        </Link>
      ) : null}

      {!isAdmin && isOrganizer ? (
        <Link
          href="/matches/new"
          aria-current={pathname.startsWith("/matches/new") ? "page" : undefined}
          className={[
            "mt-2 flex h-10 items-center gap-3 rounded-control px-3 text-sm transition-colors duration-150",
            pathname.startsWith("/matches/new")
              ? "bg-surface-2 font-medium text-ink"
              : "text-muted hover:bg-surface-2 hover:text-ink",
          ].join(" ")}
        >
          <IconPitch className="size-[18px] text-accent-text" />
          Organizza
        </Link>
      ) : null}
    </nav>
  );
}

export function BottomNav({ pendingPolls = 0 }: { pendingPolls?: number }) {
  const pathname = usePathname();
  const index = ITEMS.findIndex(({ href, exact, also }) => isActive(pathname, href, exact, also));

  return (
    <nav
      aria-label="Navigazione principale"
      className="glass-strong glass-pop fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-40 mx-auto w-[calc(100%-1.5rem)] max-w-md rounded-full border border-rule p-1.5 md:hidden"
    >
      {/*
       * Cursore accent sotto la voce attiva. Gli item sono `flex-1` senza gap,
       * quindi la fetta è esattamente `100 / ITEMS.length` e basta traslare di
       * una fetta per ogni passo. Lo strato esterno scivola, quello interno
       * rimbalza (`.squish-pop`, rimontato con `key`).
       */}
      <span aria-hidden className="pointer-events-none absolute inset-1.5">
        {index >= 0 ? (
          <span
            className="absolute inset-y-0 left-0 px-[3px] transition-transform duration-300 ease-out-soft"
            style={{ width: `${100 / ITEMS.length}%`, transform: `translateX(${index * 100}%)` }}
          >
            <span
              key={pathname}
              className="squish-pop block size-full rounded-full bg-accent/12 dark:bg-accent/22"
            />
          </span>
        ) : null}
      </span>

      <ul className="relative flex items-stretch">
        {ITEMS.map(({ href, label, Icon, exact, also }) => {
          const active = isActive(pathname, href, exact, also);
          const badge = href === "/matches" ? pendingPolls : 0;
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={[
                  "flex h-[52px] flex-col items-center justify-center gap-0.5 rounded-full text-[10.5px] font-medium transition-colors duration-150",
                  active ? "text-accent-text" : "text-muted hover:text-ink",
                ].join(" ")}
              >
                <span className="relative">
                  <Icon className="size-[21px]" />
                  <PendingBadge count={badge} className="absolute -top-2 -right-3" />
                </span>
                {label}
                {badge > 0 ? <span className="sr-only">{pendingPollsLabel(badge)}</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
