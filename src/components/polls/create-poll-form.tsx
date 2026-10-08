"use client";

import { useActionState, useState } from "react";
import { createPollAction } from "@/lib/actions/polls";
import { Field, Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form-message";
import { IconCheck, IconChevronRight, IconPlus, IconTrash, IconX } from "@/components/icons";
import {
  MAX_POLL_OPTIONS,
  MIN_POLL_OPTIONS,
} from "@/lib/validation/schemas";
import { timeSlotsForDay } from "@/lib/poll-times";
import {
  addDays,
  pollDays,
  relativeWeekLabel,
  startOfWeek,
  weekRangeLabel,
  weekdayName,
} from "@/lib/week";

type Row = {
  key: number;
  label: string;
  startsAt: string;
  withDate: boolean;
};

let nextKey = 1;

function emptyRow(): Row {
  return { key: nextKey++, label: "", startsAt: "", withDate: false };
}

/** Ora di ritrovo predefinita, se un giorno non ha orari proposti. */
const DEFAULT_TIME = "21:00";

function rowsForWeek(weekStart: string): Row[] {
  return pollDays(weekStart).map((day) => ({
    key: nextKey++,
    label: weekdayName(day),
    // Primo orario del giorno (feriali 18:00, sabato 15:30): la data vera
    // serve a generare il sottosondaggio degli orari.
    startsAt: timeSlotsForDay(day)[0]?.startsAt ?? `${day}T${DEFAULT_TIME}`,
    withDate: true,
  }));
}

const PRESETS = [
  {
    label: "Orari",
    values: ["18:00", "19:00", "20:00", "21:00", "22:00"],
  },
];

export function CreatePollForm({
  prefillQuestion,
  prefillSingleChoice,
  defaultWeekStart,
}: {
  prefillQuestion?: string;
  prefillSingleChoice?: boolean;
  defaultWeekStart: string | null;
}) {
  const [state, action] = useActionState(createPollAction, null);
  const [rows, setRows] = useState<Row[]>(() =>
    defaultWeekStart ? rowsForWeek(defaultWeekStart) : [emptyRow(), emptyRow()],
  );
  const [allowMultiple, setAllowMultiple] = useState(!prefillSingleChoice);
  const [weekStart, setWeekStart] = useState<string | null>(defaultWeekStart);
  // Con una settimana, di default ogni giorno riceve il suo sottosondaggio orari.
  const [withSubPolls, setWithSubPolls] = useState(
    Boolean(defaultWeekStart) && !prefillSingleChoice,
  );

  const currentWeek = startOfWeek();

  function chooseWeek(week: string | null) {
    setWeekStart(week);
    // Le opzioni seguono la settimana: sono i suoi sette giorni.
    setRows(week ? rowsForWeek(week) : [emptyRow(), emptyRow()]);
  }

  function update(key: number, patch: Partial<Row>) {
    setRows((previous) => previous.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setRows((previous) => (previous.length >= MAX_POLL_OPTIONS ? previous : [...previous, emptyRow()]));
  }

  function removeRow(key: number) {
    setRows((previous) =>
      previous.length <= MIN_POLL_OPTIONS ? previous : previous.filter((row) => row.key !== key),
    );
  }

  function applyPreset(values: string[]) {
    setRows(
      values.slice(0, MAX_POLL_OPTIONS).map((label) => ({
        key: nextKey++,
        label,
        startsAt: "",
        withDate: false,
      })),
    );
  }

  const stepButton =
    "inline-flex size-10 items-center justify-center rounded-control border border-rule text-muted transition-colors duration-150 hover:border-line-strong hover:text-ink";

  return (
    <form action={action} className="space-y-5">
      <Field label="Domanda" htmlFor="question" hint="Es. «Quale giorno giochiamo?»">
        <Input
          id="question"
          name="question"
          required
          minLength={3}
          maxLength={160}
          defaultValue={prefillQuestion ?? ""}
          placeholder="Quale giorno giochiamo?"
        />
      </Field>

      <Field label="Dettagli" htmlFor="details" hint="Opzionale: contesto, scadenza, note.">
        <Textarea id="details" name="details" maxLength={500} placeholder="Es. decidiamo entro giovedì" />
      </Field>

      {/* ---------------------------------------------------------- settimana */}
      <fieldset className="rounded-card border border-rule bg-paper p-4">
        <legend className="text-[13px] font-medium text-muted">Settimana</legend>

        <input type="hidden" name="week_start" value={weekStart ?? ""} />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[15px] font-medium text-ink">
              {weekStart ? weekRangeLabel(weekStart) : "Nessuna settimana"}
            </p>
            <p className="text-[12px] text-muted">
              {weekStart ? relativeWeekLabel(weekStart) : "Sondaggio senza una settimana di riferimento"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className={stepButton}
              onClick={() => chooseWeek(addDays(weekStart ?? currentWeek, -7))}
              aria-label="Settimana precedente"
            >
              <IconChevronRight className="size-4 rotate-180" />
            </button>
            <button
              type="button"
              className="h-10 rounded-control border border-rule px-3 text-[13px] text-muted transition-colors duration-150 hover:border-line-strong hover:text-ink"
              onClick={() => chooseWeek(currentWeek)}
            >
              Questa settimana
            </button>
            <button
              type="button"
              className={stepButton}
              onClick={() => chooseWeek(addDays(weekStart ?? currentWeek, 7))}
              aria-label="Settimana successiva"
            >
              <IconChevronRight className="size-4" />
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-rule pt-3">
          <button
            type="button"
            onClick={() => chooseWeek(addDays(currentWeek, 7))}
            className="rounded-full border border-rule px-2.5 py-1 text-[11.5px] text-muted transition-colors duration-150 hover:border-line-strong hover:text-ink"
          >
            La prossima
          </button>
          <button
            type="button"
            onClick={() => chooseWeek(addDays(currentWeek, 14))}
            className="rounded-full border border-rule px-2.5 py-1 text-[11.5px] text-muted transition-colors duration-150 hover:border-line-strong hover:text-ink"
          >
            Tra due settimane
          </button>
          <button
            type="button"
            onClick={() => chooseWeek(null)}
            className="rounded-full border border-rule px-2.5 py-1 text-[11.5px] text-muted transition-colors duration-150 hover:border-line-strong hover:text-ink"
          >
            Nessuna settimana
          </button>

          <p className="text-[11.5px] text-muted">
            Cambiando settimana le opzioni diventano i suoi giorni (lunedì–sabato), dal primo orario
            utile.
          </p>
        </div>

        <input
          type="hidden"
          name="with_time_subpolls"
          value={withSubPolls && weekStart ? "on" : "off"}
        />

        {weekStart ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-rule pt-3">
            <button
              type="button"
              onClick={() => setWithSubPolls((value) => !value)}
              aria-pressed={withSubPolls}
              className={[
                "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11.5px] transition-colors duration-150",
                withSubPolls
                  ? "border-accent-solid text-accent-text"
                  : "border-rule text-muted hover:border-line-strong hover:text-ink",
              ].join(" ")}
            >
              <span
                aria-hidden
                className={[
                  "flex size-3.5 items-center justify-center rounded-[4px] border",
                  withSubPolls ? "border-accent-solid bg-accent-solid text-accent-on" : "border-line-strong",
                ].join(" ")}
              >
                {withSubPolls ? <IconCheck className="size-2.5" strokeWidth={3} /> : null}
              </span>
              Sottosondaggio orari per ogni giorno
            </button>
            <p className="text-[11.5px] text-muted">
              Feriali 18:00–21:00, sabato 15:30–18:30, ogni 30 minuti.
            </p>
          </div>
        ) : null}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <fieldset className="space-y-2">
          <legend className="text-[13px] font-medium text-muted">Tipo di risposta</legend>

          <input type="hidden" name="allow_multiple" value={allowMultiple ? "on" : "off"} />

          <div className="inline-flex rounded-control bg-surface-2 p-1">
            <button
              type="button"
              onClick={() => setAllowMultiple(false)}
              aria-pressed={!allowMultiple}
              className={[
                "rounded-[7px] px-3 py-2 text-[13px] font-medium transition-colors duration-150",
                !allowMultiple ? "bg-accent-solid text-accent-on" : "text-muted hover:text-ink",
              ].join(" ")}
            >
              Una sola scelta
            </button>
            <button
              type="button"
              onClick={() => setAllowMultiple(true)}
              aria-pressed={allowMultiple}
              className={[
                "rounded-[7px] px-3 py-2 text-[13px] font-medium transition-colors duration-150",
                allowMultiple ? "bg-accent-solid text-accent-on" : "text-muted hover:text-ink",
              ].join(" ")}
            >
              Più scelte
            </button>
          </div>

          <p className="text-xs text-muted">
            «Più scelte» per i giorni disponibili, «una sola» per l&apos;orario.
          </p>
        </fieldset>

        <Field
          label="Chiusura automatica"
          htmlFor="closes_at"
          hint="Opzionale: oltre questa data non si vota più."
        >
          <Input id="closes_at" name="closes_at" type="datetime-local" />
        </Field>
      </div>

      {/* ------------------------------------------------------------ opzioni */}
      <fieldset className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <legend className="text-[13px] font-medium text-muted">
            Opzioni · minimo {MIN_POLL_OPTIONS}, massimo {MAX_POLL_OPTIONS}
          </legend>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11.5px] text-muted">Riempi con:</span>
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset.values)}
                className="rounded-full border border-rule px-2.5 py-1 text-[11.5px] text-muted transition-colors duration-150 hover:border-line-strong hover:text-ink"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <ul className="space-y-2">
          {rows.map((row, index) => (
            <li key={row.key} className="rounded-control border border-rule bg-paper p-2.5">
              <div className="flex items-center gap-2">
                <span className="num w-5 shrink-0 text-center text-[12px] text-muted">{index + 1}</span>

                <input
                  name="option_label"
                  value={row.label}
                  onChange={(event) => update(row.key, { label: event.target.value })}
                  maxLength={80}
                  placeholder={`Opzione ${index + 1}`}
                  aria-label={`Testo opzione ${index + 1}`}
                  className="h-10 min-w-0 flex-1 rounded-[8px] border border-rule bg-surface px-2.5 text-[13.5px] text-ink placeholder:text-muted/80 focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus/25"
                />

                <button
                  type="button"
                  onClick={() => update(row.key, { withDate: !row.withDate })}
                  aria-pressed={row.withDate}
                  title="Collega una data e un'ora precise"
                  className={[
                    "inline-flex size-10 shrink-0 items-center justify-center rounded-[8px] border transition-colors duration-150",
                    row.withDate
                      ? "border-accent-solid text-accent-text"
                      : "border-rule text-muted hover:text-ink",
                  ].join(" ")}
                >
                  <IconPlus className="size-4" />
                </button>

                <button
                  type="button"
                  onClick={() => removeRow(row.key)}
                  disabled={rows.length <= MIN_POLL_OPTIONS}
                  title="Rimuovi opzione"
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-[8px] border border-rule text-muted transition-colors duration-150 hover:border-loss hover:text-loss disabled:pointer-events-none disabled:opacity-40"
                >
                  <IconTrash className="size-4" />
                </button>
              </div>

              {row.withDate ? (
                <div className="mt-2 pl-7">
                  <input
                    type="datetime-local"
                    name="option_starts_at"
                    value={row.startsAt}
                    onChange={(event) => update(row.key, { startsAt: event.target.value })}
                    aria-label={`Data e ora opzione ${index + 1}`}
                    className="h-10 w-full rounded-[8px] border border-rule bg-surface px-2.5 text-[13px] text-ink focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus/25 sm:w-auto"
                  />
                </div>
              ) : (
                <input type="hidden" name="option_starts_at" value="" />
              )}
            </li>
          ))}
        </ul>

        {rows.length < MAX_POLL_OPTIONS ? (
          <button
            type="button"
            onClick={addRow}
            className="inline-flex h-10 items-center gap-2 rounded-control border border-dashed border-line-strong px-3.5 text-[13px] text-muted transition-colors duration-150 hover:border-accent-solid hover:text-ink"
          >
            <IconPlus className="size-4" />
            Aggiungi opzione
          </button>
        ) : (
          <p className="flex items-center gap-1.5 text-[12px] text-muted">
            <IconX className="size-3.5" />
            Raggiunto il massimo di {MAX_POLL_OPTIONS} opzioni.
          </p>
        )}

        <p className="text-xs text-muted">
          Collegando data e ora a un&apos;opzione, l&apos;admin può poi creare la partita con un click.
        </p>
      </fieldset>

      <FormMessage state={state} />

      <SubmitButton pendingLabel="Creazione…">Crea sondaggio</SubmitButton>
    </form>
  );
}
