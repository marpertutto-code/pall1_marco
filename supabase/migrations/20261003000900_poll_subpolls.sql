-- ============================================================
-- Pall1 · Sottosondaggi degli orari
--
-- Un sondaggio-settimana chiede in quali giorni si gioca. Per ogni giorno
-- (opzione del sondaggio) serve poi un elenco di orari fra cui votare.
--
-- Invece di una tabella nuova, un sottosondaggio è un normale sondaggio con
-- `parent_option_id` valorizzato: punta all'opzione-giorno del sondaggio
-- padre. Voti, RLS e chiusura restano quelli di sempre.
-- ============================================================

alter table public.polls
  add column parent_option_id uuid
    references public.poll_options(id) on delete cascade;

comment on column public.polls.parent_option_id is
  'Opzione-giorno del sondaggio padre a cui appartiene questo sottosondaggio (orari). Null = sondaggio di primo livello.';

create index polls_parent_option_idx
  on public.polls (parent_option_id)
  where parent_option_id is not null;

-- Un giorno può avere un solo sottosondaggio.
create unique index polls_one_subpoll_per_option_idx
  on public.polls (parent_option_id)
  where parent_option_id is not null;

-- Il legame col padre non si cambia dopo la creazione.
create or replace function public.protect_poll_fields()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.question         := old.question;
    new.allow_multiple   := old.allow_multiple;
    new.created_by       := old.created_by;
    new.created_at       := old.created_at;
    new.week_start       := old.week_start;
    new.parent_option_id := old.parent_option_id;
  end if;
  return new;
end; $$;
