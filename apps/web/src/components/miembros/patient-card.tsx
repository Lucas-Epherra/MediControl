'use client';

import { useState, type FormEvent } from 'react';
import { FormAlert, TextAreaField } from '@/components/forms';
import { SpinnerIcon } from '@/components/icons';
import { Button, Field } from '@/components/ui';
import { todayInZone } from '@/lib/dates';
import { useUpdateGroup } from '@/lib/members';
import type { Group } from '@/lib/types';

/** Años cumplidos a la fecha `today` (las dos en YYYY-MM-DD). */
function ageOn(birthDate: string, today: string) {
  const years = Number(today.slice(0, 4)) - Number(birthDate.slice(0, 4));
  return today.slice(5) < birthDate.slice(5) ? years - 1 : years;
}

/** Datos de la persona cuidada y nombre del grupo. Solo ADMIN (la página ya lo exige). */
export function PatientCard({ group, onNotify }: { group: Group; onNotify: (text: string) => void }) {
  const update = useUpdateGroup(group.id);
  const today = todayInZone(group.timezone);
  const initial = {
    patientName: group.patientName,
    patientBirthDate: group.patientBirthDate ?? '',
    patientAllergies: group.patientAllergies ?? '',
    patientConditions: group.patientConditions ?? '',
    notes: group.notes ?? '',
    name: group.name,
  };
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<{
    patientName?: string;
    patientBirthDate?: string;
    name?: string;
  }>({});
  const dirty = (Object.keys(initial) as (keyof typeof initial)[]).some((k) => values[k] !== initial[k]);
  const set = (key: keyof typeof initial) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  const birth = values.patientBirthDate;
  const age = birth && birth <= today ? ageOn(birth, today) : null;

  function save(event: FormEvent) {
    event.preventDefault();
    const found = {
      patientName: values.patientName.trim() ? undefined : 'Escribí el nombre de la persona que cuidan',
      patientBirthDate: birth && birth > today ? 'La fecha de nacimiento no puede ser futura' : undefined,
      name: values.name.trim() ? undefined : 'Escribí un nombre para el grupo',
    };
    setErrors(found);
    if (found.patientName || found.patientBirthDate || found.name) return;
    const optional = (text: string) => text.trim() || null;
    update.mutate(
      {
        patientName: values.patientName.trim(),
        patientBirthDate: birth || null,
        patientAllergies: optional(values.patientAllergies),
        patientConditions: optional(values.patientConditions),
        notes: optional(values.notes),
        name: values.name.trim(),
      },
      { onSuccess: () => onNotify('Datos de la persona cuidada guardados.') },
    );
  }

  return (
    <section aria-labelledby="paciente-h" className="flex flex-col gap-4 rounded-card border border-line bg-white p-5">
      <h2 id="paciente-h" className="text-h2 font-bold">
        Persona cuidada
      </h2>
      <form noValidate onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Nombre"
          value={values.patientName}
          maxLength={80}
          autoComplete="off"
          onChange={set('patientName')}
          error={errors.patientName}
        />
        <Field
          label="Fecha de nacimiento"
          type="date"
          max={today}
          value={birth}
          onChange={set('patientBirthDate')}
          error={errors.patientBirthDate}
          hint={age !== null ? `${age} años` : 'Opcional.'}
        />
        <div className="sm:col-span-2">
          <Field
            label="Alergias"
            value={values.patientAllergies}
            maxLength={500}
            onChange={set('patientAllergies')}
            hint="Se ven siempre, completas, arriba de las tomas. Si no tiene, dejalo vacío."
          />
        </div>
        <TextAreaField
          label={
            <>
              Condiciones o diagnósticos <span className="font-normal text-muted">(opcional)</span>
            </>
          }
          value={values.patientConditions}
          maxLength={1000}
          onChange={set('patientConditions')}
        />
        <TextAreaField
          label={
            <>
              Notas <span className="font-normal text-muted">(opcional)</span>
            </>
          }
          value={values.notes}
          maxLength={2000}
          onChange={set('notes')}
          hint="Indicaciones generales para quien cuida."
        />
        <Field label="Nombre del grupo" value={values.name} maxLength={80} onChange={set('name')} error={errors.name} />
        {update.isError && (
          <div className="sm:col-span-2">
            <FormAlert>{update.error.message}</FormAlert>
          </div>
        )}
        <Button
          type="submit"
          disabled={!dirty || update.isPending}
          icon={update.isPending ? <SpinnerIcon size={22} /> : undefined}
          className="self-end"
        >
          {update.isPending ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </form>
    </section>
  );
}
