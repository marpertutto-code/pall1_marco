#!/usr/bin/env node
/**
 * Registra il webhook del bot Telegram (o lo ispeziona / rimuove).
 *
 * Uso:
 *   npm run telegram:webhook -- set https://<tuo-dominio>.vercel.app
 *   npm run telegram:webhook -- info
 *   npm run telegram:webhook -- delete
 *
 * Senza URL usa NEXT_PUBLIC_SITE_URL. Legge le variabili da .env.local
 * tramite `node --env-file` (vedi lo script in package.json).
 */

const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const defaultSite = process.env.NEXT_PUBLIC_SITE_URL;

if (!token) {
  console.error("✗ TELEGRAM_BOT_TOKEN mancante (in .env.local).");
  process.exit(1);
}

const api = (method) => `https://api.telegram.org/bot${token}/${method}`;
const action = process.argv[2] ?? "set";

async function call(method, body = {}) {
  const response = await fetch(api(method), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await response.json();
  if (!json.ok) {
    console.error(`✗ ${method}:`, json.description ?? json);
    process.exit(1);
  }
  return json.result;
}

if (action === "set") {
  const site = (process.argv[3] ?? defaultSite ?? "").replace(/\/+$/, "");
  if (!site) {
    console.error("✗ Serve l'URL pubblico: `set https://...` oppure NEXT_PUBLIC_SITE_URL.");
    process.exit(1);
  }
  if (!secret) {
    console.error("✗ TELEGRAM_WEBHOOK_SECRET mancante (in .env.local).");
    process.exit(1);
  }

  const url = `${site}/api/telegram/webhook`;
  await call("setWebhook", {
    url,
    secret_token: secret,
    allowed_updates: ["message"],
    drop_pending_updates: true,
  });
  console.log(`✓ Webhook registrato: ${url}`);
} else if (action === "info") {
  console.log(await call("getWebhookInfo"));
} else if (action === "delete") {
  await call("deleteWebhook", { drop_pending_updates: true });
  console.log("✓ Webhook rimosso.");
} else {
  console.error(`✗ Azione sconosciuta: ${action} (usa set | info | delete)`);
  process.exit(1);
}
