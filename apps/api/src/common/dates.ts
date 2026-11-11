import { DateTime, IANAZone } from 'luxon';

export const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_OF_DAY_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidTimezone(zone: string): boolean {
  return IANAZone.isValidZone(zone);
}

/** Columnas @db.Date: Prisma las devuelve como medianoche UTC. */
export function dateOnlyToIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function isoToDateOnly(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

export function todayInZone(zone: string, now: Date = new Date()): string {
  return DateTime.fromJSDate(now, { zone }).toISODate()!;
}

/** Inicio (inclusive) y fin (exclusivo) del día local, como instantes UTC. */
export function dayBounds(isoDate: string, zone: string): { start: Date; end: Date } {
  const start = DateTime.fromISO(isoDate, { zone }).startOf('day');
  return { start: start.toJSDate(), end: start.plus({ days: 1 }).toJSDate() };
}

export function formatTimeInZone(date: Date, zone: string): string {
  return DateTime.fromJSDate(date, { zone }).toFormat('HH:mm');
}

/** Días calendario de `fromIso` a `toIso` (negativo si `toIso` es anterior). */
export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round(
    DateTime.fromISO(toIso, { zone: 'utc' }).diff(DateTime.fromISO(fromIso, { zone: 'utc' }), 'days').days,
  );
}
