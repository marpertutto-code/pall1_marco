import { FORMAT_SHORT, MATCH_FORMATS, positionByCode, type PositionDef } from "@/lib/positions";
import type { MatchFormat } from "@/types/domain";

/**
 * Pastiglie con le posizioni preferite. Con `format` filtra sul formato della
 * partita; senza, mostra tutti i formati con il numero come prefisso ("8 · DC").
 */
export function PositionTags({
  codes,
  format,
  showFormat = false,
  max,
  empty,
}: {
  codes: string[];
  format?: MatchFormat;
  showFormat?: boolean;
  max?: number;
  empty?: string;
}) {
  const list = codes
    .map((code) => positionByCode(code))
    .filter((position): position is PositionDef => Boolean(position))
    .filter((position) => (format ? position.format === format : true))
    .sort((a, b) => {
      const byFormat = MATCH_FORMATS.indexOf(a.format) - MATCH_FORMATS.indexOf(b.format);
      return byFormat !== 0 ? byFormat : a.sortOrder - b.sortOrder;
    });

  if (list.length === 0) {
    return empty ? <span className="text-[11.5px] text-muted">{empty}</span> : null;
  }

  const visible = max ? list.slice(0, max) : list;
  const hidden = list.length - visible.length;

  return (
    <span className="flex flex-wrap items-center gap-1">
      {visible.map((position) => (
        <span
          key={position.code}
          title={position.label}
          className="inline-flex items-center gap-1 rounded-[6px] border border-rule px-1.5 py-0.5 text-[11px] font-medium text-ink"
        >
          {showFormat ? (
            <span className="num text-[10px] text-muted">
              {FORMAT_SHORT[position.format].replace("a ", "")}
            </span>
          ) : null}
          {position.shortLabel}
        </span>
      ))}
      {hidden > 0 ? <span className="text-[11px] text-muted">+{hidden}</span> : null}
    </span>
  );
}
