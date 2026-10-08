# Task: Piano di implementazione — Webapp Calcetto tra amici

## Ruolo
Sei un senior full-stack engineer e tech lead. Il tuo compito, **in questa fase, è produrre un PIANO DI IMPLEMENTAZIONE dettagliato**, non scrivere il codice dell'app. Salva il piano in `docs/IMPLEMENTATION_PLAN.md`.

Prima di scrivere il piano, se qualcosa è ambiguo, elenca al massimo 5 domande mirate; altrimenti procedi dichiarando le assunzioni fatte.

---

## 1. Contesto del progetto
Webapp gestionale per un gruppo di amici che organizza partite di calcetto. Gli utenti si registrano, personalizzano il proprio profilo e consultano partite, squadre, risultati e statistiche. Un **admin** gestisce le partite (formazione squadre, risultato, ecc.).

## 2. Stack obbligatorio
- **Frontend:** React + TypeScript (Vite oppure Next.js: scegli e **motiva** la scelta in base al deploy su Vercel)
- **Backend / DB / Auth:** **Supabase** (Postgres + Supabase Auth + Row Level Security)
- **Versioning:** repository **GitHub**
- **Deploy:** progetto **Vercel** collegato al repo GitHub (deploy automatico su push; preview per ogni PR)
- **UI:** mobile-first (gli amici la useranno soprattutto da smartphone), tema pulito e moderno, dark mode opzionale

## 3. Requisiti funzionali

### 3.1 Autenticazione
- Registrazione e login con **account locale** (email + password) tramite Supabase Auth.
- **NIENTE login con Google** o altri provider OAuth.
- Reset password via email.
- Sessione persistente, logout, rotte protette.
- Alla registrazione viene creato automaticamente un record `profiles` collegato a `auth.users` (trigger SQL).

### 3.2 Profilo giocatore (personalizzabile dall'utente)
- **Nickname** (univoco)
- **Ruolo/i** (es. portiere, difensore, centrocampista, attaccante; possibilità di più ruoli, con eventuale ruolo preferito)
- **Numero di maglia** (con gestione dei conflitti: decidi e documenta se deve essere univoco o no)
- Avatar/foto profilo (opzionale)
- Campi aggiuntivi gestibili dall'admin: età, note, stato attivo/inattivo

### 3.3 Partite
- Creazione partita (admin): data, ora, luogo/campo, numero massimo di giocatori.
- Iscrizione/disiscrizione dei giocatori alla partita (stato: presente / assente / forse).
- **Formazione squadre** (admin): assegnazione manuale dei giocatori a Squadra A / Squadra B. Proponi anche, come estensione, un bilanciamento automatico opzionale basato sui ruoli.
- **Risultato** (admin): punteggio finale, eventuali marcatori/assist (se previsti), MVP opzionale.
- Stati della partita: `programmata` → `squadre formate` → `giocata` (+ `annullata`).
- Storico partite consultabile da tutti.

### 3.4 Statistiche
- Per giocatore: partite giocate, vittorie/pareggi/sconfitte, % vittorie, gol, assist (se previsti).
- Classifica generale.
- Specifica quali statistiche sono calcolate con **view/funzioni SQL** e quali lato client.

### 3.5 Pannello Admin
- Accesso solo per utenti con ruolo `admin`.
- Gestione giocatori (modifica dati, attiva/disattiva, promozione ad admin).
- Gestione partite, squadre e risultati (vedi 3.3).

## 4. Requisiti non funzionali
- **Sicurezza:** Row Level Security su **tutte** le tabelle; policy distinte per utente normale e admin; l'admin è determinato dal DB (mai solo lato client). Nessuna chiave segreta (service role) esposta al frontend.
- **Variabili d'ambiente:** gestite via `.env.local` e Vercel Environment Variables; fornisci un `.env.example`.
- **Qualità:** TypeScript strict, ESLint + Prettier, validazione form (es. Zod), gestione errori e stati di loading/empty.
- **Accessibilità e responsive** di base.
- **Costi:** deve funzionare interamente sui piani gratuiti di Supabase e Vercel.

---

## 5. Cosa deve contenere `docs/IMPLEMENTATION_PLAN.md`

1. **Panoramica architetturale** (schema testuale/Mermaid: browser → Vercel → Supabase) e scelte tecniche motivate.
2. **Struttura del repository** (albero cartelle proposto).
3. **Schema database Supabase**: tabelle, colonne, tipi, chiavi, vincoli, indici e relazioni (es. `profiles`, `matches`, `match_players`, `match_results`, eventuale `player_stats` view). Includi l'SQL completo delle migrazioni.
4. **Auth & autorizzazioni**: flusso di registrazione/login, trigger di creazione profilo, definizione del ruolo admin e **policy RLS complete in SQL**.
5. **Mappa delle pagine/rotte** e dei componenti principali, con la matrice di accesso (pubblica / utente / admin).
6. **Data layer**: come il frontend interroga Supabase (client, hook/query, caching, gestione errori), con i tipi TS generati dallo schema.
7. **Setup infrastruttura** passo-passo:
   - creazione progetto Supabase e configurazione Auth (solo email/password, conferma email sì/no);
   - creazione repo GitHub e branching strategy;
   - collegamento GitHub → Vercel, env vars, preview deployments;
   - come creare il **primo admin**.
8. **Roadmap a milestone** ordinate (es. M0 setup, M1 auth, M2 profili, M3 partite, M4 admin/squadre/risultati, M5 statistiche, M6 rifinitura/deploy). Per ogni milestone: obiettivo, task, **criteri di accettazione verificabili**, stima di complessità (S/M/L).
9. **Strategia di test** (minima ma sensata: test delle policy RLS, test dei flussi critici).
10. **Rischi, assunzioni e decisioni aperte**, con la tua raccomandazione per ciascuna.
11. **Estensioni future** (fuori scope MVP), es. notifiche, votazioni post-partita, ELO.

---

## 6. Vincoli sul tuo comportamento
- **Non scrivere codice applicativo** (componenti React, pagine ecc.): solo il piano, più SQL di schema/RLS e snippet di configurazione indispensabili.
- Sii concreto e ordinato: ogni task deve essere eseguibile da un agente AI senza dover indovinare.
- Distingui chiaramente **MVP** da **nice-to-have**.
- Scrivi il piano in **italiano**; nomi di tabelle, colonne e codice in inglese.
- Al termine, riassumi in 10 righe le decisioni principali e chiedi conferma prima di iniziare l'implementazione.
