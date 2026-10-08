import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database.types";

// Pubblica per forza: Telegram non ha la sessione Pall1. Si difende con il
// secret_token confrontato nell'header del webhook.
const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/auth",
  "/api/telegram/webhook",
  // Chiamato da pg_cron (nessuna sessione): l'endpoint è idempotente.
  "/api/cron/match-reminders",
  // Pagina-ponte per uscire dal browser interno di Telegram: nel WebView non
  // c'è sessione, una guardia la rimanderebbe a /login e non uscirebbe mai.
  "/open",
];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Refresh della sessione + guardia di rotta.
 * Nota: la sicurezza vera sta nelle policy RLS; questo è solo UX.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  /*
   * `getClaims()` verifica il JWT in locale (chiavi JWKS tenute in cache):
   * niente round-trip verso Supabase Auth a ogni navigazione. Con le chiavi
   * simmetriche legacy ricade da sé su `getUser()`, quindi è sicuro in
   * entrambi i casi.
   */
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub ?? null;

  const { pathname, search } = request.nextUrl;

  if (!userId && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  if (userId && (pathname === "/login" || pathname === "/register")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
