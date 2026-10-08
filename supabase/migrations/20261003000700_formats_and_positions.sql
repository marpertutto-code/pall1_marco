-- ============================================================
-- Pall1 · Formati di gioco (calcio a 5 / 8 / 11) e posizioni
--
-- Sostituisce i 4 ruoli generici con un catalogo di posizioni per formato,
-- ognuna con coordinate su un campo verticale normalizzato, così l'app può
-- disegnare un campo 2D su cui si toccano le posizioni preferite.
--
-- Sistema di coordinate:
--   x: 0 = sinistra, 1 = destra
--   y: 0 = porta avversaria (attacco), 1 = nostra porta
-- ============================================================

create type public.match_format as enum ('five_a_side', 'eight_a_side', 'eleven_a_side');

create table public.positions (
  code        text primary key,
  format      public.match_format not null,
  label       text not null,
  short_label text not null,
  role_group  public.player_role not null,
  x           numeric(4,3) not null check (x >= 0 and x <= 1),
  y           numeric(4,3) not null check (y >= 0 and y <= 1),
  sort_order  smallint not null default 0
);

create index positions_format_idx on public.positions (format, sort_order);

insert into public.positions (code, format, label, short_label, role_group, x, y, sort_order) values
  -- ---------------------------------------------------------- calcio a 5
  ('5_gk',    'five_a_side',   'Portiere',                    'POR', 'goalkeeper', 0.500, 0.930, 0),
  ('5_def',   'five_a_side',   'Difensore',                   'DIF', 'defender',   0.500, 0.700, 1),
  ('5_lat_r', 'five_a_side',   'Laterale destro',             'LAD', 'midfielder', 0.760, 0.440, 2),
  ('5_lat_l', 'five_a_side',   'Laterale sinistro',           'LAS', 'midfielder', 0.240, 0.440, 3),
  ('5_uni',   'five_a_side',   'Universale',                  'UNI', 'midfielder', 0.500, 0.520, 4),
  ('5_pivot', 'five_a_side',   'Pivot',                       'PIV', 'forward',    0.500, 0.160, 5),
  -- ---------------------------------------------------------- calcio a 8
  ('8_gk',    'eight_a_side',  'Portiere',                    'POR', 'goalkeeper', 0.500, 0.930, 0),
  ('8_cb',    'eight_a_side',  'Difensore centrale',          'DC',  'defender',   0.500, 0.740, 1),
  ('8_rb',    'eight_a_side',  'Terzino destro',              'TD',  'defender',   0.820, 0.660, 2),
  ('8_lb',    'eight_a_side',  'Terzino sinistro',            'TS',  'defender',   0.180, 0.660, 3),
  ('8_dm',    'eight_a_side',  'Mediano',                     'MED', 'midfielder', 0.500, 0.540, 4),
  ('8_rm',    'eight_a_side',  'Esterno destro',              'ED',  'midfielder', 0.820, 0.400, 5),
  ('8_lm',    'eight_a_side',  'Esterno sinistro',            'ES',  'midfielder', 0.180, 0.400, 6),
  ('8_st',    'eight_a_side',  'Attaccante',                  'ATT', 'forward',    0.500, 0.160, 7),
  -- ---------------------------------------------------------- calcio a 11
  ('11_gk',   'eleven_a_side', 'Portiere',                    'POR', 'goalkeeper', 0.500, 0.940, 0),
  ('11_rb',   'eleven_a_side', 'Terzino destro',              'TD',  'defender',   0.860, 0.720, 1),
  ('11_cb_r', 'eleven_a_side', 'Difensore centrale destro',   'DCD', 'defender',   0.620, 0.780, 2),
  ('11_cb_l', 'eleven_a_side', 'Difensore centrale sinistro', 'DCS', 'defender',   0.380, 0.780, 3),
  ('11_lb',   'eleven_a_side', 'Terzino sinistro',            'TS',  'defender',   0.140, 0.720, 4),
  ('11_dm',   'eleven_a_side', 'Mediano',                     'MED', 'midfielder', 0.500, 0.580, 5),
  ('11_cm',   'eleven_a_side', 'Centrocampista centrale',     'CC',  'midfielder', 0.500, 0.460, 6),
  ('11_am',   'eleven_a_side', 'Trequartista',                'TQ',  'midfielder', 0.500, 0.340, 7),
  ('11_rw',   'eleven_a_side', 'Esterno destro',              'ED',  'forward',    0.860, 0.260, 8),
  ('11_lw',   'eleven_a_side', 'Esterno sinistro',            'ES',  'forward',    0.140, 0.260, 9),
  ('11_st',   'eleven_a_side', 'Attaccante',                  'ATT', 'forward',    0.500, 0.140, 10);

-- ------------------------------------------------------------
-- Posizioni preferite: una o più per giocatore, su qualunque formato.
-- ------------------------------------------------------------

create table public.profile_positions (
  profile_id    uuid not null references public.profiles(id) on delete cascade,
  position_code text not null references public.positions(code) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (profile_id, position_code)
);

create index profile_positions_position_idx on public.profile_positions (position_code);

-- ------------------------------------------------------------
-- Formato della partita
-- ------------------------------------------------------------

alter table public.matches
  add column format public.match_format not null default 'eight_a_side';

create index matches_format_idx on public.matches (format);

-- ------------------------------------------------------------
-- La classifica non porta più i ruoli generici: le posizioni arrivano da
-- profile_positions. Serve un drop: CREATE OR REPLACE non può togliere colonne.
-- ------------------------------------------------------------

drop view public.standings;

create view public.standings with (security_invoker = true) as
select
  p.id, p.nickname, p.full_name, p.avatar_url,
  p.jersey_number, p.is_active,
  s.matches_played, s.wins, s.draws, s.losses, s.goals, s.assists,
  s.win_rate, s.last_played_at
from public.profiles p
join public.player_stats s on s.profile_id = p.id
order by s.win_rate desc nulls last, s.wins desc, s.goals desc, p.nickname;

grant select on public.standings to authenticated;

alter table public.profiles drop column preferred_role;
alter table public.profiles drop column roles;

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------

alter table public.positions         enable row level security;
alter table public.profile_positions enable row level security;

-- Il catalogo è dato di riferimento: si legge, non si scrive dall'app.
create policy positions_select_authenticated
  on public.positions for select to authenticated using (true);

create policy profile_positions_select_authenticated
  on public.profile_positions for select to authenticated using (true);

create policy profile_positions_insert_own
  on public.profile_positions for insert to authenticated
  with check (profile_id = auth.uid() or public.is_admin());

create policy profile_positions_delete_own
  on public.profile_positions for delete to authenticated
  using (profile_id = auth.uid() or public.is_admin());
