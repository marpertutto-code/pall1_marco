"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { errorMessage, firstIssue } from "@/lib/errors";
import type { FormState } from "@/lib/form-state";
import { fromDatetimeLocalValue } from "@/lib/format";
import { timeSlotsForDay } from "@/lib/poll-times";
import { notifyNewPoll } from "@/lib/telegram";
import { dayLabel, isSunday, weekdayName } from "@/lib/week";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { pollSchema, pollStatusSchema, pollVoteSchema } from "@/lib/validation/schemas";

function revalidatePolls(pollId?: string) {
  revalidatePath("/");
  revalidatePath("/polls");
  // "layout" copre anche i sottosondaggi mostrati dentro il sondaggio padre.
  revalidatePath("/polls", "layout");
  if (pollId) revalidatePath(`/polls/${pollId}`);
}

function optionalIso(value: string | undefined) {
  if (!value) return null;
  return fromDatetimeLocalValue(value);
}

/** Giorno `YYYY-MM-DD` da un valore `datetime-local`. */
function dayKeyFromLocal(value: string | undefined): string | null {
  if (!value) return null;
  const [datePart] = value.split("T");
  return /^\d{4}-\d{2}-\d{2}$/.test(datePart ?? "") ? datePart : null;
}

/**
 * Per ogni giorno del sondaggio crea un sottosondaggio con gli orari proposti
 * (feriali 18–21, sabato 15:30–18:30, passo 30 minuti). La domenica si salta.
 */
async function createTimeSubPolls(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  profileId: string,
  options: { id: string; startsAt: string | undefined }[],
) {
  for (const option of options) {
    const day = dayKeyFromLocal(option.startsAt);
    if (!day || isSunday(day)) continue;

    const slots = timeSlotsForDay(day);
    if (slots.length === 0) continue;

    const { data: subPoll, error: subPollError } = await supabase
      .from("polls")
      .insert({
        question: `Orario per ${dayLabel(day)}`.slice(0, 160),
        details: `Orari preferiti per ${weekdayName(day).toLowerCase()}.`,
        allow_multiple: true,
        parent_option_id: option.id,
        created_by: profileId,
      })
      .select("id")
      .single();

    if (subPollError) return { error: subPollError };

    const { error: slotsError } = await supabase.from("poll_options").insert(
      slots.map((slot, index) => ({
        poll_id: subPoll.id,
        label: slot.label,
        starts_at: optionalIso(slot.startsAt),
        sort_order: index,
      })),
    );

    if (slotsError) return { error: slotsError };
  }

  return { error: null };
}

