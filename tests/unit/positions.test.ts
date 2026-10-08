import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_FORMAT,
  FORMAT_DEFAULT_MAX_PLAYERS,
  FORMAT_LABELS,
  FORMAT_SHORT,
  FORMAT_SQUAD_SIZE,
  MATCH_FORMATS,
  POSITIONS,
  codesForFormat,
  positionByCode,
  positionsForFormat,
  roleGroupsOf,
  shortSummary,
  summarizePositions,
} from "@/lib/positions";

const MIGRATION = new URL(
  "../../supabase/migrations/20261003000700_formats_and_positions.sql",
  import.meta.url,
);

/** Righe della INSERT in `public.positions`. */
function parseSeededPositions() {
  const sql = readFileSync(MIGRATION, "utf8");
  const row = /\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']+)'\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*(\d+)\s*\)/g;

  const parsed = [];
  for (const match of sql.matchAll(row)) {
    parsed.push({
      code: match[1],
      format: match[2],
      label: match[3],
      shortLabel: match[4],
      roleGroup: match[5],
      x: Number(match[6]),
      y: Number(match[7]),
      sortOrder: Number(match[8]),
    });
  }
  return parsed;
}

describe("catalogo posizioni", () => {
  const seeded = parseSeededPositions();

  it("la migrazione semina delle posizioni", () => {
    expect(seeded.length).toBeGreaterThanOrEqual(20);
  });

  it("il catalogo TypeScript e la tabella `positions` coincidono", () => {
    const byCode = new Map(seeded.map((row) => [row.code, row]));

    for (const position of POSITIONS) {
      const row = byCode.get(position.code);
      expect(row, `manca ${position.code} nella migrazione`).toBeDefined();
      expect({
        format: row!.format,
        label: row!.label,
        shortLabel: row!.shortLabel,
        roleGroup: row!.roleGroup,
        x: row!.x,
        y: row!.y,
        sortOrder: row!.sortOrder,
      }).toEqual({
        format: position.format,
        label: position.label,
        shortLabel: position.shortLabel,
        roleGroup: position.roleGroup,
        x: position.x,
        y: position.y,
        sortOrder: position.sortOrder,
      });
    }

    expect(seeded.map((row) => row.code).sort()).toEqual(POSITIONS.map((p) => p.code).sort());
  });

  it("i codici sono univoci e le coordinate stanno nel campo", () => {
    const codes = POSITIONS.map((position) => position.code);
    expect(new Set(codes).size).toBe(codes.length);

    for (const position of POSITIONS) {
      expect(position.x).toBeGreaterThanOrEqual(0);
      expect(position.x).toBeLessThanOrEqual(1);
      expect(position.y).toBeGreaterThanOrEqual(0);
      expect(position.y).toBeLessThanOrEqual(1);
    }
  });

  it("ogni formato ha un portiere e abbastanza posizioni per una squadra", () => {
    for (const format of MATCH_FORMATS) {
      const list = positionsForFormat(format);
      expect(list.length).toBeGreaterThanOrEqual(FORMAT_SQUAD_SIZE[format]);
      expect(list.some((position) => position.roleGroup === "goalkeeper")).toBe(true);
      expect(FORMAT_DEFAULT_MAX_PLAYERS[format]).toBe(FORMAT_SQUAD_SIZE[format] * 2);
      expect(FORMAT_LABELS[format].length).toBeGreaterThan(0);
      expect(FORMAT_SHORT[format].length).toBeGreaterThan(0);
    }
  });

  it("nessuna posizione si sovrappone a un'altra dello stesso formato", () => {
    // Il campo è più alto che largo: una distanza verticale "pesa" 105/68
    // in più sullo schermo. La soglia è in larghezze di campo: un pallino
    // occupa ~44px su ~330px di larghezza, cioè ~0.13.
    const verticalWeight = 105 / 68;
    const minimumDistance = 0.16;

    for (const format of MATCH_FORMATS) {
      const list = positionsForFormat(format);
      for (let i = 0; i < list.length; i += 1) {
        for (let j = i + 1; j < list.length; j += 1) {
          const dx = list[i].x - list[j].x;
          const dy = (list[i].y - list[j].y) * verticalWeight;
          const distance = Math.hypot(dx, dy);
          expect(
            distance,
            `${list[i].code} e ${list[j].code} sono troppo vicini (${distance.toFixed(3)})`,
          ).toBeGreaterThan(minimumDistance);
        }
      }
    }
  });

  it("il formato predefinito è valido", () => {
    expect(MATCH_FORMATS).toContain(DEFAULT_FORMAT);
  });
});

describe("helper delle posizioni", () => {
  it("positionByCode e codesForFormat", () => {
    expect(positionByCode("5_gk")?.label).toBe("Portiere");
    expect(positionByCode("nope")).toBeUndefined();
    expect(codesForFormat(["5_gk", "8_cb", "11_st"], "eight_a_side")).toEqual(["8_cb"]);
  });

  it("roleGroupsOf restituisce i gruppi in ordine di campo", () => {
    expect(roleGroupsOf(["8_st", "8_gk", "8_cb"])).toEqual([
      "goalkeeper",
      "defender",
      "forward",
    ]);
    expect(roleGroupsOf([])).toEqual([]);
  });

  it("summarizePositions usa le etichette estese", () => {
    expect(summarizePositions(["8_gk", "8_cb"])).toBe("Portiere, Difensore centrale");
    expect(summarizePositions(["8_gk"], "five_a_side")).toBe("");
  });

  it("shortSummary è compatto e segnala le eccedenti", () => {
    expect(shortSummary(["8_gk", "5_lat_l"])).toBe("5·LAS · 8·POR");
    expect(shortSummary(["8_gk", "8_cb", "8_rb", "8_lb", "8_dm"])).toContain("+1");
  });
});
