import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

/*
 * Font self-hosted da `@fontsource-variable` ma caricati con `next/font/local`:
 * Next li preloada in `<head>` (invece di scoprirli solo dopo il CSS) e genera
 * un fallback con le stesse metriche, così il testo non balla al cambio font.
 * Solo il subset latino, asse peso: due file, ~64 kB in tutto.
 */
const sansFont = localFont({
  src: "../../node_modules/@fontsource-variable/instrument-sans/files/instrument-sans-latin-wght-normal.woff2",
  variable: "--font-instrument",
  display: "swap",
});

const displayFont = localFont({
  src: "../../node_modules/@fontsource-variable/archivo/files/archivo-latin-wght-normal.woff2",
  variable: "--font-archivo",
  display: "swap",
});

const DESCRIPTION = "Partite, squadre, risultati e statistiche del nostro calcetto.";

/** Righe di presentazione quando il link viene condiviso (WhatsApp, Telegram, X…). */
const SHARE_TITLE = "Pall1 — calcetto tra amici";

/**
 * URL pubblico del sito. Serve a rendere assoluti i link che i crawler leggono
 * fuori dal browser (`og:image`): sono gli stessi di `appBaseUrl()` in
 * `lib/telegram.ts`, con in più il ripiego sulle variabili di Vercel, così una
 * preview deploy non annuncia `localhost`.
 */
function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return /^https?:\/\//.test(configured) ? configured : `https://${configured}`;

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  return vercel ? `https://${vercel}` : "http://localhost:3000";
}

/** Origine di Supabase: avatar (Storage) e chat (Realtime) ci parlano spesso. */
const supabaseOrigin = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
})();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "Pall1", template: "%s · Pall1" },
  description: DESCRIPTION,
  applicationName: "Pall1",
  /*
   * Icone e anteprima del link: nessun elenco scritto a mano e nessuna immagine
   * disegnata a parte. Favicon, `apple-touch-icon` e immagine di condivisione
   * arrivano dalle convenzioni di `src/app/` (`icon.svg`, `favicon.ico`,
   * `apple-icon.png`, `opengraph-image.png`), generate da `npm run build:brand`
   * dallo stesso marchio che l'app disegna in alto a sinistra; le icone della
   * home le elenca `manifest.webmanifest`.
   */
  manifest: "/manifest.webmanifest",
  /** Come si presenta il link quando lo si condivide (WhatsApp, Telegram, X…). */
  openGraph: {
    type: "website",
    siteName: "Pall1",
    locale: "it_IT",
    title: SHARE_TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SHARE_TITLE,
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef6ef" },
    { media: "(prefers-color-scheme: dark)", color: "#09110a" },
  ],
};

// Applica il tema prima del paint per evitare il flash.
const themeScript = `(function(){try{var s=localStorage.getItem("pall1-theme");var d=window.matchMedia("(prefers-color-scheme: dark)").matches;if(s==="dark"||(!s&&d)){document.documentElement.classList.add("dark");}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="it"
      suppressHydrationWarning
      className={`${sansFont.variable} ${displayFont.variable}`}
    >
      <head>
        {/* Avvia prima possibile la connessione a Supabase (avatar, realtime). */}
        {supabaseOrigin ? <link rel="preconnect" href={supabaseOrigin} crossOrigin="anonymous" /> : null}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
