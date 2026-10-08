import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-accent-solid text-accent-on hover:bg-accent-solid-strong active:bg-accent-solid-strong",
  secondary: "bg-surface text-ink border border-line-strong hover:bg-surface-2",
  ghost: "text-muted hover:text-ink hover:bg-surface-2",
  danger: "bg-surface text-loss border border-line-strong hover:border-loss hover:bg-loss/10",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-[13px] gap-1.5 rounded-[9px]",
  md: "h-11 px-4 text-sm gap-2 rounded-control",
  lg: "h-12 px-5 text-base gap-2 rounded-control",
};

export function buttonClass(options?: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  const { variant = "primary", size = "md", className = "" } = options ?? {};
  return [
    "inline-flex items-center justify-center font-medium whitespace-nowrap",
    "transition-colors duration-150 ease-out-soft",
    "disabled:pointer-events-none disabled:opacity-55",
    VARIANTS[variant],
    SIZES[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return <button className={buttonClass({ variant, size, className })} {...props} />;
}
