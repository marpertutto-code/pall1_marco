"use server";

import { requireProfile } from "@/lib/auth";
import { errorMessage, firstIssue } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { chatMessageIdSchema, chatMessageSchema } from "@/lib/validation/schemas";
import type { ChatDeleteResult, ChatMessage, ChatSendResult } from "@/types/domain";

/** Quanti messaggi tenere in memoria: oltre non si scorre a mano. */
const RECENT_LIMIT = 200;

type ChatMessageSelect = {
  id: string;
  profile_id: string;
  body: string;
  created_at: string;
};

function toMessage(row: ChatMessageSelect): ChatMessage {
  return {
    id: row.id,
    profileId: row.profile_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

/**
 * Scrive un messaggio a nome proprio. Non chiama `revalidatePath`: la chat si
 * aggiorna in tempo reale, e un refresh del server rimonterebbe inutilmente
 * la lista ottimistica lato client.
 */
export async function sendChatMessage(body: string): Promise<ChatSendResult> {
  const profile = await requireProfile();

  const parsed = chatMessageSchema.safeParse({ body });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({ profile_id: profile.id, body: parsed.data.body })
    .select("id, profile_id, body, created_at")
    .single();

  if (error || !data) return { error: errorMessage(error) };

  return { message: toMessage(data) };
}

/** Elimina un messaggio: la RLS consente solo il proprio o, se admin, qualsiasi. */
export async function deleteChatMessage(id: string): Promise<ChatDeleteResult> {
  await requireProfile();

  const parsed = chatMessageIdSchema.safeParse({ id });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("chat_messages").delete().eq("id", parsed.data.id);
  if (error) return { error: errorMessage(error) };

  return { ok: true };
}

/**
 * Riconciliazione periodica: se il realtime salta (rete, scheda in background)
 * il client recupera comunque gli ultimi messaggi e li unisce ai suoi.
 */
export async function fetchRecentChatMessages(): Promise<ChatMessage[]> {
  await requireProfile();

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("chat_messages")
    .select("id, profile_id, body, created_at")
    .order("created_at", { ascending: false })
    .limit(RECENT_LIMIT);

  return (data ?? []).map(toMessage);
}
