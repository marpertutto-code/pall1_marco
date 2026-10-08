"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";
import type { FormState } from "@/lib/form-state";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Gestione dell'iscrizione Telegram dal profilo: metti in pausa / riattiva
 * (`intent=toggle`) oppure scollega del tutto (`intent=unlink`).
 */
export async function setTelegramAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireProfile();
  const supabase = await createSupabaseServerClient();

  if (formData.get("intent") === "unlink") {
    const { error } = await supabase
      .from("telegram_subscribers")
      .delete()
      .eq("profile_id", profile.id);

    if (error) return { error: errorMessage(error) };

    revalidatePath("/profile");
    return { success: "Telegram scollegato." };
  }

  const enabled = formData.get("enabled") === "true";
  const { error } = await supabase
    .from("telegram_subscribers")
    .update({ notifications_enabled: enabled })
    .eq("profile_id", profile.id);

  if (error) return { error: errorMessage(error) };

  revalidatePath("/profile");
  return { success: enabled ? "Notifiche Telegram riattivate." : "Notifiche Telegram in pausa." };
}
