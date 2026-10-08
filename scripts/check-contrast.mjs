#!/usr/bin/env node
/**
 * Verifica i contrasti WCAG dei token di colore definiti in src/app/globals.css.
 *
 * I token sono la fonte di verità: lo script legge :root (tema chiaro) e .dark
 * (tema scuro), converte OKLCH → sRGB e calcola il rapporto di contrasto.
 *
 * Dal redesign in vetro non basta confrontare due token puri: una superficie
 * semitrasparente mostra il colore *composto* (vetro sopra aloni sopra pagina).
 * Lo script riproduce quel compositing in sRGB — come fa il browser — e misura
 * il contrasto reale del testo su vetro.
 *
 * Uso: npm run check:contrast
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const cssPath = resolve(here, "../src/app/globals.css");
const css = readFileSync(cssPath, "utf8");

function block(selector) {
  const match = css.match(new RegExp(`^${selector} \\{([\\s\\S]*?)^\\}`, "m"));
  if (!match) throw new Error(`Blocco ${selector} non trovato in globals.css`);
  return match[1];
}

function parseTokens(source) {
  const tokens = {};
  for (const line of source.split("\n")) {
    const match = line.match(/^\s*(--[a-z0-9-]+):\s*([^;]+);/i);
    if (!match) continue;
    tokens[match[1]] = match[2].trim();
  }
  return tokens;
}

/* ---------- OKLCH → sRGB ---------- */

const clamp01 = (value) => Math.min(1, Math.max(0, value));

function oklchToLinearRgb(l, c, hDeg) {
  const h = (hDeg * Math.PI) / 180;
  const a = c * Math.cos(h);
  const b = c * Math.sin(h);

  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;

  const lc = l_ ** 3;
  const mc = m_ ** 3;
  const sc = s_ ** 3;

  return [
    4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc,
    -1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc,
    -0.0041960863 * lc - 0.7034186147 * mc + 1.707614701 * sc,
  ];
}

/** Lineare → sRGB (gamma encoding). */
function srgbFromLinear(channel) {
  const c = clamp01(channel);
  return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
}

