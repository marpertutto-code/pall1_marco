import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { LogoMark } from "@/components/brand/logo-mark";
import { notFoundBody, notFoundTitle } from "@/lib/copy";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-16">
      <div className="w-full max-w-md space-y-5">
        <LogoMark className="size-20 text-accent" title="" />
        <div className="space-y-2">
          <h1 className="text-[26px] font-semibold tracking-[-0.025em] text-ink">{notFoundTitle()}</h1>
          <p className="text-sm text-muted">{notFoundBody()}</p>
        </div>
        <Link href="/" className={buttonClass({ size: "md" })}>
          Torna alla home
        </Link>
      </div>
    </main>
  );
}
