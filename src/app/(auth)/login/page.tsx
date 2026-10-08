import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Accedi" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="space-y-4">
      {params.error ? (
        <p
          role="alert"
          className="rounded-control border border-loss/35 bg-loss/8 px-3 py-2.5 text-[13px] text-ink"
        >
          Il link non è più valido. Richiedine uno nuovo.
        </p>
      ) : null}
      <LoginForm next={params.next} />
    </div>
  );
}
