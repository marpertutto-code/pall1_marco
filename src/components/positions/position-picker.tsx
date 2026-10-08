"use client";

import { PitchSvg } from "@/components/positions/pitch";
import { FORMAT_SHORT, type PositionDef } from "@/lib/positions";
import type { MatchFormat } from "@/types/domain";

/**
 * Campo 2D su cui si toccano le posizioni preferite.
 * I pallini sono veri <button>: focus da tastiera, area di tocco 44px,
 * `aria-pressed` per lo stato selezionato.
 */
export function PositionPicker({
  positions,
  selected,
  format,
  onToggle,
}: {
  positions: PositionDef[];
  selected: Set<string>;
  format: MatchFormat;
  onToggle: (code: string) => void;
}) {
  return (
    <div className="relative mx-auto aspect-[68/105] w-full max-w-[330px]">
      <PitchSvg className="absolute inset-0 size-full text-line-strong" />

      {positions.map((position) => {
        const isSelected = selected.has(position.code);
        return (
          <button
            key={position.code}
            type="button"
            onClick={() => onToggle(position.code)}
            aria-pressed={isSelected}
            aria-label={`${position.label} — ${FORMAT_SHORT[format]}`}
            title={position.label}
            style={{ left: `${position.x * 100}%`, top: `${position.y * 100}%` }}
            className={[
              "absolute flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border",
              "transition-colors duration-150 ease-out-soft",
              isSelected
                ? "border-accent-solid bg-accent-solid text-accent-on"
                : "border-line-strong bg-surface/90 text-muted hover:border-accent-solid hover:text-ink",
            ].join(" ")}
          >
            <span className="num text-[10.5px] font-semibold tracking-[0.02em]">
              {position.shortLabel}
            </span>
          </button>
        );
      })}
    </div>
  );
}
