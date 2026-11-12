'use client';

import { UndoIcon } from '@/components/icons';
import { CheckIcon, DoseCard, type DoseCardAction } from '@/components/ui';
import { formatAgo, formatTime, isoDateInZone } from '@/lib/dates';
import { can } from '@/lib/roles';
import type { DaySlot, Group } from '@/lib/types';
import { canRecordNow, doseDetail, MAX_EARLY_RECORD_MS, medicationTitle, UI_STATUS, UNDO_WINDOW_MS } from './format';

interface DoseListProps {
  group: Group;
  userId: string;
  doses: DaySlot[];
  /** Instante de referencia (ms) para ventanas de registro y deshacer. */
  now: number;
  onGive: (slot: DaySlot) => void;
  onSkip: (slot: DaySlot) => void;
  onUndo: (slot: DaySlot) => void;
}

export function DoseList({ group, userId, doses, now, onGive, onSkip, onUndo }: DoseListProps) {
  const zone = group.timezone;
  const canRecord = can(group.myRole, 'recordDose');

  function actionsFor(slot: DaySlot): DoseCardAction[] {
    if (!canRecord) return [];
    if (slot.record) {
      const mine = slot.record.recordedBy.id === userId;
      const recent = now - new Date(slot.record.recordedAt).getTime() <= UNDO_WINDOW_MS;
      return (mine && recent) || can(group.myRole, 'undoOthersDose')
        ? [{ label: 'Deshacer', variant: 'neutral', icon: <UndoIcon size={20} />, onClick: () => onUndo(slot) }]
        : [];
    }
    const give: DoseCardAction = {
      label: 'Dada',
      variant: 'primary',
      icon: <CheckIcon width={22} height={22} />,
      onClick: () => onGive(slot),
    };
    const skip: DoseCardAction = { label: 'Omitir', variant: 'secondary', onClick: () => onSkip(slot) };
    if (slot.status === 'OVERDUE' || slot.status === 'DUE') return [give, skip];
    // Pendiente: se puede registrar desde 2 h antes («Dar ahora»), nunca antes.
    if (canRecordNow(slot, now)) return [{ ...give, label: 'Dar ahora', variant: 'secondary' }];
    return [];
  }

  function noteFor(slot: DaySlot): string | undefined {
    if (slot.status !== 'UPCOMING' || !canRecord || canRecordNow(slot, now)) return undefined;
    const scheduled = new Date(slot.scheduledFor);
    const from = new Date(scheduled.getTime() - MAX_EARLY_RECORD_MS);
    // Para una toma de mañana temprano, "desde las 22:00" sería ambiguo: se omite.
    const sameDay = isoDateInZone(from, zone) === isoDateInZone(scheduled, zone);
    return sameDay ? `Se puede registrar desde las ${formatTime(from, zone)}` : undefined;
  }

  return (
    <ol className="flex flex-col gap-3">
      {doses.map((slot) => (
        <li key={slot.key}>
          <DoseCard
            time={slot.timeOfDay}
            medication={medicationTitle(slot.medication)}
            instructions={doseDetail(slot)}
            status={UI_STATUS[slot.status]}
            registeredBy={
              slot.record
                ? {
                    name: slot.record.recordedBy.name,
                    time: formatTime(slot.record.recordedAt, zone),
                    // Omitida: la nota es el motivo. Dada: la nota opcional del diálogo de confirmación.
                    reason: slot.record.status === 'SKIPPED' ? (slot.record.notes ?? undefined) : undefined,
                    note: slot.record.status === 'GIVEN' ? (slot.record.notes ?? undefined) : undefined,
                  }
                : undefined
            }
            lateSince={slot.status === 'OVERDUE' ? formatAgo(new Date(slot.scheduledFor), new Date(now)) : undefined}
            note={noteFor(slot)}
            actions={actionsFor(slot)}
          />
        </li>
      ))}
    </ol>
  );
}
