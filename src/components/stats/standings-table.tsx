import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import type { StandingRow } from "@/types/domain";

export function StandingsTable({
  rows,
  limit,
  compact = false,
  subtitleById,
}: {
  rows: StandingRow[];
  limit?: number;
  compact?: boolean;
  subtitleById?: Map<string, string>;
}) {
  const visible = limit ? rows.slice(0, limit) : rows;

  return (
    <div className="overflow-hidden rounded-card border border-rule bg-surface">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">Classifica dei giocatori</caption>
        <thead>
          <tr className="border-b border-rule text-[11px] font-medium text-muted">
            <th scope="col" className="w-9 px-3 py-2.5 text-left font-medium">
              #
            </th>
            <th scope="col" className="px-2 py-2.5 text-left font-medium">
              Giocatore
            </th>
            <th scope="col" className="w-10 px-2 py-2.5 text-right font-medium" title="Partite giocate">
              G
            </th>
            <th scope="col" className="w-10 px-2 py-2.5 text-right font-medium" title="Vittorie">
              V
            </th>
            {compact ? null : (
              <>
                <th scope="col" className="hidden w-10 px-2 py-2.5 text-right font-medium sm:table-cell" title="Pareggi">
                  P
                </th>
                <th scope="col" className="hidden w-10 px-2 py-2.5 text-right font-medium sm:table-cell" title="Sconfitte">
                  S
                </th>
              </>
            )}
            <th scope="col" className="w-12 px-2 py-2.5 text-right font-medium" title="Gol">
              Gol
            </th>
            {compact ? null : (
              <th
                scope="col"
                className="hidden w-12 px-2 py-2.5 text-right font-medium sm:table-cell"
                title="Assist"
              >
                Ass
              </th>
            )}
            <th scope="col" className="w-14 px-3 py-2.5 text-right font-medium" title="Percentuale vittorie">
              %
            </th>
          </tr>
        </thead>
        <tbody>
          {visible.map((row, index) => (
            <tr key={row.id} className="border-b border-rule/70 last:border-b-0">
              <td className="num px-3 py-2.5 text-left text-[12.5px] text-muted">{index + 1}</td>
              <td className="px-2 py-2.5">
                <Link
                  href={`/players/${row.id}`}
                  className="flex min-w-0 items-center gap-2.5 hover:text-accent-text"
                >
                  <Avatar name={row.nickname ?? "?"} src={row.avatar_url} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] font-medium text-ink">
                      {row.nickname ?? "—"}
                    </span>
                    <span className="block truncate text-[11px] text-muted">
                      {subtitleById?.get(row.id ?? "") || "Posizioni da definire"}
                      {row.is_active ? "" : " · inattivo"}
                    </span>
                  </span>
                </Link>
              </td>
              <td className="num px-2 py-2.5 text-right text-[13px]">{row.matches_played ?? 0}</td>
              <td className="num px-2 py-2.5 text-right text-[13px] font-medium text-win">
                {row.wins ?? 0}
              </td>
              {compact ? null : (
                <>
                  <td className="num hidden px-2 py-2.5 text-right text-[13px] sm:table-cell">
                    {row.draws ?? 0}
                  </td>
                  <td className="num hidden px-2 py-2.5 text-right text-[13px] text-loss sm:table-cell">
                    {row.losses ?? 0}
                  </td>
                </>
              )}
              <td className="num px-2 py-2.5 text-right text-[13px] font-medium">{row.goals ?? 0}</td>
              {compact ? null : (
                <td className="num hidden px-2 py-2.5 text-right text-[13px] sm:table-cell">
                  {row.assists ?? 0}
                </td>
              )}
              <td className="num px-3 py-2.5 text-right text-[13px]">
                {row.win_rate === null || row.win_rate === undefined ? "—" : `${row.win_rate}%`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
