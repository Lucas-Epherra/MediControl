import type { DoseStatus } from '@prisma/client';

/** Minutos antes de la hora programada en que la toma pasa a "para dar". */
export const DUE_WINDOW_BEFORE_MIN = 30;
/** Minutos después de la hora programada en que la toma pasa a "atrasada". */
export const OVERDUE_AFTER_MIN = 60;
/** Cuánto antes de la hora se permite registrar una toma. */
export const MAX_EARLY_RECORD_MIN = 120;
/** Ventana en la que quien registró una toma puede deshacerla. */
export const UNDO_WINDOW_HOURS = 24;

export type DoseSlotStatus = DoseStatus | 'UPCOMING' | 'DUE' | 'OVERDUE';

const MINUTE = 60_000;

export function slotStatus(
  scheduledFor: Date,
  now: Date,
  recorded?: { status: DoseStatus } | null,
): DoseSlotStatus {
  if (recorded) return recorded.status;
  const diffMin = (now.getTime() - scheduledFor.getTime()) / MINUTE;
  if (diffMin < -DUE_WINDOW_BEFORE_MIN) return 'UPCOMING';
  if (diffMin <= OVERDUE_AFTER_MIN) return 'DUE';
  return 'OVERDUE';
}

export function isTooEarlyToRecord(scheduledFor: Date, now: Date): boolean {
  return scheduledFor.getTime() - now.getTime() > MAX_EARLY_RECORD_MIN * MINUTE;
}
