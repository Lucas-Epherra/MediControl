'use client';

import { useState } from 'react';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '@/components/icons';
import { AlertTriangleIcon, CheckIcon, Modal, SkipIcon } from '@/components/ui';
import {
  addDays,
  addMonths,
  capitalize,
  endOfMonth,
  formatLongDate,
  formatMonth,
  formatWeekdayShort,
  startOfMonth,
  startOfWeek,
} from '@/lib/dates';
import { useCalendar } from '@/lib/queries';
import type { CalendarDay } from '@/lib/types';

type MarkKind = 'atrasada' | 'omitida' | 'completo';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Cómo fue un día, para la marca del calendario. Solo se marca lo que dice algo: tomas sin
 * registrar, omitidas o el día completo. Un día en curso o futuro queda sin marca.
 */
function dayMark(day: CalendarDay | undefined): { kind: MarkKind; label: string } | null {
  if (!day || day.total === 0) return null;
  if (day.OVERDUE > 0)
    return { kind: 'atrasada', label: plural(day.OVERDUE, 'toma sin registrar', 'tomas sin registrar') };
  if (day.SKIPPED > 0) return { kind: 'omitida', label: plural(day.SKIPPED, 'omitida', 'omitidas') };
  if (day.GIVEN === day.total) return { kind: 'completo', label: 'todas dadas' };
  return null;
}

const MARK: Record<MarkKind, { Icon: typeof CheckIcon; classes: string }> = {
  atrasada: { Icon: AlertTriangleIcon, classes: 'bg-atrasada text-white' },
  omitida: { Icon: SkipIcon, classes: 'bg-omitida text-white' },
  completo: { Icon: CheckIcon, classes: 'bg-dada text-white' },
};

/** Marca de color con ícono (nunca solo color): se distingue también en escala de grises. */
function Mark({ kind, onDark = false }: { kind: MarkKind; onDark?: boolean }) {
  const { Icon, classes } = MARK[kind];
  return (
    <span aria-hidden className={`flex h-[18px] w-[18px] items-center justify-center rounded-full ${classes} ${
        onDark ? 'ring-2 ring-white' : ''
      }`}>
      <Icon width={12} height={12} strokeWidth={3} />
    </span>
  );
}

interface DayButtonProps {
  date: string;
  today: string;
  selected: boolean;
  day: CalendarDay | undefined;
  onSelect: (date: string) => void;
  /** Contenido visible (día de la semana y número, o solo el número). */
  children: React.ReactNode;
  className?: string;
}

function DayButton({ date, today, selected, day, onSelect, children, className = '' }: DayButtonProps) {
  const mark = dayMark(day);
  const isToday = date === today;
  const label = [isToday ? 'Hoy' : null, formatLongDate(date), mark?.label].filter(Boolean).join(', ');
  return (
    <button
      type="button"
      onClick={() => onSelect(date)}
      aria-label={label}
      aria-pressed={selected}
      aria-current={isToday ? 'date' : undefined}
      className={`flex flex-col items-center justify-start gap-1 rounded-btn border-[1.5px] py-1.5 font-bold tabular-nums transition-colors ${
        selected
          ? 'border-primary bg-primary text-white'
          : isToday
            ? 'border-primary bg-primary-tint text-ink hover:bg-white'
            : 'border-transparent text-ink hover:border-line hover:bg-white'
      } ${className}`}
    >
      {children}
      <span className="flex h-[18px] items-center">{mark ? <Mark kind={mark.kind} onDark={selected} /> : null}</span>
    </button>
  );
}

function NavArrow({ dir, label, onClick }: { dir: 'prev' | 'next'; label: string; onClick: () => void }) {
  const Icon = dir === 'prev' ? ChevronLeftIcon : ChevronRightIcon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-11 w-11 flex-none items-center justify-center rounded-btn border-[1.5px] border-line bg-white text-ink hover:border-muted"
    >
      <Icon size={22} />
    </button>
  );
}

interface CalendarProps {
  groupId: string;
  /** Día que se está mostrando. */
  shown: string;
  today: string;
  onSelect: (date: string) => void;
}

