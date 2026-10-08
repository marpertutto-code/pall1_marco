import Image from "next/image";
import { initials } from "@/lib/format";

const SIZES = {
  sm: { box: "size-8", text: "text-[11px]", px: 32 },
  md: { box: "size-10", text: "text-xs", px: 40 },
  lg: { box: "size-14", text: "text-sm", px: 56 },
  xl: { box: "size-20", text: "text-lg", px: 80 },
} as const;

export function Avatar({
  name,
  src,
  size = "md",
  className,
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const s = SIZES[size];

  if (src) {
    return (
      <Image
        src={src}
        alt=""
        width={s.px}
        height={s.px}
        className={[s.box, "shrink-0 rounded-full border border-rule object-cover", className]
          .filter(Boolean)
          .join(" ")}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={[
        s.box,
        s.text,
        "num flex shrink-0 items-center justify-center rounded-full border border-rule bg-surface-2 font-semibold text-muted",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {initials(name)}
    </span>
  );
}
