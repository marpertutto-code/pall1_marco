/**
 * Test delle policy RLS di Pall1.
 *
 * Verifica con un utente normale (anon key) che le regole di sicurezza
 * del database facciano il loro lavoro. Usa la service role key SOLO per
 * creare e distruggere utenti di prova: non viene mai usata per le
 * asserzioni.
 *
 * Uso:
 *   SUPABASE_SERVICE_ROLE_KEY=... npm run test:rls
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  console.error(
    "Servono NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY.",
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const stamp = Date.now();
const password = `Test-${stamp}-pall1`;

let passed = 0;
let failed = 0;

function check(name, condition, extra = "") {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL ${name}${extra ? ` → ${extra}` : ""}`);
  }
}

async function createUser(nickname) {
  const email = `${nickname}.${stamp}@pall1.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nickname },
  });
  if (error) throw new Error(`Creazione utente fallita: ${error.message}`);
  return { id: data.user.id, email };
}

async function signIn(email) {
  const client = createClient(url, anonKey, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Login fallito: ${error.message}`);
  return client;
}

const created = [];

try {
  console.log("Preparazione utenti di prova…");
  const player = await createUser(`probe${stamp}`);
  const other = await createUser(`other${stamp}`);
  const third = await createUser(`third${stamp}`);
  created.push(player.id, other.id, third.id);

  // Il trigger handle_new_user deve aver creato i profili.
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, nickname, is_admin")
    .in("id", [player.id, other.id, third.id]);

  check("il trigger crea il profilo alla registrazione", (profiles ?? []).length === 3);
  check("i nuovi utenti non sono admin", (profiles ?? []).every((p) => p.is_admin === false));

  const playerClient = await signIn(player.email);
  const otherClient = await signIn(other.email);
  const thirdClient = await signIn(third.email);

  console.log("\nLetture");
  const anonClient = createClient(url, anonKey, { auth: { persistSession: false } });
  const anonRead = await anonClient.from("profiles").select("id");
  check("anon non legge i profili", (anonRead.data ?? []).length === 0);

  const authRead = await playerClient.from("profiles").select("id");
  check("un utente autenticato legge i profili", (authRead.data ?? []).length >= 2);
  console.log("\nScritture di dominio");
  const matchInsert = await playerClient
    .from("matches")
    .insert({ match_date: new Date().toISOString(), location: "Test RLS", created_by: player.id })
    .select("id");
  check(
    "un utente normale non crea partite",
    (matchInsert.data ?? []).length === 0 && matchInsert.error !== null,
    matchInsert.error?.message,
  );

  const { data: match } = await admin
    .from("matches")
    .insert({ match_date: new Date(Date.now() + 86_400_000).toISOString(), location: "Test RLS" })
    .select("id")
    .single();

  console.log("\nEscalation di privilegi");
  await playerClient.from("profiles").update({ is_admin: true, is_active: false }).eq("id", player.id);
  const { data: afterEscalation } = await admin
    .from("profiles")
    .select("is_admin, is_active")
    .eq("id", player.id)
    .single();
  check("is_admin non è auto-assegnabile", afterEscalation?.is_admin === false);
  check("is_active non è auto-modificabile", afterEscalation?.is_active === true);

  await playerClient.from("profiles").update({ is_organizer: true }).eq("id", player.id);
  const { data: afterOrganizer } = await admin
    .from("profiles")
    .select("is_organizer")
    .eq("id", player.id)
    .single();
  check("is_organizer non è auto-assegnabile", afterOrganizer?.is_organizer === false);

  console.log("\nOrganizzatori");
  // L'admin dà il consenso.
  await admin.from("profiles").update({ is_organizer: true }).eq("id", player.id);

  const organizerMatch = await playerClient
    .from("matches")
    .insert({
      match_date: new Date(Date.now() + 2 * 86_400_000).toISOString(),
      location: "Test organizzatore",
      created_by: player.id,
    })
    .select("id");
  check(
    "un organizzatore crea partite",
    (organizerMatch.data ?? []).length === 1,
    organizerMatch.error?.message,
  );

  const organizerMatchId = organizerMatch.data?.[0]?.id;
  const organizerEdit = await playerClient
    .from("matches")
    .update({ location: "Modificata dall'organizzatore" })
    .eq("id", organizerMatchId)
    .select("id");
  check(
    "l'organizzatore non gestisce le partite",
    (organizerEdit.data ?? []).length === 0,
    organizerEdit.error?.message,
  );

  await admin.from("matches").delete().eq("id", organizerMatchId);

  console.log("\nIscrizioni");
  const otherJoinForMe = await otherClient
    .from("match_players")
    .insert({ match_id: match.id, profile_id: player.id, attendance: "present" })
    .select("id");
  check(
    "non ci si iscrive a nome di un altro",
    (otherJoinForMe.data ?? []).length === 0,
    otherJoinForMe.error?.message,
  );

  const myJoin = await playerClient
    .from("match_players")
    .insert({ match_id: match.id, profile_id: player.id, attendance: "present" })
    .select("id")
    .single();
  check("ci si iscrive a nome proprio", Boolean(myJoin.data?.id), myJoin.error?.message);

  const cheatTeam = await playerClient
    .from("match_players")
    .update({ team: "a", goals: 5 })
    .eq("id", myJoin.data.id)
    .select("team, goals")
    .single();
  check(
    "squadra e gol non sono auto-assegnabili",
    cheatTeam.data?.team === null && cheatTeam.data?.goals === 0,
    JSON.stringify(cheatTeam.data),
  );

  const cheatResult = await playerClient
    .from("match_results")
    .insert({ match_id: match.id, team_a_score: 10, team_b_score: 0 })
    .select("match_id");
  check(
    "un utente normale non inserisce risultati",
    (cheatResult.data ?? []).length === 0 && cheatResult.error !== null,
    cheatResult.error?.message,
  );

  console.log("\nCapienza");
  await admin.from("matches").update({ max_players: 2 }).eq("id", match.id);

  const otherJoin = await otherClient
    .from("match_players")
    .insert({ match_id: match.id, profile_id: other.id, attendance: "present" })
    .select("id");
  check("il secondo giocatore si iscrive da solo", (otherJoin.data ?? []).length === 1, otherJoin.error?.message);

  const full = await thirdClient
    .from("match_players")
    .insert({ match_id: match.id, profile_id: third.id, attendance: "present" })
    .select("id");
  check(
    "il terzo con la partita piena viene respinto",
    (full.data ?? []).length === 0 && full.error !== null,
    full.error?.message,
  );

  console.log("\nTransizioni di stato");
  const teamsSet = await admin.from("matches").update({ status: "teams_set" }).eq("id", match.id);
  check(
    "non si confermano le squadre con giocatori senza squadra",
    teamsSet.error !== null,
    teamsSet.error?.message,
  );

  /* ---------------- Posizioni ---------------- */

  console.log("\nPosizioni e formati");
  const catalog = await playerClient.from("positions").select("code, format");
  check("il catalogo posizioni è leggibile", (catalog.data ?? []).length >= 20, catalog.error?.message);
  check(
    "il catalogo copre i tre formati",
    new Set((catalog.data ?? []).map((row) => row.format)).size === 3,
  );

  const foreignCatalogWrite = await playerClient
    .from("positions")
    .insert({ code: "x_fake", format: "five_a_side", label: "Finta", short_label: "XX", role_group: "defender", x: 0.5, y: 0.5 })
    .select("code");
  check(
    "il catalogo non si scrive dall'app",
    (foreignCatalogWrite.data ?? []).length === 0,
    foreignCatalogWrite.error?.message,
  );

  const ownPositions = await playerClient
    .from("profile_positions")
    .insert([
      { profile_id: player.id, position_code: "8_gk" },
      { profile_id: player.id, position_code: "5_lat_r" },
    ])
    .select("position_code");
  check(
    "si scelgono le proprie posizioni",
    (ownPositions.data ?? []).length === 2,
    ownPositions.error?.message,
  );

  const foreignPositions = await otherClient
    .from("profile_positions")
    .insert({ profile_id: player.id, position_code: "11_st" })
    .select("position_code");
  check(
    "non si scelgono le posizioni di un altro",
    (foreignPositions.data ?? []).length === 0,
    foreignPositions.error?.message,
  );

  const cachedPositions = await otherClient.from("profile_positions").select("profile_id");
  check("tutti vedono le posizioni dei compagni", (cachedPositions.data ?? []).length >= 2);

  const matchFormat = await admin.from("matches").select("format").eq("id", match.id).single();
  check("la partita ha un formato", matchFormat.data?.format === "eight_a_side", matchFormat.data?.format);

  /* ---------------- Sondaggi ---------------- */

  console.log("\nSondaggi");
  const pollInsert = await playerClient
    .from("polls")
    .insert({
      question: `Sondaggio RLS ${stamp}`,
      allow_multiple: true,
      created_by: player.id,
      week_start: "2026-10-05", // lunedì
    })
    .select("id")
    .single();
  check("un membro crea un sondaggio", Boolean(pollInsert.data?.id), pollInsert.error?.message);

  const pollId = pollInsert.data.id;

  const optionsInsert = await playerClient
    .from("poll_options")
    .insert([
      { poll_id: pollId, label: "Martedì", sort_order: 0 },
      { poll_id: pollId, label: "Giovedì", sort_order: 1 },
    ])
    .select("id, sort_order");
  check("l'autore aggiunge le opzioni", (optionsInsert.data ?? []).length === 2, optionsInsert.error?.message);

  const optionIds = (optionsInsert.data ?? []).map((row) => row.id);

  const foreignVote = await otherClient
    .from("poll_votes")
    .insert({ poll_id: pollId, option_id: optionIds[0], profile_id: player.id })
    .select("id");
  check(
    "non si vota a nome di un altro",
    (foreignVote.data ?? []).length === 0,
    foreignVote.error?.message,
  );

  const ownVote = await otherClient
    .from("poll_votes")
    .insert({ poll_id: pollId, option_id: optionIds[1], profile_id: other.id })
    .select("id")
    .single();
  check("si vota per sé", Boolean(ownVote.data?.id), ownVote.error?.message);

  const removeVote = await otherClient
    .from("poll_votes")
    .delete()
    .eq("option_id", optionIds[1])
    .eq("profile_id", other.id)
    .select("id");
  check("si ritira il proprio voto", (removeVote.data ?? []).length === 1, removeVote.error?.message);

  const reVote = await otherClient
    .from("poll_votes")
    .insert({ poll_id: pollId, option_id: optionIds[1], profile_id: other.id })
    .select("id")
    .single();
  check("si rivota dopo aver ritirato", Boolean(reVote.data?.id), reVote.error?.message);

  // Il client non manda un toggle ma l'esito voluto: l'upsert "do nothing"
  // rende l'operazione ripetibile senza duplicare né cancellare.
  const repeatVote = await otherClient
    .from("poll_votes")
    .upsert(
      { poll_id: pollId, option_id: optionIds[1], profile_id: other.id },
      { onConflict: "option_id,profile_id", ignoreDuplicates: true },
    )
    .select("id");
  const votesAfterRepeat = await otherClient
    .from("poll_votes")
    .select("id")
    .eq("option_id", optionIds[1])
    .eq("profile_id", other.id);
  check(
    "rivotare la stessa opzione non duplica il voto",
    (votesAfterRepeat.data ?? []).length === 1 && !repeatVote.error,
    repeatVote.error?.message,
  );

  const foreignUpsert = await otherClient
    .from("poll_votes")
    .upsert(
      { poll_id: pollId, option_id: optionIds[0], profile_id: player.id },
      { onConflict: "option_id,profile_id", ignoreDuplicates: true },
    )
    .select("id");
  const playerVotes = await playerClient.from("poll_votes").select("id").eq("profile_id", player.id);
  check(
    "l'upsert non aggira il divieto di votare per altri",
    (foreignUpsert.data ?? []).length === 0 && (playerVotes.data ?? []).length === 0,
    foreignUpsert.error?.message,
  );

  const singlePoll = await playerClient
    .from("polls")
    .insert({ question: `Sondaggio a scelta singola ${stamp}`, allow_multiple: false, created_by: player.id })
    .select("id")
    .single();
  const singleOptions = await playerClient
    .from("poll_options")
    .insert([
      { poll_id: singlePoll.data.id, label: "Sì", sort_order: 0 },
      { poll_id: singlePoll.data.id, label: "No", sort_order: 1 },
    ])
    .select("id");
  const singleOptionIds = (singleOptions.data ?? []).map((row) => row.id);

  async function singleChoiceUpsert(optionId) {
    return otherClient
      .from("poll_votes")
      .upsert(
        { poll_id: singlePoll.data.id, option_id: optionId, profile_id: other.id },
        { onConflict: "option_id,profile_id", ignoreDuplicates: true },
      )
      .select("id");
  }

  await singleChoiceUpsert(singleOptionIds[0]);
  await singleChoiceUpsert(singleOptionIds[1]);
  await singleChoiceUpsert(singleOptionIds[1]);
  const singleVotes = await otherClient
    .from("poll_votes")
    .select("option_id")
    .eq("poll_id", singlePoll.data.id)
    .eq("profile_id", other.id);
  check(
    "nella scelta singola il nuovo voto sostituisce il vecchio",
    (singleVotes.data ?? []).length === 1 && singleVotes.data?.[0]?.option_id === singleOptionIds[1],
    JSON.stringify(singleVotes.data),
  );

  const weekHijack = await playerClient
    .from("polls")
    .update({ week_start: "2030-01-07" })
    .eq("id", pollId)
    .select("week_start")
    .single();
  check(
    "la settimana non si modifica dopo la creazione",
    weekHijack.data?.week_start === "2026-10-05",
    weekHijack.data?.week_start,
  );

  const badWeek = await playerClient
    .from("polls")
    .insert({ question: `Settimana sbagliata ${stamp}`, created_by: player.id, week_start: "2026-10-07" })
    .select("id");
  check(
    "la settimana deve iniziare di lunedì",
    (badWeek.data ?? []).length === 0,
    badWeek.error?.message,
  );

  const votes = await playerClient.from("poll_votes").select("profile_id, option_id");
  check("tutti vedono chi ha votato cosa", (votes.data ?? []).length >= 1);

  const foreignOption = await otherClient
    .from("poll_options")
    .insert({ poll_id: pollId, label: "Intruso", sort_order: 2 })
    .select("id");
  check(
    "solo l'autore aggiunge opzioni",
    (foreignOption.data ?? []).length === 0,
    foreignOption.error?.message,
  );

  const foreignClose = await otherClient
    .from("polls")
    .update({ is_closed: true })
    .eq("id", pollId)
    .select("id");
  check(
    "solo l'autore (o un admin) chiude il sondaggio",
    (foreignClose.data ?? []).length === 0,
    foreignClose.error?.message,
  );

  const hijack = await playerClient
    .from("polls")
    .update({ question: "Domanda dirottata" })
    .eq("id", pollId)
    .select("question")
    .single();
  check(
    "la domanda non si modifica dopo la creazione",
    hijack.data?.question?.startsWith("Sondaggio RLS"),
    hijack.data?.question,
  );

  await playerClient.from("polls").update({ is_closed: true }).eq("id", pollId);
  const voteOnClosed = await otherClient
    .from("poll_votes")
    .insert({ poll_id: pollId, option_id: optionIds[0], profile_id: other.id })
    .select("id");
  check(
    "non si vota su un sondaggio chiuso",
    (voteOnClosed.data ?? []).length === 0,
    voteOnClosed.error?.message,
  );

  await admin.from("polls").delete().eq("id", pollId);

  // --- Notifiche Telegram ---
  const playerChat = Number(String(stamp).slice(-9));
  const otherChat = playerChat + 1;

  const directSubscribe = await playerClient
    .from("telegram_subscribers")
    .insert({ chat_id: playerChat, profile_id: player.id });
  check(
    "l'iscrizione Telegram non si crea dal client",
    Boolean(directSubscribe.error),
    directSubscribe.error?.message,
  );

  await admin.from("telegram_subscribers").insert([
    { chat_id: playerChat, profile_id: player.id, telegram_username: "probe_player" },
    { chat_id: otherChat, profile_id: other.id },
  ]);

  const visibleSubscribers = await playerClient
    .from("telegram_subscribers")
    .select("chat_id, profile_id");
  check(
    "si vede solo la propria iscrizione Telegram",
    (visibleSubscribers.data ?? []).length === 1 &&
      visibleSubscribers.data[0].profile_id === player.id,
    JSON.stringify(visibleSubscribers.data),
  );

  const foreignSubscriber = await playerClient
    .from("telegram_subscribers")
    .update({ notifications_enabled: false })
    .eq("chat_id", otherChat)
    .select("chat_id");
  check(
    "non si tocca l'iscrizione Telegram di un altro",
    (foreignSubscriber.data ?? []).length === 0,
    foreignSubscriber.error?.message,
  );

  const ownSubscriber = await playerClient
    .from("telegram_subscribers")
    .update({ notifications_enabled: false })
    .eq("chat_id", playerChat)
    .select("notifications_enabled")
    .single();
  check(
    "si mette in pausa la propria iscrizione Telegram",
    ownSubscriber.data?.notifications_enabled === false,
    ownSubscriber.error?.message,
  );

  const linkCode = `RLS${stamp}`.slice(0, 20).toUpperCase();
  const linkInsert = await playerClient.from("telegram_link_codes").insert({
    code: linkCode,
    profile_id: player.id,
    expires_at: new Date(Date.now() + 600_000).toISOString(),
  });
  check("si crea un codice di collegamento per sé", !linkInsert.error, linkInsert.error?.message);

  const readCodes = await playerClient.from("telegram_link_codes").select("code");
  check(
    "i codici di collegamento non sono leggibili dal client",
    (readCodes.data ?? []).length === 0,
    JSON.stringify(readCodes.data),
  );

  // Il registro degli invii lo vedono e lo scrivono solo webhook e notifiche,
  // con la service role: dal client deve essere invisibile e non scrivibile.
  const readNotifications = await playerClient.from("telegram_notifications").select("id");
  check(
    "il registro degli avvisi non è leggibile dal client",
    (readNotifications.data ?? []).length === 0,
    JSON.stringify(readNotifications.data),
  );

  const writeNotifications = await admin
    .from("telegram_notifications")
    .insert({ kind: "poll", text: `Intruso ${stamp}`, audience: "all", profile_ids: [] })
    .select("id")
    .single();
  const forgedNotification = await playerClient
    .from("telegram_notifications")
    .insert({ kind: "poll", text: `Falso ${stamp}` })
    .select("id");
  check(
    "gli avvisi non si scrivono dal client",
    (forgedNotification.data ?? []).length === 0 && Boolean(writeNotifications.data?.id),
    forgedNotification.error?.message,
  );

  const readDeliveries = await playerClient.from("telegram_deliveries").select("notification_id");
  check(
    "il registro delle consegne non è leggibile dal client",
    (readDeliveries.data ?? []).length === 0,
    JSON.stringify(readDeliveries.data),
  );

  const forgeDelivery = await playerClient
    .from("telegram_deliveries")
    .insert({ notification_id: writeNotifications.data.id, chat_id: playerChat, ok: true })
    .select("notification_id");
  check(
    "le consegne non si scrivono dal client",
    (forgeDelivery.data ?? []).length === 0,
    forgeDelivery.error?.message,
  );

  await admin.from("telegram_notifications").delete().eq("id", writeNotifications.data.id);
  await admin.from("telegram_subscribers").delete().in("chat_id", [playerChat, otherChat]);
  await admin.from("telegram_link_codes").delete().eq("code", linkCode);

  console.log("\nChat di gruppo");
  const anonChat = await anonClient.from("chat_messages").select("id");
  check("anon non legge la chat", (anonChat.data ?? []).length === 0, JSON.stringify(anonChat.data));

  const ownMessage = await playerClient
    .from("chat_messages")
    .insert({ profile_id: player.id, body: "Ciao dal test RLS" })
    .select("id")
    .single();
  check("si scrive in chat a nome proprio", Boolean(ownMessage.data?.id), ownMessage.error?.message);

  const forgedMessage = await otherClient
    .from("chat_messages")
    .insert({ profile_id: player.id, body: "Per conto tuo" })
    .select("id");
  check(
    "non si scrive in chat a nome di un altro",
    (forgedMessage.data ?? []).length === 0 && forgedMessage.error !== null,
    forgedMessage.error?.message,
  );

  const blankMessage = await playerClient
    .from("chat_messages")
    .insert({ profile_id: player.id, body: "   " })
    .select("id");
  check(
    "i messaggi vuoti sono rifiutati dal database",
    (blankMessage.data ?? []).length === 0 && blankMessage.error !== null,
    blankMessage.error?.message,
  );

  const otherMessage = await otherClient
    .from("chat_messages")
    .insert({ profile_id: other.id, body: "Ciao a tutti" })
    .select("id")
    .single();
  check("un altro utente scrive in chat", Boolean(otherMessage.data?.id), otherMessage.error?.message);

  const readChat = await thirdClient.from("chat_messages").select("id");
  check("tutti gli autenticati vedono i messaggi", (readChat.data ?? []).length >= 2);

  const editChat = await playerClient
    .from("chat_messages")
    .update({ body: "Modificato" })
    .eq("id", ownMessage.data.id)
    .select("id");
  check("un messaggio non si modifica", (editChat.data ?? []).length === 0, editChat.error?.message);

  const deleteOtherChat = await playerClient
    .from("chat_messages")
    .delete()
    .eq("id", otherMessage.data.id)
    .select("id");
  check(
    "un utente normale non elimina i messaggi altrui",
    (deleteOtherChat.data ?? []).length === 0,
    deleteOtherChat.error?.message,
  );

  const deleteOwnChat = await playerClient
    .from("chat_messages")
    .delete()
    .eq("id", ownMessage.data.id)
    .select("id");
  check("si elimina il proprio messaggio", (deleteOwnChat.data ?? []).length === 1, deleteOwnChat.error?.message);

  // Moderazione: l'admin elimina qualsiasi messaggio.
  await admin.from("profiles").update({ is_admin: true }).eq("id", player.id);
  const adminDeleteChat = await playerClient
    .from("chat_messages")
    .delete()
    .eq("id", otherMessage.data.id)
    .select("id");
  check(
    "un admin elimina qualsiasi messaggio",
    (adminDeleteChat.data ?? []).length === 1,
    adminDeleteChat.error?.message,
  );
  await admin.from("profiles").update({ is_admin: false }).eq("id", player.id);

  // Pulizia
  await admin.from("matches").delete().eq("id", match.id);
} catch (error) {
  failed += 1;
  console.error("\nErrore inatteso:", error.message ?? error);
} finally {
  for (const id of created) {
    await admin.auth.admin.deleteUser(id).catch(() => {});
  }
}

console.log(`\n${passed} verifiche superate, ${failed} fallite.`);
process.exit(failed === 0 ? 0 : 1);