/** sRGB → lineare. */
function linearFromSrgb(channel) {
  const s = clamp01(channel);
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(linearRgb) {
  const [r, g, b] = linearRgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Colore → sRGB gamma-encoded (0..1) + alpha. */
function parseColor(value) {
  const oklch = value.match(
    /^oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)$/,
  );
  if (oklch) {
    const linear = oklchToLinearRgb(Number(oklch[1]) / 100, Number(oklch[2]), Number(oklch[3]));
    return {
      srgb: linear.map(srgbFromLinear),
      alpha: oklch[4] === undefined ? 1 : Number(oklch[4]),
    };
  }

  const hex = value.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const int = parseInt(hex[1], 16);
    return {
      srgb: [((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255],
      alpha: 1,
    };
  }

  throw new Error(`Formato colore non supportato: ${value}`);
}

function luminanceOfSrgb(srgb) {
  return relativeLuminance(srgb.map(linearFromSrgb));
}

function luminance(value) {
  return luminanceOfSrgb(parseColor(value).srgb);
}

function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

function contrastAgainst(fgValue, bgSrgb) {
  const lf = luminance(fgValue);
  const lb = luminanceOfSrgb(bgSrgb);
  const [hi, lo] = lf > lb ? [lf, lb] : [lb, lf];
  return (hi + 0.05) / (lo + 0.05);
}

/* ---------- Compositing (come il browser, in sRGB) ---------- */

/** Dipinge `top` (anche semitrasparente) sopra un fondo già opaco. */
function paintOver(topValue, bottomSrgb) {
  const top = parseColor(topValue);
  return top.srgb.map((channel, index) => channel * top.alpha + bottomSrgb[index] * (1 - top.alpha));
}

/**
 * Superficie effettiva dietro il testo su vetro. Dipinge dal basso verso l'alto
 * nell'ordine reale di `body::before`: gli aloni sono elencati dall'alto
 * (`--ambient-1`, poi `-3`, poi `-2`), quindi si compongono al contrario.
 */
function glassSurface(tokens, variant) {
  let surface = parseColor(tokens["--paper"]).srgb;
  for (const token of ["--ambient-2", "--ambient-3", "--ambient-1", variant]) {
    if (!tokens[token]) continue;
    surface = paintOver(tokens[token], surface);
  }
  return surface;
}

/* ---------- Coppie da verificare ---------- */

const TEXT = 4.5; // testo normale e link
const LARGE = 3; // testo grande e componenti grafici

const PAIRS = [
  ["--ink", "--paper", TEXT, "testo su sfondo pagina"],
  ["--ink", "--surface", TEXT, "testo su pannello"],
  ["--muted", "--paper", TEXT, "testo secondario su pagina"],
  ["--muted", "--surface", TEXT, "testo secondario su pannello"],
  ["--muted", "--surface-2", TEXT, "testo secondario su superficie 2"],

  ["--accent-text", "--paper", TEXT, "link/accento su pagina"],
  ["--accent-text", "--surface", TEXT, "link/accento su pannello"],
  ["--accent-text", "--surface-2", TEXT, "link/accento su superficie 2"],

  ["--accent-on", "--accent-solid", TEXT, "testo su pulsante primario"],
  ["--accent-solid", "--paper", LARGE, "pulsante primario su pagina"],
  ["--accent", "--surface-2", LARGE, "barra di capacità su traccia"],

  ["--win", "--surface", TEXT, "vittorie su pannello"],
  ["--loss", "--surface", TEXT, "sconfitte su pannello"],
  ["--draw", "--surface", TEXT, "pareggi su pannello"],
  ["--win", "--surface-2", TEXT, "vittorie su superficie 2"],
  ["--loss", "--surface-2", TEXT, "sconfitte su superficie 2"],
];

/** Testo che poggia su vetro: si misura sul colore composto. */
const GLASS_PAIRS = [
  ["--ink", TEXT, "testo su vetro"],
  ["--muted", TEXT, "testo secondario su vetro"],
  ["--accent-text", TEXT, "link/accento su vetro"],
];

/* ---------- Esecuzione ---------- */

const themes = [
  { name: "chiaro", tokens: { ...parseTokens(block(":root")) } },
  { name: "scuro", tokens: { ...parseTokens(block(":root")), ...parseTokens(block("\\.dark")) } },
];

let failures = 0;
let checks = 0;

for (const theme of themes) {
  console.log(`\nTema ${theme.name}`);

  for (const [fg, bg, minimum, label] of PAIRS) {
    const foreground = theme.tokens[fg];
    const background = theme.tokens[bg];
    if (!foreground || !background) {
      console.log(`  ?  ${label}: token mancante (${fg} / ${bg})`);
      failures += 1;
      continue;
    }

    const ratio = contrast(foreground, background);
    checks += 1;
    const ok = ratio >= minimum;
    if (!ok) failures += 1;
    console.log(
      `  ${ok ? "ok  " : "FAIL"} ${ratio.toFixed(2).padStart(5)}:1  (min ${minimum})  ${label}`,
    );
  }

  /* Vetro: il fondo è composto, non un token puro. */
  for (const variant of ["--glass", "--glass-strong"]) {
    if (!theme.tokens[variant]) {
      console.log(`  ?  vetro: token mancante (${variant})`);
      failures += 1;
      continue;
    }

    const surface = glassSurface(theme.tokens, variant);
    for (const [fg, minimum, label] of GLASS_PAIRS) {
      const foreground = theme.tokens[fg];
      if (!foreground) {
        console.log(`  ?  ${label}: token mancante (${fg})`);
        failures += 1;
        continue;
      }

      const ratio = contrastAgainst(foreground, surface);

      checks += 1;
      const ok = ratio >= minimum;
      if (!ok) failures += 1;
      const where = variant === "--glass" ? "vetro" : "vetro pieno";
      console.log(
        `  ${ok ? "ok  " : "FAIL"} ${ratio.toFixed(2).padStart(5)}:1  (min ${minimum})  ${label} [${where}]`,
      );
    }
  }
}

console.log(
  `\n${checks - failures}/${checks} coppie rispettano il contrasto minimo in entrambi i temi.`,
);
process.exit(failures === 0 ? 0 : 1);
