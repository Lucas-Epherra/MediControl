import Link from 'next/link';
import type { ReactNode } from 'react';

/** Título, resumen, acción principal y pestañas Medicamentos / Recetas del plan. */
export function PlanHeader({
  groupId,
  tab,
  subtitle,
  action,
  prescriptionAlerts = 0,
}: {
  groupId: string;
  tab: 'medicamentos' | 'recetas';
  subtitle?: string;
  action?: ReactNode;
  prescriptionAlerts?: number;
}) {
  const tabs = [
    { key: 'medicamentos', href: `/grupos/${groupId}/plan`, short: 'Medicamentos', long: 'Medicamentos y horarios' },
    { key: 'recetas', href: `/grupos/${groupId}/plan/recetas`, short: 'Recetas', long: 'Recetas' },
  ] as const;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-h1 font-bold lg:text-display">
            <span className="lg:hidden">Plan</span>
            <span className="hidden lg:inline">Plan de medicación</span>
          </h1>
          {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
      <nav aria-label="Secciones del plan" className="grid grid-cols-2 gap-1 rounded-[14px] bg-line-soft p-1 lg:flex lg:self-start">
        {tabs.map((t) => {
          const current = t.key === tab;
          return (
            <Link
              key={t.key}
              href={t.href}
              aria-current={current ? 'page' : undefined}
              className={`flex min-h-touch items-center justify-center gap-2 rounded-chip border-2 px-5 font-bold no-underline ${
                current ? 'border-primary bg-white text-primary hover:text-primary' : 'border-transparent text-ink hover:text-ink'
              }`}
            >
              <span className="lg:hidden">{t.short}</span>
              <span className="hidden lg:inline">{t.long}</span>
              {t.key === 'recetas' && prescriptionAlerts > 0 && (
                <span className="rounded-full bg-atrasada px-2 text-sm text-white">
                  {prescriptionAlerts}
                  <span className="hidden lg:inline"> {prescriptionAlerts === 1 ? 'aviso' : 'avisos'}</span>
                  <span className="sr-only lg:hidden"> {prescriptionAlerts === 1 ? 'aviso' : 'avisos'}</span>
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
