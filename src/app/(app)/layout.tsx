import { AppShell } from "@/components/app-shell";
import { requireProfile } from "@/lib/auth";
import { countPendingPolls } from "@/lib/queries";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  // Il pallino dei sondaggi vive nelle barre di navigazione, che stanno qui:
  // per questo il conteggio si calcola nel layout e non nella pagina sondaggi.
  const pendingPolls = await countPendingPolls(profile.id);

  return (
    <AppShell profile={profile} pendingPolls={pendingPolls}>
      {children}
    </AppShell>
  );
}
