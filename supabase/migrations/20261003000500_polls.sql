-- ============================================================
-- Pall1 · Sondaggi (stile WhatsApp): domanda, opzioni, voti
-- Tutti vedono chi ha votato cosa; ognuno cambia il proprio voto.
-- ============================================================

create table public.polls (
  id             uuid primary key default gen_random_uuid(),
  question       text not null,
  details        text,
  allow_multiple boolean not null default true,
  closes_at      timestamptz,
  is_closed      boolean not null default false,
  created_by     uuid not null references public.profiles(id) on delete cascade,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint polls_question_len check (char_length(question) between 3 and 160),
  constraint polls_details_len  check (details is null or char_length(details) <= 500)
);

create index polls_created_idx on public.polls (created_at desc);
create index polls_open_idx    on public.polls (is_closed) where not is_closed;

create table public.poll_options (
  id         uuid primary key default gen_random_uuid(),
  poll_id    uuid not null references public.polls(id) on delete cascade,
  label      text not null,
  -- Se valorizzato, l'opzione è una data/ora concreta e l'admin può
  -- trasformarla in partita con un click.
  starts_at  timestamptz,
  position   smallint not null default 0,
  created_at timestamptz not null default now(),
  constraint poll_options_label_len check (char_length(label) between 1 and 80),
  unique (id, poll_id)
);

create index poll_options_poll_idx on public.poll_options (poll_id, position);

create table public.poll_votes (
  id         uuid primary key default gen_random_uuid(),
  poll_id    uuid not null,
  option_id  uuid not null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (option_id, profile_id),
  -- La chiave composta garantisce che l'opzione appartenga davvero al sondaggio.
  foreign key (option_id, poll_id)
    references public.poll_options (id, poll_id) on delete cascade
);

create index poll_votes_poll_idx    on public.poll_votes (poll_id);
create index poll_votes_option_idx  on public.poll_votes (option_id);
create index poll_votes_profile_idx on public.poll_votes (profile_id);

-- ------------------------------------------------------------
-- Trigger
-- ------------------------------------------------------------

create trigger polls_set_updated_at
  before update on public.polls
  for each row execute function public.set_updated_at();

-- Voto singolo: se il sondaggio non è multiplo, il nuovo voto sostituisce i vecchi.
create or replace function public.enforce_single_choice()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  multi boolean;
begin
  select p.allow_multiple into multi from public.polls p where p.id = new.poll_id;

  if multi is not true then
    delete from public.poll_votes v
    where v.poll_id = new.poll_id
      and v.profile_id = new.profile_id
      and v.id <> new.id;
  end if;

  return new;
end; $$;

create trigger poll_votes_single_choice
  before insert on public.poll_votes
  for each row execute function public.enforce_single_choice();

-- Domanda, tipo di voto e autore non si cambiano dopo la creazione (tranne admin):
-- modifiche invaliderebbero i voti già espressi.
create or replace function public.protect_poll_fields()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.question       := old.question;
    new.allow_multiple := old.allow_multiple;
    new.created_by     := old.created_by;
    new.created_at     := old.created_at;
  end if;
  return new;
end; $$;

create trigger polls_protect_fields
  before update on public.polls
  for each row execute function public.protect_poll_fields();

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------

alter table public.polls        enable row level security;
alter table public.poll_options enable row level security;
alter table public.poll_votes   enable row level security;

-- polls: tutti vedono; chiunque può crearne uno; l'autore o l'admin chiude/cancella.
create policy polls_select_authenticated
  on public.polls for select to authenticated using (true);

create policy polls_insert_own
  on public.polls for insert to authenticated
  with check (created_by = auth.uid() and is_closed = false);

create policy polls_update_own_or_admin
  on public.polls for update to authenticated
  using (created_by = auth.uid() or public.is_admin())
  with check (created_by = auth.uid() or public.is_admin());

create policy polls_delete_own_or_admin
  on public.polls for delete to authenticated
  using (created_by = auth.uid() or public.is_admin());

-- options: tutti vedono; l'autore del sondaggio (o l'admin) aggiunge/rimuove
-- finché il sondaggio è aperto.
create policy poll_options_select_authenticated
  on public.poll_options for select to authenticated using (true);

create policy poll_options_insert_own
  on public.poll_options for insert to authenticated
  with check (
    public.is_admin()
    or exists (
      select 1 from public.polls p
      where p.id = poll_id
        and p.created_by = auth.uid()
        and not p.is_closed
        and (p.closes_at is null or p.closes_at > now())
    )
  );

create policy poll_options_delete_own
  on public.poll_options for delete to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.polls p
      where p.id = poll_id and p.created_by = auth.uid()
    )
  );

-- votes: tutti vedono chi ha votato cosa; ognuno vota solo per sé,
-- e solo su sondaggi aperti.
create policy poll_votes_select_authenticated
  on public.poll_votes for select to authenticated using (true);

create policy poll_votes_insert_self
  on public.poll_votes for insert to authenticated
  with check (
    profile_id = auth.uid()
    and exists (
      select 1 from public.polls p
      where p.id = poll_id
        and not p.is_closed
        and (p.closes_at is null or p.closes_at > now())
    )
  );

create policy poll_votes_delete_self_or_admin
  on public.poll_votes for delete to authenticated
  using (profile_id = auth.uid() or public.is_admin());
