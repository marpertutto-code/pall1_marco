/**
 * Helper condivisi dagli script che generano gli asset del marchio (favicon,
 * icone app, immagine di condivisione).
 *
 * Regola: **gli asset fuori dall'app devono essere identici al marchio che
 * l'app disegna a schermo**. Per questo qui non si scrive nessun colore a mano:
 *
 * - la geometria arriva da `src/components/brand/logo-paths.json`, l'unica
 *   copia dei tracciati (generata da `scripts/trace-logo.py`);
 * - i colori arrivano dai token di `src/app/globals.css` (`--paper`, `--accent`,
 *   `--accent-text`, `--ink`, `--muted`), gli stessi che usano i componenti.
 *
 * Se un token viene rinominato o rimosso, la lettura fallisce con un errore
 * esplicito invece di produrre un'icona di un verde quasi giusto.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Colore fisso delle marcature (pallone e linee del campo), come in `logo-mark.tsx`. */
export const CREAM = "#f5fcf6";

/** Geometria del marchio in viewBox 512×512. */
export function readLogoPaths() {
  return JSON.parse(readFileSync(resolve(ROOT, "src/components/brand/logo-paths.json"), "utf8"));
}

/* ------------------------------------------------------------------ colori */

/**
 * oklch → sRGB esadecimale (conversione di Björn Ottosson, D65).
 * I token in `globals.css` sono in oklch perché è lì che servono; le icone
 * devono essere file statici, quindi vanno convertite.
 */
export function oklchToHex(l, c, h) {
  const rad = (h * Math.PI) / 180;
  const a = c * Math.cos(rad);
  const b = c * Math.sin(rad);

  const l3 = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m3 = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s3 = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;

  const channels = [
    4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
  ];

  return (
    "#" +
    channels
      .map((value) => {
        const encoded =
          value <= 0.0031308 ? 12.92 * value : 1.055 * Math.max(value, 0) ** (1 / 2.4) - 0.055;
        return Math.round(Math.min(Math.max(encoded, 0), 1) * 255)
          .toString(16)
          .padStart(2, "0");
      })
      .join("")
  );
}

/** Blocco di regole di un selettore, dal `{` al `}` successivo. */
function cssBlock(css, selector) {
  const start = css.indexOf(selector);
  if (start < 0) throw new Error(`globals.css: selettore \`${selector}\` non trovato`);
  const body = css.slice(start, css.indexOf("}", start));
  if (!body) throw new Error(`globals.css: blocco \`${selector}\` vuoto`);
  return body;
}

function token(block, name, selector) {
  const match = block.match(new RegExp(`--${name}:\\s*oklch\\(([^)]+)\\)`));
  if (!match) throw new Error(`globals.css: token --${name} non trovato in \`${selector}\``);

  const [l, c, h] = match[1]
    .trim()
    .split(/[\s/]+/)
    .map((value) => Number.parseFloat(value));
  if ([l, c, h].some((value) => !Number.isFinite(value))) {
    throw new Error(`globals.css: token --${name} non interpretabile: ${match[1]}`);
  }
  return oklchToHex(l / 100, c, h);
}

/**
 * I colori del marchio, letti dai token del tema.
 *
 * `accent` e `paper` sono quelli del tema chiaro (il marchio "vero", quello
 * della home e della schermata di login); `accentDark` serve alla favicon, che
 * può seguire il tema del sistema come fa l'app.
 */
export function readBrandTokens() {
  const css = readFileSync(resolve(ROOT, "src/app/globals.css"), "utf8");
  const light = cssBlock(css, ":root {");
  const dark = cssBlock(css, ".dark {");

  return {
    paper: token(light, "paper", ":root"),
    accent: token(light, "accent", ":root"),
    accentText: token(light, "accent-text", ":root"),
    ink: token(light, "ink", ":root"),
    muted: token(light, "muted", ":root"),
    accentDark: token(dark, "accent", ".dark"),
  };
}

/* ------------------------------------------------------------------- marchio */

/**
 * Il marchio su un solo fondo: sagoma `hullColor` + marcature crema, come in
 * `LogoMark`. `background` è il tassello (o `null` per il fondo trasparente).
 */
export function markSvg(paths, { hullColor, background = null, radius = 0, scale = 1 }) {
  const body = [
    background ? `<rect width="512" height="512" rx="${radius}" fill="${background}"/>` : null,
    `<g${scale === 1 ? "" : ` transform="translate(${(512 * (1 - scale)) / 2} ${(512 * (1 - scale)) / 2}) scale(${scale})"`}>`,
    `<path fill="${hullColor}" d="${paths.hull}"/>`,
    `<path fill="${CREAM}" d="${paths.markings}"/>`,
    "</g>",
  ]
    .filter(Boolean)
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Pall1"><title>Pall1</title>${body}</svg>`;
}

/**
 * Controlla che i file SVG committati contengano ancora i tracciati di
 * `logo-paths.json`: se qualcuno li modifica a mano, lo script si ferma invece
 * di rigenerare icone che non somigliano più al marchio in pagina.
 */
export function assertPathsInSync(files) {
  const paths = readLogoPaths();
  for (const file of files) {
    const svg = readFileSync(resolve(ROOT, file), "utf8");
    for (const [name, d] of Object.entries(paths)) {
      if (svg.includes(d)) continue;
      throw new Error(
        `${file} non contiene il tracciato \`${name}\` di logo-paths.json: rilancia \`npm run logo:trace\` e \`npm run build:brand\`.`,
      );
    }
  }
}

/* ------------------------------------------------------------------- output */

/** ICO multi-immagine (PNG incapsulati: li leggono tutti i browser moderni). */
export function pngIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);

  let offset = header.length + images.length * 16;
  const entries = images.map(({ size, buffer }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // 0 significa 256
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2); // palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bit per pixel
    entry.writeUInt32LE(buffer.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += buffer.length;
    return entry;
  });

  return Buffer.concat([header, ...entries, ...images.map(({ buffer }) => buffer)]);
}

/** Pagina minima con l'SVG a tutta finestra, per lo screenshot. */
export function svgPage(svg, { size, background = "transparent" }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;width:${size}px;height:${size}px;background:${background}}
    svg{display:block;width:${size}px;height:${size}px}
  </style></head><body>${svg}</body></html>`;
}
