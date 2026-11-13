import type { Group } from '@/lib/types';
import { InfoIcon, PhoneIcon } from './icons';

type PatientFields = Pick<Group, 'patientAllergies' | 'notes'>;

/**
 * Chip de seguridad del o la paciente (el «Alérgica a la penicilina» del diseño). Las alergias
 * se muestran completas, sin recortar; si no hay, quedan las notas del grupo recortadas a dos líneas.
 */
export function PatientAlerts({ group, compact = false }: { group: PatientFields; compact?: boolean }) {
  const allergies = group.patientAllergies?.trim();
  const notes = group.notes?.trim();
  if (!allergies && !notes) return null;
  return (
    <span
      title={allergies ? undefined : notes}
      className={`inline-flex max-w-full items-start gap-1.5 self-start rounded-lg border-[1.5px] border-ink bg-white px-2.5 py-1 font-bold ${
        compact ? 'text-nav' : 'text-sm'
      }`}
    >
      <InfoIcon size={compact ? 16 : 18} className="mt-0.5 flex-none" />
      {allergies ? (
        <span className="whitespace-pre-line">Alergias: {allergies}</span>
      ) : (
        <span className="line-clamp-2 whitespace-pre-line">{notes}</span>
      )}
    </span>
  );
}

/** El teléfono sin espacios ni guiones, para el link `tel:`. */
export function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

/** «Llamar a Dra. Pérez»: un toque desde el celular. Sin teléfono cargado no muestra nada. */
export function DoctorCallLink({ group }: { group: Pick<Group, 'doctorName' | 'doctorPhone'> }) {
  const phone = group.doctorPhone?.trim();
  if (!phone) return null;
  const who = group.doctorName?.trim() || 'al médico';
  return (
    <a
      href={telHref(phone)}
      className="inline-flex min-h-touch items-center gap-1.5 self-start text-sm font-bold no-underline"
    >
      <PhoneIcon size={18} className="flex-none" />
      <span>
        Llamar a {who} <span className="font-normal text-muted">· {phone}</span>
      </span>
    </a>
  );
}
