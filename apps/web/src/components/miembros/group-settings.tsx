'use client';

import { useId, useState, type FormEvent } from 'react';
import { FormAlert } from '@/components/forms';
import { SpinnerIcon } from '@/components/icons';
import { Button, Field } from '@/components/ui';
import { useUpdateGroup } from '@/lib/members';
import type { Group } from '@/lib/types';

/** Nombre del grupo, persona cuidada y notas (las que se ven arriba de Hoy). Solo ADMIN. */
export function GroupSettings({ group, onNotify }: { group: Group; onNotify: (text: string) => void }) {
  const update = useUpdateGroup(group.id);
  const notesId = useId();
  const [name, setName] = useState(group.name);
  const [patientName, setPatientName] = useState(group.patientName);
  const [notes, setNotes] = useState(group.notes ?? '');
  const [errors, setErrors] = useState<{ name?: string; patientName?: string }>({});
  const dirty = name !== group.name || patientName !== group.patientName || notes !== (group.notes ?? '');

  function save(event: FormEvent) {
    event.preventDefault();
    const found = {
      name: name.trim() ? undefined : 'Escribí un nombre para el grupo',
      patientName: patientName.trim() ? undefined : 'Escribí el nombre de la persona que cuidan',
    };
    setErrors(found);
    if (found.name || found.patientName) return;
    update.mutate(
      { name: name.trim(), patientName: patientName.trim(), notes: notes.trim() },
      { onSuccess: () => onNotify('Datos del grupo guardados.') },
    );
  }

  return (
    <section aria-labelledby="grupo-h" className="flex flex-col gap-4 rounded-card border border-line bg-white p-5">
      <h2 id="grupo-h" className="text-h2 font-bold">
        Datos del grupo
      </h2>
      <form noValidate onSubmit={save} className="flex flex-col gap-4">
        <Field label="Nombre del grupo" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} error={errors.name} />
        <Field
          label="Persona cuidada"
          value={patientName}
          maxLength={80}
          onChange={(e) => setPatientName(e.target.value)}
          error={errors.patientName}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor={notesId} className="font-bold">
            Notas importantes
          </label>
          <textarea
            id={notesId}
            rows={3}
            maxLength={2000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            aria-describedby={`${notesId}-hint`}
            className="box-border w-full rounded-btn border-2 border-muted px-3.5 py-3 font-sans text-base text-ink focus-visible:border-primary"
          />
          <span id={`${notesId}-hint`} className="text-sm text-muted">
            Alergias o indicaciones generales. Las ve todo el grupo.
          </span>
        </div>
        {update.isError && <FormAlert>{update.error.message}</FormAlert>}
        <Button
          type="submit"
          disabled={!dirty || update.isPending}
          icon={update.isPending ? <SpinnerIcon size={22} /> : undefined}
        >
          {update.isPending ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </form>
    </section>
  );
}
