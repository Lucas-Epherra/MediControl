'use client';

import Link from 'next/link';
import { useState } from 'react';
import { FormAlert } from '@/components/forms';
import { PlusIcon, PrinterIcon, SpinnerIcon } from '@/components/icons';
import { daysLabel, formatAmount, formatUnits } from '@/components/plan/format';
import { PlanHeader } from '@/components/plan/plan-header';
import { StockDialog } from '@/components/plan/stock-dialog';
import { NoAccess } from '@/components/section-placeholder';
import { BoxIcon, Button, ClockIcon, PencilIcon, StatusBadge } from '@/components/ui';
import { formatTime } from '@/lib/dates';
import { useGroup } from '@/lib/group-context';
import {
  medicationLabel,
  useMedications,
  useSetMedicationActive,
  useTodayAgenda,
  type StockMovementType,
} from '@/lib/medications';
import { usePrescriptions } from '@/lib/prescriptions';
import { can } from '@/lib/roles';
import type { Medication } from '@/lib/types';

export default function PlanPage() {
  const group = useGroup();
  const [showArchived, setShowArchived] = useState(false);
  const [stock, setStock] = useState<{ medicationId: string; type: StockMovementType } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const medications = useMedications(group.id);
  const archivedQuery = useMedications(group.id, { status: 'archived', enabled: showArchived });
  const agenda = useTodayAgenda(group.id);
  const prescriptions = usePrescriptions(group.id);
  const reactivate = useSetMedicationActive(group.id);

  if (!can(group.myRole, 'viewPlan')) return <NoAccess groupId={group.id} />;

  const canEdit = can(group.myRole, 'editPlan');
  const canAdjust = can(group.myRole, 'adjustStock');
  const active = medications.data ?? [];
  const archived = archivedQuery.data ?? [];
  const dosesToday = agenda.data?.doses.length;
  const prescriptionAlerts = prescriptions.data?.filter((p) => p.status !== 'VALID').length ?? 0;

  const subtitle = medications.data
    ? [
        `${active.length} ${active.length === 1 ? 'medicamento' : 'medicamentos'}`,
        dosesToday !== undefined && `${dosesToday} ${dosesToday === 1 ? 'toma' : 'tomas'} hoy`,
      ]
        .filter(Boolean)
        .join(' · ')
    : undefined;

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-5 px-4 pt-5 pb-8 lg:px-10 lg:pt-10">
      <PlanHeader
        groupId={group.id}
        tab="medicamentos"
        subtitle={subtitle}
        prescriptionAlerts={prescriptionAlerts}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/grupos/${group.id}/plan/imprimir`}
              className="flex min-h-action items-center gap-2 rounded-btn border-2 border-primary bg-white px-5 text-[19px] font-bold text-primary no-underline hover:bg-primary-tint hover:text-primary"
            >
              <PrinterIcon size={22} />
              Imprimir
              <span className="hidden lg:inline">plan</span>
            </Link>
            {canEdit && (
              <Link
                href={`/grupos/${group.id}/plan/nuevo`}
                className="flex min-h-action items-center gap-2 rounded-btn bg-primary px-5 text-[19px] font-bold text-white no-underline hover:bg-primary-hover hover:text-white"
              >
                <PlusIcon size={22} />
                <span className="lg:hidden">Agregar</span>
                <span className="hidden lg:inline">Agregar medicamento</span>
              </Link>
            )}
          </div>
        }
      />

      {notice && (
        <p role="status" className="rounded-btn border-[1.5px] border-dada bg-dada-tint px-3.5 py-3 font-bold text-dada">
          {notice}
        </p>
      )}

      {medications.isPending ? (
        <div role="status" className="flex items-center justify-center gap-3 py-16 text-muted">
          <SpinnerIcon size={28} className="text-primary" />
          Cargando el plan…
        </div>
      ) : medications.isError ? (
        <div className="flex flex-col items-start gap-3">
          <FormAlert>{medications.error.message}</FormAlert>
          <Button variant="primary" onClick={() => medications.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            {active.length === 0 ? (
              <div className="flex flex-col items-start gap-3 rounded-card border border-line bg-white px-5 py-8">
                <p className="text-card font-bold">Todavía no hay medicamentos en el plan</p>
                <p className="text-muted">
                  {canEdit
                    ? 'Agregá el primero con sus horarios y aparece en Hoy.'
                    : 'Cuando quien administra el grupo los cargue, aparecen acá y en Hoy.'}
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {active.map((m) => (
                  <MedicationItem
                    key={m.id}
                    medication={m}
                    groupId={group.id}
                    canEdit={canEdit}
                    canAdjust={canAdjust}
                    onStock={(type) => {
                      setNotice(null);
                      setStock({ medicationId: m.id, type });
                    }}
                  />
                ))}
              </ul>
            )}

            <label className="flex min-h-touch cursor-pointer items-center gap-3 self-start">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="size-6 accent-primary"
              />
              Ver medicamentos archivados
            </label>

            {showArchived &&
              (archivedQuery.isPending ? (
                <p className="text-muted">Cargando archivados…</p>
              ) : archivedQuery.isError ? (
                <FormAlert>{archivedQuery.error.message}</FormAlert>
              ) : archived.length === 0 ? (
                <p className="text-muted">No hay medicamentos archivados.</p>
              ) : (
                <section aria-labelledby="archivados" className="flex flex-col gap-2.5">
                  <h2 id="archivados" className="text-h2 font-bold">
                    Archivados
                  </h2>
                  <p className="text-muted">No aparecen en Hoy; su historial se conserva.</p>
                  <ul className="flex flex-col gap-2.5">
                    {archived.map((m) => (
                      <li
                        key={m.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-dashed border-line bg-white px-4 py-3"
                      >
                        <span>
                          <b>{medicationLabel(m)}</b> <span className="text-muted">· archivado</span>
                        </span>
                        {canEdit && (
                          <Button
                            variant="neutral"
                            disabled={reactivate.isPending}
                            aria-label={`Volver a activar ${medicationLabel(m)}`}
                            onClick={() => reactivate.mutate({ medicationId: m.id, active: true })}
                          >
                            Volver a activar
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                  {reactivate.isError && <FormAlert>{reactivate.error.message}</FormAlert>}
                </section>
              ))}
          </div>

          <aside
            aria-labelledby="agenda"
            className="rounded-card border border-line bg-white p-5 lg:sticky lg:top-6 lg:w-[320px] lg:flex-none"
          >
            <h2 id="agenda" className="text-h2 font-bold">
              Agenda de hoy
            </h2>
            <p className="mb-3 text-sm text-muted">Así se arma la lista de Hoy.</p>
            {agenda.isPending ? (
              <p className="text-muted">Cargando…</p>
            ) : agenda.isError ? (
              <p className="text-muted">No se pudo cargar la agenda.</p>
            ) : agenda.data.doses.length === 0 ? (
              <p className="text-muted">Hoy no hay tomas programadas.</p>
            ) : (
              <ol>
                {agenda.data.doses.map((d) => (
                  <li key={d.key} className="flex gap-3.5 border-t border-line-soft py-2.5">
                    <b className="w-14 flex-none tabular-nums">{formatTime(d.scheduledFor, group.timezone)}</b>
                    <span>{medicationLabel(d.medication)}</span>
                  </li>
                ))}
              </ol>
            )}
          </aside>
        </div>
      )}

      {!canEdit && <p className="text-sm text-muted">Solo quien administra el grupo puede agregar o editar medicamentos.</p>}

      {stock && (
        <StockDialog
          groupId={group.id}
          medicationId={stock.medicationId}
          type={stock.type}
          onClose={() => setStock(null)}
          onDone={setNotice}
        />
      )}
    </div>
  );
}

function MedicationItem({
  medication: m,
  groupId,
  canEdit,
  canAdjust,
  onStock,
}: {
  medication: Medication;
  groupId: string;
  canEdit: boolean;
  canAdjust: boolean;
  onStock: (type: StockMovementType) => void;
}) {
  // La API los devuelve ordenados por hora.
  const schedules = m.schedules;
  const units = new Set(schedules.map((s) => s.unitsPerDose));
  const sameDays = new Set(schedules.map((s) => daysLabel(s.daysOfWeek))).size <= 1;
  const info = [
    m.form,
    units.size === 1 && `${formatAmount([...units][0])} por toma`,
    m.instructions,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <li className="flex flex-col gap-3 rounded-card border-[1.5px] border-line bg-white p-4 lg:grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_230px] lg:items-start lg:gap-x-5 lg:gap-y-3 lg:px-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-[21px] font-bold leading-tight">{medicationLabel(m)}</h2>
          {info && <p className="text-muted">{info}</p>}
        </div>
        {canEdit && (
          <Link
            href={`/grupos/${groupId}/plan/${m.id}`}
            aria-label={`Editar ${medicationLabel(m)}`}
            className="flex min-h-touch flex-none items-center gap-1.5 rounded-btn border-[1.5px] border-line px-3 text-[17px] font-bold text-ink no-underline hover:bg-canvas hover:text-ink lg:hidden"
          >
            <PencilIcon />
            Editar
          </Link>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        {schedules.length === 0 ? (
          <p className="text-muted">Sin horarios: no aparece en Hoy.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              {schedules.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary-tint px-2.5 py-1 font-bold tabular-nums text-primary-hover"
                >
                  <ClockIcon width={16} height={16} />
                  {s.timeOfDay}
                  {units.size > 1 && <span className="font-normal">· {formatAmount(s.unitsPerDose)}</span>}
                </span>
              ))}
            </div>
            <p className="text-sm text-muted">
              {sameDays
                ? daysLabel(schedules[0].daysOfWeek)
                : schedules.map((s) => `${s.timeOfDay} ${daysLabel(s.daysOfWeek).toLowerCase()}`).join(' · ')}
            </p>
          </>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div
          className={`flex flex-wrap items-center justify-between gap-2 rounded-chip px-3 py-2.5 font-bold ${
            m.lowStock ? 'border-[1.5px] border-ahora bg-ahora-tint text-ahora-text' : 'bg-canvas'
          }`}
        >
          <span className="flex items-center gap-2">
            <BoxIcon width={20} height={20} />
            {formatUnits(m.stock, m.form)}
          </span>
          <span className="text-sm font-normal">Aviso con {formatAmount(m.lowStockThreshold)}</span>
        </div>
        {m.lowStock && (
          <StatusBadge
            status="stockbajo"
            className="self-start"
            text={
              m.coverageDays !== null ? `Stock bajo · ≈ ${formatAmount(Math.floor(m.coverageDays))} días` : 'Stock bajo'
            }
          />
        )}
      </div>

      {(canAdjust || canEdit) && (
          <div className="flex flex-wrap gap-2 lg:col-span-3 lg:justify-end lg:border-t lg:border-line-soft lg:pt-3">
            {canAdjust && (
              <>
                <Button variant="neutral" onClick={() => onStock('RESTOCK')} className="flex-1 lg:flex-none">
                  Reponer
                </Button>
                <Button variant="neutral" onClick={() => onStock('ADJUSTMENT')} className="flex-1 lg:flex-none">
                  Ajustar
                </Button>
              </>
            )}
            {canEdit && (
              <Link
                href={`/grupos/${groupId}/plan/${m.id}`}
                aria-label={`Editar ${medicationLabel(m)}`}
                className="hidden min-h-touch items-center justify-center gap-1.5 rounded-btn border-[1.5px] border-line px-3 text-sm font-bold text-ink no-underline hover:bg-canvas hover:text-ink lg:flex"
              >
                <PencilIcon />
                Editar
              </Link>
            )}
          </div>
        )}
    </li>
  );
}