export async function createPollAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireProfile();

  const labels = formData.getAll("option_label").map(String);
  const startsAt = formData.getAll("option_starts_at").map(String);
  const options = labels.map((label, index) => ({
    label,
    starts_at: startsAt[index] ?? "",
  }));

  const parsed = pollSchema.safeParse({
    question: formData.get("question"),
    details: formData.get("details") ?? "",
    closes_at: String(formData.get("closes_at") ?? ""),
    week_start: String(formData.get("week_start") ?? ""),
    options,
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const validOptions = parsed.data.options.filter((option) => option.label.trim().length > 0);
  if (validOptions.length < 2) {
    return { error: "Servono almeno due opzioni compilate." };
  }

  const closesAt = optionalIso(parsed.data.closes_at);
  if (parsed.data.closes_at && !closesAt) return { error: "La data di chiusura non è valida." };

  const supabase = await createSupabaseServerClient();

  const { data: poll, error } = await supabase
    .from("polls")
    .insert({
      question: parsed.data.question,
      details: parsed.data.details?.trim() ? parsed.data.details.trim() : null,
      allow_multiple: formData.get("allow_multiple") === "on",
      closes_at: closesAt,
      week_start: parsed.data.week_start ? parsed.data.week_start : null,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error) return { error: errorMessage(error) };

  const { data: insertedOptions, error: optionsError } = await supabase
    .from("poll_options")
    .insert(
      validOptions.map((option, index) => ({
        poll_id: poll.id,
        label: option.label.trim(),
        starts_at: optionalIso(option.starts_at),
        sort_order: index,
      })),
    )
    .select("id, sort_order");

  if (optionsError) {
    await supabase.from("polls").delete().eq("id", poll.id);
    return { error: errorMessage(optionsError) };
  }

  // I sottosondaggi degli orari per ogni giorno (attivi di default con una settimana).
  if (formData.get("with_time_subpolls") === "on") {
    const ordered = [...(insertedOptions ?? [])].sort((a, b) => a.sort_order - b.sort_order);
    const { error: subPollsError } = await createTimeSubPolls(
      supabase,
      profile.id,
      ordered.map((option, index) => ({
        id: option.id,
        startsAt: validOptions[index]?.starts_at,
      })),
    );

    if (subPollsError) {
      await supabase.from("polls").delete().eq("id", poll.id);
      return { error: errorMessage(subPollsError) };
    }
  }

  // Avviso su Telegram: non deve mai far fallire la creazione.
  await notifyNewPoll({
    id: poll.id,
    question: parsed.data.question,
    details: parsed.data.details?.trim() ? parsed.data.details.trim() : null,
    creator: profile.nickname,
    // Oltre la chiusura l'avviso non ha più senso: non si recupera.
    closesAt,
  }).catch(() => {});

  revalidatePolls(poll.id);
  redirect(`/polls/${poll.id}`);
}

/**
 * Un giorno spuntato deve avere almeno un orario scelto in quel giorno, e
 * viceversa non si può togliere l'ultimo orario se il giorno resta votato.
 * Restituisce il messaggio d'errore, oppure null se il voto è coerente.
 */
async function checkDayTimeChoice(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  args: { pollId: string; optionId: string; voted: boolean; profileId: string },
): Promise<string | null> {
  const { pollId, optionId, voted, profileId } = args;

  const { data: poll } = await supabase
    .from("polls")
    .select("id, parent_option_id")
    .eq("id", pollId)
    .maybeSingle();
  if (!poll) return "Sondaggio non trovato.";

  // Voto su un orario (opzione di un sottosondaggio).
  if (poll.parent_option_id) {
    if (voted) return null;

    const { data: parentOption } = await supabase
      .from("poll_options")
      .select("poll_id")
      .eq("id", poll.parent_option_id)
      .maybeSingle();
    if (!parentOption) return null;

    const { data: dayVote } = await supabase
      .from("poll_votes")
      .select("option_id")
      .eq("poll_id", parentOption.poll_id)
      .eq("option_id", poll.parent_option_id)
      .eq("profile_id", profileId)
      .maybeSingle();
    if (!dayVote) return null;

    // Restano altri orari dopo questa rimozione?
    const { count } = await supabase
      .from("poll_votes")
      .select("id", { count: "exact", head: true })
      .eq("poll_id", pollId)
      .eq("profile_id", profileId)
      .neq("option_id", optionId);
    if ((count ?? 0) > 0) return null;

    return "Lascia almeno un orario, oppure togli prima la spunta al giorno.";
  }

  // Voto su un giorno (opzione del sondaggio padre).
  if (!voted) return null;

  const { data: child } = await supabase
    .from("polls")
    .select("id")
    .eq("parent_option_id", optionId)
    .maybeSingle();
  if (!child) return null;

  const { count } = await supabase
    .from("poll_votes")
    .select("id", { count: "exact", head: true })
    .eq("poll_id", child.id)
    .eq("profile_id", profileId);
  if ((count ?? 0) > 0) return null;

  const { data: dayOption } = await supabase
    .from("poll_options")
    .select("label")
    .eq("id", optionId)
    .maybeSingle();

  return `Scegli almeno un orario per ${dayOption?.label ?? "questo giorno"}.`;
}

/**
 * Scegliendo un orario il giorno padre si spunta da solo. Restituisce il voto
 * sul giorno da aggiungere insieme all'orario, oppure null se non serve (non è
 * un orario, il giorno è già votato, o il sondaggio dei giorni è chiuso).
 */
async function autoDayVote(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  args: { pollId: string; profileId: string },
): Promise<{ pollId: string; optionId: string } | null> {
  const { pollId, profileId } = args;

  const { data: poll } = await supabase
    .from("polls")
    .select("id, parent_option_id")
    .eq("id", pollId)
    .maybeSingle();
  if (!poll?.parent_option_id) return null;

  const { data: parentOption } = await supabase
    .from("poll_options")
    // Il vincolo disambigua: tra poll_options e polls ci sono due relazioni
    // (opzione → sondaggio e sondaggio → opzione-giorno).
    .select("poll_id, poll:polls!poll_options_poll_id_fkey(is_closed)")
    .eq("id", poll.parent_option_id)
    .maybeSingle();
  if (!parentOption) return null;
  if (parentOption.poll?.is_closed) return null;

  const { data: dayVote } = await supabase
    .from("poll_votes")
    .select("option_id")
    .eq("poll_id", parentOption.poll_id)
    .eq("option_id", poll.parent_option_id)
    .eq("profile_id", profileId)
    .maybeSingle();
  if (dayVote) return null;

  return { pollId: parentOption.poll_id, optionId: poll.parent_option_id };
}

/**
 * Salva il voto dell'utente su un'opzione. L'input è un'intenzione esplicita
 * (`voted`), non un toggle: ripetere la stessa chiamata è innocuo, quindi un
 * doppio tap o un retry non invertono il voto.
 */
export async function setVoteAction(input: {
  poll_id: string;
  option_id: string;
  voted: boolean;
}): Promise<FormState> {
  const profile = await requireProfile();

  const parsed = pollVoteSchema.safeParse(input);
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const { poll_id, option_id, voted } = parsed.data;
  const supabase = await createSupabaseServerClient();

  const choiceError = await checkDayTimeChoice(supabase, {
    pollId: poll_id,
    optionId: option_id,
    voted,
    profileId: profile.id,
  });
  if (choiceError) return { error: choiceError };

  if (voted) {
    // `ignoreDuplicates`: se il voto c'è già non si tocca nulla (niente errore
    // di chiave duplicata, niente trigger di scelta singola da riattivare).
    const { error } = await supabase
      .from("poll_votes")
      .upsert(
        { poll_id, option_id, profile_id: profile.id },
        { onConflict: "option_id,profile_id", ignoreDuplicates: true },
      );
    if (error) return { error: errorMessage(error) };

    // Il giorno del sottosondaggio orari si spunta da solo. Insert semplice:
    // sul sondaggio a scelta singola è il trigger a sostituire il giorno
    // precedente, esattamente come fa il client.
    const autoDay = await autoDayVote(supabase, { pollId: poll_id, profileId: profile.id });
    if (autoDay) {
      const { error: dayError } = await supabase.from("poll_votes").insert({
        poll_id: autoDay.pollId,
        option_id: autoDay.optionId,
        profile_id: profile.id,
      });
      if (dayError) return { error: errorMessage(dayError) };
    }
  } else {
    const { error } = await supabase
      .from("poll_votes")
      .delete()
      .eq("option_id", option_id)
      .eq("profile_id", profile.id);
    if (error) return { error: errorMessage(error) };
  }

  revalidatePolls(poll_id);
  return null;
}

export async function setPollStatusAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireProfile();

  const parsed = pollStatusSchema.safeParse({
    poll_id: formData.get("poll_id"),
    is_closed: String(formData.get("is_closed")),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("polls")
    .update({ is_closed: parsed.data.is_closed === "true" })
    .eq("id", parsed.data.poll_id);

  if (error) return { error: errorMessage(error) };

  revalidatePolls(parsed.data.poll_id);
  return {
    success: parsed.data.is_closed === "true" ? "Sondaggio chiuso." : "Sondaggio riaperto.",
  };
}

export async function deletePollAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireProfile();
  const pollId = String(formData.get("poll_id") ?? "");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("polls").delete().eq("id", pollId);
  if (error) return { error: errorMessage(error) };

  revalidatePolls(pollId);
  redirect("/polls");
}
