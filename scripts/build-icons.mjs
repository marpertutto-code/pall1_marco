/**
 * Genera gli asset del marchio a partire dai tracciati:
 *
 *   node scripts/build-icons.mjs      (npm run build:icons)
 *
 * Scrive:
 *
 * | File                                | Uso                                                    |
 * |-------------------------------------|--------------------------------------------------------|
 * | `src/app/icon.svg`                  | favicon: marchio su fondo trasparente, segue il tema    |
 * | `src/app/favicon.ico`               | fallback 16/32/48 per i browser senza favicon SVG       |
 * | `src/app/apple-icon.png`            | icona iOS (aggiunta alla home)                          |
 * | `public/icons/icon-192.png`         | icona PWA (tassello carta, angoli arrotondati)          |
 * | `public/icons/icon-512.png`         | icona PWA grande                                        |
 * | `public/icons/icon-maskable-512.png`| icona maskable (fondo pieno, marchio nel cerchio sicuro)|
 *
 * Tutto parte dallo **stesso** marchio che l'app disegna in alto a sinistra
 * (`hull` + `markings` di `logo-paths.json`, `--accent` e `--paper` di
 * `globals.css`): non esistono più versioni "invertite" del logo, così favicon,
 * icona della home e immagine di condivisione sono la stessa cosa che si vede in
 * pagina.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";
import {
  CREAM,
  ROOT,
  assertPathsInSync,
  markSvg,
  pngIco,
  readBrandTokens,
  readLogoPaths,
  svgPage,
} from "./brand.mjs";

const tokens = readBrandTokens();
const paths = readLogoPaths();

mkdirSync(resolve(ROOT, "public/icons"), { recursive: true });

// `public/logo.svg` è la copia esportabile del marchio: se qualcuno la modifica
// a mano, il marchio in pagina e le icone divergono. Meglio fermarsi.
assertPathsInSync(["public/logo.svg"]);

/** Angoli del tassello PWA: 115/512, come nel riferimento. */
const TILE_RADIUS = 115;

const browser = await chromium.launch();

/** Screenshot di un SVG quadrato, con o senza fondo. */
async function render(svg, { size, background = "transparent" }) {
  const page = await browser.newPage({
    viewport: { width: size, height: size },
    deviceScaleFactor: 1,
  });
  await page.setContent(svgPage(svg, { size, background }), { waitUntil: "load" });
  const buffer = await page.screenshot({ omitBackground: background === "transparent" });
  await page.close();
  return buffer;
}

/**
 * Fattore di scala perché il marchio stia dentro il cerchio sicuro dell'80% di
 * un'icona maskable. Si misura il disegno invece di stimarlo: la base a tre
 * pezzi è larga, e un numero a occhio la farebbe ritagliare dal launcher.
 */
async function safeCircleScale() {
  const page = await browser.newPage();
  await page.setContent(
    `<!doctype html><body>${markSvg(paths, { hullColor: "#000" })}<script>
       const g = document.querySelector("g");
       const b = g.getBBox();
       window.__box = { width: b.width, height: b.height };
     </script></body>`,
    { waitUntil: "load" },
  );
  const box = await page.evaluate(() => window.__box);
  await page.close();

  const halfDiagonal = Math.hypot(box.width / 2, box.height / 2);
  return Math.min(1, (512 * 0.4) / halfDiagonal);
}

const maskableScale = await safeCircleScale();

/* ------------------------------------------------------------------ favicon */

/**
 * Il marchio nudo, senza tassello: come in alto a sinistra nell'app, che in
 * tema chiaro lo disegna verde e in tema scuro verde acceso. Il CSS dentro
 * l'SVG segue `prefers-color-scheme`, quindi la favicon cambia con il browser
 * esattamente come cambia l'app.
 */
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Pall1">
  <title>Pall1</title>
  <style>
    path.hull { fill: ${tokens.accent}; }
    @media (prefers-color-scheme: dark) { path.hull { fill: ${tokens.accentDark}; } }
  </style>
  <path class="hull" d="${paths.hull}"/>
  <path fill="${CREAM}" d="${paths.markings}"/>
</svg>
`;
writeFileSync(resolve(ROOT, "src/app/icon.svg"), faviconSvg);

const faviconPngs = [];
for (const size of [16, 32, 48]) {
  faviconPngs.push({
    size,
    buffer: await render(markSvg(paths, { hullColor: tokens.accent }), { size }),
  });
}
writeFileSync(resolve(ROOT, "src/app/favicon.ico"), pngIco(faviconPngs));

/* --------------------------------------------------------------- icone app */

/** Tassello carta: è il marchio come si vede in pagina, non la sua inversa. */
const tileSvg = markSvg(paths, {
  hullColor: tokens.accent,
  background: tokens.paper,
  radius: TILE_RADIUS,
});

/** Maskable: fondo pieno (niente trasparenza sotto la maschera del launcher). */
const maskableSvg = markSvg(paths, {
  hullColor: tokens.accent,
  background: tokens.paper,
  scale: maskableScale,
});

const TARGETS = [
  { svg: tileSvg, file: "public/icons/icon-192.png", size: 192, background: "transparent" },
  { svg: tileSvg, file: "public/icons/icon-512.png", size: 512, background: "transparent" },
  {
    svg: maskableSvg,
    file: "public/icons/icon-maskable-512.png",
    size: 512,
    background: tokens.paper,
  },
  { svg: maskableSvg, file: "src/app/apple-icon.png", size: 180, background: tokens.paper },
];

for (const target of TARGETS) {
  const buffer = await render(target.svg, { size: target.size, background: target.background });
  writeFileSync(resolve(ROOT, target.file), buffer);
  console.log(`${target.file} · ${target.size}px · ${(buffer.length / 1024).toFixed(1)} kB`);
}

await browser.close();

console.log(
  `\ncolori: carta ${tokens.paper} · accento ${tokens.accent} · accento scuro ${tokens.accentDark} · crema ${CREAM}`,
);
console.log(`favicon.ico: 16 + 32 + 48 px · maskable ridimensionata a ${maskableScale.toFixed(3)}`);
