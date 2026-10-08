import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState, SectionTitle } from "@/components/ui/empty-state";
import { requireProfile } from "@/lib/auth";
import { listPlayerStats, listProfiles } from "@/lib/queries";

export const metadata: Metadata = { title: "Statistiche" };

export default async function StatsPage() {
  await requireProfile();

  const [stats, players] = await Promise.all([listPlayerStats(), listProfiles()]);
  const profileById = new Map(players.map((player) => [player.id, player]));

  const byGoals = stats
    .slice()
    .sort(
      (a, b) =>
        (b.goals ?? 0) - (a.goals ?? 0) ||
        (b.assists ?? 0) - (a.assists ?? 0) ||
        (b.matches_played ?? 0) - (a.matches_played ?? 0),
    );

  const debutants = players.filter(
    (player) => player.is_active && !stats.some((row) => row.profile_id === player.id),
  );

  return (
    <>
      <PageHeader title="Statistiche" description="Numeri aggiornati partita per partita." />

      {byGoals.length > 0 ? (
        <div className="overflow-hidden rounded-card border border-rule bg-surface">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">Statistiche per giocatore, ordinate per gol</caption>
            <thead>
              <tr className="border-b border-rule text-[11px] text-muted">
                <th scope="col" className="px-4 py-2.5 text-left font-medium">
                  Giocatore
                </th>
                <th scope="col" className="w-12 px-2 py-2.5 text-right font-medium">
                  G
                </th>
                <th scope="col" className="w-14 px-2 py-2.5 text-right font-medium">
                  Gol
                </th>
                <th scope="col" className="w-14 px-2 py-2.5 text-right font-medium">
                  Ass
                </th>
                <th scope="col" className="w-16 px-2 py-2.5 text-right font-medium">
                  V/P/S
                </th>
                <th scope="col" className="w-16 px-4 py-2.5 text-right font-medium">
                  %
                </th>
              </tr>
            </thead>
            <tbody>
              {byGoals.map((row) => {
                const player = profileById.get(row.profile_id ?? "");
                return (
                  <tr key={row.profile_id} className="border-b border-rule/70 last:border-b-0">
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/players/${row.profile_id}`}
                        className="flex min-w-0 items-center gap-2.5 hover:text-accent-text"
                      >
                        <Avatar name={player?.nickname ?? "?"} src={player?.avatar_url} size="sm" />
                        <span className="truncate text-[13.5px] font-medium text-ink">
                          {player?.nickname ?? "—"}
                        </span>
                      </Link>
                    </td>
                    <td className="num px-2 py-2.5 text-right text-[13px]">{row.matches_played ?? 0}</td>
                    <td className="num px-2 py-2.5 text-right text-[13px] font-semibold">{row.goals ?? 0}</td>
                    <td className="num px-2 py-2.5 text-right text-[13px]">{row.assists ?? 0}</td>
                    <td className="num px-2 py-2.5 text-right text-[12.5px] text-muted">
                      {row.wins ?? 0}/{row.draws ?? 0}/{row.losses ?? 0}
                    </td>
                    <td className="num px-4 py-2.5 text-right text-[13px]">
                      {row.win_rate === null || row.win_rate === undefined ? "—" : `${row.win_rate}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="Nessun dato"
          description="Le statistiche si popolano quando le partite vengono chiuse con gol e assist."
        />
      )}

      {debutants.length > 0 ? (
        <section className="mt-8">
          <SectionTitle>Ancora a secco di partite</SectionTitle>
          <ul className="flex flex-wrap gap-2">
            {debutants.map((player) => (
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
