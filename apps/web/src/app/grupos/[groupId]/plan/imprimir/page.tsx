'use client';

import Link from 'next/link';
import { FormAlert } from '@/components/forms';
import { ChevronLeftIcon, PrinterIcon, SpinnerIcon } from '@/components/icons';
import { Button } from '@/components/ui';
import { capitalize, formatLongDate } from '@/lib/dates';
import { useGroup } from '@/lib/group-context';
import { usePlanSheet, type PlanSheet } from '@/lib/plan-sheet';
import { expiryLabel } from '@/lib/prescriptions';
import { can } from '@/lib/roles';

/** Hoja del plan para imprimir o guardar como PDF. Todo viene armado desde la API. */
export default function ImprimirPlanPage() {
  const group = useGroup();
  const sheet = usePlanSheet(group.id);
  const backHref = can(group.myRole, 'viewPlan') ? `/grupos/${group.id}/plan` : `/grupos/${group.id}`;

  return (
    <div className="mx-auto flex max-w-[860px] flex-col gap-5 px-4 pt-5 pb-8 lg:px-10 lg:pt-10 print:max-w-none print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={backHref} className="flex min-h-touch items-center gap-1 font-bold no-underline">
          <ChevronLeftIcon size={22} />
          Volver
        </Link>
        <Button onClick={() => window.print()} disabled={!sheet.data} icon={<PrinterIcon size={22} />}>
          Imprimir
        </Button>
      </div>

      {sheet.isPending ? (
        <div role="status" className="flex items-center justify-center gap-3 py-16 text-muted">
          <SpinnerIcon size={24} />
          Armando la hoja del plan…
        </div>
      ) : sheet.isError ? (
        <div className="flex flex-col items-start gap-3">
          <FormAlert>{sheet.error.message}</FormAlert>
          <Button variant="secondary" onClick={() => sheet.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : (
        <Sheet sheet={sheet.data} />
      )}
    </div>
  );
}

function Sheet({ sheet }: { sheet: PlanSheet }) {
  return (
    <article className="flex flex-col gap-6 rounded-card border-[1.5px] border-line bg-white p-5 text-ink lg:p-8 print:rounded-none print:border-0 print:p-0">
      <header className="flex flex-col gap-1 border-b-2 border-ink pb-4">
        <p className="text-sm font-bold uppercase tracking-wide text-muted">Plan de medicación</p>
        <h1 className="text-h1 font-bold">{sheet.patientName}</h1>
        <p className="text-muted">Actualizado el {formatLongDate(sheet.date)} · MediControl</p>
        {sheet.notes && <p className="mt-2 whitespace-pre-line">{sheet.notes}</p>}
      </header>

      <section aria-labelledby="horarios-h" className="flex flex-col gap-3">
        <h2 id="horarios-h" className="text-h2 font-bold">
          Horarios
        </h2>
        {sheet.slots.length === 0 ? (
          <p className="text-muted">No hay horarios cargados en el plan.</p>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b-2 border-ink text-sm">
                <th scope="col" className="w-[84px] py-2 pr-3">Hora</th>
                <th scope="col" className="py-2 pr-3">Medicamento</th>
                <th scope="col" className="py-2">Cuándo</th>
              </tr>
            </thead>
            <tbody>
              {sheet.slots.map((slot) =>
                slot.items.map((item, i) => (
                  <tr
                    key={`${slot.time}-${i}`}
                    className={`break-inside-avoid align-top ${i === slot.items.length - 1 ? 'border-b border-line' : ''}`}
                  >
                    <th scope="row" className="py-2.5 pr-3 text-[22px] font-bold tabular-nums">
                      {i === 0 ? slot.time : <span className="sr-only">{slot.time}</span>}
                    </th>
                    <td className="py-2.5 pr-3">
                      <span className="block font-bold">{item.medication}</span>
                      <span className="block">{[item.dose, item.instructions].filter(Boolean).join(' · ')}</span>
                    </td>
                    <td className="py-2.5 text-sm">
                      <span className="block">{item.days}</span>
                      {item.period && <span className="block text-muted">{item.period}</span>}
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        )}
      </section>

      {sheet.prescriptions.length > 0 && (
        <section aria-labelledby="recetas-h" className="flex flex-col gap-3 break-inside-avoid">
          <h2 id="recetas-h" className="text-h2 font-bold">
            Recetas
          </h2>
          <ul className="flex flex-col">
            {sheet.prescriptions.map((p, i) => (
              <li key={i} className="flex flex-wrap justify-between gap-x-4 gap-y-1 border-b border-line py-2.5">
                <span>
                  <span className="block font-bold">{p.description}</span>
                  {p.medication && <span className="block text-sm text-muted">{p.medication}</span>}
                </span>
                <span className={`text-right ${p.status === 'VALID' ? '' : 'font-bold'}`}>
                  {capitalize(formatLongDate(p.expiresAt))}
                  <span className="block text-sm">{expiryLabel(p.daysLeft)}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
