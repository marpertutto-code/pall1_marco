"use client";

import { useActionState } from "react";
import { deletePollAction, setPollStatusAction } from "@/lib/actions/polls";
import { SubmitButton } from "@/components/ui/submit-button";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { FormMessage } from "@/components/ui/form-message";
import { IconLock, IconTrash } from "@/components/icons";
import type { PollDetail } from "@/types/domain";

export function PollActions({ poll, canManage }: { poll: PollDetail; canManage: boolean }) {
  const [statusState, statusAction] = useActionState(setPollStatusAction, null);
  const [deleteState, deleteAction] = useActionState(deletePollAction, null);

  if (!canManage) return null;

  return (
    <section className="rounded-card border border-rule bg-surface p-4 md:p-5">
      <h2 className="text-[15px] font-semibold text-ink">Gestione</h2>
      <p className="mt-1 text-[12.5px] text-muted">
        Solo chi ha creato il sondaggio (o un admin) può chiuderlo o eliminarlo.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <form action={statusAction}>
          <input type="hidden" name="poll_id" value={poll.id} />
          <input type="hidden" name="is_closed" value={poll.isClosed ? "false" : "true"} />
          <SubmitButton variant="secondary" size="sm" pendingLabel="Aggiornamento…">
            <IconLock className="size-4" />
            {poll.isClosed ? "Riapri sondaggio" : "Chiudi sondaggio"}
          </SubmitButton>
        </form>

        <form action={deleteAction}>
          <input type="hidden" name="poll_id" value={poll.id} />
          <ConfirmSubmit message="Eliminare definitivamente il sondaggio e tutti i suoi voti?">
            <span className="inline-flex items-center gap-1.5">
              <IconTrash className="size-4" />
              Elimina
            </span>
          </ConfirmSubmit>
        </form>
      </div>

      <div className="mt-3 space-y-2">
        <FormMessage state={statusState} />
        <FormMessage state={deleteState} />
      </div>
    </section>
  );
}
