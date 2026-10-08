import { formatMatchDate } from "@/lib/format";
import { FORMAT_LABELS } from "@/lib/positions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database.types";
import type { MatchFormat } from "@/types/domain";

/**
 * Invio delle notifiche Telegram.
 *
 * Il bot parla con le chat private che hanno premuto Start. Il `chat_id` viene
 * consegnato dal webhook e salvato in `telegram_subscribers`: qui lo si legge
 * con la service role e si manda il messaggio.
 *
 * Tutte le funzioni degrado con grazia: se il bot non è configurato o Telegram
 * non risponde, tornano `false` / non fanno nulla, senza far fallire l'azione
 * dell'app che ha innescato la notifica.
 *
 * Ogni avviso inviato resta in `telegram_notifications` con l'esito per chat in
 * `telegram_deliveries`: serve a sapere chi ha ricevuto cosa e a rimandarlo a chi
 * collega il bot più tardi.
 */

const TELEGRAM_API = "https://api.telegram.org";
const SEND_TIMEOUT_MS = 5_000;
/** Quanto indietro si guarda quando una chat nuova recupera gli avvisi persi. */
const CATCH_UP_WINDOW_DAYS = 7;
/** Tetto agli avvisi recuperati: meglio pochi che una raffica. */
const CATCH_UP_MAX = 5;
/** Dopo quanti giorni gli avvisi si possono buttare. */
const NOTIFICATION_RETENTION_DAYS = 60;
/** Telegram accetta ~1 messaggio al secondo per chat: li spaziamo. */
const CATCH_UP_SPACING_MS = 600;

const adminClient = () => createSupabaseAdminClient();

type Admin = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;
type NotificationRow = Database["public"]["Tables"]["telegram_notifications"]["Row"];
type NotificationKind = NotificationRow["kind"];

export function telegramBotUsername(): string | null {
  const username = process.env.TELEGRAM_BOT_USERNAME?.trim().replace(/^@/, "");
  return username ? username : null;
}

export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && telegramBotUsername());
}

/** Deep-link che apre il bot con il codice di collegamento già dentro. */
export function telegramLinkFor(code: string): string | null {
  const username = telegramBotUsername();
  if (!username) return null;
  return `https://t.me/${username}?start=${encodeURIComponent(code)}`;
}

/**
 * Codice monouso leggibile: niente 0/O/1/I per evitare errori di battitura,
 * anche se in realtà l'utente non lo digita mai (viaggia nel deep-link).
 */
export function generateTelegramLinkCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

/**
 * URL che passa dalla pagina-ponte `/open`: dentro Telegram mostra come aprire
 * il link nel browser del telefono, fuori reindirizza e basta.
 */
export function openInBrowserUrl(path: string): string {
  return `${appBaseUrl()}/open?to=${encodeURIComponent(path)}`;
}

/** Telegram interpreta l'HTML: il testo dell'utente va neutralizzato. */
export function escapeTelegramHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

type Button = { label: string; url: string };

type SendOptions = { button?: Button };

/** Esito di un invio: `ok` più il motivo dell'errore, come lo racconta Telegram. */
export type TelegramSendResult = {
  ok: boolean;
  /** Codice HTTP di Telegram (`403` = bot bloccato, `429` = troppe richieste). */
  status: number | null;
  error: string | null;
};

/** Un singolo messaggio. */
export async function sendTelegramMessage(
  chatId: number,
  text: string,
  options: SendOptions = {},
): Promise<TelegramSendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, status: null, error: "TELEGRAM_BOT_TOKEN non configurato" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);

  try {
    const response = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
        ...(options.button
          ? { reply_markup: { inline_keyboard: [[{ text: options.button.label, url: options.button.url }]] } }
          : {}),
      }),
    });

    if (response.ok) return { ok: true, status: response.status, error: null };

    const detail = (await response.json().catch(() => null)) as { description?: string } | null;
    return {
      ok: false,
      status: response.status,
      error: detail?.description ?? `HTTP ${response.status}`,
    };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return {
      ok: false,
      status: null,
      error: aborted ? "Telegram non ha risposto in tempo" : "Errore di rete verso Telegram",
    };
  } finally {
    clearTimeout(timer);
  }
}

type Broadcast = { text: string; button?: Button };

/* ------------------------------------------------------------------ */
/* Registro degli invii                                                */
/* ------------------------------------------------------------------ */

