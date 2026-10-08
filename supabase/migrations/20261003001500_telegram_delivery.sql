-- ============================================================
-- Pall1 · Consegna delle notifiche Telegram
--
-- Due problemi risolti insieme:
--
-- 1. Non si sapeva chi avesse ricevuto un avviso: l'invio scartava l'esito di
--    Telegram e una chat bloccata restava iscritta per sempre. Ora ogni avviso
--    è una riga (`telegram_notifications`) e ogni tentativo di invio è una riga
--    (`telegram_deliveries`): "a chi è arrivato" è una query.
--
-- 2. Chi collega il bot dopo la creazione di un sondaggio (o di una partita)
--    non riceveva nulla. Gli avvisi restano qui fino a `expires_at`, così il
--    webhook può rimandare a una chat nuova quelli che non ha mai ricevuto.
-- ============================================================

create table public.telegram_notifications (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null
    constraint telegram_notifications_kind check (
      kind in ('poll', 'match', 'match_reminder', 'match_fold')
    ),
  -- Sondaggio o partita a cui si riferisce: serve a scartare l'avviso se nel
  -- frattempo non è più attuale (sondaggio chiuso, partita cancellata/giocata).
  ref_id       uuid,
  text         text not null,
  button_label text,
  button_url   text,
  -- 'all' = a tutti gli iscritti attivi; 'profiles' = solo a `profile_ids`.
  audience     text not null default 'all'
    constraint telegram_notifications_audience check (audience in ('all', 'profiles')),
  profile_ids  uuid[] not null default '{}',
  created_at   timestamptz not null default now(),
  -- Oltre questa data l'avviso non ha senso e non si recupera più (es. la data
  -- della partita). Null = vale solo la finestra di recupero del webhook.
  expires_at   timestamptz
);

comment on table public.telegram_notifications is
  'Avvisi inviati dal bot: alimenta il recupero per chi collega Telegram dopo.';
comment on column public.telegram_notifications.ref_id is
  'Sondaggio o partita di riferimento, per scartare l''avviso se non è più attuale.';

create index telegram_notifications_recent_idx
  on public.telegram_notifications (created_at desc);

create table public.telegram_deliveries (
  notification_id uuid not null
    references public.telegram_notifications(id) on delete cascade,
  chat_id         bigint not null,
  sent_at         timestamptz not null default now(),
  ok              boolean not null,
  error           text,
  primary key (notification_id, chat_id)
);

comment on table public.telegram_deliveries is
  'Esito dell''invio di un avviso a una chat: il registro di "a chi è arrivato".';

create index telegram_deliveries_chat_idx on public.telegram_deliveries (chat_id);

-- Ultimo esito per iscritto: il profilo lo mostra all'utente.
alter table public.telegram_subscribers
  add column last_sent_at  timestamptz,
  add column last_error    text,
  add column last_error_at timestamptz;

comment on column public.telegram_subscribers.last_error is
  'Ultimo errore di Telegram sull''invio (es. bot bloccato dall''utente: in quel caso le notifiche vanno in pausa).';

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------

-- Registro e avvisi li leggono e li scrivono solo il webhook e l'invio delle
-- notifiche, con la service role: nessuna policy per `authenticated`, quindi
-- dal client sono invisibili e non scrivibili.
alter table public.telegram_notifications enable row level security;
alter table public.telegram_deliveries    enable row level security;
