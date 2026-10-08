-- Backfill "giorno + orario": chi ha votato un orario di un giorno senza
-- spuntare il giorno non compariva nell'incrocio di PollBestSlots, perché
-- servono entrambi i voti. Da ora il giorno si spunta da solo al momento del
-- voto (vedi `src/lib/actions/polls.ts` e `src/lib/poll-day-time.ts`), ma i
-- voti già presenti vanno sistemati una volta sola.
--
-- Solo sui sondaggi ancora aperti: su quelli chiusi i risultati sono già
-- fissati e non vanno riscritti.
-- Il trigger `poll_votes_single_choice` sostituisce da sé il giorno
-- precedente sui sondaggi a scelta singola.

insert into public.poll_votes (poll_id, option_id, profile_id)
select day_poll.id, sub.parent_option_id, v.profile_id
from public.poll_votes v
join public.polls sub
  on sub.id = v.poll_id
 and sub.parent_option_id is not null
join public.poll_options day_option
  on day_option.id = sub.parent_option_id
join public.polls day_poll
  on day_poll.id = day_option.poll_id
 and day_poll.is_closed = false
on conflict (option_id, profile_id) do nothing;
