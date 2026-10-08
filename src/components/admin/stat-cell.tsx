export function StatCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: string;
}) {
  return (
    <div className="px-4 py-3.5">
      <p className="text-[11.5px] text-muted">{label}</p>
      <p className={`num mt-1 text-[20px] font-semibold tracking-[-0.02em] ${tone ?? "text-ink"}`}>
        {value}
      </p>
    </div>
  );
}