/**
 * Tiene traccia dell'esito di un invio: riga in `telegram_deliveries` (chi ha
 * ricevuto l'avviso) e ultimo esito sulla riga dell'iscritto.
 *
 * Un `403` significa che Telegram non può più scrivere a quella chat (bot
 * bloccato, utente disattivato): l'iscrizione va messa in pausa, così il
 * profilo lo dice all'utente e non si continua a sprecare invii.
 */
async function recordDelivery(
  admin: Admin,
  notificationId: string,
  chatId: number,
  result: TelegramSendResult,
) {
  const now = new Date().toISOString();

  await admin.from("telegram_deliveries").upsert(
    {
      notification_id: notificationId,
      chat_id: chatId,
      sent_at: now,
      ok: result.ok,
      error: result.error,
    },
    { onConflict: "notification_id,chat_id" },
  );

  if (result.ok) {
    await admin
      .from("telegram_subscribers")
      .update({ last_sent_at: now, last_error: null, last_error_at: null })
      .eq("chat_id", chatId);
    return;
  }

  console.error(`[telegram] invio a ${chatId} fallito: ${result.status ?? "-"} ${result.error ?? ""}`);

  await admin
    .from("telegram_subscribers")
    .update({
      last_error: result.error ?? "Errore sconosciuto",
      last_error_at: now,
      ...(result.status === 403 ? { notifications_enabled: false } : {}),
    })
    .eq("chat_id", chatId);
}

/** Invia un avviso a una chat e registra l'esito. `true` se è partito. */
async function deliverNotification(
  admin: Admin,
  notification: Pick<NotificationRow, "id" | "text" | "button_label" | "button_url">,
  chatId: number,
): Promise<boolean> {
  const button =
    notification.button_label && notification.button_url
      ? { label: notification.button_label, url: notification.button_url }
      : undefined;

  const result = await sendTelegramMessage(chatId, notification.text, { button });
  await recordDelivery(admin, notification.id, chatId, result);
  return result.ok;
}

/** Chat attive a cui va un avviso: tutti, oppure solo i profili indicati. */
async function targetChatIds(admin: Admin, audience: NotificationRow["audience"], profileIds: string[]) {
  const query = admin
    .from("telegram_subscribers")
    .select("chat_id")
    .eq("notifications_enabled", true);

  const { data } =
    audience === "profiles" ? await query.in("profile_id", profileIds) : await query;

  return (data ?? []).map((row) => row.chat_id);
}

/**
 * Registra l'avviso e lo manda a chi deve riceverlo. Ritorna quante chat hanno
 * accettato il messaggio.
 */
async function broadcast(
  input: Broadcast & {
    kind: NotificationKind;
    refId: string | null;
    /** Dopo questo istante l'avviso non serve più (e non si recupera). */
    expiresAt: string | null;
    audience?: NotificationRow["audience"];
    profileIds?: string[];
  },
): Promise<number> {
  if (!process.env.TELEGRAM_BOT_TOKEN) return 0;

  const admin = adminClient();
  if (!admin) return 0;

  const audience = input.audience ?? "all";
  const profileIds = input.profileIds ?? [];

  // Avviso mirato senza destinatari: non c'è niente da registrare.
  if (audience === "profiles" && profileIds.length === 0) return 0;

  const { data: notification, error } = await admin
    .from("telegram_notifications")
    .insert({
      kind: input.kind,
      ref_id: input.refId,
      text: input.text,
      button_label: input.button?.label ?? null,
      button_url: input.button?.url ?? null,
      audience,
      profile_ids: profileIds,
      expires_at: input.expiresAt,
    })
    .select("id, text, button_label, button_url")
    .single();

  if (error || !notification) {
    console.error(`[telegram] avviso non registrato: ${error?.message ?? "nessuna riga"}`);
    return 0;
  }

  const chatIds = await targetChatIds(admin, audience, profileIds);
  if (chatIds.length === 0) return 0;

  const results = await Promise.all(
    chatIds.map((chatId) => deliverNotification(admin, notification, chatId)),
  );
  return results.filter(Boolean).length;
}

/**
 * Un avviso è ancora attuale? Sondaggio ancora aperto, partita non ancora
 * giocata (e non cancellata).
 */
