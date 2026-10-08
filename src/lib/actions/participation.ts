"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { errorMessage, firstIssue } from "@/lib/errors";
import type { FormState } from "@/lib/form-state";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notifyMatchFold } from "@/lib/telegram";
import { attendanceSchema } from "@/lib/validation/schemas";

export async function setAttendanceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireProfile();

  const parsed = attendanceSchema.safeParse({
    match_id: formData.get("match_id"),
    attendance: formData.get("attendance"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const { match_id, attendance } = parsed.data;
  const supabase = await createSupabaseServerClient();

  if (attendance === "absent") {
    // Serve sapere se era iscritto: solo un vero forfait avvisa gli altri.
    const { data: existing } = await supabase
      .from("match_players")
      .select("id")
      .eq("match_id", match_id)
      .eq("profile_id", profile.id)
      .maybeSingle();

    const { error } = await supabase
      .from("match_players")
      .delete()
      .eq("match_id", match_id)
      .eq("profile_id", profile.id);
    if (error) return { error: errorMessage(error) };

    // Avviso solo ai compagni di quella partita, non a tutto il gruppo.
    if (existing) {
      await notifyMatchFold({
        matchId: match_id,
        folderProfileId: profile.id,
        folderNickname: profile.nickname,
      }).catch(() => {});
    }
  } else {
    const { error } = await supabase
      .from("match_players")
      .upsert(
        { match_id, profile_id: profile.id, attendance },
        { onConflict: "match_id,profile_id" },
      );
    if (error) return { error: errorMessage(error) };
  }

  revalidatePath("/");
  revalidatePath("/matches");
  revalidatePath(`/matches/${match_id}`);
  revalidatePath("/admin/matches");

  return { success: attendance === "absent" ? "Ti abbiamo tolto dalla lista." : "Iscrizione aggiornata." };
}
