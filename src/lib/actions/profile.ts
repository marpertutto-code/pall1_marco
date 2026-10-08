"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { errorMessage, firstIssue } from "@/lib/errors";
import type { FormState } from "@/lib/form-state";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ALLOWED_AVATAR_TYPES,
  MAX_AVATAR_BYTES,
  profileSchema,
} from "@/lib/validation/schemas";

export async function updateProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireProfile();

  const parsed = profileSchema.safeParse({
    nickname: formData.get("nickname"),
    full_name: formData.get("full_name") ?? "",
    positions: formData.getAll("positions").map(String),
    jersey_number: formData.get("jersey_number") ?? "",
    birth_date: formData.get("birth_date") ?? "",
  });

  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      nickname: parsed.data.nickname,
      full_name: parsed.data.full_name?.trim() ? parsed.data.full_name.trim() : null,
      jersey_number: parsed.data.jersey_number === "" ? null : parsed.data.jersey_number,
      birth_date: parsed.data.birth_date === "" ? null : parsed.data.birth_date,
    })
    .eq("id", profile.id);

  if (error) return { error: errorMessage(error) };

  // Posizioni preferite: aggiungi le nuove, poi togli quelle deselezionate.
  // In quest'ordine un errore a metà non fa perdere le preferenze esistenti.
  const codes = [...new Set(parsed.data.positions ?? [])];

  if (codes.length === 0) {
    const { error: clearError } = await supabase
      .from("profile_positions")
      .delete()
      .eq("profile_id", profile.id);
    if (clearError) return { error: errorMessage(clearError) };
  } else {
    const { error: insertError } = await supabase
      .from("profile_positions")
      .upsert(
        codes.map((code) => ({ profile_id: profile.id, position_code: code })),
        { onConflict: "profile_id,position_code", ignoreDuplicates: true },
      );
    if (insertError) return { error: errorMessage(insertError) };

    const { error: pruneError } = await supabase
      .from("profile_positions")
      .delete()
      .eq("profile_id", profile.id)
      .not("position_code", "in", `(${codes.join(",")})`);
    if (pruneError) return { error: errorMessage(pruneError) };
  }

  revalidatePath("/profile");
  revalidatePath("/players");
  revalidatePath("/standings");
  revalidatePath("/");

  return { success: "Profilo aggiornato." };
}

export async function uploadAvatarAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireProfile();
  const file = formData.get("avatar");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Scegli un'immagine da caricare." };
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return { error: "L'immagine supera i 2 MB: scegline una più leggera." };
  }
  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
    return { error: "Formato non supportato: usa PNG, JPG o WEBP." };
  }

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${profile.id}/avatar-${Date.now()}.${extension}`;

  const supabase = await createSupabaseServerClient();
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { contentType: file.type, upsert: true, cacheControl: "3600" });

  if (uploadError) return { error: errorMessage(uploadError) };

  const { data: publicUrl } = supabase.storage.from("avatars").getPublicUrl(path);
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl.publicUrl })
    .eq("id", profile.id);

  if (error) return { error: errorMessage(error) };

  // Pulizia del vecchio avatar, solo se appartiene alla propria cartella.
  const previous = profile.avatar_url;
  const marker = "/object/public/avatars/";
  if (previous && previous.includes(marker) && previous.includes(`/${profile.id}/`)) {
    const previousPath = previous.split(marker)[1];
    if (previousPath) {
      await supabase.storage.from("avatars").remove([decodeURIComponent(previousPath)]);
    }
  }

  revalidatePath("/profile");
  revalidatePath("/players");
  return { success: "Foto aggiornata." };
}
