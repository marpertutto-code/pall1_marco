type PgError = { code?: string; message?: string; hint?: string | null; details?: string | null };

const TRIGGER_MESSAGES: Record<string, string> = {
  MATCH_FULL: "La partita è al completo: nessun posto libero.",
  MATCH_CLOSED: "La partita è chiusa e non accetta più iscrizioni.",
  UNASSIGNED_PLAYERS: "Ci sono giocatori presenti senza squadra: assegnane uno a testa.",
  TEAMS_INCOMPLETE: "Entrambe le squadre devono avere almeno un giocatore.",
  MISSING_RESULT: "Inserisci il risultato prima di chiudere la partita.",
};

const CODE_MESSAGES: Record<string, string> = {
  "23505": "Valore già in uso: controlla nickname e numero di maglia.",
  "23514": "Dati non validi: controlla i campi inseriti.",
  "23503": "Riferimento non valido.",
  "42501": "Non hai i permessi per questa operazione.",
  PGRST116: "Elemento non trovato.",
};

const RAW_MESSAGES: Array<[string, string]> = [
  ["Invalid login credentials", "Email o password non corretti."],
  ["Email not confirmed", "Devi prima confermare l'indirizzo email che ti abbiamo inviato."],
  ["User already registered", "Esiste già un account con questa email."],
  ["Password should be at least", "Password troppo corta: minimo 6 caratteri."],
  ["New password should be different", "La nuova password deve essere diversa da quella attuale."],
  ["Email rate limit exceeded", "Troppi tentativi: riprova tra qualche minuto."],
  ["invalid format", "Formato email non valido."],
];

export function firstIssue(error: { issues: Array<{ message: string }> }): string {
  return error.issues[0]?.message ?? "Controlla i dati inseriti.";
}

export function errorMessage(error: unknown): string {
  if (!error) return "Si è verificato un errore imprevisto. Riprova.";

  const e = (typeof error === "string" ? { message: error } : error) as PgError;
  const raw = e.message ?? "";

  for (const [needle, message] of Object.entries(TRIGGER_MESSAGES)) {
    if (raw.includes(needle)) return message;
  }

  for (const [needle, message] of RAW_MESSAGES) {
    if (raw.includes(needle)) return message;
  }

  if (e.code && CODE_MESSAGES[e.code]) return CODE_MESSAGES[e.code]!;
  if (raw) return raw;

  return "Si è verificato un errore imprevisto. Riprova.";
}
