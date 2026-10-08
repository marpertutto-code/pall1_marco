"use client";

import { useSyncExternalStore } from "react";
import { IconTelegram, IconX } from "@/components/icons";

/**
 * Avviso compatto sulla home per chi non ha ancora collegato Telegram.
 *
 * Chi non vuole Telegram può chiuderlo: la scelta dura una settimana, poi
 * ricompare una volta. Lo stato sta in `localStorage`, quindi non tocca il
 * database e non serve una colonna "avviso visto" sul profilo.
 *
 * `useSyncExternalStore` (invece di `useState` + `useEffect`) evita il setState
 * dentro un effect e, soprattutto, permette di assumere "chiuso" in SSR: chi ha
 * già chiuso l'avviso non se lo vede lampeggiare a ogni caricamento.
 */

const DISMISS_KEY = "pall1-telegram-banner-dismissed";
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

const listeners = new Set<() => void>();

/** Fallback in memoria: utile dove `localStorage` non è scrivibile (Safari privato). */
let memoryDismissed = false;

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readDismissed() {
  if (memoryDismissed) return true;
  try {
    return Number(localStorage.getItem(DISMISS_KEY) ?? 0) > Date.now();
  } catch {
    return false;
  }
}

/** In SSR non c'è `localStorage`: si assume chiuso, così non lampeggia. */
function serverDismissed() {
  return true;
}

export function TelegramBanner() {
  const dismissed = useSyncExternalStore(subscribe, readDismissed, serverDismissed);

  if (dismissed) return null;

  function dismiss() {
    memoryDismissed = true;
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_MS));
    } catch {
      // Nessuno storage: resta chiuso per questa visita grazie a `emit`.
    }
    emit();
  }

  return (
    <div className="mb-4 flex items-center gap-3 rounded-card border border-rule bg-surface px-3 py-2.5">
      <span
        aria-hidden
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent/12 text-accent-text"
      >
        <IconTelegram className="size-4" />
      </span>

      <p className="min-w-0 flex-1 text-[12.5px] leading-snug text-muted">
        Attiva gli avvisi su Telegram per partite e sondaggi.
      </p>

      {/* Ancoraggio nativo, non <Link>: la route risponde con un redirect a
          Telegram, e il router client di Next non lo seguirebbe. */}
      <a
        href="/api/telegram/link"
        className="shrink-0 text-[12.5px] font-medium text-accent-text hover:underline"
      >
        Collega
      </a>

      <button
        type="button"
        onClick={dismiss}
        aria-label="Chiudi l'avviso"
        title="Non ora"
        className="-mr-1 flex size-7 shrink-0 items-center justify-center rounded-full text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
      >
        <IconX className="size-3.5" />
      </button>
    </div>
  );
}
