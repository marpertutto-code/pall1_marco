import type { MatchFormat, PlayerRole } from "@/types/domain";

export type PositionDef = {
  code: string;
  format: MatchFormat;
  label: string;
  shortLabel: string;
  roleGroup: PlayerRole;
  /** 0 = sinistra, 1 = destra */
  x: number;
  /** 0 = porta avversaria, 1 = nostra porta */
  y: number;
  sortOrder: number;
};

export const MATCH_FORMATS: MatchFormat[] = ["five_a_side", "eight_a_side", "eleven_a_side"];

export const FORMAT_LABELS: Record<MatchFormat, string> = {
  five_a_side: "Calcetto · calcio a 5",
  eight_a_side: "Calciotto · calcio a 8",
  eleven_a_side: "Calcio a 11",
};

export const FORMAT_SHORT: Record<MatchFormat, string> = {
  five_a_side: "a 5",
  eight_a_side: "a 8",
  eleven_a_side: "a 11",
};

/** Giocatori in campo per squadra. */
export const FORMAT_SQUAD_SIZE: Record<MatchFormat, number> = {
  five_a_side: 5,
  eight_a_side: 8,
  eleven_a_side: 11,
};

/** Posti totali consigliati (due squadre). */
export const FORMAT_DEFAULT_MAX_PLAYERS: Record<MatchFormat, number> = {
  five_a_side: 10,
  eight_a_side: 16,
  eleven_a_side: 22,
};

export const DEFAULT_FORMAT: MatchFormat = "eight_a_side";

/**
 * Catalogo delle posizioni.
 *
 * Questa lista rispecchia la tabella `public.positions` (migrazione
 * `20261003000700_formats_and_positions.sql`). Il test `positions.test.ts`
 * confronta i due elenchi e fallisce se divergono: la duplicazione è
 * voluta (il DB serve per l'integrità referenziale, qui serve per disegnare
 * il campo senza una query), ma non deve mai andare fuori sincrono.
 */
export const POSITIONS: PositionDef[] = [
  // ---------------------------------------------------------- calcio a 5
  { code: "5_gk", format: "five_a_side", label: "Portiere", shortLabel: "POR", roleGroup: "goalkeeper", x: 0.5, y: 0.93, sortOrder: 0 },
  { code: "5_def", format: "five_a_side", label: "Difensore", shortLabel: "DIF", roleGroup: "defender", x: 0.5, y: 0.7, sortOrder: 1 },
  { code: "5_lat_r", format: "five_a_side", label: "Laterale destro", shortLabel: "LAD", roleGroup: "midfielder", x: 0.76, y: 0.44, sortOrder: 2 },
  { code: "5_lat_l", format: "five_a_side", label: "Laterale sinistro", shortLabel: "LAS", roleGroup: "midfielder", x: 0.24, y: 0.44, sortOrder: 3 },
  { code: "5_uni", format: "five_a_side", label: "Universale", shortLabel: "UNI", roleGroup: "midfielder", x: 0.5, y: 0.52, sortOrder: 4 },
  { code: "5_pivot", format: "five_a_side", label: "Pivot", shortLabel: "PIV", roleGroup: "forward", x: 0.5, y: 0.16, sortOrder: 5 },
  // ---------------------------------------------------------- calcio a 8
  { code: "8_gk", format: "eight_a_side", label: "Portiere", shortLabel: "POR", roleGroup: "goalkeeper", x: 0.5, y: 0.93, sortOrder: 0 },
  { code: "8_cb", format: "eight_a_side", label: "Difensore centrale", shortLabel: "DC", roleGroup: "defender", x: 0.5, y: 0.74, sortOrder: 1 },
  { code: "8_rb", format: "eight_a_side", label: "Terzino destro", shortLabel: "TD", roleGroup: "defender", x: 0.82, y: 0.66, sortOrder: 2 },
  { code: "8_lb", format: "eight_a_side", label: "Terzino sinistro", shortLabel: "TS", roleGroup: "defender", x: 0.18, y: 0.66, sortOrder: 3 },
  { code: "8_dm", format: "eight_a_side", label: "Mediano", shortLabel: "MED", roleGroup: "midfielder", x: 0.5, y: 0.54, sortOrder: 4 },
  { code: "8_rm", format: "eight_a_side", label: "Esterno destro", shortLabel: "ED", roleGroup: "midfielder", x: 0.82, y: 0.4, sortOrder: 5 },
  { code: "8_lm", format: "eight_a_side", label: "Esterno sinistro", shortLabel: "ES", roleGroup: "midfielder", x: 0.18, y: 0.4, sortOrder: 6 },
  { code: "8_st", format: "eight_a_side", label: "Attaccante", shortLabel: "ATT", roleGroup: "forward", x: 0.5, y: 0.16, sortOrder: 7 },
  // ---------------------------------------------------------- calcio a 11
  { code: "11_gk", format: "eleven_a_side", label: "Portiere", shortLabel: "POR", roleGroup: "goalkeeper", x: 0.5, y: 0.94, sortOrder: 0 },
  { code: "11_rb", format: "eleven_a_side", label: "Terzino destro", shortLabel: "TD", roleGroup: "defender", x: 0.86, y: 0.72, sortOrder: 1 },
  { code: "11_cb_r", format: "eleven_a_side", label: "Difensore centrale destro", shortLabel: "DCD", roleGroup: "defender", x: 0.62, y: 0.78, sortOrder: 2 },
  { code: "11_cb_l", format: "eleven_a_side", label: "Difensore centrale sinistro", shortLabel: "DCS", roleGroup: "defender", x: 0.38, y: 0.78, sortOrder: 3 },
  { code: "11_lb", format: "eleven_a_side", label: "Terzino sinistro", shortLabel: "TS", roleGroup: "defender", x: 0.14, y: 0.72, sortOrder: 4 },
  { code: "11_dm", format: "eleven_a_side", label: "Mediano", shortLabel: "MED", roleGroup: "midfielder", x: 0.5, y: 0.58, sortOrder: 5 },
  { code: "11_cm", format: "eleven_a_side", label: "Centrocampista centrale", shortLabel: "CC", roleGroup: "midfielder", x: 0.5, y: 0.46, sortOrder: 6 },
  { code: "11_am", format: "eleven_a_side", label: "Trequartista", shortLabel: "TQ", roleGroup: "midfielder", x: 0.5, y: 0.34, sortOrder: 7 },
  { code: "11_rw", format: "eleven_a_side", label: "Esterno destro", shortLabel: "ED", roleGroup: "forward", x: 0.86, y: 0.26, sortOrder: 8 },
  { code: "11_lw", format: "eleven_a_side", label: "Esterno sinistro", shortLabel: "ES", roleGroup: "forward", x: 0.14, y: 0.26, sortOrder: 9 },
  { code: "11_st", format: "eleven_a_side", label: "Attaccante", shortLabel: "ATT", roleGroup: "forward", x: 0.5, y: 0.14, sortOrder: 10 },
];

