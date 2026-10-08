import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Client Supabase con la service role: **bypassa la RLS**.
 *
 * Usalo solo lato server e solo dove serve davvero, cioè:
 * - il webhook di Telegram (legge i codici di collegamento e iscrive le chat);
 * - l'invio delle notifiche (legge le chat di tutti).
 *
 * Restituisce `null` se la chiave non è configurata: i chiamanti trattano
 * questa condizione come "notifiche non disponibili", senza far fallire l'azione.
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;

  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
