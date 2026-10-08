"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  adminSetAttendanceAction,
  assignTeamAction,
  autoBalanceTeamsAction,
  saveContributionsAction,
  saveResultAction,
  setMatchStatusAction,
  updateMatchAction,
} from "@/lib/actions/admin";
import { Avatar } from "@/components/ui/avatar";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form-message";
import { StatusChip } from "@/components/ui/badge";
import { PositionTags } from "@/components/positions/position-tags";
import { IconScale } from "@/components/icons";
import { FORMAT_LABELS, FORMAT_SHORT, MATCH_FORMATS } from "@/lib/positions";
import type { Attendance, MatchFormat, MatchResultRow, MatchRow, Profile, RosterEntry, TeamSide } from "@/types/domain";

const SEGMENT_BASE =
  "rounded-[7px] px-2.5 py-1.5 text-[12px] font-medium transition-colors duration-150 disabled:opacity-50";

function SegmentedButtons({
  options,
  selected,
  disabled,
}: {
  options: Array<{ name: string; value: string; label: string; title?: string }>;
  selected: string | null;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <div className="flex gap-0.5 rounded-control bg-surface-2 p-0.5">
      {options.map((option) => {
        const isSelected = selected === option.value;
        return (
          <button
            key={`${option.name}-${option.value}`}
            type="submit"
            name={option.name}
            value={option.value}
            disabled={disabled || pending}
            aria-pressed={isSelected}
            title={option.title}
            className={[
              SEGMENT_BASE,
              isSelected ? "bg-accent-solid text-accent-on" : "text-muted hover:text-ink",
            ].join(" ")}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function RosterRow({
  profile,
  entry,
  matchId,
  format,
  attendanceAction,
  teamAction,
  locked,
  showTeam,
}: {
  profile: Profile;
  entry: RosterEntry | undefined;
  matchId: string;
  format: MatchFormat;
  attendanceAction: (formData: FormData) => void;
  teamAction: (formData: FormData) => void;
  locked: boolean;
  showTeam: boolean;
}) {
  const attendance: Attendance | null = entry?.attendance ?? null;
  const team: TeamSide | null = entry?.team ?? null;

  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3 md:px-5">
      <Avatar name={profile.nickname} src={profile.avatar_url} size="sm" />

      <div className="min-w-[120px] flex-1">
        <p className="truncate text-[13.5px] font-medium text-ink">
          {profile.nickname}
          {profile.jersey_number !== null ? (
            <span className="num ml-2 text-[11px] text-muted">#{profile.jersey_number}</span>
          ) : null}
        </p>
        <p className="truncate text-[11.5px] text-muted">
          <PositionTags
            codes={entry?.positions ?? []}
            format={format}
            empty="posizioni non indicate"
          />
        </p>
      </div>

      <form action={attendanceAction} className="shrink-0">
        <input type="hidden" name="match_id" value={matchId} />
        <input type="hidden" name="profile_id" value={profile.id} />
        <SegmentedButtons
          options={[
            { name: "attendance", value: "present", label: "Ci sono" },
            { name: "attendance", value: "maybe", label: "Forse" },
            { name: "attendance", value: "absent", label: "No" },
          ]}
          selected={attendance}
          disabled={locked}
        />
      </form>

      {showTeam && entry ? (
        <form action={teamAction} className="shrink-0">
          <input type="hidden" name="match_id" value={matchId} />
          <input type="hidden" name="match_player_id" value={entry.matchPlayerId} />
          <SegmentedButtons
            options={[
              { name: "team", value: "a", label: "A", title: "Squadra A" },
              { name: "team", value: "", label: "–", title: "Nessuna squadra" },
              { name: "team", value: "b", label: "B", title: "Squadra B" },
            ]}
            selected={team ?? ""}
            disabled={locked}
          />
        </form>
      ) : null}
    </li>
  );
}

export function MatchAdminPanel({
  match,
  roster,
  profiles,
  result,
  defaultDateLocal,
}: {
  match: MatchRow;
  roster: RosterEntry[];
  profiles: Profile[];
  result: MatchResultRow | null;
  defaultDateLocal: string;
}) {
  const [updateState, updateAction] = useActionState(updateMatchAction, null);
  const [attendState, attendAction] = useActionState(adminSetAttendanceAction, null);
  const [teamState, teamAction] = useActionState(assignTeamAction, null);
  const [balanceState, balanceAction] = useActionState(autoBalanceTeamsAction, null);
  const [contribState, contribAction] = useActionState(saveContributionsAction, null);
  const [resultState, resultAction] = useActionState(saveResultAction, null);
  const [statusState, statusAction] = useActionState(setMatchStatusAction, null);

  const entryByProfile = new Map(roster.map((entry) => [entry.profileId, entry]));
  const playing = roster
    .filter((entry) => entry.attendance === "present")
    .sort((a, b) => a.nickname.localeCompare(b.nickname));

  const locked = match.status === "played";
  const teamsFormed = roster.some((entry) => entry.team !== null);

  const sortedProfiles = profiles
    .slice()
    .sort((a, b) => {
      const aPresent = entryByProfile.get(a.id)?.attendance === "present" ? 0 : 1;
      const bPresent = entryByProfile.get(b.id)?.attendance === "present" ? 0 : 1;
      if (aPresent !== bPresent) return aPresent - bPresent;
      return a.nickname.localeCompare(b.nickname);
    });

  return (
    <div className="space-y-6">
      {/* ---------- Iscritti e squadre ---------- */}
      <section className="rounded-card border border-rule bg-surface">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-4 py-3.5 md:px-5">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">Iscritti e squadre</h2>
            <p className="text-[12px] text-muted">
              {playing.length} presenti su {match.max_players} posti · {FORMAT_LABELS[match.format]}
            </p>
          </div>
          <StatusChip status={match.status} />
        </header>

        <div className="border-b border-rule px-4 py-3.5 md:px-5">
          <form action={balanceAction} className="flex flex-wrap items-center gap-3">
            <input type="hidden" name="match_id" value={match.id} />
            <SubmitButton variant="secondary" size="sm" pendingLabel="Calcolo…" disabled={locked}>
              <IconScale className="size-4" />
              Bilancia automaticamente
            </SubmitButton>
            <span className="text-[12px] text-muted">
              Portieri divisi, poi riempimento della squadra con meno giocatori. Usa le posizioni
              preferite per {FORMAT_SHORT[match.format]}.
            </span>
          </form>
          <div className="mt-3">
            <FormMessage state={balanceState} />
          </div>
        </div>

        <ul className="divide-y divide-rule/70">
          {sortedProfiles.map((profile) => (
            <RosterRow
              key={profile.id}
              profile={profile}
              entry={entryByProfile.get(profile.id)}
              matchId={match.id}
              format={match.format}
              attendanceAction={attendAction}
              teamAction={teamAction}
              locked={locked}
              showTeam
            />
          ))}
        </ul>

        <div className="space-y-3 px-4 py-3.5 md:px-5">
          <FormMessage state={attendState} />
          <FormMessage state={teamState} />

          <form action={statusAction} className="flex flex-wrap items-center gap-2 border-t border-rule pt-3.5">
            <input type="hidden" name="match_id" value={match.id} />
            {match.status !== "teams_set" ? (
              <SubmitButton
                name="status"
                value="teams_set"
                variant="secondary"
                size="sm"
                pendingLabel="Conferma…"
              >
                Conferma squadre
              </SubmitButton>
            ) : null}
            {match.status === "played" || match.status === "cancelled" ? (
              <SubmitButton name="status" value="scheduled" variant="secondary" size="sm" pendingLabel="Riapertura…">
                Riapri partita
              </SubmitButton>
            ) : (
              <SubmitButton name="status" value="cancelled" variant="danger" size="sm" pendingLabel="Annullamento…">
                Annulla partita
              </SubmitButton>
            )}
            {teamsFormed ? (
              <span className="text-[12px] text-muted">Squadre assegnate.</span>
            ) : (
              <span className="text-[12px] text-muted">Nessuna squadra ancora formata.</span>
            )}
          </form>

          <FormMessage state={statusState} />
        </div>
      </section>

      {/* ---------- Gol e assist ---------- */}
      <section className="rounded-card border border-rule bg-surface">
        <header className="border-b border-rule px-4 py-3.5 md:px-5">
          <h2 className="text-[15px] font-semibold text-ink">Gol e assist</h2>
          <p className="text-[12px] text-muted">Solo per i giocatori presenti.</p>
        </header>

        {playing.length > 0 ? (
          <form action={contribAction} className="divide-y divide-rule/70">
            <input type="hidden" name="match_id" value={match.id} />

            {playing.map((entry) => (
              <div key={entry.matchPlayerId} className="flex flex-wrap items-center gap-4 px-4 py-3 md:px-5">
                <input type="hidden" name="match_player_id" value={entry.matchPlayerId} />

                <span className="min-w-[120px] flex-1 truncate text-[13.5px] font-medium text-ink">
                  {entry.nickname}
                </span>

                <label className="flex items-center gap-2 text-[12.5px] text-muted">
                  Gol
                  <input
                    type="number"
                    name={`goals_${entry.matchPlayerId}`}
                    defaultValue={entry.goals}
                    min={0}
                    max={99}
                    inputMode="numeric"
                    className="num w-16 rounded-control border border-rule bg-paper px-2 py-1.5 text-center text-[13px] text-ink focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus/25"
                  />
                </label>

                <label className="flex items-center gap-2 text-[12.5px] text-muted">
                  Assist
                  <input
                    type="number"
                    name={`assists_${entry.matchPlayerId}`}
                    defaultValue={entry.assists}
                    min={0}
                    max={99}
                    inputMode="numeric"
                    className="num w-16 rounded-control border border-rule bg-paper px-2 py-1.5 text-center text-[13px] text-ink focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus/25"
                  />
                </label>
              </div>
            ))}

            <div className="space-y-3 px-4 py-3.5 md:px-5">
              <FormMessage state={contribState} />
              <SubmitButton size="sm" pendingLabel="Salvataggio…" disabled={locked}>
                Salva gol e assist
              </SubmitButton>
            </div>
          </form>
        ) : (
          <p className="px-4 py-4 text-[13px] text-muted md:px-5">
            Nessun giocatore presente: assegna prima le presenze.
          </p>
        )}
      </section>

      {/* ---------- Risultato ---------- */}
      <section className="rounded-card border border-rule bg-surface">
        <header className="border-b border-rule px-4 py-3.5 md:px-5">
          <h2 className="text-[15px] font-semibold text-ink">Risultato</h2>
          <p className="text-[12px] text-muted">
            Il punteggio alimenta classifica e statistiche. Chiudendo la partita non è più modificabile
            dagli utenti.
          </p>
        </header>

        <form action={resultAction} className="space-y-4 px-4 py-4 md:px-5">
          <input type="hidden" name="match_id" value={match.id} />

          <div className="flex flex-wrap items-end gap-5">
            <Field label={match.team_a_name} htmlFor="team_a_score" className="w-28">
              <Input
                id="team_a_score"
                name="team_a_score"
                type="number"
                min={0}
                max={99}
                inputMode="numeric"
                defaultValue={result?.team_a_score ?? ""}
                className="num text-center text-[18px]"
                required
              />
            </Field>

            <span className="pb-3 text-muted">–</span>

            <Field label={match.team_b_name} htmlFor="team_b_score" className="w-28">
              <Input
                id="team_b_score"
                name="team_b_score"
                type="number"
                min={0}
                max={99}
                inputMode="numeric"
                defaultValue={result?.team_b_score ?? ""}
                className="num text-center text-[18px]"
                required
              />
            </Field>

            <Field label="MVP" htmlFor="mvp_profile_id" className="min-w-[180px] flex-1">
              <Select id="mvp_profile_id" name="mvp_profile_id" defaultValue={result?.mvp_profile_id ?? ""}>
                <option value="">Nessuno</option>
                {playing.map((entry) => (
                  <option key={entry.profileId} value={entry.profileId}>
                    {entry.nickname}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Note sul risultato" htmlFor="result_notes">
            <Textarea
              id="result_notes"
              name="notes"
              maxLength={500}
              defaultValue={result?.notes ?? ""}
              placeholder="Es. partita equilibrata, due rigori"
            />
          </Field>

          <FormMessage state={resultState} />

          <div className="flex flex-wrap gap-2">
            <SubmitButton variant="secondary" pendingLabel="Salvataggio…">
              Salva bozza
            </SubmitButton>
            <SubmitButton name="close_match" value="1" pendingLabel="Chiusura…">
              Salva e chiudi partita
            </SubmitButton>
          </div>
        </form>
      </section>

      {/* ---------- Dati partita ---------- */}
      <section className="rounded-card border border-rule bg-surface">
        <header className="border-b border-rule px-4 py-3.5 md:px-5">
          <h2 className="text-[15px] font-semibold text-ink">Dati della partita</h2>
        </header>

        <form action={updateAction} className="space-y-4 px-4 py-4 md:px-5">
          <input type="hidden" name="match_id" value={match.id} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo di partita" htmlFor="edit_format">
              <Select id="edit_format" name="format" defaultValue={match.format}>
                {MATCH_FORMATS.map((item) => (
                  <option key={item} value={item}>
                    {FORMAT_LABELS[item]}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Data e ora" htmlFor="edit_match_date_local">
              <Input
                id="edit_match_date_local"
                name="match_date_local"
                type="datetime-local"
                defaultValue={defaultDateLocal}
                required
              />
            </Field>

            <Field label="Campo" htmlFor="edit_location">
              <Input id="edit_location" name="location" defaultValue={match.location} maxLength={120} required />
            </Field>

            <Field label="Posti disponibili" htmlFor="edit_max_players">
              <Input
                id="edit_max_players"
                name="max_players"
                type="number"
                min={2}
                max={40}
                inputMode="numeric"
                defaultValue={match.max_players}
                required
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Squadra A" htmlFor="edit_team_a_name">
                <Input
                  id="edit_team_a_name"
                  name="team_a_name"
                  defaultValue={match.team_a_name}
                  maxLength={40}
                  required
                />
              </Field>
              <Field label="Squadra B" htmlFor="edit_team_b_name">
                <Input
                  id="edit_team_b_name"
                  name="team_b_name"
                  defaultValue={match.team_b_name}
                  maxLength={40}
                  required
                />
              </Field>
            </div>
          </div>

          <Field label="Note" htmlFor="edit_notes">
            <Textarea id="edit_notes" name="notes" maxLength={500} defaultValue={match.notes ?? ""} />
          </Field>

          <FormMessage state={updateState} />

          <SubmitButton pendingLabel="Salvataggio…">Salva dati</SubmitButton>
        </form>
      </section>
    </div>
  );
}
