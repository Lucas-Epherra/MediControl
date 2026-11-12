import { DateTime } from 'luxon';
import { formatTimeInZone } from '../common/dates';
import type { DoseSlotStatus } from './dose-status';

/** Lo mínimo de una toma del día que necesita el resumen. */
export interface SummaryDose {
  timeOfDay: string;
  status: DoseSlotStatus;
  medication: { name: string; strength: string | null };
  record: { notes: string | null; recordedAt: Date; recordedBy: { name: string } } | null;
}

export interface SummaryInput {
  patientName: string;
  date: string;
  timezone: string;
  doses: SummaryDose[];
  /** Mensajes de los avisos vigentes; solo se pasan cuando el resumen es de hoy. */
  alerts: string[];
}

const SECTIONS: { status: DoseSlotStatus; title: string }[] = [
  { status: 'OVERDUE', title: 'Atrasadas' },
  { status: 'DUE', title: 'Toca ahora' },
  { status: 'GIVEN', title: 'Dadas' },
  { status: 'SKIPPED', title: 'Omitidas' },
  { status: 'UPCOMING', title: 'Pendientes' },
];

/**
 * Texto plano para compartir por WhatsApp: títulos en negrita (`*…*`) y viñetas con guion,
 * sin emojis. Las horas van en la zona del grupo.
 */
export function formatDaySummary({ patientName, date, timezone, doses, alerts }: SummaryInput): string {
  const day = DateTime.fromISO(date, { zone: timezone }).setLocale('es-AR').toFormat("cccc d 'de' LLLL");
  const lines = [`*MediControl · ${patientName}*`, capitalize(day), ''];

  if (doses.length === 0) {
    lines.push('No hay tomas programadas para este día.');
  } else {
    for (const { status, title } of SECTIONS) {
      const group = doses.filter((d) => d.status === status);
      if (group.length === 0) continue;
      lines.push(`*${title} (${group.length})*`);
      for (const dose of group) lines.push(`- ${doseLine(dose, timezone)}`);
      lines.push('');
    }
  }

  if (alerts.length > 0) {
    if (lines[lines.length - 1] !== '') lines.push('');
    lines.push('*Avisos*');
    for (const alert of alerts) lines.push(`- ${alert}`);
  }

  return lines.join('\n').trimEnd();
}

function doseLine(dose: SummaryDose, zone: string) {
  const med = dose.medication.strength ? `${dose.medication.name} ${dose.medication.strength}` : dose.medication.name;
  let line = `${dose.timeOfDay} ${med}`;
  const record = dose.record;
  if (record && dose.status === 'GIVEN') {
    line += ` (${record.recordedBy.name}, ${formatTimeInZone(record.recordedAt, zone)})`;
  } else if (record && dose.status === 'SKIPPED') {
    line += ` (${record.recordedBy.name})`;
    if (record.notes) line += `: ${record.notes}`;
  }
  return line;
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
