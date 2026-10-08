import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { OpenInBrowser } from "@/components/open-in-browser";
import { appBaseUrl } from "@/lib/telegram";

/**
 * Pagina-ponte `/open?to=/polls/<id>`: serve solo a uscire dal browser interno
 * di Telegram. Fuori da Telegram (o da desktop, che apre già il browser di
 * sistema) reindirizza subito e non si vede.
 *
 * È volutamente **pubblica** (vedi `PUBLIC_PATHS` nel proxy): dentro il WebView
 * di Telegram non c'è la sessione Pall1, quindi una guardia di rotta la
 * rimanderebbe a `/login` e non uscirebbe mai.
 */

export const metadata: Metadata = { title: "Apri nel browser" };

export const dynamic = "force-dynamic";

/** Ammette solo percorsi interni: niente `//host`, niente backslash o a capo. */
function safePath(to: string | undefined): string | null {
  if (!to || !to.startsWith("/") || to.startsWith("//")) return null;
  if (/[\\\r\n]/.test(to)) return null;
  return to;
}

export default async function OpenPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string }>;
}) {
  const { to } = await searchParams;
  const path = safePath(to);
  if (!path) redirect("/");

  const userAgent = (await headers()).get("user-agent") ?? "";
  const inTelegram = /Telegram/i.test(userAgent);
  const isAndroid = /Android/i.test(userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);

  // Chi non è su Telegram mobile va dritto alla pagina vera.
  if (!inTelegram || (!isAndroid && !isIOS)) redirect(path);

  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <OpenInBrowser url={`${appBaseUrl()}${path}`} platform={isAndroid ? "android" : "ios"} />
      </div>
    </main>
  );
}
