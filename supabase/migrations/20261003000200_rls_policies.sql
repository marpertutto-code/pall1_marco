-- ============================================================
-- Pall1 · Row Level Security
-- ============================================================
alter table public.profiles      enable row level security;
alter table public.matches       enable row level security;
alter table public.match_players enable row level security;
alter table public.match_results enable row level security;

-- ---------- profiles ----------
create policy profiles_select_authenticated
  on public.profiles for select to authenticated using (true);

create policy profiles_insert_self
  on public.profiles for insert to authenticated
  with check (id = auth.uid() and is_admin = false);

create policy profiles_update_self
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy profiles_admin_all
  on public.profiles for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- matches ----------
create policy matches_select_authenticated
  on public.matches for select to authenticated using (true);

create policy matches_admin_insert
  on public.matches for insert to authenticated
  with check (public.is_admin());

create policy matches_admin_update
  on public.matches for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy matches_admin_delete
  on public.matches for delete to authenticated
  using (public.is_admin());

-- ---------- match_players ----------
create policy match_players_select_authenticated
  on public.match_players for select to authenticated using (true);

create policy match_players_insert_self_or_admin
  on public.match_players for insert to authenticated
  with check (
    public.is_admin()
    or (
      profile_id = auth.uid()
      and attendance in ('present', 'maybe')
      and team is null
      and goals = 0
      and assists = 0
      and exists (
        select 1 from public.matches m
        where m.id = match_id and m.status in ('scheduled', 'teams_set')
      )
    )
  );

create policy match_players_update_self_or_admin
  on public.match_players for update to authenticated
  using (profile_id = auth.uid() or public.is_admin())
  with check (profile_id = auth.uid() or public.is_admin());

create policy match_players_delete_self_or_admin
  on public.match_players for delete to authenticated
  using (profile_id = auth.uid() or public.is_admin());

-- ---------- match_results ----------
create policy match_results_select_authenticated
  on public.match_results for select to authenticated using (true);

create policy match_results_admin_write
  on public.match_results for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
