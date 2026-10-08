/**
 * Genera l'immagine di anteprima che appare quando si condivide il link del
 * sito (WhatsApp, Telegram, Instagram, X, Slack…).
 *
 *   node scripts/build-og-image.mjs      (npm run build:og)
 *
 * Scrive:
 *
 *   src/app/opengraph-image.png     1200×630, la misura "grande" che usano tutti
 *   src/app/opengraph-image.alt.txt il testo alternativo (accessibilità)
 *
 * Next.js prende questi due file per convenzione e mette da solo i tag
 * `og:image` (con `width`/`height`/`alt`) e `twitter:image` in ogni pagina.
 *
 * Il disegno è lo stesso marchio della home: fondo carta, numero **1** verde con
 * pallone e marcature crema, wordmark accanto. Niente colori scritti a mano: i
 * token arrivano da `globals.css` come in `build-icons.mjs`.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";
import { CREAM, ROOT, markSvg, readBrandTokens, readLogoPaths } from "./brand.mjs";

const WIDTH = 1200;
const HEIGHT = 630;

const tokens = readBrandTokens();
const paths = readLogoPaths();

/** Font di marca, incorporati come data URL: nessuna richiesta di rete al build. */
function fontFace(family, file) {
  const base64 = readFileSync(resolve(ROOT, `node_modules/@fontsource-variable/${file}`)).toString(
    "base64",
  );
  return `@font-face{font-family:"${family}";font-style:normal;font-weight:100 900;src:url(data:font/woff2;base64,${base64}) format("woff2")}`;
}

const fonts = [
  fontFace("Archivo", "archivo/files/archivo-latin-wght-normal.woff2"),
  fontFace("Instrument", "instrument-sans/files/instrument-sans-latin-wght-normal.woff2"),
].join("\n");

/** Marchio grande a destra, con il cerchio di centrocampo che gli gira attorno. */
const hero = markSvg(paths, { hullColor: tokens.accent });

const html = `<!doctype html><html lang="it"><head><meta charset="utf-8"><style>
  ${fonts}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:${WIDTH}px;height:${HEIGHT}px}
  body{
    background:${tokens.paper};
    color:${tokens.ink};
    font-family:"Instrument",sans-serif;
    display:flex;
    flex-direction:column;
    justify-content:space-between;
    padding:64px 72px;
  }
  header{display:flex;align-items:center;gap:16px}
  .mark-sm{width:54px;height:54px}
  .wordmark{
    font-family:"Archivo",sans-serif;
    font-size:38px;
    font-weight:700;
    letter-spacing:-0.03em;
  }
  .wordmark span{color:${tokens.accentText}}
  main{display:flex;align-items:center;gap:56px}
  .copy{flex:1;display:flex;flex-direction:column;gap:22px}
  h1{
    font-family:"Archivo",sans-serif;
    font-size:66px;
    font-weight:600;
    line-height:1.05;
    letter-spacing:-0.032em;
  }
  p{font-size:26px;line-height:1.4;color:${tokens.muted}}
  .hero{position:relative;width:330px;height:330px;flex:none}
  .hero svg{position:relative;width:330px;height:330px}
  .ring{
    position:absolute;
    left:50%;top:50%;
    width:430px;height:430px;
    margin:-215px 0 0 -215px;
    border:2px solid ${tokens.accent};
    border-radius:50%;
    opacity:.16;
  }
</style></head><body>
  <header>
    <div class="mark-sm">${hero}</div>
    <div class="wordmark">Pall<span>1</span></div>
  </header>

  <main>
    <div class="copy">
      <h1>Il calcetto del gruppo,<br>finalmente in ordine.</h1>
      <p>Iscrizioni, squadre, risultati e classifica.<br>Un solo posto, niente più messaggi persi nella chat.</p>
    </div>
    <div class="hero">
      <div class="ring"></div>
      ${hero}
    </div>
  </main>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 1,
});
await page.setContent(html, { waitUntil: "load" });
// Aspetta che i font incorporati siano applicati: senza questo lo screenshot
// può uscire con la sans di sistema.
await page.evaluate(() => document.fonts.ready);

const buffer = await page.screenshot({ type: "png" });
await browser.close();

writeFileSync(resolve(ROOT, "src/app/opengraph-image.png"), buffer);

const alt =
  "Pall1: il numero 1 disegnato come un campo da calcio, verde su fondo carta, " +
  "accanto al titolo «Il calcetto del gruppo, finalmente in ordine».";
writeFileSync(resolve(ROOT, "src/app/opengraph-image.alt.txt"), `${alt}\n`);

console.log(
  `src/app/opengraph-image.png · ${WIDTH}×${HEIGHT} · ${(buffer.length / 1024).toFixed(1)} kB`,
);
console.log(`colori: carta ${tokens.paper} · accento ${tokens.accent} · crema ${CREAM}`);
