<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Pall1 — istruzioni per l'agente

Questo repository è uno **scheletro pulito**: codice completo, **nessuna risorsa cloud
collegata**. Non esistono repo Git, progetto Supabase, progetto Vercel né credenziali.
Tocca a te crearli e collegarli.

**Leggi `README.md` da cima a fondo: è la checklist operativa.** Qui trovi solo le regole
di comportamento e i punti che si sbagliano più spesso.

## Cosa devi fare (in ordine)

1. Creare il **repo GitHub** nuovo (§1 del README) — `git init` da zero, nessun remoto esistente.
2. Creare il **progetto Supabase** nuovo, `supabase link`, poi `db push` (§2).
3. Creare **`.env.local`** da `.env.example` con le chiavi nuove (§3).
4. Deployare su **Vercel** e impostare le env per Production e Preview (§4).
5. Configurare gli **URL di auth** su Supabase con il dominio reale (§5).
6. Aggiornare l'**URL del job `pg_cron`** dei promemoria (§6) — è un segnaposto.
7. (Opzionale) Bot **Telegram** (§7) e secrets **GitHub Actions** (§8).

## Regole inderogabili

- **Mai riusare credenziali altrui.** Se trovi stringhe tipo `yivbe…`, `prj_…`, `team_…`,
  `IL-TUO-…`, sono segnaposto da sostituire, non valori validi.
- **Mai committare segreti.** `.env.local`, `supabase/.temp/`, `.vercel/`, `tmp/` sono
  già in `.gitignore`. Non aggiungerli, non forzarne l'add.
- **Chiedi prima** di: cancellare risorse, cambiare `is_admin`, ruotare password, o
  qualunque operazione distruttiva sul DB.
- **Password DB:** la sceglie il proprietario del nuovo progetto. La CLI non la salva:
  passala con `-p '<PASSWORD-DB>'` a `db push` e ai comandi che la richiedono.
- **Migrazioni:** sempre `supabase db push --dry-run` prima del push reale.
- **Tipi generati:** `supabase gen types … > file` tronca il file anche se fallisce.
  Scrivi su un file temporaneo, confronta il diff, poi sostituisci.
- `supabase config push` invia **tutta** la config auth: controlla il diff prima di confermare.

## Punti che si sbagliano sempre

- **Realtime + RLS:** sottoscrivere senza token lascia il socket come `anon`; la RLS scarta
  gli eventi **in silenzio** e `SUBSCRIBED` arriva comunque. Prima di `.subscribe()`:
  `const { data } = await supabase.auth.getSession()` poi
  `await supabase.realtime.setAuth(...)` (vedi `src/components/chat/chat-room.tsx`).
  Le nuove tabelle realtime vanno aggiunte alla publication `supabase_realtime` e, se
  servono gli eventi `DELETE` sotto RLS, con `alter table … replica identity full;`.
- **Cron promemoria:** senza l'URL reale nel job `pg_cron` i messaggi non partono mai e
  non c'è nessun errore visibile. È il §6 del README.
- **Auth redirect:** se *Site URL*/*Redirect URLs* restano su `localhost`, la conferma
  email rompe il flusso dopo il deploy.
- **`test:rls`** (`tests/rls/rls.test.mjs`) è l'unico test che tocca il DB reale: usa
  `SUPABASE_SERVICE_ROLE_KEY` da `.env.local`.
