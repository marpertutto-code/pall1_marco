-- ============================================================
-- Pall1 · Promemoria partita ~12 ore prima
--
-- Vercel Hobby permette i cron solo una volta al giorno (min interval: once
-- per day), troppo grossolano per un promemoria a 12 ore. Quindi il timer vive
-- in Postgres: `pg_cron` scatta ogni 30 minuti e `pg_net` chiama l'endpoint
-- dell'app, che manda il messaggio su Telegram.
--
-- `reminder_sent_at` garantisce un solo invio per partita anche se due
-- esecuzioni si sovrappongono.
-- ============================================================

alter table public.matches add column reminder_sent_at timestamptz;

comment on column public.matches.reminder_sent_at is
  'Quando è stato inviato il promemoria Telegram (~12h prima). Null = da inviare.';

create index matches_reminder_idx
  on public.matches (match_date)
  where reminder_sent_at is null;

-- ------------------------------------------------------------
-- Timer: pg_cron + pg_net
-- ------------------------------------------------------------

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Riapplicando la migrazione non si duplica il job.
select cron.unschedule('pall1-match-reminders')
where exists (select 1 from cron.job where jobname = 'pall1-match-reminders');

-- Ogni 30 minuti: l'endpoint è idempotente, quindi chiamate ravvicinate non
-- producono messaggi doppi.
--
-- ATTENZIONE: sostituire IL-TUO-DOMINIO con il dominio Vercel reale (o aggiornare
-- il job dal SQL Editor dopo il primo deploy, vedi README §6). Con il segnaposto
-- il cron gira ma le chiamate falliscono in silenzio.
select cron.schedule(
  'pall1-match-reminders',
  '*/30 * * * *',
  $$
  select net.http_post(
    url := 'https://pall1-marco.vercel.app/api/cron/match-reminders',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  ) as request_id;
  $$
);
