-- ============================================================
-- Pall1 · poll_options: position -> sort_order
-- "position" è una parola riservata dello standard SQL e crea attrito con
-- PostgREST (ordinare una INSERT su una colonna non inclusa nella select
-- restituisce "column poll_options.position does not exist").
-- La tabella era vuota: rinomina senza migrazione dati.
-- ============================================================

alter table public.poll_options rename column position to sort_order;

comment on column public.poll_options.sort_order is
  'Ordine di visualizzazione dell''opzione nel sondaggio.';
