import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  Attendance,
  ChatMessage,
  MatchDetail,
  MatchListItem,
  MatchRow,
  PlayerStatsRow,
  PollDetail,
  PollOptionResult,
  PollRow,
  PollSubPoll,
  PollSummary,
  Profile,
  RosterEntry,
  StandingRow,
  TeamSide,
  TelegramSubscription,
} from "@/types/domain";

type AttendanceRow = { match_id: string; attendance: Attendance };

export async function listMatches(): Promise<MatchListItem[]> {
  const supabase = await createSupabaseServerClient();

  const [matchesResult, playersResult, resultsResult] = await Promise.all([
    supabase.from("matches").select("*").order("match_date", { ascending: false }),
    supabase.from("match_players").select("match_id, attendance"),
    supabase.from("match_results").select("match_id, team_a_score, team_b_score"),
  ]);

  const matches = matchesResult.data ?? [];
  const players = (playersResult.data ?? []) as AttendanceRow[];
  const results = resultsResult.data ?? [];

  const presentCount = new Map<string, number>();
  const maybeCount = new Map<string, number>();
  for (const row of players) {
    if (row.attendance === "present") {
      presentCount.set(row.match_id, (presentCount.get(row.match_id) ?? 0) + 1);
    } else if (row.attendance === "maybe") {
      maybeCount.set(row.match_id, (maybeCount.get(row.match_id) ?? 0) + 1);
    }
  }

  const resultByMatch = new Map(
    results.map((row) => [row.match_id, { team_a_score: row.team_a_score, team_b_score: row.team_b_score }]),
  );

  return matches.map((match) => ({
    id: match.id,
    match_date: match.match_date,
    location: match.location,
    max_players: match.max_players,
    status: match.status,
    format: match.format,
    team_a_name: match.team_a_name,
    team_b_name: match.team_b_name,
    present_count: presentCount.get(match.id) ?? 0,
    maybe_count: maybeCount.get(match.id) ?? 0,
    result: resultByMatch.get(match.id) ?? null,
  }));
}

export function splitMatches(matches: MatchListItem[]) {
  const now = Date.now();
  const upcoming = matches
    .filter((m) => m.status !== "played" && m.status !== "cancelled" && new Date(m.match_date).getTime() >= now - 3 * 3_600_000)
    .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime());

  const past = matches
    .filter((m) => !upcoming.includes(m))
    .sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime());

  return { upcoming, past };
}

export function matchesToClose(matches: MatchListItem[]): MatchListItem[] {
  const now = Date.now();
  return matches.filter(
    (match) =>
      match.status === "teams_set" ||
      (match.status === "scheduled" && new Date(match.match_date).getTime() < now),
  );
}

export async function getMatchById(id: string): Promise<MatchRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("matches").select("*").eq("id", id).maybeSingle();
  return data ?? null;
}

type RosterQueryRow = {
  id: string;
  profile_id: string;
  attendance: Attendance;
  team: TeamSide | null;
  goals: number;
  assists: number;
  profiles: {
    nickname: string;
    full_name: string | null;
    avatar_url: string | null;
    jersey_number: number | null;
    is_active: boolean;
  } | null;
};

/** Mappa `profile_id -> codici posizione` per un insieme di profili. */
export async function getPositionsByProfile(
  profileIds: string[],
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (profileIds.length === 0) return map;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("profile_positions")
    .select("profile_id, position_code")
    .in("profile_id", profileIds);

  for (const row of data ?? []) {
    const list = map.get(row.profile_id) ?? [];
    list.push(row.position_code);
    map.set(row.profile_id, list);
  }

  return map;
}

export async function listProfilePositions(): Promise<Map<string, string[]>> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("profile_positions").select("profile_id, position_code");

  const map = new Map<string, string[]>();
  for (const row of data ?? []) {
    const list = map.get(row.profile_id) ?? [];
    list.push(row.position_code);
    map.set(row.profile_id, list);
  }
  return map;
}

