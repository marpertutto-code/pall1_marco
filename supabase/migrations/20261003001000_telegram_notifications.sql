-- ============================================================
-- Pall1 · Notifiche Telegram
--
-- L'utente apre il bot e preme Start una volta: Telegram consegna al webhook
-- il `chat_id`, che salviamo qui. Da quel momento il bot gli scrive.
-- Il collegamento al profilo avviene con un codice monouso generato
-- dall'app (`telegram_link_codes`) e passato nel deep-link di Start.
-- ============================================================

create table public.telegram_subscribers (
  chat_id               bigint primary key,
  profile_id            uuid not null references public.profiles(id) on delete cascade,
  telegram_username     text,
  first_name            text,
  notifications_enabled boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on table public.telegram_subscribers is
  'Chat private a cui il bot invia le notifiche, una per profilo.';

-- Un profilo = una chat.
create unique index telegram_subscribers_profile_idx
  on public.telegram_subscribers (profile_id);

create trigger telegram_subscribers_set_updated_at
  before update on public.telegram_subscribers
  for each row execute function public.set_updated_at();

create table public.telegram_link_codes (
  code       text primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

comment on table public.telegram_link_codes is
  'Codici monouso per collegare una chat Telegram a un profilo.';

create index telegram_link_codes_profile_idx
  on public.telegram_link_codes (profile_id);

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------

alter table public.telegram_subscribers enable row level security;
alter table public.telegram_link_codes enable row level security;

-- L'iscrizione nasce dal webhook (service role, che bypassa RLS): qui l'utente
-- vede, mette in pausa e cancella solo la propria riga.
create policy telegram_subscribers_select_own
  on public.telegram_subscribers for select to authenticated
  using (profile_id = auth.uid());

create policy telegram_subscribers_update_own
  on public.telegram_subscribers for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy telegram_subscribers_delete_own
  on public.telegram_subscribers for delete to authenticated
  using (profile_id = auth.uid());

-- I codici li crea l'utente per sé. La lettura avviene solo dal webhook con la
-- service role, quindi nessuna policy di select per `authenticated`.
create policy telegram_link_codes_insert_own
  on public.telegram_link_codes for insert to authenticated
  with check (profile_id = auth.uid() and expires_at > now());

create policy telegram_link_codes_delete_own
  on public.telegram_link_codes for delete to authenticated
  using (profile_id = auth.uid());
