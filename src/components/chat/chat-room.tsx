"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { IconChat, IconSend, IconSpinner, IconTrash } from "@/components/icons";
import { formatTime, humanDay } from "@/lib/format";
import { deleteChatMessage, fetchRecentChatMessages, sendChatMessage } from "@/lib/actions/chat";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ChatAuthor, ChatMessage, ChatMessageRow } from "@/types/domain";

/** Un messaggio in scena: uguale al salvato, più lo stato di invio locale. */
type ClientMessage = ChatMessage & { pending?: boolean };

const RECONCILE_MS = 30_000;
const NEAR_BOTTOM_PX = 96;

/** Ordina per data, con l'id come spareggio per un ordine stabile. */
function sortMessages(list: ClientMessage[]): ClientMessage[] {
  return list
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

/** Unisce i messaggi per id: i nuovi entrano, quelli già noti si aggiornano. */
function mergeMessages(prev: ClientMessage[], incoming: ChatMessage[]): ClientMessage[] {
  const byId = new Map(prev.map((message) => [message.id, message]));
  for (const message of incoming) {
    const existing = byId.get(message.id);
    byId.set(message.id, existing ? { ...existing, ...message } : message);
  }
  return sortMessages([...byId.values()]);
}

export function ChatRoom({
  initialMessages,
  authors,
  currentProfileId,
  canModerate,
}: {
  initialMessages: ChatMessage[];
  authors: ChatAuthor[];
  currentProfileId: string;
  canModerate: boolean;
}) {
  const [messages, setMessages] = useState<ClientMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [live, setLive] = useState(false);
  const [atBottom, setAtBottom] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const reconcilingRef = useRef(false);
  const supabaseRef = useRef<ReturnType<typeof createSupabaseBrowserClient> | null>(null);

  const authorById = useMemo(
    () => new Map(authors.map((author) => [author.id, author])),
    [authors],
  );

  /* ---------------- Realtime ---------------- */
  useEffect(() => {
    let cancelled = false;
    const supabase = createSupabaseBrowserClient();
    supabaseRef.current = supabase;
    const channel = supabase
      .channel(`chat-messages-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const row = payload.new as ChatMessageRow;
          setMessages((prev) => mergeMessages(prev, [toClientMessage(row)]));
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "chat_messages" },
        (payload) => {
          const id = (payload.old as { id?: string }).id;
          if (id) setMessages((prev) => prev.filter((message) => message.id !== id));
        },
      );

    // Senza un token esplicito il socket resta "anon" e la RLS scarta gli eventi
    // in silenzio (SUBSCRIBED arriva lo stesso). Impostarlo prima di sottoscrivere
    // è la differenza fra una chat viva e una chat muta.
    const start = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) await supabase.realtime.setAuth(session.access_token);
      if (!cancelled) channel.subscribe((status) => setLive(status === "SUBSCRIBED"));
    };
    void start();

    return () => {
      cancelled = true;
      supabaseRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, []);

  /* ------------- Riconciliazione ------------- */
  useEffect(() => {
    let active = true;

    const tick = async () => {
      if (!active || reconcilingRef.current || document.visibilityState !== "visible") return;
      reconcilingRef.current = true;
      try {
        const recent = await fetchRecentChatMessages();
        if (active && recent.length > 0) {
          setMessages((prev) => mergeMessages(prev, recent));
        }

        /*
         * La Server Action qui sopra ha attraversato il proxy, che ha rinnovato
         * i cookie se il token era scaduto. Il client browser invece non rinnova
         * da solo (di proposito: vedi src/lib/supabase/client.ts), quindi il
         * socket va riallineato a mano al token fresco, altrimenti dopo un'ora
         * di chat aperta resta autenticato con un JWT scaduto.
         */
        const supabase = supabaseRef.current;
        if (supabase) {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session) await supabase.realtime.setAuth(session.access_token);
        }
      } catch {
        // Silenzioso: il realtime resta la via principale.
      } finally {
        reconcilingRef.current = false;
      }
    };

    const timer = window.setInterval(tick, RECONCILE_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  /* ---------------- Autoscroll ---------------- */
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !atBottom) return;
    container.scrollTop = container.scrollHeight;
  }, [messages, atBottom]);

  function handleScroll() {
    const container = scrollRef.current;
    if (!container) return;
    const distance = container.scrollHeight - container.scrollTop - container.clientHeight;
    setAtBottom(distance < NEAR_BOTTOM_PX);
  }

  function scrollToBottom() {
    const container = scrollRef.current;
    if (container) container.scrollTop = container.scrollHeight;
    setAtBottom(true);
  }

  /* ---------------- Azioni ---------------- */
  async function handleSubmit() {
    const body = draft.trim();
    if (!body || sending) return;

    const tempId = `pending-${crypto.randomUUID()}`;
    const temp: ClientMessage = {
      id: tempId,
      profileId: currentProfileId,
      body,
      createdAt: new Date().toISOString(),
      pending: true,
    };

    setMessages((prev) => mergeMessages(prev, [temp]));
    setDraft("");
    setError(null);
    setSending(true);
    setAtBottom(true);

    try {
      const result = await sendChatMessage(body);
      if ("error" in result) {
        setMessages((prev) => prev.filter((message) => message.id !== tempId));
        setDraft(body);
        setError(result.error);
      } else {
        setMessages((prev) =>
          mergeMessages(
            prev.filter((message) => message.id !== tempId),
            [result.message],
          ),
        );
      }
    } catch {
      setMessages((prev) => prev.filter((message) => message.id !== tempId));
      setDraft(body);
      setError("Invio non riuscito. Controlla la connessione e riprova.");
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(message: ClientMessage) {
    if (message.pending) return;
    if (!window.confirm("Eliminare questo messaggio per tutti?")) return;

    setError(null);
    setMessages((prev) => prev.filter((item) => item.id !== message.id));

    try {
      const result = await deleteChatMessage(message.id);
      if ("error" in result) {
        setMessages((prev) => mergeMessages(prev, [message]));
        setError(result.error);
      }
    } catch {
      setMessages((prev) => mergeMessages(prev, [message]));
      setError("Eliminazione non riuscita. Riprova.");
    }
  }

  /* ---------------- Render ---------------- */
  let lastDay: string | null = null;

  return (
    <div className="flex h-[calc(100dvh-13rem)] min-h-[24rem] flex-col overflow-hidden rounded-card border border-rule bg-surface md:h-[calc(100dvh-7.5rem)]">
      <div className="flex items-center gap-3 border-b border-rule px-4 py-3">
        <IconChat className="size-5 shrink-0 text-accent-text" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-ink">Chat di gruppo</p>
          <p className="truncate text-[11.5px] text-muted">
            <span className="num">{authors.length}</span> giocatori
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-0.5 text-[11px] font-medium text-muted">
          <span
            className={["size-1.5 rounded-full", live ? "bg-accent" : "bg-line-strong"].join(" ")}
            aria-hidden
          />
          {live ? "In tempo reale" : "Connessione…"}
        </span>
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-full space-y-3 overflow-y-auto overscroll-contain px-4 py-4"
          aria-live="polite"
          aria-relevant="additions"
        >
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <IconChat className="size-8 text-line-strong" />
              <p className="font-display text-[15px] font-semibold text-ink">
                Ancora nessun messaggio
              </p>
              <p className="max-w-xs text-[13px] text-muted">
                Rompi il ghiaccio: scrivi il primo messaggio del gruppo.
              </p>
            </div>
          ) : (
            messages.map((message) => {
              const day = humanDay(message.createdAt);
              const showDay = day !== lastDay;
              lastDay = day;

              const author = authorById.get(message.profileId);
              const own = message.profileId === currentProfileId;
              const deletable = !message.pending && (own || canModerate);

              return (
                <div key={message.id}>
                  {showDay ? (
                    <div className="my-4 flex items-center gap-3 first:mt-0">
                      <span className="h-px flex-1 bg-rule" aria-hidden />
                      <span className="text-[11px] font-medium text-muted">{day}</span>
                      <span className="h-px flex-1 bg-rule" aria-hidden />
                    </div>
                  ) : null}

                  <div className={["flex items-end gap-2.5", own ? "justify-end" : ""].join(" ")}>
                    {own ? null : (
                      <Avatar
                        name={author?.nickname ?? "?"}
                        src={author?.avatarUrl ?? null}
                        size="sm"
                      />
                    )}

                    <div className={["min-w-0 max-w-[78%]", own ? "text-right" : ""].join(" ")}>
                      {own ? null : (
                        <p className="mb-0.5 text-[11px] font-medium text-muted">
                          {author?.nickname ?? "Giocatore"}
                        </p>
                      )}

                      <div
                        className={[
                          "inline-block px-3.5 py-2 text-left text-[13.5px]",
                          own
                            ? "rounded-card rounded-br-[5px] bg-accent-solid text-accent-on"
                            : "rounded-card rounded-bl-[5px] bg-surface-2 text-ink",
                          message.pending ? "opacity-70" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <p className="whitespace-pre-wrap break-words text-left">{message.body}</p>
                      </div>

                      <p
                        className={[
                          "mt-0.5 flex items-center gap-1.5 text-[10.5px] text-muted",
                          own ? "justify-end" : "",
                        ].join(" ")}
                      >
                        {message.pending ? <IconSpinner className="size-3" /> : null}
                        <span className="num">{formatTime(message.createdAt)}</span>
                        {deletable ? (
                          <button
                            type="button"
                            onClick={() => void handleDelete(message)}
                            aria-label="Elimina messaggio"
                            title="Elimina messaggio"
                            className="rounded-[6px] p-0.5 text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-loss"
                          >
                            <IconTrash className="size-3.5" />
                          </button>
                        ) : null}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {!atBottom ? (
          <button
            type="button"
            onClick={scrollToBottom}
            className="glass-strong glass-pop absolute inset-x-0 bottom-3 mx-auto w-fit rounded-full border border-rule px-3 py-1.5 text-[12px] font-medium text-ink transition-colors duration-150 hover:bg-surface-2"
          >
            Vai ai messaggi recenti
          </button>
        ) : null}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
        className="border-t border-rule px-3 pb-3 pt-2.5"
      >
        {error ? (
          <p
            role="alert"
            className="mb-2 rounded-control bg-loss/10 px-3 py-2 text-[12.5px] text-loss"
          >
            {error}
          </p>
        ) : null}

        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                void handleSubmit();
              }
            }}
            rows={1}
            maxLength={1000}
            placeholder="Scrivi al gruppo…"
            aria-label="Scrivi un messaggio"
            className="field-sizing-content max-h-32 min-h-11 w-full resize-none rounded-control border border-rule bg-paper px-3 py-2.5 text-sm text-ink placeholder:text-muted/80 transition-colors duration-150 hover:border-line-strong focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus/25"
          />
          <button
            type="submit"
            disabled={sending || draft.trim().length === 0}
            aria-label="Invia messaggio"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-control bg-accent-solid text-accent-on transition-colors duration-150 hover:bg-accent-solid-strong disabled:pointer-events-none disabled:opacity-50"
          >
            {sending ? <IconSpinner className="size-5" /> : <IconSend className="size-5" />}
          </button>
        </div>

        <p className="mt-1.5 text-[11px] text-muted">
          Invio per spedire · Maiusc+Invio per andare a capo
        </p>
      </form>
    </div>
  );
}

function toClientMessage(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    profileId: row.profile_id,
    body: row.body,
    createdAt: row.created_at,
  };
}