export async function getRoster(matchId: string): Promise<RosterEntry[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("match_players")
    .select(
      "id, profile_id, attendance, team, goals, assists, profiles:profile_id ( nickname, full_name, avatar_url, jersey_number, is_active )",
    )
    .eq("match_id", matchId);

  const rows = (data ?? []) as unknown as RosterQueryRow[];
  const positionsByProfile = await getPositionsByProfile(rows.map((row) => row.profile_id));

  return rows.map((row) => ({
    matchPlayerId: row.id,
    profileId: row.profile_id,
    nickname: row.profiles?.nickname ?? "—",
    fullName: row.profiles?.full_name ?? null,
    avatarUrl: row.profiles?.avatar_url ?? null,
    jerseyNumber: row.profiles?.jersey_number ?? null,
    isActive: row.profiles?.is_active ?? true,
    positions: positionsByProfile.get(row.profile_id) ?? [],
    attendance: row.attendance,
    team: row.team,
    goals: row.goals,
    assists: row.assists,
  }));
}

/**
 * `cache()` evita la query doppia: la pagina di dettaglio chiama questa stessa
 * funzione sia in `generateMetadata` sia nel componente.
 */
export const getMatchDetail = cache(async (id: string): Promise<MatchDetail | null> => {
  const supabase = await createSupabaseServerClient();

  const [match, roster, result] = await Promise.all([
    getMatchById(id),
    getRoster(id),
    supabase.from("match_results").select("*").eq("match_id", id).maybeSingle(),
  ]);

  if (!match) return null;

  return { match, roster, result: result.data ?? null };
});

export async function getMyAttendance(
  matchId: string,
  profileId: string,
): Promise<Attendance | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("match_players")
    .select("attendance")
    .eq("match_id", matchId)
    .eq("profile_id", profileId)
    .maybeSingle();
  return data?.attendance ?? null;
}

export async function listProfiles(): Promise<Profile[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("profiles").select("*").order("nickname", { ascending: true });
  return data ?? [];
}

/**
 * Ultimi messaggi della chat unica di gruppo, dal più vecchio al più recente.
 * Il limite è una rete di sicurezza: la chat si estende caricando la pagina.
 */
export async function listChatMessages(limit = 200): Promise<ChatMessage[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("chat_messages")
    .select("id, profile_id, body, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? [])
    .map((row) => ({
      id: row.id,
      profileId: row.profile_id,
      body: row.body,
      createdAt: row.created_at,
    }))
    .reverse();
}

/** Stessa deduplica di `getMatchDetail`: metadata + pagina, una sola query. */
export const getProfileById = cache(async (id: string): Promise<Profile | null> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  return data ?? null;
});

export async function listStandings(): Promise<StandingRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("standings").select("*");
  return data ?? [];
}

export async function getPlayerStats(profileId: string): Promise<PlayerStatsRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("player_stats")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();
  return data ?? null;
}

export async function listPlayerStats(): Promise<PlayerStatsRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("player_stats").select("*");
  return data ?? [];
}

/* ------------------------------------------------------------------ */
/* Notifiche Telegram                                                 */
/* ------------------------------------------------------------------ */

export async function getMyTelegramSubscription(): Promise<TelegramSubscription | null> {
  const supabase = await createSupabaseServerClient();
  // La RLS limita alla riga del profilo corrente.
  const { data } = await supabase
    .from("telegram_subscribers")
    .select(
      "chat_id, telegram_username, first_name, notifications_enabled, last_sent_at, last_error, last_error_at",
    )
    .maybeSingle();

  if (!data) return null;

  return {
    chatId: data.chat_id,
    username: data.telegram_username,
    firstName: data.first_name,
    enabled: data.notifications_enabled,
    lastSentAt: data.last_sent_at,
    lastError: data.last_error,
    lastErrorAt: data.last_error_at,
  };
}

/* ------------------------------------------------------------------ */
/* Sondaggi                                                            */
/* ------------------------------------------------------------------ */

type PollOptionLite = {
  id: string;
  poll_id: string;
  label: string;
  starts_at: string | null;
  sort_order: number;
};

