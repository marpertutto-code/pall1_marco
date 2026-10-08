import type { Database } from "@/types/database.types";

export type MatchStatus = Database["public"]["Enums"]["match_status"];
export type MatchFormat = Database["public"]["Enums"]["match_format"];
export type PlayerRole = Database["public"]["Enums"]["player_role"];
export type Attendance = Database["public"]["Enums"]["attendance_status"];
export type TeamSide = Database["public"]["Enums"]["team_side"];

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type PollRow = Database["public"]["Tables"]["polls"]["Row"];
export type PollOptionRow = Database["public"]["Tables"]["poll_options"]["Row"];
export type PollVoteRow = Database["public"]["Tables"]["poll_votes"]["Row"];
export type MatchRow = Database["public"]["Tables"]["matches"]["Row"];
export type MatchPlayerRow = Database["public"]["Tables"]["match_players"]["Row"];
export type MatchResultRow = Database["public"]["Tables"]["match_results"]["Row"];
export type ChatMessageRow = Database["public"]["Tables"]["chat_messages"]["Row"];
export type StandingRow = Database["public"]["Views"]["standings"]["Row"];
export type PlayerStatsRow = Database["public"]["Views"]["player_stats"]["Row"];

export type MatchListItem = {
  id: string;
  match_date: string;
  location: string;
  max_players: number;
  status: MatchStatus;
  format: MatchFormat;
  team_a_name: string;
  team_b_name: string;
  present_count: number;
  maybe_count: number;
  result: { team_a_score: number; team_b_score: number } | null;
};

export type RosterEntry = {
  matchPlayerId: string;
  profileId: string;
  nickname: string;
  fullName: string | null;
  avatarUrl: string | null;
  jerseyNumber: number | null;
  isActive: boolean;
  /** Codici delle posizioni preferite (tutti i formati). */
  positions: string[];
  attendance: Attendance;
  team: TeamSide | null;
  goals: number;
  assists: number;
};

export type MatchDetail = {
  match: MatchRow;
  roster: RosterEntry[];
  result: MatchResultRow | null;
};

/* ------------------------------------------------------------------ */
/* Notifiche Telegram                                                 */
/* ------------------------------------------------------------------ */

/** Iscrizione Telegram del profilo corrente. */
export type TelegramSubscription = {
  chatId: number;
  username: string | null;
  firstName: string | null;
  enabled: boolean;
  /** Ultimo avviso accettato da Telegram (null = nessuno ancora). */
  lastSentAt: string | null;
  /** Ultimo errore di invio, per capire perché non arriva nulla. */
  lastError: string | null;
  lastErrorAt: string | null;
};

/* ------------------------------------------------------------------ */
/* Sondaggi                                                            */
/* ------------------------------------------------------------------ */

export type PollVoter = {
  profileId: string;
  nickname: string;
  avatarUrl: string | null;
};

export type PollOptionResult = {
  id: string;
  label: string;
  startsAt: string | null;
  sortOrder: number;
  voters: PollVoter[];
  /** Sottosondaggio degli orari legato a questa opzione, se esiste. */
  subPoll: PollSubPoll | null;
};

/**
 * Sondaggio degli orari agganciato al giorno (opzione) di un sondaggio
 * settimanale. È un sondaggio a tutti gli effetti, mostrato in linea.
 */
export type PollSubPoll = {
  id: string;
  question: string;
  allowMultiple: boolean;
  closed: boolean;
  options: PollOptionResult[];
  voterCount: number;
  myVotes: string[];
};

export type PollSummary = {
  id: string;
  question: string;
  details: string | null;
  allowMultiple: boolean;
  closesAt: string | null;
  isClosed: boolean;
  /** Chiuso a mano oppure oltre la scadenza. */
  closed: boolean;
  /** Lunedì della settimana di riferimento, se il sondaggio ne ha una. */
  weekStart: string | null;
  /** Opzione-giorno del padre se è un sottosondaggio degli orari. */
  parentOptionId: string | null;
  createdAt: string;
  createdBy: string;
  creatorNickname: string;
  creatorAvatarUrl: string | null;
  optionCount: number;
  voterCount: number;
  myVotes: string[];
};

export type PollDetail = PollSummary & {
  options: PollOptionResult[];
};

/* ------------------------------------------------------------------ */
/* Chat di gruppo                                                     */
/* ------------------------------------------------------------------ */

/** Anagrafica minima dell'autore, risolta dal client per nickname e avatar. */
export type ChatAuthor = {
  id: string;
  nickname: string;
  avatarUrl: string | null;
};

/** Un messaggio della chat unica di gruppo. */
export type ChatMessage = {
  id: string;
  profileId: string;
  body: string;
  createdAt: string;
};

/** Esito dell'invio: il messaggio salvato oppure il motivo del rifiuto. */
export type ChatSendResult = { message: ChatMessage } | { error: string };

/** Esito della cancellazione: solo conferma oppure errore. */
export type ChatDeleteResult = { ok: true } | { error: string };
