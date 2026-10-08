"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { setAttendanceAction } from "@/lib/actions/participation";
import { FormMessage } from "@/components/ui/form-message";
import { IconCheck, IconX } from "@/components/icons";
import type { Attendance } from "@/types/domain";

/**
 * Due sole scelte: confermo o do forfait. Il "forse" non c'è più — chi non sa
 * non conferma, e se ci ripensa lo dice dopo (o libera il posto, che avvisa i
 * compagni di quella specifica partita).
 */

const OPTIONS: Array<{ value: Attendance; label: string; icon: typeof IconCheck }> = [
  { value: "present", label: "Confermo la mia presenza", icon: IconCheck },
  { value: "absent", label: "Foldo, sono un infame", icon: IconX },
];

/** "Forse" (dati vecchi) conta come iscritto: può ritirare. */
function isRegistered(value: Attendance | null) {
  return value === "present" || value === "maybe";
}

const SELECTED: Record<string, string> = {
  present: "border-accent-solid bg-accent-solid text-accent-on",
  absent: "border-loss bg-loss/12 text-loss",
};

function Options({ value }: { value: Attendance | null }) {
  const { pending } = useFormStatus();
  const registered = isRegistered(value);

  // Chi non è iscritto non può "foldare": non c'è nessuna posizione da liberare.
  // Vede solo la conferma; il forfait compare dopo che si è iscritto.
  const options = registered ? OPTIONS : OPTIONS.filter((option) => option.value === "present");

  return (
    <fieldset
      disabled={pending}
      aria-busy={pending}
      className={`grid w-full grid-cols-1 gap-2 ${registered ? "sm:grid-cols-2" : ""}`}
    >
      <legend className="sr-only">La tua presenza a questa partita</legend>

      {options.map((option) => {
        const selected = value === option.value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="submit"
            name="attendance"
            value={option.value}
            aria-pressed={selected}
            className={[
              "inline-flex items-center justify-center gap-2 rounded-control border px-3 py-2.5 text-[13px] font-medium transition-colors duration-150",
              selected
                ? SELECTED[option.value]
                : "border-rule text-muted hover:border-line-strong hover:text-ink",
            ].join(" ")}
          >
            <Icon className="size-4 shrink-0" />
            {option.label}
          </button>
        );
      })}
    </fieldset>
  );
}

export function AttendanceControl({
  matchId,
  value,
  disabled,
  className,
}: {
  matchId: string;
  value: Attendance | null;
  disabled?: boolean;
  className?: string;
}) {
  const [state, action] = useActionState(setAttendanceAction, null);

  return (
    <div className={["space-y-2", className].filter(Boolean).join(" ")}>
      <form action={action}>
        <input type="hidden" name="match_id" value={matchId} />
        <Options value={value} />
      </form>
      {disabled ? (
        <p className="text-xs text-muted">Le iscrizioni sono chiuse per questa partita.</p>
      ) : null}
      <FormMessage state={state} />
    </div>
  );
}
