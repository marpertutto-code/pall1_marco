"use client";

import { useActionState, useRef, useState } from "react";
import { uploadAvatarAction } from "@/lib/actions/profile";
import { Avatar } from "@/components/ui/avatar";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form-message";
import type { Profile } from "@/types/domain";

export function AvatarForm({ profile }: { profile: Profile }) {
  const [state, action] = useActionState(uploadAvatarAction, null);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <form action={action} className="space-y-4">
      <div className="flex flex-wrap items-center gap-5">
        <Avatar name={profile.nickname} src={profile.avatar_url} size="xl" />

        <div className="min-w-[200px] flex-1 space-y-2">
          <label className="inline-flex cursor-pointer items-center">
            <input
              ref={inputRef}
              type="file"
              name="avatar"
              accept="image/png,image/jpeg,image/webp"
              required
              onChange={(event) => setFileName(event.target.files?.[0]?.name ?? null)}
              className="peer sr-only"
            />
            <span
              className={[
                "inline-flex h-11 items-center rounded-control border border-line-strong bg-surface px-4 text-sm text-ink",
                "transition-colors duration-150 hover:bg-surface-2",
                "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus",
              ].join(" ")}
            >
              {fileName ?? "Scegli un'immagine"}
            </span>
          </label>

          <p className="text-xs text-muted">PNG, JPG o WEBP · massimo 2 MB.</p>

          <SubmitButton variant="secondary" size="sm" pendingLabel="Caricamento…">
            Carica foto
          </SubmitButton>
        </div>
      </div>

      <FormMessage state={state} />
    </form>
  );
}
