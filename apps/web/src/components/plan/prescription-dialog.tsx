'use client';

import { useState, type FormEvent } from 'react';
import { FormAlert } from '@/components/forms';
import { Button, Field, Modal, SelectField } from '@/components/ui';
import { medicationLabel } from '@/lib/medications';
import { useDeletePrescription, useSavePrescription, type Prescription } from '@/lib/prescriptions';
import type { Medication } from '@/lib/types';

/** Alta, edición y baja de una receta u orden. */
export function PrescriptionDialog({
  groupId,
  prescription,
  medications,
  initialMedicationId,
  onClose,
  onDone,
}: {
  groupId: string;
  prescription?: Prescription;
  medications: Medication[];
  /** Al «Cargar nueva» desde una vencida, se propone el mismo medicamento. */
  initialMedicationId?: string | null;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const editing = prescription !== undefined;
  const [description, setDescription] = useState(prescription?.description ?? '');
  const [medicationId, setMedicationId] = useState(prescription?.medicationId ?? initialMedicationId ?? '');
  const [issuedAt, setIssuedAt] = useState(prescription?.issuedAt?.slice(0, 10) ?? '');
  const [expiresAt, setExpiresAt] = useState(prescription?.expiresAt.slice(0, 10) ?? '');
  const [notes, setNotes] = useState(prescription?.notes ?? '');
  const [errors, setErrors] = useState<{ description?: string; expiresAt?: string }>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  const save = useSavePrescription(groupId);
  const remove = useDeletePrescription(groupId);

  function submit(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!description.trim()) next.description = 'Escribí qué receta u orden es.';
    if (!expiresAt) next.expiresAt = 'Elegí la fecha de vencimiento.';
    else if (issuedAt && expiresAt < issuedAt) next.expiresAt = 'No puede vencer antes de la fecha de emisión.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    save.mutate(
      {
        id: prescription?.id,
        description: description.trim(),
        medicationId: medicationId || null,
        issuedAt: issuedAt || null,
        expiresAt,
        notes: notes.trim() || null,
      },
      {
        onSuccess: () => {
          onDone(editing ? 'Receta actualizada.' : 'Receta agregada.');
          onClose();
        },
      },
    );
  }

  const linkable = medications.filter((m) => m.active || m.id === medicationId);

  return (
    <Modal
      open
      onOpenChange={(open) => !open && onClose()}
      size="form"
      title={confirmDelete ? '¿Eliminar esta receta?' : editing ? 'Editar receta' : 'Agregar receta'}
      description={confirmDelete ? `«${prescription?.description}» se borra del plan y de los avisos.` : undefined}
    >
      {confirmDelete ? (
        <div className="flex flex-col gap-2.5">
          {remove.isError && <FormAlert>{remove.error.message}</FormAlert>}
          <Button
            variant="primary"
            disabled={remove.isPending}
            onClick={() =>
              remove.mutate(prescription!.id, {
                onSuccess: () => {
                  onDone('Receta eliminada.');
                  onClose();
                },
              })
            }
          >
            {remove.isPending ? 'Eliminando…' : 'Eliminar'}
          </Button>
          <Button variant="neutral" onClick={() => setConfirmDelete(false)}>
            Volver
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <Field
            label="Receta u orden"
            placeholder="Ej.: Enalapril 10 mg x 60"
            value={description}
            maxLength={200}
            onChange={(e) => setDescription(e.target.value)}
            error={errors.description}
          />
          <SelectField
            label="Medicamento (opcional)"
            value={medicationId}
            onChange={(e) => setMedicationId(e.target.value)}
            options={[
              { value: '', label: 'Ninguno (orden de estudio, etc.)' },
              ...linkable.map((m) => ({ value: m.id, label: medicationLabel(m) })),
            ]}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Emitida (opcional)" type="date" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)} />
            <Field
              label="Vence"
              type="date"
              value={expiresAt}
              min={issuedAt || undefined}
              onChange={(e) => setExpiresAt(e.target.value)}
              error={errors.expiresAt}
            />
          </div>
          <Field
            label="Notas (opcional)"
            placeholder="Ej.: Dra. Méndez, renovar en la farmacia de siempre"
            value={notes}
            maxLength={1000}
            onChange={(e) => setNotes(e.target.value)}
          />
          {save.isError && <FormAlert>{save.error.message}</FormAlert>}
          <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center">
            {editing && (
              <Button type="button" variant="danger" onClick={() => setConfirmDelete(true)}>
                Eliminar receta
              </Button>
            )}
            <Button type="button" variant="secondary" onClick={onClose} className="sm:ml-auto">
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={save.isPending}>
              {save.isPending ? 'Guardando…' : editing ? 'Guardar' : 'Agregar'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
