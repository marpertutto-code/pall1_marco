# Pall1 — guida di setup (per l'agente AI)

**Pall1** si legge *pall-one* → **pallone**. Webapp per gestire il calcetto tra amici:
iscrizioni, formazione delle squadre, risultati, classifica, sondaggi, chat e statistiche.

> **Agente, leggi tutto questo file prima di toccare qualsiasi cosa.**
> Questa cartella è uno **scheletro pulito**: il codice è completo e funzionante, ma
> **non è collegato a nessuna risorsa cloud**. Non esiste più:
>
> - nessun repository GitHub,
> - nessun progetto/storico Git (la cartella `.git` è stata rimossa di proposito),
> - nessun progetto Supabase,
> - nessun progetto Vercel,
> - nessuna credenziale (`.env.local`, `supabase/.temp/`, `.vercel/` non esistono).
>
> Il tuo compito è creare da zero il **repo GitHub**, il **progetto Supabase** e il
> **progetto Vercel** del nuovo proprietario, collegarli e deployare. I segnaposto da
> sostituire nel codice sono tutti riconoscibili: cerca `IL-TUO-`, `IL-TUO-DOMINIO`,
> `xxxxxxxxxxxx`, `team_xxx`, `REPLACE-ME`.

- **Frontend:** Next.js 16 (App Router) + React 19 + TypeScript strict
- **Dati, auth e storage:** Supabase (Postgres + RLS + Auth email/password + Storage + Realtime)
- **Deploy:** Vercel
- **UI:** mobile-first, tema chiaro/scuro, design system a token OKLCH

---

## 0. Prima di iniziare: cosa serve

| Strumento | Perché | Verifica |
|---|---|---|
| Node.js 22+ | build e dev server | `node -v` |
| npm | dipendenze | `npm -v` |
| Git | versionamento | `git --version` |
| GitHub CLI (`gh`) | creare il repo | `gh --version` e `gh auth status` |
| Supabase CLI | migrazioni e link | `supabase --version` |
| Vercel CLI (`vercel`) | deploy | `vercel --version` |
| Python 3 + potracer | **solo** per rigenerare il logo | `python --version` |

### Dati che devi farti dare dall'utente (non inventarli, non riusarli)

