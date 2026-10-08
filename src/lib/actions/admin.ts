"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireOrganizer } from "@/lib/auth";
import { errorMessage, firstIssue } from "@/lib/errors";
import type { FormState } from "@/lib/form-state";
import { fromDatetimeLocalValue } from "@/lib/format";
import { positionByCode, roleGroupsOf } from "@/lib/positions";
import { getMatchById, getRoster } from "@/lib/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notifyNewMatch } from "@/lib/telegram";
import {
  attendanceSchema,
  matchSchema,
  playerContributionSchema,
  resultSchema,
  teamAssignmentSchema,
} from "@/lib/validation/schemas";
import type { MatchFormat, PlayerRole, RosterEntry } from "@/types/domain";

function revalidateMatch(matchId: string) {
  revalidatePath("/");
  revalidatePath("/matches");
  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/standings");
  revalidatePath("/stats");
  revalidatePath("/admin");
  revalidatePath("/admin/matches");
  revalidatePath(`/admin/matches/${matchId}`);
}

/* ------------------------------------------------------------------ */
/* Partite                                                             */
/* ------------------------------------------------------------------ */

export async function createMatchAction(_prev: FormState, formData: FormData): Promise<FormState> {
  // Può creare partite anche un organizzatore, non solo un admin.
  const author = await requireOrganizer();

  const parsed = matchSchema.safeParse({
    format: formData.get("format"),
    match_date_local: formData.get("match_date_local"),
    location: formData.get("location"),
    max_players: formData.get("max_players"),
    team_a_name: formData.get("team_a_name") || "Squadra A",
    team_b_name: formData.get("team_b_name") || "Squadra B",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const matchDate = fromDatetimeLocalValue(parsed.data.match_date_local);
  if (!matchDate) return { error: "Data e ora non valide." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("matches")
    .insert({
      format: parsed.data.format,
      match_date: matchDate,
      location: parsed.data.location,
      max_players: parsed.data.max_players,
      team_a_name: parsed.data.team_a_name,
      team_b_name: parsed.data.team_b_name,
      notes: parsed.data.notes?.trim() ? parsed.data.notes.trim() : null,
      created_by: author.id,
    })
    .select("id")
    .single();

  if (error) return { error: errorMessage(error) };

  // Avviso su Telegram: non deve mai far fallire la creazione.
  await notifyNewMatch({
    id: data.id,
    format: parsed.data.format,
    matchDate,
    location: parsed.data.location,
    creator: author.nickname,
  }).catch(() => {});

  revalidateMatch(data.id);
  // L'organizzatore non ha il pannello di gestione: va alla partita pubblica.
  redirect(author.is_admin ? `/admin/matches/${data.id}` : `/matches/${data.id}`);
}

export async function updateMatchAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const matchId = String(formData.get("match_id") ?? "");

  const parsed = matchSchema.safeParse({
    format: formData.get("format"),
    match_date_local: formData.get("match_date_local"),
    location: formData.get("location"),
    max_players: formData.get("max_players"),
    team_a_name: formData.get("team_a_name") || "Squadra A",
    team_b_name: formData.get("team_b_name") || "Squadra B",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const matchDate = fromDatetimeLocalValue(parsed.data.match_date_local);
  if (!matchDate) return { error: "Data e ora non valide." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("matches")
    .update({
      format: parsed.data.format,
      match_date: matchDate,
      location: parsed.data.location,
      max_players: parsed.data.max_players,
      team_a_name: parsed.data.team_a_name,
      team_b_name: parsed.data.team_b_name,
      notes: parsed.data.notes?.trim() ? parsed.data.notes.trim() : null,
    })
    .eq("id", matchId);

  if (error) return { error: errorMessage(error) };

  revalidateMatch(matchId);
  return { success: "Partita aggiornata." };
}

export async function setMatchStatusAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const matchId = String(formData.get("match_id") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!["scheduled", "teams_set", "played", "cancelled"].includes(status)) {
    return { error: "Stato non valido." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("matches")
    .update({ status: status as "scheduled" | "teams_set" | "played" | "cancelled" })
    .eq("id", matchId);

  if (error) return { error: errorMessage(error) };

  revalidateMatch(matchId);
  return {
    success:
      status === "cancelled"
        ? "Partita annullata."
        : status === "teams_set"
          ? "Squadre confermate."
          : "Stato aggiornato.",
  };
}

/* ------------------------------------------------------------------ */
/* Iscritti gestiti dall'admin                                         */
/* ------------------------------------------------------------------ */

export async function adminSetAttendanceAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const parsed = attendanceSchema.safeParse({
    match_id: formData.get("match_id"),
    attendance: formData.get("attendance"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const profileId = String(formData.get("profile_id") ?? "");
  const supabase = await createSupabaseServerClient();

  if (parsed.data.attendance === "absent") {
    const { error } = await supabase
      .from("match_players")
      .delete()
      .eq("match_id", parsed.data.match_id)
      .eq("profile_id", profileId);
    if (error) return { error: errorMessage(error) };
  } else {
    const { error } = await supabase
      .from("match_players")
      .upsert(
        {
          match_id: parsed.data.match_id,
          profile_id: profileId,
          attendance: parsed.data.attendance,
        },
        { onConflict: "match_id,profile_id" },
      );
    if (error) return { error: errorMessage(error) };
  }

  revalidateMatch(parsed.data.match_id);
  return { success: "Iscrizione aggiornata." };
}

/* ------------------------------------------------------------------ */
/* Squadre                                                             */
/* ------------------------------------------------------------------ */

export async function assignTeamAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();

  const parsed = teamAssignmentSchema.safeParse({
    match_player_id: formData.get("match_player_id"),
    team: formData.get("team"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const matchId = String(formData.get("match_id") ?? "");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("match_players")
    .update({ team: parsed.data.team === "" ? null : parsed.data.team })
    .eq("id", parsed.data.match_player_id);

  if (error) return { error: errorMessage(error) };

  revalidateMatch(matchId);
  return null;
}

const ROLE_PRIORITY: Record<PlayerRole, number> = {
  goalkeeper: 0,
  defender: 1,
  midfielder: 2,
  forward: 3,
};

/**
 * Priorità di un giocatore per il bilanciamento: conta prima le posizioni
 * preferite **per il formato della partita**, e solo in mancanza ripiega su
 * tutte le altre.
 */
function entryPriority(entry: RosterEntry, format: MatchFormat) {
  const forFormat = entry.positions.filter(
    (code) => positionByCode(code)?.format === format,
  );
  const groups = roleGroupsOf(forFormat.length > 0 ? forFormat : entry.positions);

  if (groups.length === 0) return { priority: ROLE_PRIORITY.forward, goalkeeper: false };

  const priority = Math.min(...groups.map((group) => ROLE_PRIORITY[group]));
  return { priority, goalkeeper: groups.includes("goalkeeper") };
}

/**
 * Bilanciamento automatico: portieri divisi per primi, poi riempimento
 * della squadra con meno giocatori (a parità, alternanza).
 */
export async function autoBalanceTeamsAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const matchId = String(formData.get("match_id") ?? "");

  const [roster, match] = await Promise.all([getRoster(matchId), getMatchById(matchId)]);
  if (!match) return { error: "Partita non trovata." };

  const format = match.format;
  const playing = roster
    .filter((entry) => entry.attendance === "present")
    .sort((a, b) => {
      const left = entryPriority(a, format);
      const right = entryPriority(b, format);
      if (left.priority !== right.priority) return left.priority - right.priority;
      return a.nickname.localeCompare(b.nickname);
    });

  if (playing.length < 2) {
    return { error: "Servono almeno due giocatori presenti per formare le squadre." };
  }

  const teamA: string[] = [];
  const teamB: string[] = [];
  let alternate = true;

  for (const entry of playing) {
    const isGoalkeeper = entryPriority(entry, format).goalkeeper;
    let goesToA: boolean;

    if (isGoalkeeper) {
      goesToA = teamA.length <= teamB.length;
    } else if (teamA.length !== teamB.length) {
      goesToA = teamA.length < teamB.length;
    } else {
      goesToA = alternate;
      alternate = !alternate;
    }

    if (goesToA) teamA.push(entry.matchPlayerId);
    else teamB.push(entry.matchPlayerId);
  }

  const supabase = await createSupabaseServerClient();
  const updates = [
    ...teamA.map((id) => supabase.from("match_players").update({ team: "a" as const }).eq("id", id)),
    ...teamB.map((id) => supabase.from("match_players").update({ team: "b" as const }).eq("id", id)),
  ];

  const results = await Promise.all(updates);
  const failed = results.find((result) => result.error);
  if (failed?.error) return { error: errorMessage(failed.error) };

  revalidateMatch(matchId);
  return { success: `Squadre bilanciate: ${teamA.length} vs ${teamB.length}.` };
}

/* ------------------------------------------------------------------ */
/* Gol, assist, risultato                                              */
/* ------------------------------------------------------------------ */

export async function saveContributionsAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const matchId = String(formData.get("match_id") ?? "");

  const ids = formData.getAll("match_player_id").map(String);
  const supabase = await createSupabaseServerClient();

  const payloads: Array<{ id: string; goals: number; assists: number }> = [];

  for (const id of ids) {
    const parsed = playerContributionSchema.safeParse({
      match_player_id: id,
      goals: formData.get(`goals_${id}`) ?? 0,
      assists: formData.get(`assists_${id}`) ?? 0,
    });
    if (!parsed.success) return { error: firstIssue(parsed.error) };
    payloads.push({
      id: parsed.data.match_player_id,
      goals: parsed.data.goals,
      assists: parsed.data.assists,
    });
  }

  const results = await Promise.all(
    payloads.map((payload) =>
      supabase
        .from("match_players")
        .update({ goals: payload.goals, assists: payload.assists })
        .eq("id", payload.id),
    ),
  );

  const failed = results.find((result) => result.error);
  if (failed?.error) return { error: errorMessage(failed.error) };

  revalidateMatch(matchId);
  return { success: "Gol e assist salvati." };
}

export async function saveResultAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const matchId = String(formData.get("match_id") ?? "");

  const parsed = resultSchema.safeParse({
    team_a_score: formData.get("team_a_score"),
    team_b_score: formData.get("team_b_score"),
    mvp_profile_id: formData.get("mvp_profile_id") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const supabase = await createSupabaseServerClient();

  const { error: resultError } = await supabase.from("match_results").upsert(
    {
      match_id: matchId,
      team_a_score: parsed.data.team_a_score,
      team_b_score: parsed.data.team_b_score,
      mvp_profile_id:
        parsed.data.mvp_profile_id && parsed.data.mvp_profile_id !== ""
          ? parsed.data.mvp_profile_id
          : null,
      notes: parsed.data.notes?.trim() ? parsed.data.notes.trim() : null,
      recorded_by: admin.id,
    },
    { onConflict: "match_id" },
  );
  if (resultError) return { error: errorMessage(resultError) };

  const closeMatch = formData.get("close_match") !== null;
  if (closeMatch) {
    const { error: statusError } = await supabase
      .from("matches")
      .update({ status: "played" })
      .eq("id", matchId);
    if (statusError) return { error: errorMessage(statusError) };
  }

  revalidateMatch(matchId);
  return { success: closeMatch ? "Partita chiusa e salvata." : "Risultato salvato." };
}

/* ------------------------------------------------------------------ */
/* Giocatori                                                           */
/* ------------------------------------------------------------------ */

export async function adminUpdatePlayerAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdmin();
  const profileId = String(formData.get("profile_id") ?? "");
  const isActive = formData.get("is_active") === "on";
  const isAdmin = formData.get("is_admin") === "on";
  const isOrganizer = formData.get("is_organizer") === "on";

  if (profileId === admin.id && (!isActive || !isAdmin)) {
    return { error: "Non puoi disattivare o togliere i permessi a te stesso." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      is_active: isActive,
      is_admin: isAdmin,
      is_organizer: isOrganizer,
      notes: String(formData.get("notes") ?? "").trim() || null,
    })
    .eq("id", profileId);

  if (error) return { error: errorMessage(error) };

  revalidatePath("/admin/players");
  revalidatePath("/players");
  revalidatePath("/standings");
  return { success: "Giocatore aggiornato." };
}
