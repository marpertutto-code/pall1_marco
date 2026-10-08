-- ============================================================
-- Pall1 · Pulizia voti "solo giorno"
--
-- La regola "giorno + orario" impone che un giorno spuntato abbia almeno un
-- orario scelto in quel giorno. I voti precedenti alla regola possono essere
-- orfani: il giorno è votato ma nel relativo sottosondaggio il profilo non ha
-- scelto nulla.
--
-- Questi voti non alimentano il calcolo delle fasce (che incrocia giorno e
-- orario) e non sono più replicabili. Li rimuoviamo una volta per tutte: gli
-- interessati rivoteranno scegliendo anche un orario.
-- ============================================================

delete from public.poll_votes v
using public.polls sub
where sub.parent_option_id = v.option_id
  and not exists (
    select 1
    from public.poll_votes t
    where t.poll_id = sub.id
      and t.profile_id = v.profile_id
  );
