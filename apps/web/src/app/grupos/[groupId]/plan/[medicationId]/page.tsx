'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormAlert } from '@/components/forms';
import { SpinnerIcon } from '@/components/icons';
import { MedicationForm } from '@/components/plan/medication-form';
import { NoAccess } from '@/components/section-placeholder';
import { Button } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { useGroup } from '@/lib/group-context';
import { medicationLabel, useMedication } from '@/lib/medications';
import { can } from '@/lib/roles';

export default function EditMedicationPage() {
  const group = useGroup();
  const { medicationId } = useParams<{ medicationId: string }>();
  const medication = useMedication(group.id, medicationId);

  if (!can(group.myRole, 'editPlan')) return <NoAccess groupId={group.id} />;

  const planHref = `/grupos/${group.id}/plan`;
  const title = medication.data ? `Editar ${medicationLabel(medication.data)}` : 'Editar medicamento';

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-5 px-4 pt-5 pb-8 lg:px-10 lg:pt-8">
      <nav aria-label="Ruta" className="text-sm">
        <Link href={planHref} className="font-bold">
          Plan de medicación
        </Link>{' '}
        <span className="text-muted">/ {title}</span>
      </nav>
      <h1 className="text-h1 font-bold lg:text-display">Editar medicamento</h1>
      {medication.isPending ? (
        <div role="status" className="flex items-center justify-center gap-3 py-16 text-muted">
          <SpinnerIcon size={28} className="text-primary" />
          Cargando…
        </div>
      ) : medication.isError ? (
        <div className="flex flex-col items-start gap-3">
          <FormAlert>
            {medication.error instanceof ApiError && medication.error.isNotFound
              ? 'No encontramos este medicamento en el grupo.'
              : medication.error.message}
          </FormAlert>
          <Link href={planHref} className="font-bold">
            Volver al plan
          </Link>
          {!(medication.error instanceof ApiError && medication.error.isNotFound) && (
            <Button variant="primary" onClick={() => medication.refetch()}>
              Reintentar
            </Button>
          )}
        </div>
      ) : (
        <MedicationForm key={medication.data.id} groupId={group.id} timezone={group.timezone} medication={medication.data} />
      )}
    </div>
  );
}
