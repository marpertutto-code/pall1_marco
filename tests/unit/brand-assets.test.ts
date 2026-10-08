import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Favicon, icone app e immagine di condivisione sono file statici, committati:
 * se qualcuno li tocca a mano — o se si cambiano i tracciati e si dimentica
 * `npm run build:brand` — l'icona smette di somigliare al logo che l'app disegna
 * in alto a sinistra, e ce se ne accorge solo dal browser dell'utente.
 *
 * Qui si controlla la struttura, non il disegno: che ci sia la stessa geometria
 * del marchio, che i formati siano quelli giusti e che il manifest non punti a
 * file che non esistono.
 */

const read = (relative: string) => readFileSync(new URL(relative, import.meta.url));

const paths = JSON.parse(read("../../src/components/brand/logo-paths.json").toString()) as Record<
  string,
  string
>;

/** Le due copie testuali del marchio: quella esportabile e la favicon. */
const MARK_FILES = ["../../public/logo.svg", "../../src/app/icon.svg"];

/** Larghezza e altezza da un PNG (primi byte dopo la firma: chunk IHDR). */
function pngSize(buffer: Buffer) {
  expect(buffer.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

describe("marchio", () => {
  it("i tracciati sono quelli che il componente React disegna", () => {
    expect(Object.keys(paths).sort()).toEqual(["hull", "markings"]);
    for (const [name, d] of Object.entries(paths)) {
      expect(d, `${name} vuoto`).toMatch(/^M[\d. ]/);
    }
  });

  it.each(MARK_FILES)("%s contiene sagoma e marcature", (file) => {
    const svg = read(file).toString();
    expect(svg).toContain(paths.hull);
    expect(svg).toContain(paths.markings);
  });

  it("la favicon segue il tema e tiene le marcature crema", () => {
    const svg = read("../../src/app/icon.svg").toString();
    expect(svg).toContain("prefers-color-scheme: dark");
    expect(svg).toContain("#f5fcf6");

    const fills = svg.match(/fill: (#[0-9a-f]{6})/gi) ?? [];
    const hull = fills.map((fill) => fill.slice(-7).toLowerCase());
    expect(hull).toHaveLength(2);
    expect(new Set(hull).size).toBe(2);
  });

  it("le icone raster hanno le misure che dichiarano", () => {
    expect(pngSize(read("../../public/icons/icon-192.png"))).toEqual({ width: 192, height: 192 });
    expect(pngSize(read("../../public/icons/icon-512.png"))).toEqual({ width: 512, height: 512 });
    expect(pngSize(read("../../public/icons/icon-maskable-512.png"))).toEqual({
      width: 512,
      height: 512,
    });
    expect(pngSize(read("../../src/app/apple-icon.png"))).toEqual({ width: 180, height: 180 });
  });

  it("la favicon .ico contiene 16, 32 e 48 px", () => {
    const ico = read("../../src/app/favicon.ico");
    expect(ico.readUInt16LE(0)).toBe(0); // reserved
    expect(ico.readUInt16LE(2)).toBe(1); // tipo: icona

    const count = ico.readUInt16LE(4);
    const sizes = Array.from({ length: count }, (_, index) => {
      const entry = 6 + index * 16;
      const blob = ico.subarray(ico.readUInt32LE(entry + 12));
      return { size: ico.readUInt8(entry), png: blob.subarray(0, 8).toString("hex") };
    });

    expect(sizes.map(({ size }) => size)).toEqual([16, 32, 48]);
    for (const { png } of sizes) expect(png).toBe("89504e470d0a1a0a");
  });

  it("l'immagine di condivisione è 1200×630 e ha il suo alt", () => {
    expect(pngSize(read("../../src/app/opengraph-image.png"))).toEqual({
      width: 1200,
      height: 630,
    });
    expect(read("../../src/app/opengraph-image.alt.txt").toString().trim().length).toBeGreaterThan(
      20,
    );
  });

  it("il manifest punta a file che esistono", () => {
    const manifest = JSON.parse(read("../../public/manifest.webmanifest").toString()) as {
      icons: { src: string }[];
    };

    expect(manifest.icons.length).toBeGreaterThan(0);
    for (const icon of manifest.icons) {
      // `new URL` fallirebbe se il file non ci fosse
      expect(() => read(`../../public${icon.src}`), icon.src).not.toThrow();
    }
  });
});
