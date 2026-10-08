import { z } from "zod";
import { POSITION_CODES } from "@/lib/positions";
import { isWeekStart } from "@/lib/week";

export const FORMATS = ["five_a_side", "eight_a_side", "eleven_a_side"] as const;
export const formatEnum = z.enum(FORMATS);

export const nicknameSchema = z
  .string()
  .trim()
  .min(3, "Il nickname deve avere almeno 3 caratteri.")
  .max(24, "Il nickname può avere al massimo 24 caratteri.")
  .regex(/^[A-Za-z0-9_.-]+$/, "Solo lettere, numeri e i simboli . _ -");

export const emailSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
  z.email("Inserisci un indirizzo email valido."),
);

export const passwordSchema = z
  .string()
  .min(6, "La password deve avere almeno 6 caratteri.")
  .max(72, "La password può avere al massimo 72 caratteri.");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Inserisci la password."),
});

export const registerSchema = z.object({
  nickname: nicknameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Le due password non coincidono.",
    path: ["confirm"],
  });

export const emptyToNull = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => (value === "" || value === null ? undefined : value), schema.optional());

export const profileSchema = z
  .object({
    nickname: nicknameSchema,
    full_name: z.string().trim().max(80, "Massimo 80 caratteri.").optional(),
    positions: z
      .array(z.string())
      .max(40, "Troppe posizioni selezionate.")
      .optional()
      .refine(
        (codes) => (codes ?? []).every((code) => POSITION_CODES.has(code)),
        "Posizione non riconosciuta.",
      ),
    jersey_number: z.union([
      z.coerce
        .number()
        .int("Il numero di maglia deve essere un numero intero.")
        .min(1, "Il numero di maglia va da 1 a 99.")
        .max(99, "Il numero di maglia va da 1 a 99."),
      z.literal(""),
    ]),
    birth_date: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data di nascita non valida."), z.literal("")]),
  });

export const matchSchema = z.object({
  format: formatEnum,
  match_date_local: z.string().min(1, "Indica data e ora della partita."),
  location: z.string().trim().min(2, "Indica il campo.").max(120, "Massimo 120 caratteri."),
  max_players: z.coerce
    .number()
    .int("Numero non valido.")
    .min(2, "Servono almeno 2 posti.")
    .max(40, "Massimo 40 posti."),
  team_a_name: z.string().trim().min(1, "Nome squadra mancante.").max(40, "Massimo 40 caratteri."),
  team_b_name: z.string().trim().min(1, "Nome squadra mancante.").max(40, "Massimo 40 caratteri."),
  notes: z.string().trim().max(500, "Massimo 500 caratteri.").optional(),
});

export const resultSchema = z.object({
  team_a_score: z.coerce.number().int("Punteggio non valido.").min(0, "Punteggio non valido.").max(99),
  team_b_score: z.coerce.number().int("Punteggio non valido.").min(0, "Punteggio non valido.").max(99),
  mvp_profile_id: z.union([z.string().uuid(), z.literal("")]).optional(),
  notes: z.string().trim().max(500, "Massimo 500 caratteri.").optional(),
});

export const teamAssignmentSchema = z.object({
  match_player_id: z.string().uuid("Giocatore non valido."),
  team: z.union([z.enum(["a", "b"]), z.literal("")]),
});

export const playerContributionSchema = z.object({
  match_player_id: z.string().uuid("Giocatore non valido."),
  goals: z.coerce.number().int().min(0, "Valore non valido.").max(99),
  assists: z.coerce.number().int().min(0, "Valore non valido.").max(99),
});

export const attendanceSchema = z.object({
  match_id: z.string().uuid(),
  attendance: z.enum(["present", "maybe", "absent"]),
});

export const adminProfileSchema = z.object({
  profile_id: z.string().uuid(),
  notes: z.string().trim().max(500, "Massimo 500 caratteri.").optional(),
});

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
export const ALLOWED_AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"];

export const MIN_POLL_OPTIONS = 2;
export const MAX_POLL_OPTIONS = 12;

export const pollSchema = z.object({
  question: z
    .string()
    .trim()
    .min(3, "Scrivi la domanda (almeno 3 caratteri).")
    .max(160, "La domanda può avere al massimo 160 caratteri."),
  details: z.string().trim().max(500, "Massimo 500 caratteri.").optional(),
  closes_at: z.string().optional(),
  week_start: z
    .string()
    .optional()
    .refine(
      (value) => !value || isWeekStart(value),
      "La settimana deve iniziare di lunedì.",
    ),
  options: z
    .array(
      z.object({
        label: z.string().trim().max(80, "Massimo 80 caratteri per opzione."),
        starts_at: z.string().optional(),
      }),
    )
    .min(MIN_POLL_OPTIONS, `Servono almeno ${MIN_POLL_OPTIONS} opzioni.`)
    .max(MAX_POLL_OPTIONS, `Massimo ${MAX_POLL_OPTIONS} opzioni.`),
});

/**
 * Voto su un'opzione. `voted` è l'esito che il client si aspetta, non un toggle
 * cieco: così un doppio tap o un retry non invertono il voto.
 */
export const pollVoteSchema = z.object({
  poll_id: z.string().uuid("Sondaggio non valido."),
  option_id: z.string().uuid("Opzione non valida."),
  voted: z.boolean(),
});

export const pollStatusSchema = z.object({
  poll_id: z.string().uuid("Sondaggio non valido."),
  is_closed: z.enum(["true", "false"]),
});

export const MAX_CHAT_MESSAGE_LENGTH = 1000;

/** Un messaggio della chat di gruppo: una riga, fino a 1000 caratteri. */
export const chatMessageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Scrivi qualcosa prima di inviare.")
    .max(MAX_CHAT_MESSAGE_LENGTH, `Massimo ${MAX_CHAT_MESSAGE_LENGTH} caratteri.`),
});

export const chatMessageIdSchema = z.object({
  id: z.string().uuid("Messaggio non valido."),
});
