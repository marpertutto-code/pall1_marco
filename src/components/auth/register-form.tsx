"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUpAction } from "@/lib/actions/auth";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form-message";

export function RegisterForm() {
  const [state, action] = useActionState(signUpAction, null);

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-[24px] font-semibold tracking-[-0.025em] text-ink">Crea l&apos;account</h1>
        <p className="text-sm text-muted">
          Ti serviranno un nickname e un&apos;email. Il resto lo aggiungi dopo.
        </p>
      </div>

      <form action={action} className="space-y-4">
        <Field label="Nickname" htmlFor="nickname" hint="Da 3 a 24 caratteri. Deve essere unico.">
          <Input
            id="nickname"
            name="nickname"
            autoComplete="nickname"
            required
            minLength={3}
            maxLength={24}
            placeholder="es. tafo"
          />
        </Field>

        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            placeholder="nome@esempio.it"
          />
        </Field>

        <Field label="Password" htmlFor="password" hint="Almeno 6 caratteri.">
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            placeholder="••••••••"
          />
        </Field>

        <FormMessage state={state} />

        <SubmitButton className="w-full" pendingLabel="Creazione…">
          Registrati
        </SubmitButton>
      </form>

      <p className="text-[13px] text-muted">
        Hai già un account?{" "}
        <Link href="/login" className="font-medium text-accent-text hover:underline">
          Entra
        </Link>
      </p>
    </div>
  );
}
