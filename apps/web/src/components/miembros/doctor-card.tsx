'use client';

import { useState, type FormEvent } from 'react';
import { EMAIL_PATTERN, FormAlert } from '@/components/forms';
import { SpinnerIcon } from '@/components/icons';
import { DoctorCallLink } from '@/components/patient-info';
import { Button, Field } from '@/components/ui';
import { useUpdateGroup } from '@/lib/members';
import type { Group } from '@/lib/types';

/** Mismo criterio que `PHONE_REGEX` de apps/api/src/groups/groups.dto.ts. */
const PHONE_PATTERN = /^[\d\s+()-]{6,30}$/;

/** Médico de cabecera. Solo ADMIN (la página ya lo exige). */
export function DoctorCard({ group, onNotify }: { group: Group; onNotify: (text: string) => void }) {
  const update = useUpdateGroup(group.id);
  const initial = {
    doctorName: group.doctorName ?? '',
    doctorSpecialty: group.doctorSpecialty ?? '',
    doctorPhone: group.doctorPhone ?? '',
    doctorEmail: group.doctorEmail ?? '',
  };
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<{ doctorPhone?: string; doctorEmail?: string }>({});
  const dirty = (Object.keys(initial) as (keyof typeof initial)[]).some((k) => values[k] !== initial[k]);
  const set = (key: keyof typeof initial) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  function save(event: FormEvent) {
    event.preventDefault();
    const phone = values.doctorPhone.trim();
    const email = values.doctorEmail.trim();
    const found = {
      doctorPhone:
        phone && !PHONE_PATTERN.test(phone) ? 'Usá solo números, espacios, +, - y paréntesis (ej.: 2983 41-2233)' : undefined,
      doctorEmail: email && !EMAIL_PATTERN.test(email) ? 'Revisá el formato del email (ej.: nombre@correo.com)' : undefined,
    };
    setErrors(found);
    if (found.doctorPhone || found.doctorEmail) return;
    update.mutate(
      {
        doctorName: values.doctorName.trim() || null,
        doctorSpecialty: values.doctorSpecialty.trim() || null,
        doctorPhone: phone || null,
        doctorEmail: email || null,
      },
      { onSuccess: () => onNotify('Datos del médico guardados.') },
    );
  }

  return (
    <section aria-labelledby="medico-h" className="flex flex-col gap-4 rounded-card border border-line bg-white p-5">
      <div className="flex flex-col gap-1">
        <h2 id="medico-h" className="text-h2 font-bold">
          Médico de cabecera
        </h2>
        <p className="text-sm text-muted">Todo el grupo lo ve y puede llamar desde el celular.</p>
        <DoctorCallLink group={group} />
      </div>
      <form noValidate onSubmit={save} className="flex flex-col gap-4">
        <Field label="Nombre" value={values.doctorName} maxLength={80} autoComplete="off" onChange={set('doctorName')} />
        <Field
          label="Especialidad"
          value={values.doctorSpecialty}
          maxLength={80}
          onChange={set('doctorSpecialty')}
          hint="Opcional. Ej.: Clínica médica."
        />
        <Field
          label="Teléfono"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          value={values.doctorPhone}
          maxLength={30}
          onChange={set('doctorPhone')}
          error={errors.doctorPhone}
        />
        <Field
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="off"
          value={values.doctorEmail}
          maxLength={120}
          onChange={set('doctorEmail')}
          error={errors.doctorEmail}
          hint="Opcional."
        />
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
