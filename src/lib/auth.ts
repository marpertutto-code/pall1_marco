import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/domain";

export const getCurrentUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createSupabaseServerClient();
  /*
   * Verifica locale del JWT: `requireProfile()` gira su ogni pagina, quindi
   * qui un `getUser()` costerebbe un round-trip verso Supabase a ogni
   * navigazione. `getClaims()` ricade su `getUser()` solo con chiavi
   * simmetriche legacy.
   */
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return null;

  const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
  return data ?? null;
});

export async function requireProfile(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  return profile;
}

/** Chiamato solo dal layout /admin: se non sei admin la pagina non esiste (404, non 403). */
export async function requireAdmin(): Promise<Profile> {
  const profile = await requireProfile();
  if (!profile.is_admin) notFound();
  return profile;
}

/**
 * Creazione partite: admin o organizzatore. Serve al form "Nuova partita"
 * dedicato; il pannello /admin resta riservato agli admin.
 */
export async function requireOrganizer(): Promise<Profile> {
  const profile = await requireProfile();
  if (!profile.is_admin && !profile.is_organizer) notFound();
  return profile;
}
