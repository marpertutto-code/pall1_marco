/**
 * Genera la foto profilo del bot Telegram dal marchio nuovo (`public/logo.svg`).
 *
 *   node scripts/build-bot-avatar.mjs
 *
 * Scrive `public/icons/bot-avatar.png` (512×512). Sfondo carta come nella home,
 * sagoma verde e marcature crema: è lo stesso marchio che sta in alto a sinistra
 * nell'app. Telegram ritaglia il cerchio, quindi il numero sta dentro con margine.
 * I colori sono i token di `globals.css`, come per gli altri asset del marchio.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";
import { CREAM, ROOT, readBrandTokens } from "./brand.mjs";

const outDir = resolve(ROOT, "public/icons");
const SIZE = 512;

/** Sfondo carta (tema chiaro) e verde del marchio, come in `app-shell`. */
const { paper: PAPER, accent: ACCENT } = readBrandTokens();

const rawSvg = readFileSync(resolve(ROOT, "public/logo.svg"), "utf8").replace(/<\?xml[^>]*\?>/, "");

/** Varianti da produrre: stesso marchio, due fondi. */
const VARIANTS = [
  {
    file: "bot-avatar.png",
    background: PAPER,
    svg: rawSvg.replace(/currentColor/g, ACCENT),
  },
  {
    file: "bot-avatar-green.png",
    background: ACCENT,
    // Marchio invertito: sagoma crema, marcature verdi (come un'icona app).
    // Prima le marcature, poi il colore ereditato: dopo il primo replace i due
    // path avrebbero lo stesso fill e non si distinguerebbero più.
    svg: rawSvg.replace(new RegExp(CREAM, "gi"), ACCENT).replace(/currentColor/g, CREAM),
  },
];

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();

for (const variant of VARIANTS) {
  const page = await browser.newPage({
    viewport: { width: SIZE, height: SIZE },
    deviceScaleFactor: 1,
  });

  await page.setContent(
    `<!doctype html><html><head><style>
       html,body{margin:0;width:${SIZE}px;height:${SIZE}px;background:${variant.background}}
       svg{display:block;width:${SIZE}px;height:${SIZE}px}
     </style></head><body>${variant.svg}</body></html>`,
    { waitUntil: "load" },
  );

  const buffer = await page.screenshot();
  writeFileSync(resolve(outDir, variant.file), buffer);
  await page.close();

  console.log(`${variant.file} · ${SIZE}px · ${(buffer.length / 1024).toFixed(1)} kB`);
}

await browser.close();
