'use client';

import { useRouter } from 'next/navigation';
import { BoxIcon, DocumentIcon } from '@/components/icons';
import { AlertCard } from '@/components/ui';
import { can } from '@/lib/roles';
import type { Alert, Group } from '@/lib/types';

const LABEL: Record<Alert['type'], string> = {
  LOW_STOCK: 'Stock bajo',
  PRESCRIPTION_EXPIRING: 'Receta por vencer',
  PRESCRIPTION_EXPIRED: 'Receta vencida',
};

interface DayAlertsProps {
  group: Group;
  alerts: Alert[] | undefined;
  failed: boolean;
  onRestock: (medicationId: string) => void;
}

/** Avisos de stock y recetas. Si no hay ninguno, la sección no ocupa lugar. */
export function DayAlerts({ group, alerts, failed, onRestock }: DayAlertsProps) {
  const router = useRouter();
  if (failed) {
    return (
      <section aria-labelledby="avisos-h" className="flex flex-col gap-2.5">
        <h2 id="avisos-h" className="text-h2 font-bold">
          Avisos
        </h2>
        <p className="text-sm text-muted">No se pudieron cargar los avisos. Se vuelve a intentar en unos segundos.</p>
      </section>
    );
  }
  if (!alerts?.length) return null;

  return (
    <section aria-labelledby="avisos-h" className="flex flex-col gap-2.5">
      <h2 id="avisos-h" className="text-h2 font-bold">
        Avisos
      </h2>
      <ul className="flex flex-col gap-2.5">
        {alerts.map((alert) => {
          const stock = alert.type === 'LOW_STOCK';
          const action =
            stock && alert.medicationId && can(group.myRole, 'adjustStock')
              ? { label: 'Reponer', onClick: () => onRestock(alert.medicationId!) }
              : !stock && can(group.myRole, 'viewPlan')
                ? { label: 'Ver recetas', onClick: () => router.push(`/grupos/${group.id}/plan`) }
                : undefined;
          return (
            <li key={`${alert.type}-${alert.medicationId ?? ''}-${alert.prescriptionId ?? ''}`}>
              <AlertCard
                tone={alert.severity === 'critical' ? 'atrasada' : 'ahora'}
                icon={stock ? <BoxIcon size={22} /> : <DocumentIcon size={22} />}
                label={LABEL[alert.type]}
                message={alert.message}
                action={action}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
