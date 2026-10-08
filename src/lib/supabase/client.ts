"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";

/**
 * Client Supabase per il browser. Serve al solo Realtime: la sessione è già
 * nei cookie (leggibili da JS), quindi il socket si autentica da solo e la
 * RLS continua a valere su ogni evento.
 *
 * `autoRefreshToken: false` di proposito: a rinnovare la sessione ci pensa solo
 * il proxy (src/lib/supabase/proxy.ts). Con il rinnovo anche qui, proxy e
 * browser usano lo stesso refresh token in parallelo e fuori dalla finestra di
 * `refresh_token_reuse_interval`; Supabase lo legge come riuso e revoca l'intera
 * famiglia di token, buttando fuori l'utente senza errori visibili.
 * Il token fresco arriva dai cookie riscritti dal proxy, quindi qui si legge e basta.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false } },
  );
}
