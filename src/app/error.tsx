"use client";

import { useEffect } from "react";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-16">
      <div className="w-full max-w-md space-y-5">
        <div className="space-y-2">
          <h1 className="text-[26px] font-semibold tracking-[-0.025em] text-ink">
            Qualcosa è andato storto
          </h1>
          <p className="text-sm text-muted">
            Non siamo riusciti a caricare questa schermata. Riprova: se continua, ricarica la pagina.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={reset} className={buttonClass({ size: "md" })}>
            Riprova
          </button>
          <Link href="/" className={buttonClass({ variant: "secondary", size: "md" })}>
            Torna alla home
          </Link>
        </div>
      </div>
    </main>
  );
}
