'use client';

import { ChevronDownIcon, UndoIcon } from '@/components/icons';
import { Button, CheckIcon, DoseCard, SkipIcon, type DoseCardAction } from '@/components/ui';
import { formatAgo, formatTime, isoDateInZone } from '@/lib/dates';
import { can } from '@/lib/roles';
import type { DaySlot, Group } from '@/lib/types';
import {
  canRecordNow,
  doseDetail,
  MAX_EARLY_RECORD_MS,
  medicationTitle,
  UI_STATUS,
  UNDO_WINDOW_MS,
  unitsLabel,
} from './format';

/** Desde cuánto atraso se sugiere consultar antes de dar la toma. */
const LONG_OVERDUE_MS = 4 * 3_600_000;

interface DoseListProps {
  group: Group;
  userId: string;
  doses: DaySlot[];
  /** Instante de referencia (ms) para ventanas de registro y deshacer. */
  now: number;
  /** Si el día mostrado es hoy, antes o después: cambia qué secciones se ven. */
  when: 'past' | 'today' | 'future';
  onGive: (slot: DaySlot) => void;
  onSkip: (slot: DaySlot) => void;
  onUndo: (slot: DaySlot) => void;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Tomas del día ordenadas por urgencia, no por hora: primero lo que pide acción, después lo que
 * viene y al final, compacto y plegable, lo que ya se registró.
 */
export function DoseList({ group, userId, doses, now, when, onGive, onSkip, onUndo }: DoseListProps) {
  const zone = group.timezone;
  const canRecord = can(group.myRole, 'recordDose');

  const pending = doses.filter((d) => !d.record);
  const recorded = doses.filter((d) => d.record);
  const actNow = pending.filter((d) => d.status === 'OVERDUE' || d.status === 'DUE');
  // En un día futuro todo lo pendiente es agenda (incluso una toma de la madrugada que ya «toca»).
  const later = when === 'future' ? pending : pending.filter((d) => d.status === 'UPCOMING');

  function undoAllowed(slot: DaySlot) {
    if (!canRecord || !slot.record) return false;
    const mine = slot.record.recordedBy.id === userId;
    const recent = now - new Date(slot.record.recordedAt).getTime() <= UNDO_WINDOW_MS;
    return (mine && recent) || can(group.myRole, 'undoOthersDose');
  }

  function actionsFor(slot: DaySlot): DoseCardAction[] {
    if (!canRecord) return [];
    const give: DoseCardAction = {
      label: 'Registrar como dada',
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
    if (slot.status === 'OVERDUE') {
      // No damos indicaciones médicas: solo se avisa que pasó mucho y se deja la decisión a la familia.
      const late = now - new Date(slot.scheduledFor).getTime();
      return late >= LONG_OVERDUE_MS && canRecord
        ? 'Pasó mucho tiempo. Si tenés dudas, consultá antes de darla, o marcala como omitida.'
        : undefined;
    }
    if (slot.status !== 'UPCOMING' || !canRecord || canRecordNow(slot, now)) return undefined;
    const scheduled = new Date(slot.scheduledFor);
    const from = new Date(scheduled.getTime() - MAX_EARLY_RECORD_MS);
    // Para una toma de mañana temprano, "desde las 22:00" sería ambiguo: se omite.
    const sameDay = isoDateInZone(from, zone) === isoDateInZone(scheduled, zone);
    return sameDay ? `Se puede registrar desde las ${formatTime(from, zone)}` : undefined;
  }

  function stockFor({ medication }: DaySlot) {
    // Una API anterior no manda el stock: no se muestra nada.
    if (typeof medication.stock !== 'number') return undefined;
    const left = Math.max(0, medication.stock);
    if (left === 0) return { text: 'Sin stock', low: true };
    const text = `${left === 1 ? 'Queda' : 'Quedan'} ${unitsLabel(left, medication.form)}`;
    return medication.lowStock ? { text: `Stock bajo · ${text.toLowerCase()}`, low: true } : { text, low: false };
  }

  function cards(slots: DaySlot[]) {
    return (
      <ol className="flex flex-col gap-3">
        {slots.map((slot) => (
          <li key={slot.key}>
            <DoseCard
              time={slot.timeOfDay}
              medication={medicationTitle(slot.medication)}
              instructions={doseDetail(slot)}
              status={UI_STATUS[slot.status]}
              lateSince={slot.status === 'OVERDUE' ? formatAgo(new Date(slot.scheduledFor), new Date(now)) : undefined}
              note={noteFor(slot)}
              stock={stockFor(slot)}
              actions={actionsFor(slot)}
            />
          </li>
        ))}
      </ol>
    );
  }

  const nextUp = later[0];
  const given = recorded.filter((d) => d.record?.status === 'GIVEN').length;
  const skipped = recorded.length - given;
  const recordedSummary = [
    given ? plural(given, 'dada', 'dadas') : null,
    skipped ? plural(skipped, 'omitida', 'omitidas') : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="flex flex-col gap-6">
      {when === 'today' && (
        <Section id="ahora-h" title="Ahora">
          {actNow.length > 0 ? (
            cards(actNow)
          ) : (
            <p className="rounded-card border border-line bg-white p-4">
              <b>Nada para dar ahora.</b>{' '}
              {nextUp ? (
                <span className="text-muted">
                  La próxima es a las {nextUp.timeOfDay}: {medicationTitle(nextUp.medication)}.
                </span>
              ) : (
                <span className="text-muted">No quedan tomas por hoy.</span>
              )}
            </p>
          )}
        </Section>
      )}

      {when === 'past' && actNow.length > 0 && (
        <Section id="sin-registrar-h" title="Sin registrar">
          {cards(actNow)}
        </Section>
      )}

      {later.length > 0 && (
        <Section id="despues-h" title={when === 'today' ? 'Más tarde hoy' : 'Agenda del día'}>
          {cards(later)}
        </Section>
      )}

      {recorded.length > 0 && (
        // Plegado mientras quede algo por hacer hoy; en un día pasado o ya completo, abierto.
        <details open={when !== 'today' || pending.length === 0} className="group flex flex-col">
          <summary className="flex min-h-touch cursor-pointer list-none items-center justify-between gap-3 rounded-btn [&::-webkit-details-marker]:hidden">
            <h2 className="text-h2 font-bold">
              {when === 'today' ? 'Ya registradas' : 'Registradas'}{' '}
              <span className="text-base font-normal text-muted">· {recordedSummary}</span>
            </h2>
            <ChevronDownIcon size={24} className="flex-none text-muted transition-transform group-open:rotate-180" />
          </summary>
          <ol className="mt-2.5 flex flex-col divide-y divide-line-soft rounded-card border border-line bg-white">
            {recorded.map((slot) => (
              <RecordedRow
                key={slot.key}
                slot={slot}
                zone={zone}
                canUndo={undoAllowed(slot)}
                onUndo={() => onUndo(slot)}
              />
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2.5">
      <h2 id={id} className="text-h2 font-bold">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Toma ya registrada: ya no pide acción, alcanza con una fila (hora, quién, cuándo y Deshacer). */
function RecordedRow({
  slot,
  zone,
  canUndo,
  onUndo,
}: {
  slot: DaySlot;
  zone: string;
  canUndo: boolean;
  onUndo: () => void;
}) {
  const record = slot.record!;
  const skipped = record.status === 'SKIPPED';
  const Icon = skipped ? SkipIcon : CheckIcon;
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
      <span className="w-[4.5rem] flex-none text-card font-bold tabular-nums">{slot.timeOfDay}</span>
      <div className="flex min-w-[12rem] flex-1 flex-col">
        <span className="font-bold">{medicationTitle(slot.medication)}</span>
        <span className={`flex items-center gap-1.5 text-sm font-bold ${skipped ? 'text-omitida' : 'text-dada'}`}>
          <Icon width={18} height={18} className="flex-none" />
          {skipped ? 'Omitida' : 'Dada'} por {record.recordedBy.name} · {formatTime(record.recordedAt, zone)}
        </span>
        {record.notes && (
          <span className="whitespace-pre-line break-words text-sm text-muted">
            {skipped ? 'Motivo' : 'Nota'}: {record.notes}
          </span>
        )}
      </div>
      {canUndo && (
        <Button variant="neutral" icon={<UndoIcon size={20} />} onClick={onUndo}>
          Deshacer
        </Button>
      )}
    </li>
  );
}
