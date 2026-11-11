import { DateTime } from 'luxon';
import { dateOnlyToIso } from '../common/dates';

export interface ScheduleRule {
  timeOfDay: string;
  daysOfWeek: number[];
  startDate: Date;
  endDate: Date | null;
}

/** Indica si el día local `isoDate` está dentro de la vigencia del horario. */
export function isInEffect(schedule: ScheduleRule, isoDate: string): boolean {
  if (isoDate < dateOnlyToIso(schedule.startDate)) return false;
  return !schedule.endDate || isoDate <= dateOnlyToIso(schedule.endDate);
}

/** Indica si el horario corresponde al día local `isoDate` (vigencia y día de la semana). */
export function occursOn(schedule: ScheduleRule, isoDate: string): boolean {
  if (!isInEffect(schedule, isoDate)) return false;
  if (schedule.daysOfWeek.length === 0) return true;
  const weekday = DateTime.fromISO(isoDate, { zone: 'utc' }).weekday;
  return schedule.daysOfWeek.includes(weekday);
}

/** Instante UTC de la toma del día local `isoDate` a la hora `timeOfDay` en `zone`. */
export function occurrenceInstant(timeOfDay: string, isoDate: string, zone: string): Date {
  return DateTime.fromISO(`${isoDate}T${timeOfDay}`, { zone }).toUTC().toJSDate();
}

/** Comprueba que `scheduledFor` sea exactamente una toma programada del horario. */
export function isOccurrence(schedule: ScheduleRule, scheduledFor: Date, zone: string): boolean {
  const isoDate = DateTime.fromJSDate(scheduledFor, { zone }).toISODate();
  if (!isoDate || !occursOn(schedule, isoDate)) return false;
  return occurrenceInstant(schedule.timeOfDay, isoDate, zone).getTime() === scheduledFor.getTime();
}

/** Unidades promedio por día que consume el horario (para estimar cobertura de stock). */
export function averageDailyUnits(schedule: ScheduleRule & { unitsPerDose: number }): number {
  const daysPerWeek = schedule.daysOfWeek.length || 7;
  return (schedule.unitsPerDose * daysPerWeek) / 7;
}
