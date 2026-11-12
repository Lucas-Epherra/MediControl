'use client';

import Link from 'next/link';
import { MedicationForm } from '@/components/plan/medication-form';
import { NoAccess } from '@/components/section-placeholder';
import { useGroup } from '@/lib/group-context';
import { can } from '@/lib/roles';

export default function NewMedicationPage() {
  const group = useGroup();
  if (!can(group.myRole, 'editPlan')) return <NoAccess groupId={group.id} />;
  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-5 px-4 pt-5 pb-8 lg:px-10 lg:pt-8">
      <nav aria-label="Ruta" className="text-sm">
        <Link href={`/grupos/${group.id}/plan`} className="font-bold">
          Plan de medicación
        </Link>{' '}
        <span className="text-muted">/ Agregar medicamento</span>
      </nav>
      <h1 className="text-h1 font-bold lg:text-display">Agregar medicamento</h1>
      <MedicationForm groupId={group.id} timezone={group.timezone} />
    </div>
  );
}
