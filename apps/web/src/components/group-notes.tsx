import { InfoIcon } from './icons';

/**
 * Notas del grupo en el lugar del chip «Alérgica a la penicilina» del diseño: la API no tiene
 * un campo de alergias, así que se muestran las notas (CareGroup.notes) recortadas a dos líneas.
 */
export function GroupNotes({ notes, compact = false }: { notes: string | null; compact?: boolean }) {
  const text = notes?.trim();
  if (!text) return null;
  return (
    <span
      title={text}
      className={`inline-flex max-w-full items-start gap-1.5 self-start rounded-lg border-[1.5px] border-ink bg-surface px-2.5 py-1 font-bold ${
        compact ? 'text-nav' : 'text-sm'
      }`}
    >
      <InfoIcon size={compact ? 16 : 18} className="mt-0.5 flex-none" />
      <span className="line-clamp-2 whitespace-pre-line">{text}</span>
    </span>
  );
}
