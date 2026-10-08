-- ============================================================
-- Pall1 · Organizzatori
--
-- Un livello fra giocatore e admin: l'admin dà il "consenso" e la persona può
-- **creare** partite. Non può toccare iscritti, squadre, risultati o profili:
-- quelle restano cose da admin.
--
-- Il permesso vive nel database (colonna + policy), come `is_admin`: il client
-- non può assegnarselo da solo.
-- ============================================================

alter table public.profiles add column is_organizer boolean not null default false;

comment on column public.profiles.is_organizer is
  'Organizzatore: può creare partite. Lo assegna un admin; non è auto-assegnabile.';

-- ------------------------------------------------------------
-- Helper
-- ------------------------------------------------------------

create or replace function public.is_organizer()
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select p.is_organizer from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

revoke all on function public.is_organizer() from public;
grant execute on function public.is_organizer() to authenticated;

-- ------------------------------------------------------------
-- Niente auto-assegnazione
-- ------------------------------------------------------------

create or replace function public.protect_profile_fields()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  -- auth.uid() null = service_role / migrazioni: nessuna restrizione
  if auth.uid() is not null and not public.is_admin() then
    new.is_admin     := old.is_admin;
    new.is_organizer := old.is_organizer;
    new.is_active    := old.is_active;
  end if;
  return new;
end; $$;

drop policy profiles_insert_self on public.profiles;
create policy profiles_insert_self
  on public.profiles for insert to authenticated
  with check (id = auth.uid() and is_admin = false and is_organizer = false);

-- ------------------------------------------------------------
-- Creazione partite: admin o organizzatore
-- ------------------------------------------------------------

drop policy matches_admin_insert on public.matches;
create policy matches_insert_admin_or_organizer
  on public.matches for insert to authenticated
  with check (public.is_admin() or public.is_organizer());
