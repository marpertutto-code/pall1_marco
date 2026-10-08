-- ============================================================
-- Pall1 · Sondaggi legati alla settimana reale
--
-- Un sondaggio può riferirsi a una settimana (lunedì → domenica): serve a
-- organizzare le disponibilità della settimana e a raggruppare i sondaggi
-- nella lista. Resta opzionale: un sondaggio qualsiasi non ha settimana.
-- ============================================================

alter table public.polls add column week_start date;

comment on column public.polls.week_start is
  'Lunedì della settimana a cui si riferisce il sondaggio. Null = nessuna settimana.';

-- Solo lunedì: così il raggruppamento per settimana è sempre coerente.
alter table public.polls
  add constraint polls_week_starts_monday
  check (week_start is null or extract(isodow from week_start) = 1);

create index polls_week_idx on public.polls (week_start desc) where week_start is not null;

-- La settimana fa parte dell'identità del sondaggio: non si cambia dopo la
-- creazione (tranne che da un admin), come domanda e tipo di voto.
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
    new.week_start     := old.week_start;
  end if;
  return new;
end; $$;
