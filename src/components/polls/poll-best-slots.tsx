"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { IconBall, IconPodium, IconX } from "@/components/icons";
import { bestPollSlots, type PollBestSlot } from "@/lib/poll-best-slots";
import type { PollDetail } from "@/types/domain";

/**
 * Grafico a barre orizzontali con le tre fasce (giorno + orario) più votate.
 * Il calcolo è in `@/lib/poll-best-slots`: incrocia chi ha votato il giorno con
 * chi ha votato quell'orario.
 *
 * - sondaggio concluso → risultato definitivo;
 * - sondaggio senza scadenza e ancora aperto → anteprima che si aggiorna a ogni voto.
 *
 * Toccando una fascia si apre il popup con i votanti.
 */
export function PollBestSlots({
  poll,
  matchCreatePath = null,
}: {
  poll: PollDetail;
  /** Base per creare la partita dalla fascia migliore (admin o organizzatore). */
  matchCreatePath?: string | null;
}) {
  const slots = bestPollSlots(poll);
  const isPreview = !poll.closed;
  const [openKey, setOpenKey] = useState<string | null>(null);
  const closeDialog = useCallback(() => setOpenKey(null), []);

  if (slots.length === 0) {
    return (
      <section className="mb-6">
        <EmptyState
          title="Nessuna disponibilità da incrociare"
          description={
            isPreview
              ? "Appena arrivano voti sui giorni e sugli orari, qui compaiono le tre fasce più votate."
              : "Servono voti, sui giorni e sugli orari, per calcolare la fascia con più persone."
          }
        />
      </section>
    );
  }

  // Le barre sono proporzionali alla fascia più votata, non ai votanti totali:
  // così si vede il distacco senza schiacciare tutto a sinistra.
  const top = slots[0].voters.length;
  const openSlot = slots.find((slot) => slot.key === openKey) ?? null;

  return (
    <section className="mb-6">
      <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
        <IconPodium className="size-4 text-accent-text" />
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
          {isPreview ? "Le 3 proposte più votate" : "Le 3 fasce con più persone"}
        </h2>
        {isPreview ? (
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10.5px] font-medium text-muted">
            anteprima
          </span>
        ) : null}
      </div>
      <p className="mb-4 max-w-prose text-[12.5px] text-muted">
        {isPreview
          ? "Sondaggio ancora aperto: il grafico si aggiorna a ogni voto e si fissa alla chiusura."
          : "Incrocio dei voti: chi ha scelto sia il giorno sia l'orario. A pari merito vince la fascia proposta prima."}
      </p>

      <ul className="space-y-3.5">
        {slots.map((slot) => {
          // A pari merito il badge e la barra piena vanno a tutte le fasce in testa.
          const isBest = top > 0 && slot.voters.length === top;
          const width = top > 0 ? Math.max(6, Math.round((slot.voters.length / top) * 100)) : 0;

          return (
            <li key={slot.key}>
              <button
                type="button"
                onClick={() => setOpenKey(slot.key)}
                aria-haspopup="dialog"
                aria-label={`${slot.primary}${slot.time ? ` alle ${slot.time}` : ""}: ${slot.voters.length} ${slot.voters.length === 1 ? "persona" : "persone"}. Tocca per vedere chi.`}
                className="group block w-full rounded-control text-left"
              >
                <span className="flex items-baseline justify-between gap-3">
                  {/*
                   * L'etichetta si tronca da sola: il badge «migliore» resta
                   * intero anche quando lo spazio è poco (schermi da 320px).
                   */}
                  <span className="flex min-w-0 items-baseline gap-2">
                    <span className="min-w-0 truncate text-[13px] font-medium text-ink">
                      {slot.primary}
                      <span className="text-muted">
                        {slot.time ? <> · <span className="num text-ink">{slot.time}</span></> : " · tutto il giorno"}
                      </span>
                    </span>
                    {isBest ? (
                      <span className="shrink-0 rounded-full bg-accent-solid px-1.5 py-0.5 text-[10px] font-semibold text-accent-on">
                        migliore
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-[12px] text-muted">
                    <span className="num text-[14px] font-semibold text-ink">
                      {slot.voters.length}
                    </span>{" "}
                    {slot.voters.length === 1 ? "persona" : "persone"}
                    <span className="num ml-1.5 text-[11px] text-muted">{slot.percentage}%</span>
                  </span>
                </span>

                <span
                  className="mt-1.5 block h-2.5 w-full overflow-hidden rounded-full bg-surface-2 transition-colors group-hover:ring-1 group-hover:ring-line-strong"
                  aria-hidden
                >
                  <span
                    className={[
                      "block h-full rounded-full transition-[width] duration-500",
                      isBest ? "bg-accent-solid" : "bg-accent",
                    ].join(" ")}
                    style={{ width: `${width}%` }}
                  />
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {openSlot ? (
        <VotersDialog
          slot={openSlot}
          isPreview={isPreview}
          matchCreatePath={matchCreatePath}
          onClose={closeDialog}
        />
      ) : null}
    </section>
  );
}

/** Popup con i votanti di una fascia: si chiude con la X, con Esc o toccando fuori. */
function VotersDialog({
  slot,
  isPreview,
  matchCreatePath,
  onClose,
}: {
  slot: PollBestSlot;
  isPreview: boolean;
  matchCreatePath: string | null;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Al ripristino (chiusura) il focus torna dov'era prima di aprire.
    const opener = document.activeElement as HTMLElement | null;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
      opener?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Votanti di ${slot.primary}`}
        onClick={(event) => event.stopPropagation()}
        className="glass-strong glass-pop flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-card border border-rule pb-[env(safe-area-inset-bottom)] sm:rounded-card sm:pb-0"
      >
        <header className="flex items-start justify-between gap-4 border-b border-rule px-4 py-3">
          <div className="min-w-0">
            <p className="truncate font-display text-[15px] font-semibold text-ink">
              {slot.primary}
              {slot.time ? <span className="num"> · {slot.time}</span> : null}
            </p>
            <p className="mt-0.5 text-[12px] text-muted">
              <span className="num font-semibold text-ink">{slot.voters.length}</span>{" "}
              {slot.voters.length === 1 ? "persona disponibile" : "persone disponibili"} ·{" "}
              <span className="num">{slot.percentage}%</span> dei votanti
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Chiudi"
            className="-mr-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <IconX className="size-4" />
          </button>
        </header>

        <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-4 py-3">
          {slot.voters.map((voter) => (
            <li key={voter.profileId} className="flex items-center gap-2.5">
              <Avatar name={voter.nickname} src={voter.avatarUrl} size="sm" className="size-7" />
              <span className="text-[13.5px] text-ink">{voter.nickname}</span>
            </li>
          ))}
        </ul>

        {matchCreatePath && slot.startsAt && !isPreview ? (
          <footer className="border-t border-rule px-4 py-3">
            <Link
              href={`${matchCreatePath}?date=${encodeURIComponent(slot.startsAt)}`}
              className="inline-flex items-center gap-2 text-[12.5px] font-medium text-accent-text hover:underline"
            >
              <IconBall className="size-4" />
              Crea partita con questa fascia
            </Link>
          </footer>
        ) : null}
      </div>
    </div>
  );
}
