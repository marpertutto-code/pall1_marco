import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateTelegramLinkCode, telegramLinkFor } from "@/lib/telegram";

/**
 * Crea un codice monouso per il profilo e rimanda a Telegram, che apre il bot
 * con `/start <codice>`. L'utente non copia nulla: un solo click.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CODE_TTL_MINUTES = 15;

export async function GET(request: Request) {
  const profile = await requireProfile();
  const supabase = await createSupabaseServerClient();

  // Un solo codice valido per volta.
  await supabase.from("telegram_link_codes").delete().eq("profile_id", profile.id);

  const code = generateTelegramLinkCode();
  const { error } = await supabase.from("telegram_link_codes").insert({
    code,
    profile_id: profile.id,
    expires_at: new Date(Date.now() + CODE_TTL_MINUTES * 60_000).toISOString(),
  });

  if (error) {
    return NextResponse.redirect(new URL("/profile?telegram=error", request.url));
  }

  const link = telegramLinkFor(code);
  if (!link) {
    return NextResponse.redirect(new URL("/profile?telegram=unconfigured", request.url));
  }

  return NextResponse.redirect(link);
}
