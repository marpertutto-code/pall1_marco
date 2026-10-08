import { describe, expect, it } from "vitest";
import {
  loginSchema,
  matchSchema,
  pollSchema,
  profileSchema,
  registerSchema,
  resultSchema,
} from "@/lib/validation/schemas";
import { firstIssue, errorMessage } from "@/lib/errors";
import { fromDatetimeLocalValue, humanDay, toDatetimeLocalValue } from "@/lib/format";

describe("loginSchema", () => {
  it("normalizza email (trim + lowercase)", () => {
    const parsed = loginSchema.parse({ email: "  Nome@Esempio.IT ", password: "segreta" });
    expect(parsed.email).toBe("nome@esempio.it");
  });

  it("rifiuta email non valide", () => {
    const result = loginSchema.safeParse({ email: "non-una-email", password: "segreta" });
    expect(result.success).toBe(false);
    if (!result.success) expect(firstIssue(result.error)).toMatch(/email/i);
  });

  it("richiede la password", () => {
    const result = loginSchema.safeParse({ email: "a@b.it", password: "" });
    expect(result.success).toBe(false);
  });
});

describe("registerSchema", () => {
  it("accetta un nickname valido", () => {
    const parsed = registerSchema.parse({
      nickname: "tafo_02",
      email: "tafo@example.it",
      password: "calcetto",
    });
    expect(parsed.nickname).toBe("tafo_02");
  });

  it("rifiuta nickname con caratteri non ammessi", () => {
    const result = registerSchema.safeParse({
      nickname: "taf o!",
      email: "tafo@example.it",
      password: "calcetto",
    });
    expect(result.success).toBe(false);
  });

  it("rifiuta password troppo corte", () => {
    const result = registerSchema.safeParse({
      nickname: "tafo",
      email: "tafo@example.it",
      password: "12345",
    });
    expect(result.success).toBe(false);
  });
});

describe("profileSchema", () => {
  const base = {
    nickname: "tafo",
    full_name: "",
    positions: ["5_gk", "8_cb"],
    jersey_number: "",
    birth_date: "",
  };

  it("accetta campi opzionali vuoti", () => {
    const parsed = profileSchema.parse(base);
    expect(parsed.jersey_number).toBe("");
    expect(parsed.birth_date).toBe("");
  });

  it("coercizza il numero di maglia da stringa", () => {
    const parsed = profileSchema.parse({ ...base, jersey_number: "10" });
    expect(parsed.jersey_number).toBe(10);
  });

  it("rifiuta numeri di maglia fuori range", () => {
    expect(profileSchema.safeParse({ ...base, jersey_number: "0" }).success).toBe(false);
    expect(profileSchema.safeParse({ ...base, jersey_number: "100" }).success).toBe(false);
  });

  it("accetta posizioni del catalogo su formati diversi", () => {
    const parsed = profileSchema.parse({
      ...base,
      positions: ["5_gk", "5_lat_r", "11_cb_l"],
    });
    expect(parsed.positions).toEqual(["5_gk", "5_lat_r", "11_cb_l"]);
  });

  it("rifiuta posizioni inventate", () => {
    const result = profileSchema.safeParse({ ...base, positions: ["8_gk", "portiere"] });
    expect(result.success).toBe(false);
    if (!result.success) expect(firstIssue(result.error)).toMatch(/posizione/i);
  });

  it("accetta un profilo senza posizioni", () => {
    expect(profileSchema.safeParse({ ...base, positions: [] }).success).toBe(true);
  });

  it("rifiuta date non valide", () => {
    expect(profileSchema.safeParse({ ...base, birth_date: "12/05/1990" }).success).toBe(false);
  });
});

