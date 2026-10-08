"use client";

import { useActionState } from "react";
import Link from "next/link";
import { adminUpdatePlayerAction } from "@/lib/actions/admin";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form-message";
import { Avatar } from "@/components/ui/avatar";
import { PositionTags } from "@/components/positions/position-tags";
import type { Profile } from "@/types/domain";

export function PlayerAdminRow({
  player,
  isSelf,
  positions,
}: {
  player: Profile;
  isSelf: boolean;
  positions: string[];
}) {
  const [state, action] = useActionState(adminUpdatePlayerAction, null);

  return (
    <li className="px-4 py-4 md:px-5">
      <form action={action} className="space-y-3">
        <input type="hidden" name="profile_id" value={player.id} />

        <div className="flex flex-wrap items-center gap-3">
          <Avatar name={player.nickname} src={player.avatar_url} size="md" />

          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 text-[14px] font-medium text-ink">
              <Link href={`/players/${player.id}`} className="truncate hover:text-accent-text">
                {player.nickname}
              </Link>
              {isSelf ? (
                <span className="rounded-full border border-rule px-1.5 py-0.5 text-[10px] font-semibold text-muted">
                  TU
                </span>
              ) : null}
            </p>
            <p className="truncate text-[12px] text-muted">{player.full_name ?? "—"}</p>
            <div className="mt-1.5">
              <PositionTags
                codes={positions}
                showFormat
                max={6}
                empty="posizioni non indicate"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-ink">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={player.is_active}
                disabled={isSelf && player.is_active}
                className="size-4 accent-[var(--accent-solid)]"
              />
              Attivo
            </label>

            <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-ink">
              <input
                type="checkbox"
                name="is_admin"
                defaultChecked={player.is_admin}
                disabled={isSelf && player.is_admin}
                className="size-4 accent-[var(--accent-solid)]"
              />
              Admin
            </label>

            <label
              className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-ink"
              title="Può creare partite, ma non gestire squadre e risultati"
            >
              <input
                type="checkbox"
                name="is_organizer"
                defaultChecked={player.is_organizer}
                className="size-4 accent-[var(--accent-solid)]"
              />
              Organizzatore
            </label>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[200px] flex-1">
            <span className="mb-1.5 block text-[12px] text-muted">Note interne</span>
            <input
              name="notes"
              defaultValue={player.notes ?? ""}
              maxLength={500}
              placeholder="Es. disponibile solo il martedì"
              className="w-full rounded-control border border-rule bg-paper px-3 py-2 text-[13px] text-ink placeholder:text-muted/80 focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus/25"
            />
          </label>

          <SubmitButton variant="secondary" size="sm" pendingLabel="Salvataggio…">
            Salva
          </SubmitButton>
        </div>

        <FormMessage state={state} />
      </form>
    </li>
  );
}