1. **Account GitHub** in cui creare il repo (o l'org).
2. **Account Supabase** — o un `SUPABASE_ACCESS_TOKEN` già attivo.
3. **Nome progetto / regione** desiderati per Supabase (default consigliato: `eu-central-1`, Francoforte).
4. **Password del database** Supabase da scegliere e annotare.
5. **Account Vercel** per il deploy.
6. **Email + nickname** del primo amministratore (`profiles.is_admin`).
7. (Opzionale) **Bot Telegram**: token da BotFather e username.

> Regola d'oro: **nessun segreto va committato**. `.env.local`, `supabase/.temp/`,
> `.vercel/` sono già in `.gitignore`: lasciali lì.

### Autenticazione delle CLI

```bash
gh auth login                 # se non già autenticato
supabase login                # apre il browser; oppure esporta SUPABASE_ACCESS_TOKEN
vercel login
```

Se non hai accesso al browser, chiedi all'utente di fare `login` e poi riprendi.

---

## 1. Crea il repository GitHub

Il repo è nuovo e scollegato da qualsiasi altro. Scegli un nome (es. `pall1`).

```bash
cd Pall1-starter
git init -b main
git add -A
git commit -m "chore: import Pall1 skeleton"

# crea il repo remoto e pusha (usa --private se preferisci)
gh repo create <NOME-REPO> --public --source=. --remote=origin --push
```

Verifica: `git remote -v` deve puntare **solo** al repo nuovo.

> Il repo parte senza cronologia: è intenzionale. Se l'utente vuole che sia *fork*
> del progetto originale, fermati e chiedi: qui si costruisce da zero.

---

## 2. Crea il progetto Supabase e collegalo

```bash
# crea il progetto (l'org-id lo vedi con `supabase orgs list`)
supabase projects create <NOME-PROGETTO> \
  --org-id <ORG-ID> \
  --db-password '<PASSWORD-DB>' \
  --region eu-central-1

# prendi il project-ref: è il prefisso di https://<ref>.supabase.co
supabase projects list
supabase link --project-ref <PROJECT-REF>
```

Poi recupera URL, anon key e service role key:

```bash
supabase projects api-keys --project-ref <PROJECT-REF>
# oppure: Dashboard → Project Settings → API
```

### 2.1 Applica le migrazioni

Le migrazioni in `supabase/migrations/` creano schema, trigger, RLS, view, Storage,
Realtime e il job del promemoria. **Sempre prima il dry-run:**

```bash
supabase db push --dry-run -p '<PASSWORD-DB>'
supabase db push -p '<PASSWORD-DB>'
supabase migration list          # l'ultima riga: local e remote devono combaciare
```

> **Attenzione al cron (leggi §6).** La migrazione `…_match_reminders` crea un job
> `pg_cron` che chiama l'URL Vercel. In questo scheletro l'URL è un segnaposto
> (`https://IL-TUO-DOMINIO.vercel.app/...`): lo correggerai al §6, **dopo** il deploy.

### 2.2 Rigenera i tipi TypeScript (facoltativo ma consigliato)

`src/types/database.types.ts` è già allineato allo schema. Se cambi le migrazioni:

```bash
npx supabase gen types typescript --project-ref <PROJECT-REF> > /tmp/types.ts
# confronta con src/types/database.types.ts; se differisce, sostituisci
npx supabase gen types typescript --project-ref <PROJECT-REF> > src/types/database.types.ts
```

---

## 3. Crea `.env.local`

```bash
cp .env.example .env.local
```

Compila i valori reali (`.env.example` è il modello commentato):

| Variabile | Valore |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<PROJECT-REF>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key del progetto |
| `NEXT_PUBLIC_SITE_URL` | in locale `http://localhost:3000`; in produzione il dominio Vercel |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key — **solo server, mai nel frontend** |
| `SUPABASE_PROJECT_ID` | `<PROJECT-REF>` (serve a `gen:types`) |
| `TELEGRAM_BOT_TOKEN` | (opzionale) da BotFather |
| `TELEGRAM_BOT_USERNAME` | (opzionale) username senza `@` |
| `TELEGRAM_WEBHOOK_SECRET` | (opzionale) stringa casuale |
| `CRON_SECRET` | (opzionale) se impostato, l'endpoint cron richiede `Bearer <secret>` |

Avvia e verifica in locale:

```bash
npm install
npm run dev        # http://localhost:3000
```

### 3.1 Primo amministratore

Nessuno può auto-promuoversi (bloccato da trigger e RLS). Dopo che l'utente si è
registrato dall'app, promuovilo dal **SQL Editor** di Supabase:

```sql
update public.profiles
set is_admin = true
where lower(nickname) = lower('<NICKNAME-DEL-ADMIN>');
```

---

## 4. Crea il progetto Vercel e deploya

```bash
cd Pall1-starter
vercel link              # crea/collega un progetto Vercel nuovo
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add NEXT_PUBLIC_SITE_URL production          # es. https://<progetto>.vercel.app
vercel env add SUPABASE_SERVICE_ROLE_KEY production
# ripeti gli stessi env per l'ambiente "preview" (e "development" se vuoi)
vercel --prod
```

Oppure importa il repo GitHub dalla dashboard Vercel (consigliato per i deploy
automatici su `main` e le preview sulle PR). In quel caso aggiungi le stesse
variabili in **Settings → Environment Variables** per Production **e** Preview.

`vercel.json` fissa già il framework su `nextjs`.

> Dopo il primo deploy annota il dominio definitivo: serve al §5 e §6.

---

## 5. Configura gli URL di autenticazione su Supabase

I magic link e le conferme email devono tornare sul tuo dominio, non su localhost.
Apri `supabase/config.toml` e sostituisci i segnaposto nella sezione `[auth]`:

```toml
[auth]
site_url = "https://IL-TUO-DOMINIO.vercel.app"
additional_redirect_urls = [
  "http://localhost:3000/auth/callback",
  "https://IL-TUO-DOMINIO.vercel.app/auth/callback",
  "https://*-<TUO-TEAM-VERCEL>.vercel.app/auth/callback",
]
[auth.email]
enable_confirmations = true
```

Poi allinea il progetto remoto:

```bash
supabase config push     # mostra il diff e chiede conferma: leggilo
```

In alternativa (o per controllo) fallo dalla dashboard:
**Authentication → URL Configuration** → imposta *Site URL* e *Redirect URLs*, e
verifica **Providers → Email** attivo (nessun OAuth è usato).

---

## 6. Attiva il promemoria partita (job `pg_cron`)

Il timer non usa i cron di Vercel (sul piano Hobby il minimo è una volta al giorno,
troppo grossolano per un avviso a 12 ore): vive in Postgres e chiama
`/api/cron/match-reminders` tramite `pg_net` ogni 30 minuti.

Sostituisci il segnaposto **prima** del `db push` (in
`supabase/migrations/20261003001100_match_reminders.sql`), oppure — se lo hai già
pushato — riprogramma il job dal **SQL Editor** con il dominio reale:

```sql
select cron.unschedule('pall1-match-reminders');

select cron.schedule(
  'pall1-match-reminders',
  '*/30 * * * *',
  $$
  select net.http_post(
    url := 'https://IL-TUO-DOMINIO.vercel.app/api/cron/match-reminders',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  ) as request_id;
  $$
);
```

Verifica:

```sql
select jobname, schedule, active from cron.job;
select * from net._http_response order by created desc limit 5;
```

La migrazione crea anche le estensioni `pg_cron` e `pg_net`: se il piano Supabase
non le consente, il push fallisce su quel file — in quel caso disattiva il job e
segnalalo all'utente.

---

## 7. (Opzionale) Notifiche Telegram

1. Crea un bot con **@BotFather** e recupera il token.
2. Metti `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME` e un
   `TELEGRAM_WEBHOOK_SECRET` casuale in `.env.local` **e** tra le env di Vercel.
3. Registra il webhook:

```bash
npm run telegram:webhook -- set https://IL-TUO-DOMINIO.vercel.app
npm run telegram:webhook -- info
```

Gli utenti attivano le notifiche dal profilo (deep-link `t.me/<bot>?start=<codice>`).

---

## 8. (Consigliato) Secrets per la CI GitHub

`.github/workflows/ci.yml` esegue lint, typecheck, test, contrasto e build. Per la
build servono due secret nel repo (**Settings → Secrets and variables → Actions**):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Aggiungili anche via CLI:

```bash
gh secret set NEXT_PUBLIC_SUPABASE_URL --body "https://<PROJECT-REF>.supabase.co"
gh secret set NEXT_PUBLIC_SUPABASE_ANON_KEY --body "<ANON-KEY>"
```

---

## 9. Verifica finale (checklist)

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

- [ ] `git remote -v` → solo il repo nuovo
- [ ] `supabase migration list` → local = remote
- [ ] App in locale: registrazione, login, partita, sondaggio, chat funzionanti
- [ ] Deploy Vercel online e raggiungibile
- [ ] Env Vercel complete per Production **e** Preview
- [ ] Auth URL configurati (§5) e conferma email che torna sul dominio giusto
- [ ] Job `pall1-match-reminders` attivo con l'URL reale (§6)
- [ ] `tests/rls/rls.test.mjs` verde: `node tests/rls/rls.test.mjs` (usa `SUPABASE_SERVICE_ROLE_KEY`)
- [ ] Nessun segreto nel repo (`git grep -iE "service_role|supabase.co|vercel.app"` → solo doc/example)

---

## 10. Comandi utili

| Comando | Cosa fa |
|---|---|
| `npm run dev` | server di sviluppo |
| `npm run build` / `npm start` | build e avvio in produzione |
| `npm run lint` | ESLint (flat config) |
| `npm run typecheck` | TypeScript `noEmit` |
| `npm test` | test unitari (Vitest) |
| `npm run test:rls` | test delle policy RLS contro il DB reale |
| `npm run test:e2e` | E2E Playwright (avvia da sé il dev server) |
| `npm run gen:types` | rigenera `src/types/database.types.ts` |
| `npm run telegram:webhook` | registra/ispeziona/rimuove il webhook bot |
| `npm run build:brand` | rigenera favicon, icone app, OG image |
| `npm run format` | Prettier |

---

## 11. Note di architettura

### Migrazioni (`supabase/migrations/`)

`init_schema`, `functions_triggers`, `rls_policies`, `views_stats`, `storage_avatars`,
`polls`, `poll_options_sort_order`, `formats_and_positions`, `poll_week`, `poll_subpolls`,
`telegram_notifications`, `match_reminders`, `organizers`, `match_insert_author`, `chat`,
`telegram_delivery`, `poll_day_time_cleanup`, `backfill_day_vote`.

### Regole di sicurezza in breve

- RLS attiva su **tutte** le tabelle; `anon` non legge nulla.
- `is_admin()` è `security definer`: il ruolo vive nel database, mai nel client.
- Nessuno può auto-assegnarsi `is_admin` o `is_organizer` (trigger).
- Capacità partita, transizioni di stato e risultati sono validati dal database.
- `telegram_notifications`/`telegram_deliveries` non hanno policy: le vedono solo
  webhook e notifiche con la service role.

### Realtime + RLS (errore classico)

Sottoscrivere un canale senza token esplicito lascia il socket come `anon`; la RLS
scarta gli eventi **in silenzio** e `SUBSCRIBED` arriva comunque. Prima di
`.subscribe()` va fatto:

```ts
const { data } = await supabase.auth.getSession();
await supabase.realtime.setAuth(...);
```

Vedi `src/components/chat/chat-room.tsx`. Vale per ogni nuova tabella realtime, che
va anche aggiunta alla publication `supabase_realtime` (con `replica identity full`
se servono gli eventi `DELETE` sotto RLS).

### Struttura

```
src/
├─ app/          rotte App Router: (auth), (app), admin, polls, chat, api, open
├─ components/   UI: ui/, match/, positions/, chat/, polls/, admin/
├─ lib/          azioni server, client Supabase, telegram, validazioni, util
└─ types/        database.types.ts (generato)
supabase/migrations/   schema, RLS, trigger, view, storage, realtime, cron
scripts/               brand, webhook Telegram, controlli
 tests/                unit/, e2e/, rls/
```

---

## 12. Troubleshooting

| Sintomo | Causa probabile |
|---|---|
| Login non completa il redirect | *Site URL* / *Redirect URLs* non aggiornati (§5) |
| Chat muta, nessun errore | `realtime.setAuth` mancante (§11) |
| Promemoria mai inviati | URL del job `pg_cron` ancora segnaposto o dominio sbagliato (§6) |
| 404 su tutte le rotte dopo il deploy | framework Vercel non `nextjs` (già fissato in `vercel.json`) |
| Build CI rossa | secret `NEXT_PUBLIC_*` mancanti nel repo (§8) |
| `supabase db push` chiede password | passala con `-p '<PASSWORD-DB>'` |
| `gen:types` scrive file vuoto | il comando tronca anche se fallisce: usa un file temporaneo |

---

## Licenza e proprietà

Il codice è fornito «così com'è», senza alcuna risorsa cloud collegata. Il nuovo
proprietario è responsabile di GitHub, Supabase, Vercel, credenziali e costi.
