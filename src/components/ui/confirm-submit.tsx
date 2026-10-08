"use client";

import { useFormStatus } from "react-dom";
import { buttonClass, type ButtonSize, type ButtonVariant } from "@/components/ui/button";

/**
 * Bottone distruttivo con conferma: evita un click accidentale su "Elimina".
 */
export function ConfirmSubmit({
  children,
  message,
  variant = "danger",
  size = "sm",
  className,
}: {
  children: React.ReactNode;
  message: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={buttonClass({ variant, size, className })}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
