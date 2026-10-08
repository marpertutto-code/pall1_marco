export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-card border border-dashed border-rule bg-surface/60 px-5 py-8">
      <div className="space-y-1">
        <p className="font-display text-base font-semibold text-ink">{title}</p>
        {description ? <p className="max-w-prose text-sm text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={["animate-pulse rounded-[8px] bg-surface-2", className].filter(Boolean).join(" ")} />;
}

export function SectionTitle({
  children,
  action,
  as: Tag = "h2",
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <Tag className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{children}</Tag>
      {action}
    </div>
  );
}
