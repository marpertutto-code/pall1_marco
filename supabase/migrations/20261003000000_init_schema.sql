-- ============================================================
-- Pall1 · Migrazione iniziale: tipi, tabelle, vincoli, indici
-- ============================================================
create extension if not exists "pgcrypto";

-- ---------- Tipi ENUM ----------
create type public.player_role       as enum ('goalkeeper','defender','midfielder','forward');
create type public.match_status      as enum ('scheduled','teams_set','played','cancelled');
create type public.attendance_status as enum ('present','absent','maybe');
create type public.team_side         as enum ('a','b');

-- ---------- profiles (1:1 con auth.users) ----------
create table public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  nickname       text not null,
  full_name      text,
  avatar_url     text,
  roles          public.player_role[] not null default '{}',
  preferred_role public.player_role,
  jersey_number  smallint,
  birth_date     date,
  notes          text,
  is_active      boolean not null default true,
  is_admin       boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint profiles_nickname_format check (nickname ~ '^[A-Za-z0-9_.-]{3,24}$'),
  constraint profiles_jersey_range    check (jersey_number is null or jersey_number between 1 and 99),
  constraint profiles_preferred_in_roles
    check (preferred_role is null or preferred_role = any(roles))
);

create unique index profiles_nickname_lower_key on public.profiles (lower(nickname));
create unique index profiles_jersey_active_key
  on public.profiles (jersey_number) where is_active and jersey_number is not null;
create index profiles_active_idx on public.profiles (is_active) where is_active;

-- ---------- matches ----------
create table public.matches (
  id           uuid primary key default gen_random_uuid(),
  match_date   timestamptz not null,
  location     text not null,
  max_players  smallint not null default 10 check (max_players between 2 and 40),
  team_a_name  text not null default 'Squadra A',
  team_b_name  text not null default 'Squadra B',
  status       public.match_status not null default 'scheduled',
  notes        text,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index matches_date_idx   on public.matches (match_date desc);
create index matches_status_idx on public.matches (status);

-- ---------- match_players (iscrizione + squadra + contributi) ----------
create table public.match_players (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid not null references public.matches(id) on delete cascade,
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  attendance  public.attendance_status not null default 'present',
  team        public.team_side,
  goals       smallint not null default 0 check (goals  >= 0),
  assists     smallint not null default 0 check (assists >= 0),
  joined_at   timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (match_id, profile_id)
);
create index match_players_match_idx   on public.match_players (match_id);
create index match_players_profile_idx on public.match_players (profile_id);
create index match_players_team_idx    on public.match_players (match_id, team);

-- ---------- match_results (1:1 con la partita) ----------
create table public.match_results (
  match_id       uuid primary key references public.matches(id) on delete cascade,
  team_a_score   smallint not null check (team_a_score >= 0),
  team_b_score   smallint not null check (team_b_score >= 0),
  mvp_profile_id uuid references public.profiles(id) on delete set null,
  notes          text,
  recorded_by    uuid references public.profiles(id) on delete set null,
  recorded_at    timestamptz not null default now()
);
