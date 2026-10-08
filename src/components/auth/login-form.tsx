"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInAction } from "@/lib/actions/auth";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form-message";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signInAction, null);

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-[24px] font-semibold tracking-[-0.025em] text-ink">Entra</h1>
        <p className="text-sm text-muted">Bentornato in campo.</p>
      </div>

      <form action={action} className="space-y-4">
        {next ? <input type="hidden" name="next" value={next} /> : null}

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

        <Field label="Password" htmlFor="password">
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
          />
        </Field>

        <FormMessage state={state} />

        <SubmitButton className="w-full" pendingLabel="Accesso…">
          Entra
        </SubmitButton>
      </form>

      <div className="flex flex-col gap-2 text-[13px]">
        <Link href="/forgot-password" className="text-muted underline decoration-rule underline-offset-4 hover:text-ink">
          Ho dimenticato la password
        </Link>
        <p className="text-muted">
          Non hai un account?{" "}
          <Link href="/register" className="font-medium text-accent-text hover:underline">
            Registrati
          </Link>
        </p>
      </div>
    </div>
  );
}
