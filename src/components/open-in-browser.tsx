"use client";

import { useState } from "react";
import { buttonClass } from "@/components/ui/button";
import { IconAlert, IconCheck, IconTelegram } from "@/components/icons";

/**
 * Pagina-ponte per aprire un link di Pall1 nel browser del telefono invece che
 * nel browser interno di Telegram.
 *
 * Perché serve: un bottone `url` di un bot apre **sempre** nel browser interno,
 * e non esiste un parametro per cambiarlo (dipende da un'impostazione del
 * client). Le vie d'uscita reali sono due:
 *
 * - dentro una **Mini App** esiste `Telegram.WebApp.openLink()`, che apre nel
 *   browser esterno su Android e iOS (API ufficiale);
 * - fuori da una Mini App, su **Android** si può forzare la consegna al browser
 *   con un URL `intent://`; su **iOS** non è possibile da una pagina web, quindi
 *   si spiega come uscire.
 *
 * Tutto in un solo gesto: se `openLink` non c'è si prova `intent://`, altrimenti
 * si apre una nuova scheda.
 */

type TelegramWebApp = { openLink?: (url: string) => void };

type Platform = "android" | "ios" | "other";

/** URL `intent://` che fa gestire il link al browser di sistema (Android). */
function androidIntentUrl(target: string): string {
  const parsed = new URL(target);
  const scheme = parsed.protocol.replace(":", "");
  return `intent://${parsed.host}${parsed.pathname}${parsed.search}#Intent;scheme=${scheme};S.browser_fallback_url=${encodeURIComponent(target)};end`;
}

export function OpenInBrowser({ url, platform }: { url: string; platform: Platform }) {
  const [copied, setCopied] = useState(false);

  function open() {
    const webApp = (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp;
    if (webApp?.openLink) {
      webApp.openLink(url);
      return;
    }
    if (platform === "android") {
      window.location.href = androidIntentUrl(url);
      return;
    }
    window.open(url, "_blank");
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Clipboard non disponibile: il link resta comunque visibile.
    }
  }

  return (
    <div className="rounded-card border border-rule bg-surface p-5 text-center">
      <span
        aria-hidden
        className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent/12 text-accent-text"
      >
        <IconTelegram className="size-6" />
      </span>

      <h1 className="mt-3 text-[17px] font-semibold text-ink">Apri nel browser</h1>
      <p className="mt-1.5 text-[13.5px] leading-snug text-muted">
        Stai aprendo Pall1 da Telegram. Per usare il browser del telefono — dove hai già l&apos;accesso
        attivo — tocca il pulsante.
      </p>

      <button type="button" onClick={open} className={buttonClass({ className: "mt-4 w-full" })}>
        {platform === "ios" ? "Apri in Safari" : "Apri nel browser"}
      </button>

      <button
        type="button"
        onClick={copy}
        className={buttonClass({ variant: "secondary", className: "mt-2 w-full" })}
      >
        {copied ? (
          <>
            <IconCheck className="size-4" />
            Link copiato
          </>
        ) : (
          "Copia link"
        )}
      </button>

      {platform === "ios" ? (
        <p className="mt-4 flex items-start gap-2 rounded-control border border-rule bg-surface-2 px-3 py-2.5 text-left text-[12px] leading-snug text-muted">
          <IconAlert className="mt-0.5 size-3.5 shrink-0 text-muted" />
          <span>
            Se non si apre: tocca <b>⋯</b> in alto a destra e scegli <b>Apri in Safari</b>.
          </span>
        </p>
      ) : null}
    </div>
  );
}
