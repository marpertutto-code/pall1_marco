"use client";

import { useActionState } from "react";
import { setTelegramAction } from "@/lib/actions/telegram";
import { buttonClass } from "@/components/ui/button";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { IconBell, IconTelegram } from "@/components/icons";
import { formatMatchDate } from "@/lib/format";
import type { TelegramSubscription } from "@/types/domain";

/** Telegram racconta gli errori in inglese: qui diventano un consiglio utile. */
function errorHint(error: string) {
  const value = error.toLowerCase();
  if (value.includes("blocked")) {
    return "Risulti aver bloccato il bot: apri la chat con il bot e premi Start per riattivare.";
  }
  if (value.includes("deactivated")) return "Il tuo account Telegram risulta disattivato.";
  if (value.includes("chat not found")) {
    return "La chat con il bot non esiste più: ricollega Telegram.";
  }
  if (value.includes("too many requests")) {
    return "Troppi messaggi in poco tempo: Telegram ha chiesto di aspettare.";
  }
  return error;
}

export function TelegramNotifications({
  subscription,
  configured,
}: {
  subscription: TelegramSubscription | null;
  configured: boolean;
}) {
  const [state, action] = useActionState(setTelegramAction, null);

  if (!configured) {
    return (
      <p className="rounded-control border border-rule bg-surface-2 px-3 py-2.5 text-[13px] text-muted">
        Le notifiche Telegram non sono ancora configurate su questo server.
      </p>
    );
  }

  if (!subscription) {
    return (
      <div className="space-y-3">
        <p className="text-[13.5px] text-muted">
          Collega Telegram per ricevere un messaggio quando nasce una nuova partita o un nuovo
          sondaggio. Ti basta un tocco: si apre il bot, premi <b>Start</b> e sei a posto.
        </p>
        {/* Ancoraggio nativo, non <Link>: la route risponde con un redirect a
            Telegram, che il router client di Next non seguirebbe. */}
        <a href="/api/telegram/link" className={buttonClass({ size: "sm" })}>
          <IconTelegram className="size-4" />
          Collega Telegram
        </a>
        <FormMessage state={state} />
      </div>
    );
  }

  const handle = subscription.username
    ? `@${subscription.username}`
    : (subscription.firstName ?? "la tua chat");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-[13.5px]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-0.5 text-[12px] font-medium text-ink">
          <span
            aria-hidden
            className={`size-1.5 rounded-full ${subscription.enabled ? "bg-win" : "bg-draw"}`}
          />
          {subscription.enabled ? "Collegato" : "In pausa"}
        </span>
        <span className="text-muted">{handle}</span>
      </div>

      <p className="text-[13px] text-muted">
        {subscription.enabled
          ? "Riceverai un messaggio su Telegram per ogni nuova partita e ogni nuovo sondaggio."
          : "Le notifiche sono in pausa: non ti arriverà nulla finché non le riattivi."}
      </p>

      {subscription.lastError ? (
        <p className="rounded-control border border-loss/35 bg-loss/8 px-3 py-2.5 text-[12.5px] text-ink">
          <b>Ultimo invio non riuscito.</b> {errorHint(subscription.lastError)}
          {subscription.lastErrorAt ? (
            <span className="text-muted"> · {formatMatchDate(subscription.lastErrorAt)}</span>
          ) : null}
        </p>
      ) : (
        <p className="text-[12.5px] text-muted">
          {subscription.lastSentAt ? (
            <>
              Ultimo avviso consegnato: {""}
              <span className="num text-ink">{formatMatchDate(subscription.lastSentAt)}</span>
            </>
          ) : (
            "Nessun avviso consegnato finora."
          )}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <form action={action}>
          <input type="hidden" name="enabled" value={subscription.enabled ? "false" : "true"} />
          <SubmitButton variant="secondary" size="sm" pendingLabel="Aggiornamento…">
            <IconBell className="size-4" />
            {subscription.enabled ? "Metti in pausa" : "Riattiva"}
          </SubmitButton>
        </form>

        <form action={action}>
          <input type="hidden" name="intent" value="unlink" />
          <ConfirmSubmit message="Scollegare Telegram? Non riceverai più notifiche da Pall1.">
            Scollega
          </ConfirmSubmit>
        </form>
      </div>

      <FormMessage state={state} />
    </div>
  );
}
