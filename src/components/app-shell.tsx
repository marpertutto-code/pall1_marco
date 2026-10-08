import Link from "next/link";
import { signOutAction } from "@/lib/actions/auth";
import { Avatar } from "@/components/ui/avatar";
import { LogoMark } from "@/components/brand/logo-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { BottomNav, RailNav } from "@/components/nav";
import { SectionTabs } from "@/components/section-tabs";
import { IconLogout, IconPitch, IconShield } from "@/components/icons";
import type { Profile } from "@/types/domain";

function Wordmark() {
  return (
    <span className="font-display text-[19px] font-bold tracking-[-0.03em] text-ink">
      Pall<span className="text-accent-text">1</span>
    </span>
  );
}

export function AppShell({
  profile,
  pendingPolls = 0,
  children,
}: {
  profile: Profile;
  /** Sondaggi che aspettano il voto di questa persona: pallini nelle barre. */
  pendingPolls?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[232px_1fr]">
      {/* Rail desktop */}
      <aside className="glass sticky top-0 hidden h-dvh flex-col border-r border-rule px-3 py-5 md:flex">
        <div className="flex items-center gap-2.5 px-3 pb-6">
          <LogoMark className="size-8 text-accent" title="" />
          <Wordmark />
        </div>

        <RailNav
          isAdmin={profile.is_admin}
          isOrganizer={profile.is_organizer}
          pendingPolls={pendingPolls}
        />

        <div className="mt-auto space-y-3 border-t border-rule pt-4">
          <Link
            href="/profile"
            className="flex items-center gap-3 rounded-control px-2 py-2 transition-colors duration-150 hover:bg-surface-2"
          >
            <Avatar name={profile.nickname} src={profile.avatar_url} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-ink">{profile.nickname}</span>
              <span className="block truncate text-[11px] text-muted">
                {profile.is_admin
                  ? "Amministratore"
                  : profile.is_organizer
                    ? "Organizzatore"
                    : "Giocatore"}
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-1">
            <ThemeToggle />
            <form action={signOutAction} className="ml-auto">
              <button
                type="submit"
                className="inline-flex h-10 items-center gap-2 rounded-control px-3 text-[13px] text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
              >
                <IconLogout className="size-[18px]" />
                Esci
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        {/*
         * Barra mobile flottante: non una fascia piena ma pezzi staccati che
         * galleggiano sopra il contenuto (marchio a sinistra, azioni a destra).
         * Il contenitore è trasparente e `pointer-events-none`: i click passano
         * negli spazi vuoti, li intercettano solo i pezzi (che li riattivano).
         */}
        <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center gap-2 px-3 pt-[calc(env(safe-area-inset-top)+0.5rem)] md:hidden">
          <Link
            href="/"
            aria-label="Pall1 — home"
            className="glass pointer-events-auto flex h-11 items-center gap-2.5 rounded-full border border-rule px-3.5"
          >
            <LogoMark className="size-7 text-accent" title="" />
            <Wordmark />
          </Link>

          <div className="pointer-events-auto ml-auto flex items-center gap-2">
            {profile.is_admin ? (
              <Link
                href="/admin"
                className="glass inline-flex h-11 items-center gap-1.5 rounded-full border border-rule px-3.5 text-[12px] font-medium text-muted transition-colors duration-150 hover:text-ink"
              >
                <IconShield className="size-4 text-accent-text" />
                <span className="hidden min-[380px]:inline">Gestione</span>
              </Link>
            ) : profile.is_organizer ? (
              <Link
                href="/matches/new"
                className="glass inline-flex h-11 items-center gap-1.5 rounded-full border border-rule px-3.5 text-[12px] font-medium text-muted transition-colors duration-150 hover:text-ink"
              >
                <IconPitch className="size-4 text-accent-text" />
                <span className="hidden min-[380px]:inline">Organizza</span>
              </Link>
            ) : null}
            <ThemeToggle className="glass size-11 rounded-full border border-rule" />
            <Link
              href="/profile"
              aria-label="Il tuo profilo"
              className="glass flex size-11 items-center justify-center rounded-full border border-rule"
            >
              <Avatar name={profile.nickname} src={profile.avatar_url} size="sm" />
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1040px] flex-1 px-4 pb-[calc(env(safe-area-inset-bottom)+6rem)] pt-[calc(env(safe-area-inset-top)+4.5rem)] md:px-8 md:pb-12 md:pt-8">
          {/*
           * Il selettore partite/sondaggi sta qui e non nelle pagine: è un
           * elemento persistente, quindi passando da una sezione all'altra il
           * suo cursore può scivolare invece di ricomparire già a posto.
           */}
          <SectionTabs pendingPolls={pendingPolls} />
          {children}
        </main>
      </div>

      <BottomNav pendingPolls={pendingPolls} />
    </div>
  );
}
