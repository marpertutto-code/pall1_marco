import type { FormState } from "@/lib/form-state";
import { IconAlert, IconCheck } from "@/components/icons";

export function FormMessage({ state }: { state: FormState }) {
  if (!state) return null;

  if (state.error) {
    return (
      <p
        role="alert"
        className="flex items-start gap-2 rounded-control border border-loss/35 bg-loss/8 px-3 py-2.5 text-[13px] text-ink"
      >
        <IconAlert className="mt-0.5 size-4 shrink-0 text-loss" />
        {state.error}
      </p>
    );
  }

  if (state.success) {
    return (
      <p
        role="status"
        className="flex items-start gap-2 rounded-control border border-win/35 bg-win/8 px-3 py-2.5 text-[13px] text-ink"
      >
        <IconCheck className="mt-0.5 size-4 shrink-0 text-win" />
        {state.success}
      </p>
    );
  }

  return null;
}
