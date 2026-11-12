'use client';

import { useState } from 'react';
import { FormAlert } from '@/components/forms';
import { PlusIcon, SpinnerIcon } from '@/components/icons';
import { PlanHeader } from '@/components/plan/plan-header';
import { PrescriptionDialog } from '@/components/plan/prescription-dialog';
import { NoAccess } from '@/components/section-placeholder';
import { Button, PencilIcon, StatusBadge, type BadgeStatus } from '@/components/ui';
import { formatLongDate } from '@/lib/dates';
import { useGroup } from '@/lib/group-context';
import { medicationLabel, useMedications } from '@/lib/medications';
import { expiryLabel, usePrescriptions, type Prescription, type PrescriptionStatus } from '@/lib/prescriptions';
import { can } from '@/lib/roles';

const BADGE: Record<PrescriptionStatus, BadgeStatus> = { VALID: 'vigente', EXPIRING: 'porvencer', EXPIRED: 'vencida' };
const ROW_TONE: Record<PrescriptionStatus, string> = {
  EXPIRED: 'border-[2.5px] border-atrasada bg-atrasada-card',
  EXPIRING: 'border-[2.5px] border-ahora bg-ahora-tint',
  VALID: 'border-[1.5px] border-line bg-white',
};

type DialogState = { prescription?: Prescription; medicationId?: string | null } | null;

export default function RecetasPage() {
  const group = useGroup();
  const prescriptions = usePrescriptions(group.id);
  const medications = useMedications(group.id);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!can(group.myRole, 'viewPlan')) return <NoAccess groupId={group.id} />;
  const canEdit = can(group.myRole, 'editPlan');

  const list = prescriptions.data ?? [];
  const expired = list.filter((p) => p.status === 'EXPIRED').length;
  const expiring = list.filter((p) => p.status === 'EXPIRING').length;
  const subtitle = prescriptions.data
    ? [
        `${list.length} ${list.length === 1 ? 'receta' : 'recetas'}`,
        expired > 0 && `${expired} ${expired === 1 ? 'vencida' : 'vencidas'}`,
        expiring > 0 && `${expiring} por vencer`,
      ]
        .filter(Boolean)
        .join(' · ')
    : undefined;

  function open(state: NonNullable<DialogState>) {
    setNotice(null);
    setDialog(state);
  }

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-5 px-4 pt-5 pb-8 lg:px-10 lg:pt-10">
      <PlanHeader
        groupId={group.id}
        tab="recetas"
        subtitle={subtitle}
        prescriptionAlerts={expired + expiring}
        action={
          canEdit && (
            <Button variant="primary" icon={<PlusIcon size={22} />} onClick={() => open({})}>
              <span className="lg:hidden">Agregar</span>
              <span className="hidden lg:inline">Agregar receta</span>
            </Button>
          )
        }
      />

      {notice && (
        <p role="status" className="rounded-btn border-[1.5px] border-dada bg-dada-tint px-3.5 py-3 font-bold text-dada">
          {notice}
        </p>
      )}

      {prescriptions.isPending ? (
        <div role="status" className="flex items-center justify-center gap-3 py-16 text-muted">
          <SpinnerIcon size={28} className="text-primary" />
          Cargando recetas…
        </div>
      ) : prescriptions.isError ? (
        <div className="flex flex-col items-start gap-3">
          <FormAlert>{prescriptions.error.message}</FormAlert>
          <Button variant="primary" onClick={() => prescriptions.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-start gap-2 rounded-card border border-line bg-white px-5 py-8">
          <p className="text-card font-bold">No hay recetas cargadas</p>
          <p className="text-muted">Cargalas con su vencimiento y te avisamos en Hoy antes de que venzan.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((p) => {
            const renew = p.status !== 'VALID';
            return (
              <li
                key={p.id}
                className={`flex flex-col gap-3 rounded-card p-4 lg:grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_150px_auto] lg:items-center lg:gap-5 lg:px-5 ${ROW_TONE[p.status]}`}
              >
                <div className="min-w-0">
                  <h2 className="text-[19px] font-bold">{p.description}</h2>
                  <p className="text-sm text-muted">
                    {[p.medication && medicationLabel(p.medication), p.notes].filter(Boolean).join(' · ') || 'Sin medicamento asociado'}
                  </p>
                </div>
                <div>
                  <p className="font-bold first-letter:uppercase">{formatLongDate(p.expiresAt.slice(0, 10))}</p>
                  <p className="text-sm text-muted">{p.status === 'VALID' ? `En ${p.daysLeft} días` : expiryLabel(p.daysLeft)}</p>
                </div>
                <span>
                  <StatusBadge status={BADGE[p.status]} />
                </span>
                {canEdit && (
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    {renew && (
                      <Button variant="primary" onClick={() => open({ medicationId: p.medicationId })} className="flex-1 lg:flex-none">
                        {p.status === 'EXPIRED' ? 'Cargar nueva' : 'Renovar'}
                      </Button>
                    )}
                    <Button
                      variant="neutral"
                      icon={<PencilIcon />}
                      onClick={() => open({ prescription: p })}
                      aria-label={`Editar ${p.description}`}
                      className="flex-1 lg:flex-none"
                    >
                      Editar
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-sm text-muted">
        Las recetas por vencer y vencidas también avisan en Hoy. Las vencidas se muestran en rojo hasta que se carga una nueva.
      </p>

      {dialog && (
        <PrescriptionDialog
          groupId={group.id}
          prescription={dialog.prescription}
          initialMedicationId={dialog.medicationId}
          medications={medications.data ?? []}
          onClose={() => setDialog(null)}
          onDone={setNotice}
        />
      )}
    </div>
  );
}
