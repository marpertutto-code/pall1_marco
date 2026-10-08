import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Avatar } from "@/components/ui/avatar";
import { JerseyNumber } from "@/components/ui/badge";
import { PositionTags } from "@/components/positions/position-tags";
import { EmptyState } from "@/components/ui/empty-state";
import { requireProfile } from "@/lib/auth";
import { ageFrom } from "@/lib/format";
import { listProfilePositions, listProfiles, listStandings } from "@/lib/queries";

export const metadata: Metadata = { title: "Giocatori" };

export default async function PlayersPage() {
  await requireProfile();

  const [players, standings, positionsByProfile] = await Promise.all([
    listProfiles(),
    listStandings(),
    listProfilePositions(),
  ]);

  const statsById = new Map(standings.map((row) => [row.id, row]));
  const active = players.filter((p) => p.is_active);
  const inactive = players.filter((p) => !p.is_active);

  return (
    <>
      <PageHeader title="Giocatori" description={`${active.length} attivi nel gruppo.`} />

      <div className="grid gap-3 sm:grid-cols-2">
        {active.map((player) => {
          const stats = statsById.get(player.id);
          const age = ageFrom(player.birth_date);
          const positions = positionsByProfile.get(player.id) ?? [];

          return (
            <Link
              key={player.id}
              href={`/players/${player.id}`}
              className="flex items-start gap-4 rounded-card border border-rule bg-surface p-4 transition-colors duration-150 hover:bg-surface-2"
            >
              <Avatar name={player.nickname} src={player.avatar_url} size="lg" />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[15px] font-semibold text-ink">{player.nickname}</span>
                  <JerseyNumber value={player.jersey_number} />
                </div>

                <p className="mt-0.5 truncate text-[12.5px] text-muted">
                  {player.full_name ?? "—"}
                  {age !== null ? ` · ${age} anni` : ""}
                </p>

                <div className="mt-2">
                  <PositionTags
                    codes={positions}
                    showFormat
                    max={5}
                    empty="Posizioni da definire"
                  />
                </div>

                <p className="mt-2.5 text-[12px] text-muted">
                  <span className="num font-semibold text-ink">{stats?.matches_played ?? 0}</span> partite
                  {" · "}
                  <span className="num font-semibold text-ink">{stats?.goals ?? 0}</span> gol
                  {" · "}
                  <span className="num font-semibold text-ink">{stats?.wins ?? 0}</span> vittorie
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {players.length === 0 ? (
        <EmptyState
          title="Nessun giocatore"
          description="Registrandosi, i membri del gruppo compaiono qui."
        />
      ) : null}

      {inactive.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-3 text-[13px] font-semibold text-muted">Non più attivi</h2>
          <ul className="flex flex-wrap gap-2">
            {inactive.map((player) => (
              <li key={player.id}>
                <Link
                  href={`/players/${player.id}`}
                  className="inline-flex items-center gap-2 rounded-full border border-rule px-3 py-1.5 text-[13px] text-muted hover:text-ink"
                >
                  <Avatar name={player.nickname} src={player.avatar_url} size="sm" className="size-6" />
                  {player.nickname}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
