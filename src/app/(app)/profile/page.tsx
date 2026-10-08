import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { AvatarForm } from "@/components/profile/avatar-form";
import { ProfileForm } from "@/components/profile/profile-form";
import { TelegramNotifications } from "@/components/profile/telegram-notifications";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireProfile } from "@/lib/auth";
import { getCurrentUser } from "@/lib/auth";
import { signOutAction } from "@/lib/actions/auth";
import { getMyTelegramSubscription, getPositionsByProfile } from "@/lib/queries";
import { isTelegramConfigured } from "@/lib/telegram";

export const metadata: Metadata = { title: "Il tuo profilo" };

const TELEGRAM_NOTICE: Record<string, string> = {
  error: "Non è stato possibile creare il collegamento. Riprova.",
  unconfigured: "Le notifiche Telegram non sono configurate su questo server.",
};

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ telegram?: string }>;
}) {
  const profile = await requireProfile();
  const params = await searchParams;
  const [user, positionsByProfile, telegram] = await Promise.all([
    getCurrentUser(),
    getPositionsByProfile([profile.id]),
    getMyTelegramSubscription(),
  ]);

  const positions = positionsByProfile.get(profile.id) ?? [];
  const telegramNotice = params.telegram ? TELEGRAM_NOTICE[params.telegram] : undefined;

  return (
    <>
      <PageHeader
        title="Il tuo profilo"
        description="Aggiorna i tuoi dati: compaiono nelle partite e nella classifica."
      />

      <section className="rounded-card border border-rule bg-surface p-5 md:p-6">
        <h2 className="mb-4 text-[15px] font-semibold text-ink">Foto</h2>
        <AvatarForm profile={profile} />
      </section>

      <section className="mt-6 rounded-card border border-rule bg-surface p-5 md:p-6">
        <h2 className="mb-5 text-[15px] font-semibold text-ink">Dati giocatore</h2>
        <ProfileForm profile={profile} positions={positions} />
      </section>

      <section className="mt-6 rounded-card border border-rule bg-surface p-5 md:p-6">
        <h2 className="mb-4 text-[15px] font-semibold text-ink">Notifiche Telegram</h2>
        {telegramNotice ? (
          <p className="mb-3 rounded-control border border-loss/35 bg-loss/8 px-3 py-2.5 text-[13px] text-ink">
            {telegramNotice}
          </p>
        ) : null}
        <TelegramNotifications subscription={telegram} configured={isTelegramConfigured()} />
      </section>

      <section className="mt-6 rounded-card border border-rule bg-surface p-5 md:p-6">
        <h2 className="mb-4 text-[15px] font-semibold text-ink">Account</h2>

        <dl className="space-y-3 text-[13.5px]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <dt className="text-muted">Email</dt>
            <dd className="font-medium text-ink">{user?.email ?? "—"}</dd>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <dt className="text-muted">Permessi</dt>
            <dd className="font-medium text-ink">
              {profile.is_admin ? "Amministratore" : "Giocatore"}
            </dd>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <dt className="text-muted">Stato</dt>
            <dd className="font-medium text-ink">{profile.is_active ? "Attivo" : "Non attivo"}</dd>
          </div>
        </dl>

        <div className="mt-5 border-t border-rule pt-4">
          <form action={signOutAction}>
            <SubmitButton variant="secondary" size="sm" pendingLabel="Uscita…">
              Esci dall&apos;account
            </SubmitButton>
          </form>
        </div>
      </section>
    </>
  );
}
