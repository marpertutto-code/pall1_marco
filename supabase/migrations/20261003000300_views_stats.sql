-- ============================================================
-- Pall1 · View statistiche (security_invoker)
-- ============================================================
create or replace view public.player_stats with (security_invoker = true) as
with base as (
  select mp.profile_id,
         m.id as match_id,
         m.match_date,
         mp.team,
         mp.goals,
         mp.assists,
         r.team_a_score,
         r.team_b_score
  from public.match_players mp
  join public.matches m       on m.id = mp.match_id
  join public.match_results r on r.match_id = m.id
  where m.status = 'played'
    and mp.attendance = 'present'
    and mp.team is not null
)
select
  b.profile_id,
  count(*)::int as matches_played,
  count(*) filter (
    where (b.team = 'a' and b.team_a_score > b.team_b_score)
       or (b.team = 'b' and b.team_b_score > b.team_a_score)
  )::int as wins,
  count(*) filter (where b.team_a_score = b.team_b_score)::int as draws,
  count(*) filter (
    where (b.team = 'a' and b.team_a_score < b.team_b_score)
       or (b.team = 'b' and b.team_b_score < b.team_a_score)
  )::int as losses,
  coalesce(sum(b.goals), 0)::int   as goals,
  coalesce(sum(b.assists), 0)::int as assists,
  round(
    100.0 * count(*) filter (
      where (b.team = 'a' and b.team_a_score > b.team_b_score)
         or (b.team = 'b' and b.team_b_score > b.team_a_score)
    ) / nullif(count(*), 0),
    1
  ) as win_rate,
  max(b.match_date) as last_played_at
from base b
group by b.profile_id;

create or replace view public.standings with (security_invoker = true) as
select
  p.id, p.nickname, p.full_name, p.avatar_url, p.roles, p.preferred_role,
  p.jersey_number, p.is_active,
  s.matches_played, s.wins, s.draws, s.losses, s.goals, s.assists,
  s.win_rate, s.last_played_at
from public.profiles p
join public.player_stats s on s.profile_id = p.id
order by s.win_rate desc nulls last, s.wins desc, s.goals desc, p.nickname;

grant select on public.player_stats to authenticated;
grant select on public.standings    to authenticated;
