import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  appBaseUrl,
  escapeTelegramHtml,
  sendMissedNotifications,
  sendTelegramMessage,
} from "@/lib/telegram";

/**
 * Webhook del bot Telegram.
 *
 * Telegram ci manda qui gli aggiornamenti. L'utente non configura nulla: quando
 * preme Start su `t.me/<bot>?start=<codice>`, questo handler legge il `chat_id`
 * dal pacchetto, lo abbina al profilo tramite il codice monouso e lo salva.
 *
 * La rotta è pubblica (Telegram non ha la sessione Pall1) e si difende con il
 * `secret_token` impostato su `setWebhook`, confrontato nell'header.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TelegramUpdate = {
  message?: {
    chat: { id: number; type: string; first_name?: string; username?: string };
    from?: { first_name?: string; username?: string };
    text?: string;
  };
};

const HELP = [
  "Comandi disponibili:",
  "/start — collega o riattiva le notifiche",
  "/stop — metti in pausa le notifiche",
].join("\n");

async function replyUnauthorized(chatId: number) {
  await sendTelegramMessage(
    chatId,
    "⚠️ Le notifiche non sono configurate sul server. Riprova più tardi.",
  );
}

export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || request.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return new NextResponse("forbidden", { status: 403 });
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: true });
  }

  const message = update.message;
  const text = message?.text?.trim();
  if (!message || !text || message.chat.type !== "private") {
    return NextResponse.json({ ok: true });
  }

  const chatId = message.chat.id;
  const firstName = message.from?.first_name ?? message.chat.first_name ?? null;
  const username = message.from?.username ?? message.chat.username ?? null;

  const [command, ...rest] = text.split(/\s+/);
  const payload = rest.join(" ").trim();

  try {
    if (command === "/start") {
      await handleStart(chatId, payload, firstName, username);
    } else if (command === "/stop") {
      await handleStop(chatId);
    } else {
      await sendTelegramMessage(chatId, HELP);
    }
  } catch {
    // Non rilanciare: Telegram ritenterebbe e l'utente vedrebbe errori a raffica.
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}

async function handleStart(
  chatId: number,
  payload: string,
  firstName: string | null,
  username: string | null,
) {
  if (!process.env.TELEGRAM_BOT_TOKEN) return;

  const admin = createSupabaseAdminClient();
  if (!admin) {
    await replyUnauthorized(chatId);
    return;
  }

  if (payload) {
    const { data: code } = await admin
      .from("telegram_link_codes")
      .select("code, profile_id, expires_at")
      .eq("code", payload.toUpperCase())
      .maybeSingle();

    if (!code || new Date(code.expires_at).getTime() <= Date.now()) {
      await sendTelegramMessage(
        chatId,
        "⚠️ Codice non valido o scaduto. Apri il tuo profilo su Pall1 e premi di nuovo «Collega Telegram».",
      );
      return;
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("nickname")
      .eq("id", code.profile_id)
      .maybeSingle();

    await admin.from("telegram_subscribers").upsert(
      {
        chat_id: chatId,
        profile_id: code.profile_id,
        telegram_username: username,
        first_name: firstName,
        notifications_enabled: true,
      },
      { onConflict: "chat_id" },
    );

    await admin.from("telegram_link_codes").delete().eq("code", code.code);

    const name = escapeTelegramHtml(firstName ?? profile?.nickname ?? "ciao");
    await sendTelegramMessage(
      chatId,
      `✅ <b>Collegato!</b>\nCiao ${name}, da ora ricevi qui gli avvisi di Pall1: nuove partite e nuovi sondaggi.\n\nScrivi /stop se vuoi metterli in pausa.`,
      { button: { label: "Apri Pall1", url: appBaseUrl() } },
    );

    // Chi collega il bot dopo la creazione di un sondaggio (o di una partita)
    // riceve gli avvisi ancora attuali che non ha mai visto.
    await sendMissedNotifications(chatId, code.profile_id);
    return;
  }

  // Start senza codice: forse è già collegato.
  const { data: existing } = await admin
    .from("telegram_subscribers")
    .select("profile_id")
    .eq("chat_id", chatId)
    .maybeSingle();

  if (existing) {
    await admin
      .from("telegram_subscribers")
      .update({ notifications_enabled: true })
      .eq("chat_id", chatId);
    await sendTelegramMessage(
      chatId,
      "🔔 Notifiche <b>riattivate</b>. Sei già collegato al tuo profilo Pall1.",
    );

    // Anche chi riattiva dopo una pausa recupera quello che si è perso.
    await sendMissedNotifications(chatId, existing.profile_id);
    return;
  }

  await sendTelegramMessage(
    chatId,
    "👋 Ciao! Per ricevere le notifiche di Pall1 apri il tuo profilo e premi <b>Collega Telegram</b>. Ci pensa il sito ad aprire questa chat col codice giusto.",
    { button: { label: "Vai al profilo", url: `${appBaseUrl()}/profile` } },
  );
}

async function handleStop(chatId: number) {
  const admin = createSupabaseAdminClient();
  if (!admin) return;

  await admin
    .from("telegram_subscribers")
    .update({ notifications_enabled: false })
    .eq("chat_id", chatId);

  await sendTelegramMessage(
    chatId,
    "🔕 Notifiche in pausa. Scrivi /start per riattivarle, oppure gestiscile dal tuo profilo Pall1.",
  );
}
