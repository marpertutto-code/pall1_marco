-- ============================================================
-- Pall1 · Chat di gruppo
--
-- Una chat unica per tutto il gruppo (come i sondaggi): tutti vedono
-- tutti. I messaggi arrivano in tempo reale via Supabase Realtime, quindi
-- la tabella entra nella publication `supabase_realtime`.
-- ============================================================

create table public.chat_messages (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now(),
  -- Il vincolo guarda al testo "vero" (trim): niente messaggi vuoti o di soli spazi.
  constraint chat_messages_body_len check (char_length(btrim(body)) between 1 and 1000)
);

comment on table public.chat_messages is
  'Messaggi della chat unica di gruppo. Immutabili: si scrivono e si eliminano.';

create index chat_messages_created_idx on public.chat_messages (created_at desc);
create index chat_messages_profile_idx on public.chat_messages (profile_id);

-- Con la RLS attiva un evento DELETE porta con sé solo la chiave primaria: senza
-- i valori vecchi il realtime non riesce a valutare la policy e scarta l'evento.
-- `full` rende disponibile la riga eliminata (e quindi il suo `id`).
alter table public.chat_messages replica identity full;

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------

alter table public.chat_messages enable row level security;

create policy chat_messages_select_authenticated
  on public.chat_messages for select to authenticated using (true);

-- Si scrive solo a nome proprio.
create policy chat_messages_insert_self
  on public.chat_messages for insert to authenticated
  with check (profile_id = auth.uid());

-- Nessuna policy di update: un messaggio non si modifica, si elimina.
-- Il proprio lo cancella chi l'ha scritto; un admin modera qualsiasi messaggio.
create policy chat_messages_delete_own_or_admin
  on public.chat_messages for delete to authenticated
  using (profile_id = auth.uid() or public.is_admin());

-- ------------------------------------------------------------
-- Realtime
-- ------------------------------------------------------------

alter publication supabase_realtime add table public.chat_messages;
