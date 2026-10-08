import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/password-forms";

export const metadata: Metadata = { title: "Nuova password" };

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
