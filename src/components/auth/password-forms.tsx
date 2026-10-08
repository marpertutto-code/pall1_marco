"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotPasswordAction, resetPasswordAction } from "@/lib/actions/auth";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form-message";
import { IconArrowLeft } from "@/components/icons";

export function ForgotPasswordForm() {
  const [state, action] = useActionState(forgotPasswordAction, null);

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-[24px] font-semibold tracking-[-0.025em] text-ink">Password dimenticata</h1>
        <p className="text-sm text-muted">
          Inserisci l&apos;email del tuo account: ti mandiamo un link per sceglierne una nuova.
        </p>
      </div>

      <form action={action} className="space-y-4">
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required placeholder="nome@esempio.it" />
        </Field>

        <FormMessage state={state} />

        <SubmitButton className="w-full" pendingLabel="Invio…">
          Invia il link
        </SubmitButton>
      </form>

      <Link
        href="/login"
        className="inline-flex items-center gap-2 text-[13px] text-muted hover:text-ink"
      >
        <IconArrowLeft className="size-4" />
        Torna all&apos;accesso
      </Link>
    </div>
  );
}

export function ResetPasswordForm() {
  const [state, action] = useActionState(resetPasswordAction, null);

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-[24px] font-semibold tracking-[-0.025em] text-ink">Nuova password</h1>
        <p className="text-sm text-muted">Scegli una password che ricordi. Almeno 6 caratteri.</p>
      </div>

      <form action={action} className="space-y-4">
        <Field label="Nuova password" htmlFor="password">
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
          />
        </Field>

        <Field label="Ripeti la password" htmlFor="confirm">
          <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={6} />
        </Field>

        <FormMessage state={state} />

        <SubmitButton className="w-full" pendingLabel="Salvataggio…">
          Salva la password
        </SubmitButton>
      </form>
    </div>
  );
}
