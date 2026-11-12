import type { DoseStatus } from '@/components/ui';
import type { DaySlot, DoseSlotStatus, MedicationSummary } from '@/lib/types';

export const UI_STATUS: Record<DoseSlotStatus, DoseStatus> = {
  GIVEN: 'dada',
  SKIPPED: 'omitida',
  DUE: 'ahora',
  UPCOMING: 'pendiente',
  OVERDUE: 'atrasada',
};

/** Cuánto antes de la hora se puede registrar (MAX_EARLY_RECORD_MIN de la API). */
export const MAX_EARLY_RECORD_MS = 120 * 60_000;
/** Ventana para deshacer una toma propia (UNDO_WINDOW_HOURS de la API). */
export const UNDO_WINDOW_MS = 24 * 3_600_000;

export function medicationTitle(medication: MedicationSummary): string {
  return [medication.name, medication.strength].filter(Boolean).join(' ');
}

/** "1 comprimido", "2 comprimidos", "0,5 comprimido". La forma se guarda en plural. */
export function unitsLabel(units: number, form: string | null): string {
  const amount = Number.isInteger(units) ? String(units) : String(units).replace('.', ',');
  const plural = form?.trim() || 'unidades';
  const singular = plural === 'unidades' ? 'unidad' : plural.replace(/s$/, '');
  return `${amount} ${units > 1 ? plural : singular}`;
}

export function doseDetail(slot: DaySlot): string {
  return [unitsLabel(slot.unitsPerDose, slot.medication.form), slot.medication.instructions]
    .filter(Boolean)
    .join(' · ');
}

export function canRecordNow(slot: DaySlot, now: number = Date.now()): boolean {
  return new Date(slot.scheduledFor).getTime() - now <= MAX_EARLY_RECORD_MS;
}