const BY_CODE = new Map(POSITIONS.map((position) => [position.code, position]));

export function positionByCode(code: string): PositionDef | undefined {
  return BY_CODE.get(code);
}

export function positionsForFormat(format: MatchFormat): PositionDef[] {
  return POSITIONS.filter((position) => position.format === format).sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
}

export function positionLabel(code: string): string {
  return BY_CODE.get(code)?.label ?? code;
}

export function positionShortLabel(code: string): string {
  return BY_CODE.get(code)?.shortLabel ?? code;
}

/** Codici validi, per validare l'input dei form. */
export const POSITION_CODES = new Set(POSITIONS.map((position) => position.code));

const ROLE_GROUP_ORDER: PlayerRole[] = ["goalkeeper", "defender", "midfielder", "forward"];

/** Gruppi di ruolo coperti dalle posizioni scelte (per bilanciamento e riepiloghi). */
export function roleGroupsOf(codes: string[]): PlayerRole[] {
  const found = new Set<PlayerRole>();
  for (const code of codes) {
    const position = BY_CODE.get(code);
    if (position) found.add(position.roleGroup);
  }
  return ROLE_GROUP_ORDER.filter((group) => found.has(group));
}

/** "Portiere, Laterale destro" — usato nei riepiloghi testuali. */
export function summarizePositions(codes: string[], format?: MatchFormat): string {
  const list = codes
    .map((code) => BY_CODE.get(code))
    .filter((position): position is PositionDef => Boolean(position))
    .filter((position) => !format || position.format === format)
    .sort((a, b) => ROLE_GROUP_ORDER.indexOf(a.roleGroup) - ROLE_GROUP_ORDER.indexOf(b.roleGroup) || a.sortOrder - b.sortOrder);

  if (list.length === 0) return "";
  return list.map((position) => position.label).join(", ");
}

export function codesForFormat(codes: string[], format: MatchFormat): string[] {
  return codes.filter((code) => BY_CODE.get(code)?.format === format);
}

function sortedPositions(codes: string[]): PositionDef[] {
  return codes
    .map((code) => BY_CODE.get(code))
    .filter((position): position is PositionDef => Boolean(position))
    .sort(
      (a, b) =>
        MATCH_FORMATS.indexOf(a.format) - MATCH_FORMATS.indexOf(b.format) ||
        a.sortOrder - b.sortOrder,
    );
}

/** Riepilogo compatto per le tabelle: "5·POR · 8·DC · 8·TD". */
export function shortSummary(codes: string[], max = 4): string {
  const list = sortedPositions(codes);
  const visible = list.slice(0, max).map((position) => {
    const formatNumber = FORMAT_SHORT[position.format].replace("a ", "");
    return `${formatNumber}\u00b7${position.shortLabel}`;
  });
  if (list.length > max) visible.push(`+${list.length - max}`);
  return visible.join(" \u00b7 ");
}
