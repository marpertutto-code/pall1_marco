import { capitalize } from "@/lib/format";

/**
 * Settimane reali (lunedì → domenica), calcolate sul fuso italiano.
 *
 * Le chiavi data sono stringhe `YYYY-MM-DD` già nel calendario di Roma: per
 * formattarle si costruisce una data a mezzogiorno UTC e si formatta in UTC,
 * così nessun cambio di fuso o di ora legale può spostare il giorno.
 */

const TZ = "Europe/Rome";

function dateFromKey(key: string) {
  return new Date(`${key}T12:00:00Z`);
}

function format(key: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("it-IT", { ...options, timeZone: "UTC" }).format(dateFromKey(key));
}

/** Data di Roma (YYYY-MM-DD) di un istante. */
export function romeDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: TZ,
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "01";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Lunedì della settimana che contiene la data. */
export function startOfWeek(date: Date = new Date()): string {
  const key = romeDateKey(date);
  const [year, month, day] = key.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  const shift = (utc.getUTCDay() + 6) % 7; // 0 = lunedì
  utc.setUTCDate(utc.getUTCDate() - shift);
  return utc.toISOString().slice(0, 10);
}

export function addDays(key: string, days: number): string {
  const date = dateFromKey(key);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** I sette giorni della settimana, da lunedì a domenica. */
export function weekDays(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

/**
 * I giorni della settimana utili ai sondaggi: da lunedì a sabato.
 * La domenica non si gioca, quindi non compare fra le opzioni.
 */
export function pollDays(weekStart: string): string[] {
  return Array.from({ length: 6 }, (_, index) => addDays(weekStart, index));
}

export function endOfWeek(weekStart: string): string {
  return addDays(weekStart, 6);
}

/** Giorno della settimana di una chiave data: 0 = domenica, 6 = sabato. */
export function weekdayIndex(key: string): number {
  return dateFromKey(key).getUTCDay();
}

/** true se la chiave data cade di domenica. */
export function isSunday(key: string): boolean {
  return weekdayIndex(key) === 0;
}

/** "Lunedì" */
export function weekdayName(key: string): string {
  return capitalize(format(key, { weekday: "long" }));
}

/** "lun 5 ott" */
export function dayLabel(key: string): string {
  return capitalize(format(key, { weekday: "short", day: "numeric", month: "short" }));
}

/** "5 ottobre 2026" */
export function longDate(key: string): string {
  return capitalize(format(key, { day: "numeric", month: "long", year: "numeric" }));
}

/**
 * "5–11 ottobre 2026" se la settimana sta in un mese solo,
 * "28 settembre – 4 ottobre 2026" quando a cavallo.
 */
export function weekRangeLabel(weekStart: string): string {
  const weekEnd = endOfWeek(weekStart);
  const sameMonth = weekStart.slice(0, 7) === weekEnd.slice(0, 7);

  if (sameMonth) {
    const first = format(weekStart, { day: "numeric" });
    const rest = format(weekEnd, { day: "numeric", month: "long", year: "numeric" });
    return `${first}–${rest}`;
  }

  const first = format(weekStart, { day: "numeric", month: "long" });
  const rest = format(weekEnd, { day: "numeric", month: "long", year: "numeric" });
  return `${first} – ${rest}`;
}

/** "5–11 ott" — per gli spazi stretti. */
export function weekRangeShort(weekStart: string): string {
  const weekEnd = endOfWeek(weekStart);
  const sameMonth = weekStart.slice(0, 7) === weekEnd.slice(0, 7);
  return sameMonth
    ? `${format(weekStart, { day: "numeric" })}–${format(weekEnd, { day: "numeric", month: "short" })}`
    : `${format(weekStart, { day: "numeric", month: "short" })} – ${format(weekEnd, { day: "numeric", month: "short" })}`;
}

/** "Questa settimana" · "La prossima" · "Settimana scorsa" · altrimenti l'intervallo. */
export function relativeWeekLabel(weekStart: string, today: Date = new Date()): string {
  const current = startOfWeek(today);
  if (weekStart === current) return "Questa settimana";
  if (weekStart === addDays(current, 7)) return "La prossima settimana";
  if (weekStart === addDays(current, -7)) return "Settimana scorsa";
  if (weekStart === addDays(current, 14)) return "Tra due settimane";
  return `Settimana ${weekRangeLabel(weekStart)}`;
}


/** true se la chiave data è un lunedì valido (cioè un inizio settimana). */
export function isWeekStart(key: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  return startOfWeek(dateFromKey(key)) === key;
}