type PollVoteLite = { poll_id: string; option_id: string; profile_id: string };
type ProfileLite = { id: string; nickname: string; avatar_url: string | null };

type PollData = {
  polls: PollRow[];
  options: PollOptionLite[];
  votes: PollVoteLite[];
  profiles: ProfileLite[];
};

const EMPTY_POLL_DATA: PollData = { polls: [], options: [], votes: [], profiles: [] };

/**
 * Carica solo le righe che servono davvero: `pollIds` limita sondaggi, opzioni
 * e voti, i profili sono quelli dei creatori e dei votanti coinvolti. Prima
 * questa funzione scaricava l'intero archivio dei voti anche per mostrare un
 * solo sondaggio.
 */
async function loadPollData(pollIds: string[]): Promise<PollData> {
  if (pollIds.length === 0) return EMPTY_POLL_DATA;

  const supabase = await createSupabaseServerClient();

  const [pollsResult, optionsResult, votesResult] = await Promise.all([
    supabase.from("polls").select("*").in("id", pollIds),
    supabase
      .from("poll_options")
      .select("id, poll_id, label, starts_at, sort_order")
      .in("poll_id", pollIds)
      .order("sort_order"),
    supabase.from("poll_votes").select("poll_id, option_id, profile_id").in("poll_id", pollIds),
  ]);

  const polls = (pollsResult.data ?? []) as PollRow[];
  const votes = (votesResult.data ?? []) as PollVoteLite[];

  const profileIds = [
    ...new Set([...polls.map((poll) => poll.created_by), ...votes.map((vote) => vote.profile_id)]),
  ];
  const profilesResult =
    profileIds.length > 0
      ? await supabase.from("profiles").select("id, nickname, avatar_url").in("id", profileIds)
      : { data: [] as ProfileLite[] };

  return {
    polls,
    options: (optionsResult.data ?? []) as PollOptionLite[],
    votes,
    profiles: (profilesResult.data ?? []) as ProfileLite[],
  };
}

export function isPollClosed(poll: { is_closed: boolean; closes_at: string | null }) {
  if (poll.is_closed) return true;
  return poll.closes_at !== null && new Date(poll.closes_at).getTime() <= Date.now();
}

/**
 * Quanti sondaggi aspettano il voto di questa persona: alimenta i pallini
 * nelle barre di navigazione, che stanno nel layout e quindi girano su *ogni*
 * pagina. La regola è la stessa di `waitingForMe` in /polls (sondaggi padre,
 * non chiusi, senza un mio voto), così il numero sulla barra e il testo in
 * pagina non possono divergere; le query però sono due select di sole colonne
 * corte, non `listPolls` con opzioni, voti e profili al seguito.
 */
export async function countPendingPolls(myProfileId: string): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const [pollsResult, myVotesResult] = await Promise.all([
    supabase.from("polls").select("id, is_closed, closes_at").is("parent_option_id", null),
    supabase.from("poll_votes").select("poll_id").eq("profile_id", myProfileId),
  ]);

  // I voti sui sottosondaggi orari hanno il poll_id del figlio: non collidono.
  const voted = new Set((myVotesResult.data ?? []).map((vote) => vote.poll_id));
  return (pollsResult.data ?? []).filter((poll) => !isPollClosed(poll) && !voted.has(poll.id))
    .length;
}

function toPollSummary(
  poll: PollRow,
  data: PollData,
  myProfileId: string,
): PollSummary {
  const options = data.options.filter((option) => option.poll_id === poll.id);
  const votes = data.votes.filter((vote) => vote.poll_id === poll.id);
  const creator = data.profiles.find((profile) => profile.id === poll.created_by);

  return {
    id: poll.id,
    question: poll.question,
    details: poll.details,
    allowMultiple: poll.allow_multiple,
    closesAt: poll.closes_at,
    isClosed: poll.is_closed,
    closed: isPollClosed(poll),
    weekStart: poll.week_start,
    parentOptionId: poll.parent_option_id,
    createdAt: poll.created_at,
    createdBy: poll.created_by,
    creatorNickname: creator?.nickname ?? "—",
    creatorAvatarUrl: creator?.avatar_url ?? null,
    optionCount: options.length,
    voterCount: new Set(votes.map((vote) => vote.profile_id)).size,
    myVotes: votes.filter((vote) => vote.profile_id === myProfileId).map((vote) => vote.option_id),
  };
}

