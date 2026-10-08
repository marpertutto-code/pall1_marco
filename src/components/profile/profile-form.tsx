"use client";

import { useActionState, useState } from "react";
import { updateProfileAction } from "@/lib/actions/profile";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form-message";
import { PositionPicker } from "@/components/positions/position-picker";
import {
  FORMAT_LABELS,
  MATCH_FORMATS,
  codesForFormat,
  positionLabel,
  positionsForFormat,
} from "@/lib/positions";
import type { MatchFormat, Profile } from "@/types/domain";

export function ProfileForm({
  profile,
  positions,
}: {
  profile: Profile;
  positions: string[];
}) {
  const [state, action] = useActionState(updateProfileAction, null);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(positions));
  const [format, setFormat] = useState<MatchFormat>("five_a_side");

  function toggle(code: string) {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  const codes = [...selected];
  const selectedList = positionsForFormat(format).filter((position) => selected.has(position.code));

  return (
    <form action={action} className="space-y-6">
      {codes.map((code) => (
        <input key={code} type="hidden" name="positions" value={code} />
      ))}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nickname" htmlFor="nickname" hint="Unico nel gruppo, 3-24 caratteri.">
          <Input
            id="nickname"
            name="nickname"
            defaultValue={profile.nickname}
            required
            minLength={3}
            maxLength={24}
          />
        </Field>

        <Field label="Nome e cognome" htmlFor="full_name" hint="Visibile ai membri del gruppo.">
          <Input id="full_name" name="full_name" defaultValue={profile.full_name ?? ""} maxLength={80} />
        </Field>

        <Field label="Numero di maglia" htmlFor="jersey_number" hint="1-99. Libero tra i giocatori attivi.">
          <Input
            id="jersey_number"
            name="jersey_number"
            type="number"
            min={1}
            max={99}
            inputMode="numeric"
            defaultValue={profile.jersey_number ?? ""}
            placeholder="—"
          />
        </Field>

        <Field label="Data di nascita" htmlFor="birth_date" hint="Serve solo per le statistiche.">
          <Input id="birth_date" name="birth_date" type="date" defaultValue={profile.birth_date ?? ""} />
        </Field>
      </div>

      <fieldset className="space-y-3 border-t border-rule pt-5">
        <legend className="text-[15px] font-semibold text-ink">Dove ti trovi bene in campo</legend>
        <p className="text-[13px] text-muted">
          Scegli il formato, poi tocca le posizioni sul campo. Puoi indicarne più di una per ogni
          formato: serve all&apos;admin per formare squadre equilibrate.
        </p>

        <div className="inline-flex flex-wrap rounded-control bg-surface-2 p-1" role="tablist">
          {MATCH_FORMATS.map((item) => {
            const count = codesForFormat(codes, item).length;
            const active = item === format;
            return (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFormat(item)}
                className={[
                  "inline-flex items-center gap-2 rounded-[7px] px-3.5 py-2 text-[13px] font-medium transition-colors duration-150",
                  active ? "bg-accent-solid text-accent-on" : "text-muted hover:text-ink",
                ].join(" ")}
              >
                {FORMAT_LABELS[item]}
                {count > 0 ? (
                  <span
                    className={[
                      "num rounded-full px-1.5 text-[10.5px]",
                      active ? "bg-accent-on/20 text-accent-on" : "bg-surface text-muted",
                    ].join(" ")}
                  >
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="rounded-card border border-rule bg-paper p-4">
          <PositionPicker
            positions={positionsForFormat(format)}
            selected={selected}
            format={format}
            onToggle={toggle}
          />

          <div className="mt-4 border-t border-rule pt-3">
            <p className="text-[12px] text-muted">
              Selezionate per {FORMAT_LABELS[format].toLowerCase()}:
            </p>
            {selectedList.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {selectedList.map((position) => (
                  <li key={position.code}>
                    <button
                      type="button"
                      onClick={() => toggle(position.code)}
                      title="Togli questa posizione"
                      className="inline-flex items-center gap-1.5 rounded-full border border-accent-solid bg-accent-solid/10 px-2.5 py-1 text-[12px] font-medium text-ink"
                    >
                      {positionLabel(position.code)}
                      <span aria-hidden className="text-muted">
                        ×
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1.5 text-[12.5px] text-muted">
                Nessuna posizione: tocca un pallino sul campo.
              </p>
            )}
          </div>
        </div>
      </fieldset>

      <FormMessage state={state} />

      <SubmitButton pendingLabel="Salvataggio…">Salva profilo</SubmitButton>
    </form>
  );
}