async function stillRelevant(admin: Admin, notifications: NotificationRow[]) {
  const pollIds = notifications.filter((n) => n.kind === "poll" && n.ref_id).map((n) => n.ref_id!);
  const matchIds = notifications
    .filter((n) => n.kind !== "poll" && n.ref_id)
    .map((n) => n.ref_id!);

  const [polls, matches] = await Promise.all([
    pollIds.length > 0
      ? admin.from("polls").select("id, is_closed, closes_at").in("id", pollIds)
      : Promise.resolve({ data: [] as { id: string; is_closed: boolean; closes_at: string | null }[] }),
    matchIds.length > 0
      ? admin.from("matches").select("id, match_date, status").in("id", matchIds)
      : Promise.resolve({ data: [] as { id: string; match_date: string; status: string }[] }),
  ]);

  const openPolls = new Set(
    (polls.data ?? [])
      .filter(
        (poll) =>
          !poll.is_closed &&
          (poll.closes_at === null || new Date(poll.closes_at).getTime() > Date.now()),
      )
      .map((poll) => poll.id),
  );
  const playableMatches = new Set(
    (matches.data ?? [])
      .filter(
        (match) =>
          (match.status === "scheduled" || match.status === "teams_set") &&
          new Date(match.match_date).getTime() > Date.now(),
      )
      .map((match) => match.id),
  );

  return notifications.filter((notification) => {
    if (!notification.ref_id) return true;
    return notification.kind === "poll"
      ? openPolls.has(notification.ref_id)
      : playableMatches.has(notification.ref_id);
  });
}

/**
 * Rimanda a una chat gli avvisi ancora attuali che non ha mai ricevuto (o che
 * le erano falliti). Serve a chi collega il bot dopo la creazione di un
 * sondaggio o di una partita: prima non riceveva nulla di quanto già inviato.
 */
export async function sendMissedNotifications(chatId: number, profileId: string): Promise<number> {
  if (!process.env.TELEGRAM_BOT_TOKEN) return 0;

  const admin = adminClient();
  if (!admin) return 0;

  const since = new Date(Date.now() - CATCH_UP_WINDOW_DAYS * 86_400_000).toISOString();
  const { data: candidates } = await admin
    .from("telegram_notifications")
    .select("*")
    .gte("created_at", since)
    .or(`audience.eq.all,profile_ids.cs.{${profileId}}`)
    .order("created_at", { ascending: false })
    .limit(50);

  const now = Date.now();
  const inWindow = (candidates ?? []).filter(
    (notification) =>
      notification.expires_at === null || new Date(notification.expires_at).getTime() > now,
  );
  if (inWindow.length === 0) return 0;

  const { data: delivered } = await admin
    .from("telegram_deliveries")
    .select("notification_id")
    .eq("chat_id", chatId)
    .eq("ok", true)
    .in(
      "notification_id",
      inWindow.map((notification) => notification.id),
    );

  const alreadySent = new Set((delivered ?? []).map((row) => row.notification_id));
  const relevant = await stillRelevant(
    admin,
    inWindow.filter((notification) => !alreadySent.has(notification.id)),
  );
  if (relevant.length === 0) return 0;

  // Dal più vecchio al più recente, e solo gli ultimi: niente raffiche.
  const toSend = relevant.slice(0, CATCH_UP_MAX).reverse();

  // Un rigo di contesto: senza, un avviso vecchio sembra arrivato per sbaglio.
  await sendTelegramMessage(
    chatId,
    toSend.length === 1
      ? "📬 <b>Ti sei collegato dopo</b>\nEcco l'avviso ancora attuale che ti eri perso."
      : `📬 <b>Ti sei collegato dopo</b>\nEcco i ${toSend.length} avvisi ancora attuali che ti eri perso.`,
  );

  let sent = 0;
  for (const notification of toSend) {
    if (sent > 0) await new Promise((resolve) => setTimeout(resolve, CATCH_UP_SPACING_MS));
    if (await deliverNotification(admin, notification, chatId)) sent += 1;
  }

  return sent;
}

/**
 * Manutenzione del registro: gli avvisi oltre la finestra di recupero non
 * servono più (le consegne collegate spariscono per cascata).
 */
export async function pruneOldNotifications(): Promise<number> {
  const admin = adminClient();
  if (!admin) return 0;

  const cutoff = new Date(Date.now() - NOTIFICATION_RETENTION_DAYS * 86_400_000).toISOString();
  const { data } = await admin
    .from("telegram_notifications")
    .delete()
    .lt("created_at", cutoff)
    .select("id");

  return (data ?? []).length;
}

