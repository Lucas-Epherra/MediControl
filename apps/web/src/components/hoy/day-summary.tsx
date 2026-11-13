import { AlertTriangleIcon, CheckIcon, ClockDashedIcon, ClockIcon, SkipIcon } from '@/components/ui';
import type { DayResponse } from '@/lib/types';

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/**
 * Resumen del día en una línea («1 atrasada · 3 pendientes · 2 dadas»). Cada parte lleva ícono y
 * texto; solo aparecen los estados que hay. La lista de abajo tiene el detalle.
 */
export function DaySummary({ day }: { day: DayResponse }) {
  const { summary } = day;
  const items = [
    {
      n: summary.OVERDUE,
      label: plural(summary.OVERDUE, 'atrasada', 'atrasadas'),
      tone: 'text-atrasada',
      Icon: AlertTriangleIcon,
    },
    { n: summary.DUE, label: 'para dar ahora', tone: 'text-ahora-text', Icon: ClockIcon },
    {
      n: summary.UPCOMING,
      label: plural(summary.UPCOMING, 'pendiente', 'pendientes'),
      tone: 'text-muted',
      Icon: ClockDashedIcon,
    },
    { n: summary.GIVEN, label: plural(summary.GIVEN, 'dada', 'dadas'), tone: 'text-dada', Icon: CheckIcon },
    { n: summary.SKIPPED, label: plural(summary.SKIPPED, 'omitida', 'omitidas'), tone: 'text-omitida', Icon: SkipIcon },
  ].filter((item) => item.n > 0);

  if (items.length === 0) return null;
  return (
    <ul aria-label="Resumen del día" className="flex flex-wrap items-center gap-x-4 gap-y-1.5 font-bold">
      {items.map(({ n, label, tone, Icon }) => (
        <li key={label} className={`flex items-center gap-1.5 ${tone}`}>
          <Icon width={20} height={20} className="flex-none" />
          {n} {label}
        </li>
      ))}
    </ul>
  );
}
