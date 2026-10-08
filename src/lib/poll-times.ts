import { isSunday } from "@/lib/week";

/**
 * Orari proposti nei sottosondaggi, per giorno della settimana.
 *
 * Feriali (lun–ven): 18:00 → 21:00. Sabato: 15:30 → 18:30. Passo di 30 minuti,
 * estremi inclusi. La domenica non si gioca e non ha orari.
 */

export type TimeSlot = {
  /** Solo l'ora, es. "18:30". */
  label: string;
  /** `datetime-local` del giorno e dell'ora, es. "2026-10-05T18:30". */
  startsAt: string;
};

type Window = { from: number; to: number };

const STEP_MINUTES = 30;

/** Finestra oraria in minuti dalla mezzanotte, per indice giorno (0 = domenica). */
const WINDOWS: Record<number, Window> = {
  1: { from: 18 * 60, to: 21 * 60 }, // lunedì
  2: { from: 18 * 60, to: 21 * 60 }, // martedì
  3: { from: 18 * 60, to: 21 * 60 }, // mercoledì
  4: { from: 18 * 60, to: 21 * 60 }, // giovedì
  5: { from: 18 * 60, to: 21 * 60 }, // venerdì
  6: { from: 15 * 60 + 30, to: 18 * 60 + 30 }, // sabato
};

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function windowFor(dayKey: string): Window | null {
  if (isSunday(dayKey)) return null;
  const [year, month, day] = dayKey.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return WINDOWS[weekday] ?? null;
}

/** Gli orari proposta per un giorno (`YYYY-MM-DD`). Domenica: nessuno. */
export function timeSlotsForDay(dayKey: string): TimeSlot[] {
  const window = windowFor(dayKey);
  if (!window) return [];

  const slots: TimeSlot[] = [];
  for (let minutes = window.from; minutes <= window.to; minutes += STEP_MINUTES) {
    const label = formatMinutes(minutes);
    slots.push({ label, startsAt: `${dayKey}T${label}` });
  }
  return slots;
}
