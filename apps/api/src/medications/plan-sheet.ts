import { prescriptionStatus, type PrescriptionStatus } from '../alerts/alerts.calc';
import { dateOnlyToIso } from '../common/dates';
import { isInEffect } from '../doses/occurrences';

/** Hoja del plan para imprimir: todo viene armado y en texto para que el front solo lo muestre. */
export interface PlanSheet {
  date: string;
  patientName: string;
  groupName: string;
  notes: string | null;
  slots: { time: string; items: PlanSheetItem[] }[];
  prescriptions: PlanSheetPrescription[];
}

export interface PlanSheetItem {
  medication: string;
  dose: string;
  instructions: string | null;
  days: string;
  period: string | null;
}

export interface PlanSheetPrescription {
  description: string;
  medication: string | null;
  expiresAt: string;
  status: PrescriptionStatus;
  daysLeft: number;
}

export interface PlanSheetInput {
  today: string;
  group: { name: string; patientName: string; notes: string | null };
  medications: {
    name: string;
    strength: string | null;
    form: string | null;
    instructions: string | null;
    schedules: { timeOfDay: string; daysOfWeek: number[]; unitsPerDose: number; startDate: Date; endDate: Date | null }[];
  }[];
  prescriptions: {
    description: string;
    expiresAt: Date;
    medication: { name: string; strength: string | null } | null;
  }[];
}

const WEEKDAYS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

/**
 * Arma la hoja con los horarios vigentes hoy o que arrancan más adelante (los vencidos no van),
 * agrupados por hora y ordenados por nombre. Las recetas van por vencimiento.
 */
export function buildPlanSheet({ today, group, medications, prescriptions }: PlanSheetInput): PlanSheet {
  const byTime = new Map<string, PlanSheetItem[]>();

  for (const med of medications) {
    for (const s of med.schedules) {
      const startsLater = dateOnlyToIso(s.startDate) > today;
      if (!startsLater && !isInEffect(s, today)) continue;
      const items = byTime.get(s.timeOfDay) ?? [];
      items.push({
        medication: title(med.name, med.strength),
        dose: unitsLabel(s.unitsPerDose, med.form),
        instructions: med.instructions?.trim() || null,
        days: daysLabel(s.daysOfWeek),
        period: startsLater
          ? `Desde el ${shortDate(dateOnlyToIso(s.startDate))}`
          : s.endDate
            ? `Hasta el ${shortDate(dateOnlyToIso(s.endDate))}`
            : null,
      });
      byTime.set(s.timeOfDay, items);
    }
  }

  const slots = [...byTime.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, items]) => ({ time, items: items.sort((a, b) => a.medication.localeCompare(b.medication, 'es')) }));

  const sheetPrescriptions = prescriptions
    .map((p) => {
      const expiresAt = dateOnlyToIso(p.expiresAt);
      return {
        description: p.description,
        medication: p.medication ? title(p.medication.name, p.medication.strength) : null,
        expiresAt,
        ...prescriptionStatus(expiresAt, today),
      };
    })
    .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));

  return {
    date: today,
    patientName: group.patientName,
    groupName: group.name,
    notes: group.notes?.trim() || null,
    slots,
    prescriptions: sheetPrescriptions,
  };
}

function title(name: string, strength: string | null) {
  return strength ? `${name} ${strength}` : name;
}

/** "1 comprimido", "2 comprimidos", "0,5 comprimido". La forma se guarda en plural. */
export function unitsLabel(units: number, form: string | null): string {
  const amount = Number.isInteger(units) ? String(units) : String(units).replace('.', ',');
  const plural = form?.trim() || 'unidades';
  const singular = plural === 'unidades' ? 'unidad' : plural.replace(/s$/, '');
  return `${amount} ${units > 1 ? plural : singular}`;
}

/** [] o los 7 días → "Todos los días"; [1, 3, 5] → "Lunes, miércoles y viernes". */
export function daysLabel(daysOfWeek: number[]): string {
  const days = [...new Set(daysOfWeek)].sort((a, b) => a - b);
  if (days.length === 0 || days.length === 7) return 'Todos los días';
  if (days.join() === '1,2,3,4,5') return 'De lunes a viernes';
  if (days.join() === '6,7') return 'Sábados y domingos';
  const names = days.map((d) => WEEKDAYS[d - 1]);
  const text = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function shortDate(iso: string) {
  const [, month, day] = iso.split('-');
  return `${day}/${month}`;
}
