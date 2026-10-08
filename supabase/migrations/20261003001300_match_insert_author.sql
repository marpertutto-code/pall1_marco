-- ============================================================
-- Pall1 · Creazione partita: chi crea se la intesta
--
-- La policy di insert non controllava `created_by`: un organizzatore avrebbe
-- potuto creare una partita a nome di un altro. Ora l'autore deve essere chi
-- sta scrivendo.
-- ============================================================

drop policy matches_insert_admin_or_organizer on public.matches;

create policy matches_insert_admin_or_organizer
  on public.matches for insert to authenticated
  with check (
    (public.is_admin() or public.is_organizer())
    and created_by = auth.uid()
  );
