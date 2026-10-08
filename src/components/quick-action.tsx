import Link from "next/link";
import { IconChevronRight } from "@/components/icons";

/**
 * Scelta rapida in home: "cosa vuoi creare?".
 *
 * Due tessere sempre sulla stessa riga (anche su telefono): icona grande su
 * tinta d'accento, poi etichetta e riga di contesto. Su schermo largo passano
 * in orizzontale, dove c'è spazio per l'invito a destra.
 */
export function QuickAction({
  href,
  icon,
  title,
  hint,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-card border border-rule bg-surface p-3.5 transition-colors duration-150 hover:border-line-strong hover:bg-surface-2 sm:flex-row sm:items-center sm:gap-4 sm:p-4"
    >
      <span className="flex size-14 shrink-0 items-center justify-center rounded-[14px] bg-accent/15 text-accent-text dark:bg-accent/25">
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-medium leading-snug text-ink sm:text-[15px]">
          {title}
        </span>
        <span className="mt-0.5 block text-[12px] leading-snug text-muted">{hint}</span>
      </span>

      <IconChevronRight className="hidden size-4 shrink-0 text-muted transition-transform duration-150 ease-out-soft group-hover:translate-x-0.5 sm:block" />
    </Link>
  );
}