describe("matchSchema", () => {
  const base = {
    format: "eight_a_side",
    match_date_local: "2026-06-15T21:00",
    location: "Campo Nord",
    max_players: "12",
    team_a_name: "Squadra A",
    team_b_name: "Squadra B",
  };

  it("coercizza max_players e applica i default dei nomi squadra", () => {
    const parsed = matchSchema.parse(base);
    expect(parsed.max_players).toBe(12);
    expect(parsed.format).toBe("eight_a_side");
  });

  it("accetta tutti i formati", () => {
    for (const format of ["five_a_side", "eight_a_side", "eleven_a_side"] as const) {
      expect(matchSchema.safeParse({ ...base, format }).success).toBe(true);
    }
  });

  it("rifiuta un formato sconosciuto", () => {
    expect(matchSchema.safeParse({ ...base, format: "beach_soccer" }).success).toBe(false);
  });

  it("richiede il formato", () => {
    const { format, ...withoutFormat } = base;
    void format;
    expect(matchSchema.safeParse(withoutFormat).success).toBe(false);
  });

  it("rifiuta un numero di posti fuori range", () => {
    const result = matchSchema.safeParse({ ...base, max_players: "1" });
    expect(result.success).toBe(false);
  });
});

describe("resultSchema", () => {
  it("accetta punteggi a zero", () => {
    const parsed = resultSchema.parse({ team_a_score: "0", team_b_score: "3" });
    expect(parsed.team_b_score).toBe(3);
  });

  it("rifiuta punteggi negativi", () => {
    expect(resultSchema.safeParse({ team_a_score: "-1", team_b_score: "0" }).success).toBe(false);
  });
});

describe("errorMessage", () => {
  it("traduce gli errori dei trigger", () => {
    expect(errorMessage({ message: 'exception MATCH_FULL', code: "P0001" })).toMatch(/completo/i);
    expect(errorMessage({ message: "MISSING_RESULT" })).toMatch(/risultato/i);
  });

  it("traduce gli errori di unicità", () => {
    expect(errorMessage({ code: "23505", message: "duplicate key" })).toMatch(/già in uso/i);
  });

  it("traduce gli errori di credenziali", () => {
    expect(errorMessage({ message: "Invalid login credentials" })).toMatch(/email o password/i);
  });
});

describe("pollSchema", () => {
  const base = {
    question: "Quale giorno giochiamo?",
    details: "",
    closes_at: "",
    options: [
      { label: "Martedì", starts_at: "" },
      { label: "Giovedì", starts_at: "" },
    ],
  };

  it("accetta un sondaggio con due opzioni", () => {
    const parsed = pollSchema.parse(base);
    expect(parsed.options).toHaveLength(2);
    expect(parsed.question).toBe("Quale giorno giochiamo?");
  });

  it("rifiuta meno di due opzioni", () => {
    const result = pollSchema.safeParse({ ...base, options: [{ label: "Martedì" }] });
    expect(result.success).toBe(false);
  });

  it("rifiuta una domanda troppo corta", () => {
    const result = pollSchema.safeParse({ ...base, question: "Ok" });
    expect(result.success).toBe(false);
  });

  it("rifiuta più di dodici opzioni", () => {
    const options = Array.from({ length: 13 }, (_, index) => ({ label: `Opzione ${index + 1}` }));
    const result = pollSchema.safeParse({ ...base, options });
    expect(result.success).toBe(false);
  });

  it("accetta opzioni collegate a una data", () => {
    const parsed = pollSchema.parse({
      ...base,
      options: [
        { label: "Martedì 21:00", starts_at: "2026-06-15T21:00" },
        { label: "Giovedì 21:00", starts_at: "2026-06-17T21:00" },
      ],
    });
    expect(parsed.options[0].starts_at).toBe("2026-06-15T21:00");
  });
});

describe("fuso orario", () => {
  it("converte l'ora di Roma in UTC (estate: UTC+2)", () => {
    expect(fromDatetimeLocalValue("2026-06-15T21:00")).toBe("2026-06-15T19:00:00.000Z");
  });

  it("converte l'ora di Roma in UTC (inverno: UTC+1)", () => {
    expect(fromDatetimeLocalValue("2026-01-15T21:00")).toBe("2026-01-15T20:00:00.000Z");
  });

  it("fa il giro completo andata e ritorno", () => {
    const iso = fromDatetimeLocalValue("2026-09-08T20:30");
    expect(iso).not.toBeNull();
    expect(toDatetimeLocalValue(iso!)).toBe("2026-09-08T20:30");
  });

  it("etichetta la giornata corrente", () => {
    expect(humanDay(new Date().toISOString())).toBe("Oggi");
  });
});
