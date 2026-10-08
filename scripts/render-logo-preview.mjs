/**
 * Rende il marchio alle varie dimensioni e su fondo chiaro/scuro, per
 * controllare a occhio che regga anche a 16px, e mostra le icone generate.
 *
 *   node scripts/render-logo-preview.mjs      (npm run logo:preview)
 *
 * Produce `tmp/logo-preview.png`. I colori sono gli stessi che l'app usa a
 * schermo (token di `globals.css`): se il verde cambia, cambia anche qui.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";
import { CREAM, ROOT, markSvg, readBrandTokens, readLogoPaths } from "./brand.mjs";

const tokens = readBrandTokens();
const paths = readLogoPaths();

const SIZES = [16, 24, 32, 48, 64, 128, 256];

/** Il marchio con il colore del tema forzato: qui non c'è `prefers-color-scheme`. */
const mark = (color, size) =>
  markSvg(paths, { hullColor: color }).replace(
    "<svg",
    `<svg style="width:${size}px;height:${size}px"`,
  );

const figure = (content, caption) =>
  `<figure>${content}<figcaption>${caption}</figcaption></figure>`;

const row = (items) => `<div class="row">${items.join("")}</div>`;

const band = (title, body, dark = false) =>
  `<div class="band${dark ? " dark" : ""}"><h2>${title}</h2>${body}</div>`;

const markRow = (color) => row(SIZES.map((size) => figure(mark(color, size), size)));

/** La favicon come file: qui il colore va forzato, un `<img>` non eredita il tema. */
const faviconSvg = readFileSync(resolve(ROOT, "src/app/icon.svg"), "utf8");
const favicon = (color, size) =>
  faviconSvg
    // l'override va in coda al blocco: deve battere anche la media query del tema
    .replace("</style>", `path.hull{fill:${color}}</style>`)
    .replace("<svg", `<svg style="width:${size}px;height:${size}px"`);

const faviconRow = (color) =>
  row([16, 20, 24, 32, 48, 64].map((size) => figure(favicon(color, size), size)));

const png = (file) =>
  `data:image/png;base64,${readFileSync(resolve(ROOT, file)).toString("base64")}`;

const appIcons = row([
  figure(`<img src="${png("public/icons/icon-192.png")}" width="96" height="96">`, "PWA 192"),
  figure(`<img src="${png("public/icons/icon-512.png")}" width="96" height="96">`, "PWA 512"),
  figure(
    `<img src="${png("public/icons/icon-maskable-512.png")}" width="96" height="96">`,
    "maskable (cerchio sicuro)",
  ),
  figure(`<img src="${png("src/app/apple-icon.png")}" width="90" height="90">`, "iOS 180"),
  figure(
    `<img src="data:image/x-icon;base64,${readFileSync(resolve(ROOT, "src/app/favicon.ico")).toString("base64")}" width="48" height="48">`,
    "favicon.ico",
  ),
]);

const sheet = `<!doctype html><html><head><meta charset="utf-8"><style>
  body { margin:0; font: 12px/1.4 system-ui, sans-serif; color:#111; }
  .band { padding: 20px 24px; }
  .light { background:${tokens.paper}; color:${tokens.accent}; }
  .dark  { background:#09110a; color:${tokens.accentDark}; }
  h2 { font-size:11px; font-weight:600; letter-spacing:.08em; text-transform:uppercase; opacity:.6; margin:0 0 14px; }
  .row { display:flex; align-items:flex-end; gap:26px; flex-wrap:wrap; }
  figure { margin:0; text-align:center; }
  figure svg, figure img { display:block; margin:0 auto; }
  figcaption { margin-top:6px; font-size:10px; opacity:.6; }
</style></head><body>
  ${band("Marchio · fondo chiaro", markRow(tokens.accent))}
  ${band("Marchio · fondo scuro", markRow(tokens.accentDark), true)}
  ${band("Favicon (src/app/icon.svg) · dimensioni reali, tema chiaro", faviconRow(tokens.accent))}
  ${band("Favicon · tema scuro", faviconRow(tokens.accentDark), true)}
  ${band("Icone generate (build:icons)", appIcons)}
  <p style="padding:0 24px 20px;font-size:11px;opacity:.6">
    carta ${tokens.paper} · accento ${tokens.accent} · accento scuro ${tokens.accentDark} · crema ${CREAM}
  </p>
</body></html>`;

mkdirSync(resolve(ROOT, "tmp"), { recursive: true });
writeFileSync(resolve(ROOT, "tmp/logo-preview.html"), sheet);

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1180, height: 620 },
  deviceScaleFactor: 2,
});
await page.setContent(sheet, { waitUntil: "load" });
await page.screenshot({ path: resolve(ROOT, "tmp/logo-preview.png"), fullPage: true });
await browser.close();

console.log("Scritto tmp/logo-preview.png");
