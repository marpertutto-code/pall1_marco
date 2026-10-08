"use client";

import { useActionState, useState } from "react";
import { createMatchAction } from "@/lib/actions/admin";
import { Field, Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form-message";
import {
  DEFAULT_FORMAT,
  FORMAT_DEFAULT_MAX_PLAYERS,
  FORMAT_LABELS,
  FORMAT_SQUAD_SIZE,
  MATCH_FORMATS,
} from "@/lib/positions";
import type { MatchFormat } from "@/types/domain";

export function CreateMatchForm({ defaultDateLocal }: { defaultDateLocal: string }) {
  const [state, action] = useActionState(createMatchAction, null);
  const [format, setFormat] = useState<MatchFormat>(DEFAULT_FORMAT);
  const [maxPlayers, setMaxPlayers] = useState<number>(FORMAT_DEFAULT_MAX_PLAYERS[DEFAULT_FORMAT]);

  function changeFormat(next: MatchFormat) {
    setFormat(next);
    setMaxPlayers(FORMAT_DEFAULT_MAX_PLAYERS[next]);
  }

  return (
    <form action={action} className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="text-[13px] font-medium text-muted">Tipo di partita</legend>
        <div className="inline-flex flex-wrap rounded-control bg-surface-2 p-1">
          {MATCH_FORMATS.map((item) => {
            const active = item === format;
            return (
              <button
                key={item}
                type="button"
                onClick={() => changeFormat(item)}
                aria-pressed={active}
                className={[
                  "rounded-[7px] px-3.5 py-2 text-[13px] font-medium transition-colors duration-150",
                  active ? "bg-accent-solid text-accent-on" : "text-muted hover:text-ink",
                ].join(" ")}
              >
                {FORMAT_LABELS[item]}
              </button>
            );
          })}
        </div>
        <input type="hidden" name="format" value={format} />
        <p className="text-xs text-muted">
          In campo {FORMAT_SQUAD_SIZE[format]} per squadra. I posti sono precompilati ma puoi
          cambiarli.
        </p>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Data e ora" htmlFor="match_date_local" hint="Fuso orario italiano.">
          <Input
            id="match_date_local"
            name="match_date_local"
            type="datetime-local"
            required
            defaultValue={defaultDateLocal}
          />
        </Field>

        <Field label="Campo" htmlFor="location">
          <Input id="location" name="location" required maxLength={120} placeholder="es. Centro Sportivo Nord" />
        </Field>

        <Field label="Posti disponibili" htmlFor="max_players" hint="Quanti giocatori in totale.">
          <Input
            id="max_players"
            name="max_players"
            type="number"
            min={2}
            max={40}
            inputMode="numeric"
            value={maxPlayers}
            onChange={(event) => setMaxPlayers(Number(event.target.value))}
            required
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Nome squadra A" htmlFor="team_a_name">
            <Input id="team_a_name" name="team_a_name" defaultValue="Squadra A" maxLength={40} required />
          </Field>
          <Field label="Nome squadra B" htmlFor="team_b_name">
            <Input id="team_b_name" name="team_b_name" defaultValue="Squadra B" maxLength={40} required />
          </Field>
        </div>
      </div>

      <Field label="Note" htmlFor="notes" hint="Opzionale: ritrovo, quote, regole.">
        <Textarea id="notes" name="notes" maxLength={500} placeholder="Es. ritrovo 15 minuti prima" />
      </Field>

      <FormMessage state={state} />

      <SubmitButton pendingLabel="Creazione…">Crea partita</SubmitButton>
    </form>
  );
}