/* ------------------------------------------------------------------ */
/* Messaggi di dominio                                                 */
/* ------------------------------------------------------------------ */

export async function notifyNewPoll(poll: {
  id: string;
  question: string;
  details: string | null;
  creator: string;
  /** Chiusura automatica: oltre quella data l'avviso non si recupera più. */
  closesAt: string | null;
}): Promise<number> {
  const lines = ["📊 <b>Nuovo sondaggio</b>", escapeTelegramHtml(poll.question)];
  if (poll.details) lines.push(`<i>${escapeTelegramHtml(poll.details)}</i>`);
  lines.push(`👤 Creato da ${escapeTelegramHtml(poll.creator)}`);

  return broadcast({
    kind: "poll",
    refId: poll.id,
    expiresAt: poll.closesAt,
    text: lines.join("\n"),
    button: { label: "Apri il sondaggio", url: openInBrowserUrl(`/polls/${poll.id}`) },
  });
}

export async function notifyNewMatch(match: {
  id: string;
  format: MatchFormat;
  matchDate: string;
  location: string;
  creator: string;
}): Promise<number> {
  const text = [
    "⚽ <b>Nuova partita</b>",
    `🗓 ${formatMatchDate(match.matchDate)}`,
    `📍 ${escapeTelegramHtml(match.location)}`,
    FORMAT_LABELS[match.format],
    `👤 Creata da ${escapeTelegramHtml(match.creator)}`,
  ].join("\n");

  return broadcast({
    kind: "match",
    refId: match.id,
    expiresAt: match.matchDate,
    text,
    button: { label: "Conferma la partita", url: openInBrowserUrl(`/matches/${match.id}`) },
  });
}

/**
 * Promemoria ~12 ore prima: lo manda il cron, a tutti gli iscritti.
 * Serve a ricordare di confermare la presenza.
 */
export async function notifyMatchReminder(match: {
  id: string;
  format: MatchFormat;
  matchDate: string;
  location: string;
}): Promise<number> {
  const text = [
    "⏰ <b>Si gioca tra circa 12 ore</b>",
    `🗓 ${formatMatchDate(match.matchDate)}`,
    `📍 ${escapeTelegramHtml(match.location)}`,
    FORMAT_LABELS[match.format],
    "",
    "Hai già confermato? Se non puoi più, ricordati di liberare il posto.",
  ].join("\n");

  return broadcast({
    kind: "match_reminder",
    refId: match.id,
    expiresAt: match.matchDate,
    text,
    button: { label: "Confermo la mia presenza", url: openInBrowserUrl(`/matches/${match.id}`) },
  });
}

/**
 * Forfait: avvisa **solo** chi è in quella partita, non tutto il gruppo.
 * La lista dei giocatori è `match_players`: la riga di chi dà forfait viene
 * cancellata prima di chiamare questa funzione, ma ci si protegge comunque.
 */
export async function notifyMatchFold(input: {
  matchId: string;
  folderProfileId: string;
  folderNickname: string;
}): Promise<number> {
  if (!process.env.TELEGRAM_BOT_TOKEN) return 0;

  const admin = adminClient();
  if (!admin) return 0;

  const [{ data: match }, { data: players }] = await Promise.all([
    admin
      .from("matches")
      .select("match_date, location")
      .eq("id", input.matchId)
      .maybeSingle(),
    admin.from("match_players").select("profile_id").eq("match_id", input.matchId),
  ]);

  if (!match) return 0;

  const teammates = (players ?? [])
    .map((row) => row.profile_id)
    .filter((id) => id !== input.folderProfileId);

  const text = [
    "❌ <b>Ha dato forfait</b>",
    `${escapeTelegramHtml(input.folderNickname)} ha liberato il posto.`,
    `🗓 ${formatMatchDate(match.match_date)}`,
    `📍 ${escapeTelegramHtml(match.location)}`,
  ].join("\n");

  return broadcast({
    kind: "match_fold",
    refId: input.matchId,
    expiresAt: match.match_date,
    audience: "profiles",
    profileIds: teammates,
    text,
    button: { label: "Apri la partita", url: openInBrowserUrl(`/matches/${input.matchId}`) },
  });
}
