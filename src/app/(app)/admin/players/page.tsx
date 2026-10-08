import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { PlayerAdminRow } from "@/components/admin/player-admin-row";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdmin } from "@/lib/auth";
import { listProfilePositions, listProfiles, listPlayerStats } from "@/lib/queries";

export const metadata: Metadata = { title: "Giocatori · Gestione" };

export default async function AdminPlayersPage() {
  const admin = await requireAdmin();
  const [players, stats, positionsByProfile] = await Promise.all([
    listProfiles(),
    listPlayerStats(),
    listProfilePositions(),
  ]);
  const statsById = new Map(stats.map((row) => [row.profile_id, row]));

  const active = players.filter((player) => player.is_active);
  const inactive = players.filter((player) => !player.is_active);

  return (
    <>
      <PageHeader
        title="Giocatori"
        description="Attiva, disattiva, promuovi ad admin e annota."
        back={
          <Link href="/admin" className="text-[13px] text-muted hover:text-ink">
            ← Gestione
          </Link>
        }
      />

      <section>
        <h2 className="mb-3 text-[13px] font-semibold text-muted">Attivi ({active.length})</h2>
        {active.length > 0 ? (
          <ul className="divide-y divide-rule overflow-hidden rounded-card border border-rule bg-surface">
            {active.map((player) => (
              <PlayerAdminRow
                key={player.id}
                player={player}
                isSelf={player.id === admin.id}
                positions={positionsByProfile.get(player.id) ?? []}
              />
            ))}
          </ul>
        ) : (
          <EmptyState title="Nessun giocatore attivo" />
        )}
      </section>

      {inactive.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-3 text-[13px] font-semibold text-muted">Non attivi ({inactive.length})</h2>
          <ul className="divide-y divide-rule overflow-hidden rounded-card border border-rule bg-surface">
            {inactive.map((player) => (
              <PlayerAdminRow
                key={player.id}
                player={player}
                isSelf={player.id === admin.id}
                positions={positionsByProfile.get(player.id) ?? []}
              />
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="mb-3 text-[13px] font-semibold text-muted">Partite giocate per giocatore</h2>
        <ul className="flex flex-wrap gap-2">
          {players.map((player) => (
            <li
              key={player.id}
              className="inline-flex items-center gap-2 rounded-full border border-rule px-3 py-1.5 text-[12.5px] text-muted"
            >
              {player.nickname}
              <span className="num font-semibold text-ink">
                {statsById.get(player.id)?.matches_played ?? 0}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
