'use client';

import { useId, useState, type FormEvent } from 'react';
import { FormAlert } from '@/components/forms';
import { InfoIcon, SpinnerIcon } from '@/components/icons';
import { Button, Modal, StatusBadge, Stepper } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { formatTime } from '@/lib/dates';
import { useMedication, useRecordDose, useRestock } from '@/lib/queries';
import type { DaySlot, DoseRecord } from '@/lib/types';
import { doseDetail, medicationTitle, unitsLabel } from './format';

const textareaClass =
  'box-border w-full rounded-btn border-2 border-muted px-3.5 py-3 font-sans text-base text-ink focus-visible:border-primary';

export interface Conflict {
  message: string;
  slot: DaySlot;
  existing?: DoseRecord;
}

function conflictFrom(error: unknown, slot: DaySlot): Conflict | null {
  if (!(error instanceof ApiError) || !error.isConflict) return null;
  return { message: error.message, slot, existing: error.body.existing as DoseRecord | undefined };
}

interface RecordDialogProps {
  groupId: string;
  slot: DaySlot | null;
  onClose: () => void;
  onConflict: (conflict: Conflict) => void;
  onDone: (message: string) => void;
}

/** Confirmación antes de registrar una toma como dada (cambio pedido sobre el diseño de Lolo). */
export function GiveDialog({ groupId, slot, onClose, onConflict, onDone }: RecordDialogProps) {
  const record = useRecordDose(groupId);
  const noteId = useId();
  const [note, setNote] = useState('');

  function close() {
    setNote('');
    record.reset();
    onClose();
  }

  function confirm(event: FormEvent) {
    event.preventDefault();
    if (!slot) return;
    record.mutate(
      { scheduleId: slot.scheduleId, scheduledFor: slot.scheduledFor, status: 'GIVEN', notes: note.trim() || undefined },
      {
        onSuccess: () => {
          onDone(`Registrada: ${medicationTitle(slot.medication)} de las ${slot.timeOfDay}.`);
          close();
        },
        onError: (error) => {
          const conflict = conflictFrom(error, slot);
          if (conflict) {
            close();
            onConflict(conflict);
          }
        },
      },
    );
  }

  return (
    <Modal
      open={!!slot}
      onOpenChange={(open) => !open && close()}
      title="¿Diste esta toma?"
      description={slot ? `${medicationTitle(slot.medication)} · ${doseDetail(slot)} · ${slot.timeOfDay}` : undefined}
    >
      <form onSubmit={confirm} className="flex w-full flex-col gap-3 text-left">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={noteId} className="font-bold">
            Nota <span className="font-normal text-muted">(opcional)</span>
          </label>
          <textarea
            id={noteId}
            rows={2}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Por ejemplo: con el desayuno"
            className={textareaClass}
          />
        </div>
        {record.isError && !conflictFrom(record.error, slot!) && <FormAlert>{record.error.message}</FormAlert>}
        <Button
          type="submit"
          disabled={record.isPending}
          icon={record.isPending ? <SpinnerIcon size={22} /> : undefined}
        >
          {record.isPending ? 'Registrando…' : 'Sí, la di'}
        </Button>
        <Button type="button" variant="secondary" onClick={close}>
          Cancelar
        </Button>
      </form>
    </Modal>
  );
}

const SKIP_REASONS = ['Se sintió mal', 'No quiso tomarla', 'No hay medicación', 'Indicación médica', 'Otro motivo'];

