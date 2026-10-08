import type { Attendance, MatchStatus, PlayerRole } from "@/types/domain";

const TZ = "Europe/Rome";

const dateTimeFormatter = new Intl.DateTimeFormat("it-IT", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TZ,
});

const dateFormatter = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: TZ,
});

const timeFormatter = new Intl.DateTimeFormat("it-IT", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TZ,
});

const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: TZ,
});

export function formatMatchDate(iso: string) {
  return capitalize(dateTimeFormatter.format(new Date(iso)).replace(",", " ·"));
}

export function formatDate(iso: string) {
  return capitalize(dateFormatter.format(new Date(iso)));
}

export function formatTime(iso: string) {
  return timeFormatter.format(new Date(iso));
}

function dayKey(date: Date) {
  return dayKeyFormatter.format(date);
}

/** Etichetta breve e umana: "Oggi", "Domani", "Ieri", altrimenti "gio 9 ott". */
export function humanDay(iso: string) {
  const target = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86_400_000);
  const tomorrow = new Date(today.getTime() + 86_400_000);

  if (dayKey(target) === dayKey(today)) return "Oggi";
  if (dayKey(target) === dayKey(tomorrow)) return "Domani";
  if (dayKey(target) === dayKey(yesterday)) return "Ieri";

  return capitalize(
    new Intl.DateTimeFormat("it-IT", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: TZ,
    }).format(target),
  );
}

/** Valore per <input type="datetime-local"> nel fuso Europe/Rome. */
export function toDatetimeLocalValue(iso: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TZ,
  }).formatToParts(new Date(iso));

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";

  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** "2026-10-04T20:30" (ora di Roma) -> ISO UTC. */
export function fromDatetimeLocalValue(value: string) {
  const [datePart, timePart] = value.split("T");
  if (!datePart || !timePart) return null;
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  if (!y || !m || !d || hh === undefined || mm === undefined) return null;

  // Roma è UTC+1 o UTC+2: ricaviamo l'offset reale dal formatter.
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const offset = getRomeOffsetMinutes(new Date(guess));
  return new Date(guess - offset * 60_000).toISOString();
}

function getRomeOffsetMinutes(date: Date) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUTC = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  );
  return Math.round((asUTC - date.getTime()) / 60_000);
}

export function ageFrom(birthDate: string | null) {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const diff = Date.now() - birth.getTime();
  return Math.floor(diff / (365.25 * 86_400_000));
}

export function initials(value: string) {
  return value
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export const ROLE_ORDER: PlayerRole[] = ["goalkeeper", "defender", "midfielder", "forward"];

export const ATTENDANCE_LABELS: Record<Attendance, string> = {
  present: "Ci sono",
  maybe: "Forse",
  absent: "Non ci sono",
};

export const STATUS_LABELS: Record<MatchStatus, string> = {
  scheduled: "Programmata",
  teams_set: "Squadre formate",
  played: "Giocata",
  cancelled: "Annullata",
};

export function isPast(iso: string) {
  return new Date(iso).getTime() < Date.now();
}

/** Default per il form di creazione partita: domani alle 21:00 (ora di Roma). */
export function defaultMatchDateLocal() {
  const tomorrowInRome = toDatetimeLocalValue(new Date(Date.now() + 86_400_000).toISOString());
  return `${tomorrowInRome.slice(0, 10)}T21:00`;
}