/** Tira de lunes a domingo con la marca de cada día. En celular reemplaza a las flechas ‹ ›. */
export function WeekStrip({ groupId, shown, today, onSelect }: CalendarProps) {
  const [monthOpen, setMonthOpen] = useState(false);
  const monday = startOfWeek(shown);
  const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const calendar = useCalendar(groupId, week[0], week[6]);
  const byDate = new Map(calendar.data?.days.map((d) => [d.date, d]));

  return (
    <nav aria-label="Elegir día" className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setMonthOpen(true)}
          className="flex min-h-touch items-center gap-2 rounded-btn px-1 font-bold text-ink hover:underline"
        >
          <CalendarIcon size={20} className="text-primary" />
          {capitalize(formatMonth(shown))}
          <span className="sr-only">: ver el mes</span>
        </button>
        <div className="flex gap-2">
          <NavArrow dir="prev" label="Semana anterior" onClick={() => onSelect(addDays(monday, -7))} />
          <NavArrow dir="next" label="Semana siguiente" onClick={() => onSelect(addDays(monday, 7))} />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {week.map((date) => (
          <DayButton
            key={date}
            date={date}
            today={today}
            selected={date === shown}
            day={byDate.get(date)}
            onSelect={onSelect}
          >
            <span className={`text-nav font-normal ${date === shown ? 'text-white' : 'text-muted'}`}>
              {formatWeekdayShort(date)}
            </span>
            <span className="text-[20px] leading-none">{Number(date.slice(8))}</span>
          </DayButton>
        ))}
      </div>

      <Modal open={monthOpen} onOpenChange={setMonthOpen} title="Elegir día" size="form">
        <MonthCalendar
          groupId={groupId}
          shown={shown}
          today={today}
          onSelect={(date) => {
            setMonthOpen(false);
            onSelect(date);
          }}
        />
      </Modal>
    </nav>
  );
}

/** Calendario del mes con la marca de cada día. Fijo en la columna derecha en escritorio. */
export function MonthCalendar({ groupId, shown, today, onSelect }: CalendarProps) {
  // El mes visible sigue al día elegido, pero se puede hojear sin cambiar de día.
  const [browsing, setBrowsing] = useState<{ for: string; month: string } | null>(null);
  const month = browsing?.for === shown ? browsing.month : startOfMonth(shown);
  const browse = (delta: number) => setBrowsing({ for: shown, month: addMonths(month, delta) });

  const last = endOfMonth(month);
  const calendar = useCalendar(groupId, month, last);
  const byDate = new Map(calendar.data?.days.map((d) => [d.date, d]));
  const leading = (new Date(`${month}T12:00:00Z`).getUTCDay() + 6) % 7;
  const count = Number(last.slice(8));
  const dates = Array.from({ length: count }, (_, i) => addDays(month, i));
  const weekdays = Array.from({ length: 7 }, (_, i) => formatWeekdayShort(addDays(startOfWeek(month), i)));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <NavArrow dir="prev" label="Mes anterior" onClick={() => browse(-1)} />
        <p className="whitespace-nowrap text-base font-bold" aria-live="polite">
          {capitalize(formatMonth(month))}
        </p>
        <NavArrow dir="next" label="Mes siguiente" onClick={() => browse(1)} />
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {weekdays.map((name) => (
          <span key={name} aria-hidden className="text-nav text-muted">
            {name}
          </span>
        ))}
        {leading > 0 && <span aria-hidden style={{ gridColumn: `span ${leading}` }} />}
        {dates.map((date) => (
          <DayButton
            key={date}
            date={date}
            today={today}
            selected={date === shown}
            day={byDate.get(date)}
            onSelect={onSelect}
          >
            <span className="text-base leading-none">{Number(date.slice(8))}</span>
          </DayButton>
        ))}
      </div>
      {calendar.isError && <p className="text-sm text-atrasada-text">No se pudieron cargar las marcas del mes.</p>}
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted">
        <li className="flex items-center gap-1.5">
          <Mark kind="completo" /> Todas dadas
        </li>
        <li className="flex items-center gap-1.5">
          <Mark kind="omitida" /> Con omitidas
        </li>
        <li className="flex items-center gap-1.5">
          <Mark kind="atrasada" /> Sin registrar
        </li>
      </ul>
    </div>
  );
}
