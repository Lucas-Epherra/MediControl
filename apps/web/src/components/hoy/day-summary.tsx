import { AlertTriangleIcon, CheckIcon, ClockDashedIcon, ClockIcon, SkipIcon } from '@/components/ui';
import type { DayResponse } from '@/lib/types';
import { doseDetail, medicationTitle } from './format';

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** Conteo por estado. Cada casilla lleva color, ícono y texto; omitidas solo si hay. */
export function DaySummary({ day, isToday }: { day: DayResponse; isToday: boolean }) {
  const { summary } = day;
  const next = isToday ? day.doses.find((d) => d.status === 'DUE' || d.status === 'UPCOMING') : undefined;

  const items = [
    {
      n: summary.OVERDUE,
      label: plural(summary.OVERDUE, 'atrasada', 'atrasadas'),
      tone: 'border-atrasada bg-atrasada-tint text-atrasada',
      Icon: AlertTriangleIcon,
    },
    { n: summary.DUE, label: 'para dar ahora', tone: 'border-ahora bg-ahora-tint text-ahora-text', Icon: ClockIcon },
    {
      n: summary.UPCOMING,
      label: plural(summary.UPCOMING, 'pendiente', 'pendientes'),
      tone: 'border-line bg-white text-muted',
      Icon: ClockDashedIcon,
    },
    {
      n: summary.GIVEN,
      label: plural(summary.GIVEN, 'dada', 'dadas'),
      tone: 'border-dada bg-dada-tint text-dada',
      Icon: CheckIcon,
    },
  ];
  if (summary.SKIPPED > 0) {
    items.push({
      n: summary.SKIPPED,
      label: plural(summary.SKIPPED, 'omitida', 'omitidas'),
      tone: 'border-omitida bg-omitida-tint text-omitida',
      Icon: SkipIcon,
    });
  }

  return (
    <section aria-labelledby="resumen-h" className="flex flex-col gap-2.5">
      <h2 id="resumen-h" className="text-h2 font-bold">
        Resumen del día
      </h2>
      <ul className="grid grid-cols-2 gap-2">
        {items.map(({ n, label, tone, Icon }, i) => (
          <li
            key={label}
            className={`flex items-center gap-2.5 rounded-btn border-[1.5px] p-3 font-bold ${tone} ${
              i === 4 ? 'col-span-2' : ''
            }`}
          >
            <Icon width={24} height={24} />
            <span>
              <span className="text-[24px] leading-none">{n}</span> {label}
            </span>
          </li>
        ))}
      </ul>
      {next && (
        <p className="text-sm text-muted">
          Próxima toma:{' '}
          <b className="text-ink">
            {next.timeOfDay} · {medicationTitle(next.medication)}
          </b>{' '}
          <span className="sr-only">({doseDetail(next)})</span>
        </p>
      )}
    </section>
  );
}
