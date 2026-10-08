import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export const inputClass =
  "w-full rounded-control border border-rule bg-paper px-3 py-2.5 text-sm text-ink " +
  "placeholder:text-muted/80 transition-colors duration-150 " +
  "hover:border-line-strong focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus/25 " +
  "disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-loss";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={[inputClass, className].filter(Boolean).join(" ")} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea className={[inputClass, "min-h-24 resize-y", className].filter(Boolean).join(" ")} {...props} />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={[inputClass, "appearance-none bg-paper pr-9", className].filter(Boolean).join(" ")}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='1.8' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 10px center",
        backgroundSize: "16px",
      }}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={["block text-[13px] font-medium text-muted", className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={["flex flex-col gap-1.5", className].filter(Boolean).join(" ")}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error ? <p className="text-xs text-muted">{hint}</p> : null}
      {error ? (
        <p className="text-xs font-medium text-loss" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
