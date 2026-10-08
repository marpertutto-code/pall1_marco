import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**.supabase.co" }],
  },
  experimental: {
    serverActions: {
      // Il caricamento avatar può arrivare a 2 MB; il limite di default è 1 MB.
      bodySizeLimit: "3mb",
    },
    /**
     * Le pagine dell'app sono tutte dinamiche (leggono la sessione dai cookie),
     * e per le route dinamiche Next tiene il Router Cache client a 0 secondi:
     * ogni ritorno su «Home» o «Partite» rifaceva il render sul server mostrando
     * di nuovo lo skeleton, anche pochi istanti dopo. Trenta secondi di cache
     * bastano a far sembrare istantanea la ri-navigazione; la prima visita
     * resta a carico del prefetch.
     */
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
  },
  /**
   * Favicon, icone PWA e manifest hanno nome fisso (niente hash nel path),
   * quindi il browser se li tiene in cache per giorni: dopo un cambio di marchio
   * l'utente continua a vedere la versione vecchia. Le facciamo rivalidare
   * sempre. I file sono < 20 kB: il costo di una richiesta è trascurabile.
   * (`src/app/icon.svg` è generata da Next con l'hash di build: quella no.)
   */
  async headers() {
    const revalidate = [
      { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
    ];

    return [
      { source: "/manifest.webmanifest", headers: revalidate },
      { source: "/icons/:file*", headers: revalidate },
    ];
  },
};

export default nextConfig;