export function SkipDialog({ groupId, slot, onClose, onConflict, onDone }: RecordDialogProps) {
  const record = useRecordDose(groupId);
  const noteId = useId();
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const needsNote = reason === 'Otro motivo' && !note.trim();

  function close() {
    setReason('');
    setNote('');
    record.reset();
    onClose();
  }

  function confirm(event: FormEvent) {
    event.preventDefault();
    if (!slot || !reason || needsNote) return;
    const notes = reason === 'Otro motivo' ? note.trim() : note.trim() ? `${reason}: ${note.trim()}` : reason;
    record.mutate(
      { scheduleId: slot.scheduleId, scheduledFor: slot.scheduledFor, status: 'SKIPPED', notes },
      {
        onSuccess: () => {
          onDone(`Omitida: ${medicationTitle(slot.medication)} de las ${slot.timeOfDay}.`);
          close();
        },
        onError: (error) => {
          const conflict = conflictFrom(error, slot);
          if (conflict) {
            close();
            onConflict(conflict);
          }
        },
      },
    );
  }

  return (
    <Modal
      open={!!slot}
      onOpenChange={(open) => !open && close()}
      title="Omitir toma"
      description={slot ? `${medicationTitle(slot.medication)} · ${slot.timeOfDay}` : undefined}
    >
      <form onSubmit={confirm} className="flex w-full flex-col gap-3 text-left">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-bold">¿Por qué no se da? (obligatorio)</legend>
          {SKIP_REASONS.map((option) => {
            const checked = reason === option;
            return (
              <label
                key={option}
                className={`flex min-h-[52px] cursor-pointer items-center gap-3 rounded-btn px-3.5 ${
                  checked ? 'border-2 border-primary bg-primary-tint' : 'border-[1.5px] border-line bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="motivo"
                  value={option}
                  checked={checked}
                  onChange={() => setReason(option)}
                  className="h-[22px] w-[22px] accent-primary"
                />
                {option}
              </label>
            );
          })}
        </fieldset>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={noteId} className="font-bold">
            {reason === 'Otro motivo' ? 'Contá el motivo' : 'Nota'}{' '}
            {reason !== 'Otro motivo' && <span className="font-normal text-muted">(opcional)</span>}
          </label>
          <textarea
            id={noteId}
            rows={2}
            maxLength={450}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={textareaClass}
          />
        </div>
        {record.isError && !conflictFrom(record.error, slot!) && <FormAlert>{record.error.message}</FormAlert>}
        <Button
          type="submit"
          disabled={!reason || needsNote || record.isPending}
          icon={record.isPending ? <SpinnerIcon size={22} /> : undefined}
        >
          {record.isPending ? 'Guardando…' : 'Confirmar omisión'}
        </Button>
        <Button type="button" variant="secondary" onClick={close}>
          Cancelar
        </Button>
      </form>
    </Modal>
  );
}

/** 409: alguien ya registró esta toma. Se explica quién y cuándo; no hubo doble dosis. */
export function ConflictDialog({
  conflict,
  timeZone,
  onClose,
}: {
  conflict: Conflict | null;
  timeZone: string;
  onClose: () => void;
}) {
  const existing = conflict?.existing;
  const given = existing?.status !== 'SKIPPED';
  return (
    <Modal open={!!conflict} onOpenChange={(open) => !open && onClose()} title={conflict?.message ?? ''} showCloseButton={false}>
      {conflict && (
        <div className="flex w-full flex-col gap-3.5 text-left">
          <span className="flex h-[52px] w-[52px] items-center justify-center self-center rounded-full bg-primary-tint text-primary">
            <InfoIcon size={28} />
          </span>
          <div className="flex flex-col items-start gap-1.5 rounded-[14px] bg-canvas p-3.5">
            <div className="flex w-full items-center justify-between gap-3">
              <b className="text-[20px]">{medicationTitle(conflict.slot.medication)}</b>
              <span className="font-bold tabular-nums">{conflict.slot.timeOfDay}</span>
            </div>
            {existing && (
              <StatusBadge
                status={given ? 'dada' : 'omitida'}
                text={`${given ? 'Dada' : 'Omitida'} · por ${existing.recordedBy.name} · ${formatTime(existing.recordedAt, timeZone)}`}
              />
            )}
          </div>
          <p className="text-muted">
            {given
              ? 'No se registró de nuevo, así que no hay riesgo de doble dosis. La lista ya está actualizada.'
              : 'No se registró de nuevo. La lista ya está actualizada.'}
          </p>
          <Button onClick={onClose}>Entendido</Button>
        </div>
      )}
    </Modal>
  );
}

export function RestockDialog({
  groupId,
  medicationId,
  onClose,
  onDone,
}: {
  groupId: string;
  medicationId: string | null;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const medication = useMedication(groupId, medicationId ?? undefined);
  const restock = useRestock(groupId);
  const [quantity, setQuantity] = useState(30);
  const med = medication.data;
  const form = med?.form ?? 'unidades';

  function close() {
    setQuantity(30);
    restock.reset();
    onClose();
  }

  function confirm(event: FormEvent) {
    event.preventDefault();
    if (!medicationId || !med || quantity <= 0) return;
    restock.mutate(
      { medicationId, quantity },
      {
        onSuccess: ({ stock }) => {
          onDone(`Stock actualizado: ${med.name}, ${unitsLabel(stock, med.form)}.`);
          close();
        },
      },
    );
  }

  return (
    <Modal
      open={!!medicationId}
      onOpenChange={(open) => !open && close()}
      title="Reponer stock"
      description={med ? `${medicationTitle(med)} · ${form}` : undefined}
    >
      {medication.isPending ? (
        <p role="status" className="flex items-center justify-center gap-2 text-muted">
          <SpinnerIcon size={22} /> Cargando…
        </p>
      ) : medication.isError || !med ? (
        <FormAlert>{medication.error?.message ?? 'No se pudo cargar el medicamento.'}</FormAlert>
      ) : (
        <form onSubmit={confirm} className="flex w-full flex-col gap-4 text-left">
          <div className="flex justify-between gap-3 rounded-btn bg-ahora-tint px-3.5 py-3 text-ahora-text">
            <span>Stock actual</span>
            <b>{unitsLabel(med.stock, med.form)}</b>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-bold">Cantidad que agregás</span>
            <Stepper value={quantity} onChange={setQuantity} min={0} step={1} label={`${form} de ${med.name}`} />
          </div>
          <p className="text-[19px]">
            Nuevo stock: <b>{unitsLabel(med.stock + quantity, med.form)}</b>
          </p>
          {restock.isError && <FormAlert>{restock.error.message}</FormAlert>}
          <Button
            type="submit"
            disabled={quantity <= 0 || restock.isPending}
            icon={restock.isPending ? <SpinnerIcon size={22} /> : undefined}
          >
            {restock.isPending ? 'Guardando…' : 'Confirmar'}
          </Button>
          <Button type="button" variant="secondary" onClick={close}>
            Cancelar
          </Button>
        </form>
      )}
    </Modal>
  );
}
