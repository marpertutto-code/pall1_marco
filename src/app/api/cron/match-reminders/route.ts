import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { notifyMatchReminder, pruneOldNotifications } from "@/lib/telegram";

/**
 * Promemoria ~12 ore prima della partita.
 *
 * La chiama `pg_cron` (via `pg_net`) ogni 30 minuti. Si può chiamare quante
 * volte si vuole: `reminder_sent_at` garantisce **un solo** invio per partita,
 * anche se due esecuzioni si sovrappongono (la UPDATE condizionata fa da
 * prenotazione atomica).
 *
 * Se `CRON_SECRET` è impostato, serve l'header `Authorization: Bearer <secret>`;
 * altrimenti l'endpoint è aperto — non è un problema, perché il suo unico effetto
 * possibile è mandare i promemoria già in scadenza, una volta ciascuno.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Finestra attorno alle 12 ore: 11–13, così un tick ogni 30 min la copre. */
const WINDOW_FROM_MS = 11 * 60 * 60 * 1000;
const WINDOW_TO_MS = 13 * 60 * 60 * 1000;

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("forbidden", { status: 403 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "service role non configurata" }, { status: 500 });
  }

  const now = Date.now();

  // Manutenzione del registro degli avvisi: oltre il recupero non serve più.
  const pruned = await pruneOldNotifications();

  const { data: matches, error } = await admin
    .from("matches")
    .select("id, match_date, location, format")
    .in("status", ["scheduled", "teams_set"])
    .gte("match_date", new Date(now + WINDOW_FROM_MS).toISOString())
    .lte("match_date", new Date(now + WINDOW_TO_MS).toISOString())
    .is("reminder_sent_at", null);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  let sent = 0;
  let handled = 0;

  for (const match of matches ?? []) {
    // Prenota il promemoria: se un'altra esecuzione l'ha già preso, salta.
    const { data: claimed } = await admin
      .from("matches")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", match.id)
      .is("reminder_sent_at", null)
      .select("id");

    if (!claimed || claimed.length === 0) continue;

    handled += 1;
    sent += await notifyMatchReminder({
      id: match.id,
      format: match.format,
      matchDate: match.match_date,
      location: match.location,
    });
  }

  return NextResponse.json({ ok: true, candidates: matches?.length ?? 0, handled, sent, pruned });
}