export async function listPolls(myProfileId: string): Promise<PollSummary[]> {
  const supabase = await createSupabaseServerClient();
  // I sottosondaggi degli orari non compaiono nell'elenco: vivono dentro il
  // giorno del sondaggio padre. Il filtro sta in SQL, non in JS.
  const { data } = await supabase
    .from("polls")
    .select("id")
    .is("parent_option_id", null)
    .order("created_at", { ascending: false });

  const ids = (data ?? []).map((poll) => poll.id);
  const pollData = await loadPollData(ids);

  return pollData.polls
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((poll) => toPollSummary(poll, pollData, myProfileId));
}

/** Opzioni di un sondaggio con votanti e (per i giorni) sottosondaggio orari. */
function toOptionResults(
  pollId: string,
  data: PollData,
  myProfileId: string,
  withSubPolls: boolean,
): PollOptionResult[] {
  const profileById = new Map(data.profiles.map((profile) => [profile.id, profile]));
  const childByParent = new Map<string, PollRow>();
  if (withSubPolls) {
    for (const candidate of data.polls) {
      if (candidate.parent_option_id) childByParent.set(candidate.parent_option_id, candidate);
    }
  }

  return data.options
    .filter((option) => option.poll_id === pollId)
    .map((option) => ({
      id: option.id,
      label: option.label,
      startsAt: option.starts_at,
      sortOrder: option.sort_order,
      voters: data.votes
        .filter((vote) => vote.option_id === option.id)
        .map((vote) => {
          const profile = profileById.get(vote.profile_id);
          return {
            profileId: vote.profile_id,
            nickname: profile?.nickname ?? "—",
            avatarUrl: profile?.avatar_url ?? null,
          };
        })
        .sort((a, b) => a.nickname.localeCompare(b.nickname)),
      subPoll: withSubPolls
        ? toSubPoll(childByParent.get(option.id), data, myProfileId)
        : null,
    }));
}

function toSubPoll(
  poll: PollRow | undefined,
  data: PollData,
  myProfileId: string,
): PollSubPoll | null {
  if (!poll) return null;

  const votes = data.votes.filter((vote) => vote.poll_id === poll.id);

  return {
    id: poll.id,
    question: poll.question,
    allowMultiple: poll.allow_multiple,
    closed: isPollClosed(poll),
    voterCount: new Set(votes.map((vote) => vote.profile_id)).size,
    myVotes: votes
      .filter((vote) => vote.profile_id === myProfileId)
      .map((vote) => vote.option_id),
    options: toOptionResults(poll.id, data, myProfileId, false),
  };
}

/** Metadata e pagina chiedono lo stesso sondaggio: una sola query per render. */
export const getPollDetail = cache(
  async (id: string, myProfileId: string): Promise<PollDetail | null> => {
    const supabase = await createSupabaseServerClient();

    const { data: poll } = await supabase.from("polls").select("*").eq("id", id).maybeSingle();
    if (!poll) return null;

    // Gli orari stanno in un sottosondaggio per ogni opzione-giorno.
    const { data: options } = await supabase.from("poll_options").select("id").eq("poll_id", id);
    const optionIds = (options ?? []).map((option) => option.id);

    let childIds: string[] = [];
    if (optionIds.length > 0) {
      const { data: children } = await supabase
        .from("polls")
        .select("id")
        .in("parent_option_id", optionIds);
      childIds = (children ?? []).map((child) => child.id);
    }

    const data = await loadPollData([id, ...childIds]);

    return {
      ...toPollSummary(poll, data, myProfileId),
      options: toOptionResults(poll.id, data, myProfileId, true),
    };
  },
);
