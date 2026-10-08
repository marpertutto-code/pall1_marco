-- ============================================================
-- Pall1 · Funzioni e trigger
-- ============================================================

-- updated_at automatico
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end; $$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger matches_set_updated_at before update on public.matches
  for each row execute function public.set_updated_at();

-- Admin: sorgente di verita nel DB, mai nel client
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Creazione automatica del profilo alla registrazione
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  base_nick text;
  final_nick text;
  suffix int := 0;
begin
  base_nick := coalesce(
    new.raw_user_meta_data->>'nickname',
    split_part(new.email, '@', 1)
  );
  base_nick := regexp_replace(base_nick, '[^A-Za-z0-9_.-]', '', 'g');
  if length(base_nick) < 3 then
    base_nick := 'player' || substr(new.id::text, 1, 6);
  end if;
  base_nick := left(base_nick, 24);

  final_nick := base_nick;
  while exists (select 1 from public.profiles where lower(nickname) = lower(final_nick)) loop
    suffix := suffix + 1;
    final_nick := left(base_nick, 24 - length(suffix::text)) || suffix::text;
  end loop;

  insert into public.profiles (id, nickname, full_name, avatar_url)
  values (
    new.id,
    final_nick,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Impedisce escalation di privilegi su self-update
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  -- auth.uid() null = service_role / migrazioni: nessuna restrizione
  if auth.uid() is not null and not public.is_admin() then
    new.is_admin  := old.is_admin;
    new.is_active := old.is_active;
  end if;
  return new;
end; $$;

create trigger profiles_protect_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- Capienza partita
create or replace function public.enforce_match_capacity()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  cap public.matches.max_players%type;
  st  public.match_status;
  cnt int;
begin
  select m.max_players, m.status into cap, st
  from public.matches m where m.id = new.match_id;

  if st in ('played', 'cancelled') then
    raise exception 'MATCH_CLOSED' using hint = 'La partita non accetta piu iscrizioni';
  end if;

  if new.attendance = 'present' then
    select count(*) into cnt
    from public.match_players mp
    where mp.match_id = new.match_id
      and mp.attendance = 'present'
      and (new.id is null or mp.id <> new.id);
    if cnt >= cap then
      raise exception 'MATCH_FULL' using hint = 'Numero massimo di giocatori raggiunto';
    end if;
  end if;

  return new;
end; $$;

create trigger match_players_capacity
  before insert or update of attendance, match_id on public.match_players
  for each row execute function public.enforce_match_capacity();

-- I campi di competenza admin non sono modificabili dall'utente
create or replace function public.protect_match_player_fields()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.team       := old.team;
    new.goals      := old.goals;
    new.assists    := old.assists;
    new.match_id   := old.match_id;
    new.profile_id := old.profile_id;
  end if;
  return new;
end; $$;

create trigger match_players_protect_fields
  before update on public.match_players
  for each row execute function public.protect_match_player_fields();

-- Transizioni di stato validate
create or replace function public.validate_match_status()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'teams_set' then
    if exists (
      select 1 from public.match_players mp
      where mp.match_id = new.id and mp.attendance = 'present' and mp.team is null
    ) then
      raise exception 'UNASSIGNED_PLAYERS';
    end if;
    if not exists (select 1 from public.match_players where match_id = new.id and team = 'a')
       or not exists (select 1 from public.match_players where match_id = new.id and team = 'b') then
      raise exception 'TEAMS_INCOMPLETE';
    end if;
  end if;

  if new.status = 'played' then
    if not exists (select 1 from public.match_results where match_id = new.id) then
      raise exception 'MISSING_RESULT' using hint = 'Inserire il risultato prima di chiudere la partita';
    end if;
  end if;

  return new;
end; $$;

create trigger matches_validate_status
  before insert or update of status on public.matches
  for each row execute function public.validate_match_status();
