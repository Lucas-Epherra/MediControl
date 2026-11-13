'use client';

import { useMemo, useState } from 'react';
import { FormAlert } from '@/components/forms';
import { Avatar } from '@/components/avatar';
import { ChevronDownIcon, SpinnerIcon, UndoIcon } from '@/components/icons';
import { Button, Field, SelectField, StatusBadge } from '@/components/ui';
import { addDays, daysBetween, formatDayHeading, formatShortDate, formatTime, isoDateInZone, todayInZone } from '@/lib/dates';
import { useGroup } from '@/lib/group-context';
import { MAX_HISTORY_DAYS, useDoseHistory } from '@/lib/history';
import { medicationLabel, useMedications } from '@/lib/medications';
import type { DoseHistory, DoseRecordStatus } from '@/lib/types';

type Period = 'hoy' | 'ayer' | '7d' | 'rango';
type StatusFilter = 'todos' | DoseRecordStatus | 'UNDONE';
type HistoryRecord = DoseHistory['records'][number];

const PERIODS: { value: Period; label: string; short: string }[] = [
  { value: 'hoy', label: 'Hoy', short: 'Hoy' },
  { value: 'ayer', label: 'Ayer', short: 'Ayer' },
  { value: '7d', label: 'Últimos 7 días', short: '7 días' },
  { value: 'rango', label: 'Rango', short: 'Rango' },
];

function periodBounds(period: Period, today: string, custom: { from: string; to: string }) {
  if (period === 'hoy') return { from: today, to: today };
  if (period === 'ayer') return { from: addDays(today, -1), to: addDays(today, -1) };
  if (period === '7d') return { from: addDays(today, -6), to: today };
  return custom;
}

function rangeError(from: string, to: string, today: string): string | null {
  if (!from || !to) return 'Elegí las dos fechas.';
  if (from > to) return 'La fecha «Desde» tiene que ser anterior a «Hasta».';
  if (to > today) return 'No puede haber tomas registradas en el futuro.';
  if (daysBetween(from, to) > MAX_HISTORY_DAYS) return `El rango máximo es de ${MAX_HISTORY_DAYS} días.`;
  return null;
}

export default function HistorialPage() {
  const group = useGroup();
  const zone = group.timezone;
  const today = todayInZone(zone);

  const [period, setPeriod] = useState<Period>('7d');
  const [custom, setCustom] = useState({ from: addDays(today, -13), to: today });
  const [medicationId, setMedicationId] = useState('');
  const [recordedBy, setRecordedBy] = useState<{ id: string; name: string } | null>(null);
  const recordedById = recordedBy?.id ?? '';
  const [status, setStatus] = useState<StatusFilter>('todos');

  const bounds = periodBounds(period, today, custom);
  const invalidRange = period === 'rango' ? rangeError(bounds.from, bounds.to, today) : null;

  // Los archivados también: su historial sigue existiendo.
  const medications = useMedications(group.id, { status: 'all' });
  // Todos los filtros los resuelve la API.
  const history = useDoseHistory(
    group.id,
    {
      from: bounds.from,
      to: bounds.to,
      medicationId: medicationId || undefined,
      recordedById: recordedById || undefined,
      // «Dadas» y «Omitidas» son las vigentes; «Deshechas», las que alguien deshizo.
      status: status === 'todos' || status === 'UNDONE' ? undefined : status,
      undone: status === 'todos' ? undefined : status === 'UNDONE',
    },
    !invalidRange,
  );

  const visible = history.data?.records ?? [];
  const people = history.data?.recorders ?? [];
  const days = useMemo(() => groupByDay(history.data?.records ?? [], zone), [history.data, zone]);
  const activeFilters = [medicationId !== '', recordedById !== '', status !== 'todos'].filter(Boolean).length;
  const hasExtraFilters = activeFilters > 0;
  // En celular los filtros extra van plegados: si no, ocupan toda la primera pantalla.
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-5 px-4 pt-5 pb-8 lg:px-10 lg:pt-10">
      <div>
        <h1 className="text-h1 font-bold lg:text-display">Historial</h1>
        <p className="mt-1 text-muted">Todas las tomas registradas, con quién las registró y cuándo.</p>
      </div>

      <div className="flex flex-col gap-4 rounded-card border border-line bg-white p-4 lg:px-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-5">
          <fieldset className="min-w-0">
            <legend className="mb-1.5 text-sm font-bold">Período</legend>
            <div className="grid grid-cols-4 gap-1 rounded-[14px] bg-line-soft p-1 lg:flex">
              {PERIODS.map((p) => (
                <label key={p.value} className="min-w-0">
                  <input
                    type="radio"
                    name="periodo"
                    value={p.value}
                    checked={period === p.value}
                    onChange={() => setPeriod(p.value)}
                    className="peer sr-only"
                  />
                  <span className="flex min-h-touch cursor-pointer items-center justify-center rounded-chip border-2 border-transparent px-2 text-center text-[17px] font-bold text-ink peer-checked:border-primary peer-checked:bg-white peer-checked:text-primary peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-primary-ring lg:px-4">
                    <span className="lg:hidden">{p.short}</span>
                    <span className="hidden lg:inline">{p.label}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
  
          {period === 'rango' && (
            <div className="grid grid-cols-2 gap-2.5 lg:flex">
              <Field
                label="Desde"
                type="date"
                value={custom.from}
                max={today}
                onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))}
              />
              <Field
                label="Hasta"
                type="date"
                value={custom.to}
                max={today}
                onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))}
              />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-5">
          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            aria-controls="historial-filtros"
            className="flex min-h-touch items-center justify-between gap-2 rounded-btn border-[1.5px] border-line px-4 font-bold text-ink hover:bg-canvas lg:hidden"
          >
            <span>
              Filtros
              {hasExtraFilters && (
                <span className="font-normal text-muted">
                  {' '}
                  · {activeFilters === 1 ? '1 activo' : `${activeFilters} activos`}
                </span>
              )}
            </span>
            <ChevronDownIcon size={22} className={`flex-none transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
          </button>
          <div
            id="historial-filtros"
            className={`${filtersOpen ? 'grid' : 'hidden'} grid-cols-1 gap-4 sm:grid-cols-3 lg:grid lg:max-w-[760px] lg:flex-1`}
          >
            <SelectField
              label="Medicamento"
              value={medicationId}
              onChange={(e) => setMedicationId(e.target.value)}
              disabled={!medications.data}
              options={[
                { value: '', label: medications.isError ? 'Todos (no se pudo cargar la lista)' : 'Todos' },
                ...(medications.data ?? []).map((m) => ({
                  value: m.id,
                  label: m.active ? medicationLabel(m) : `${medicationLabel(m)} (archivado)`,
                })),
              ]}
            />
            <SelectField
              label="Responsable"
              value={recordedById}
              onChange={(e) => {
                const person = people.find((p) => p.id === e.target.value);
                setRecordedBy(person ?? null);
              }}
              options={[
                { value: '', label: 'Todos' },
                ...people.map((p) => ({ value: p.id, label: p.name })),
                // Si cambia el período y la persona ya no aparece, se mantiene elegida igual.
                ...(recordedBy && !people.some((p) => p.id === recordedBy.id)
                  ? [{ value: recordedBy.id, label: recordedBy.name }]
                  : []),
              ]}
            />
            <SelectField
              label="Estado"
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
              options={[
                { value: 'todos', label: 'Todos' },
                { value: 'GIVEN', label: 'Dadas' },
                { value: 'SKIPPED', label: 'Omitidas' },
                { value: 'UNDONE', label: 'Deshechas' },
              ]}
            />
          </div>
  
          {!invalidRange && history.data && (
            <p className="flex items-center gap-2 text-sm text-muted lg:ml-auto lg:min-h-action" aria-live="polite">
              {history.isFetching && <SpinnerIcon size={18} className="text-primary" />}
              {history.isFetching ? 'Actualizando…' : visible.length === 1 ? '1 registro' : `${visible.length} registros`}
            </p>
          )}
        </div>
      </div>

      {invalidRange ? (
        <FormAlert>{invalidRange}</FormAlert>
      ) : history.isPending ? (
        <div role="status" className="flex items-center justify-center gap-3 py-16 text-muted">
          <SpinnerIcon size={28} className="text-primary" />
          Cargando historial…
        </div>
      ) : history.isError ? (
        <div className="flex flex-col items-start gap-3">
          <FormAlert>{history.error.message}</FormAlert>
          <Button variant="primary" onClick={() => history.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : days.length === 0 ? (
        <p className="rounded-card border border-line bg-white px-5 py-10 text-center text-muted">
          {hasExtraFilters ?'No hay tomas registradas con estos filtros.' : 'No hay tomas registradas en este período.'}
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {days.map((day) => (
            <section key={day.date} aria-labelledby={`dia-${day.date}`} className="flex flex-col gap-2.5">
              <h2 id={`dia-${day.date}`} className="text-h2 font-bold">
                {formatDayHeading(day.date, today)}
              </h2>
              <div className="overflow-hidden rounded-card border border-line bg-white">
                <div
                  aria-hidden="true"
                  className="hidden grid-cols-[72px_minmax(0,1.4fr)_130px_minmax(0,1fr)_110px_minmax(0,1.6fr)] gap-4 bg-canvas px-4 py-3 text-sm font-bold text-muted lg:grid"
                >
                  <span>Hora</span>
                  <span>Medicamento</span>
                  <span>Estado</span>
                  <span>Responsable</span>
                  <span>Registrado</span>
                  <span>Notas</span>
                </div>
                <ol>
                  {day.records.map((record) => (
                    <HistoryRow key={record.id} record={record} zone={zone} scheduledDate={day.date} />
                  ))}
                </ol>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryRow({ record, zone, scheduledDate }: { record: HistoryRecord; zone: string; scheduledDate: string }) {
  const skipped = record.status === 'SKIPPED';
  const recordedDate = isoDateInZone(record.recordedAt, zone);
  const recordedTime = formatTime(record.recordedAt, zone);
  // Si se registró otro día (por ejemplo, de madrugada), se aclara la fecha.
  const recordedAt = recordedDate === scheduledDate ? recordedTime : `${formatShortDate(recordedDate)} ${recordedTime}`;
  const note = record.notes ? (skipped ? `Motivo: ${record.notes}` : record.notes) : null;
  const medication = medicationLabel(record.medication);
  const undone = record.undoneAt
    ? `Se había registrado como ${skipped ? 'omitida' : 'dada'}. La deshizo ${record.undoneBy?.name ?? 'alguien'} a las ${formatTime(record.undoneAt, zone)}${
        isoDateInZone(record.undoneAt, zone) === scheduledDate ? '' : ` del ${formatShortDate(isoDateInZone(record.undoneAt, zone))}`
      }.`
    : null;

  return (
    <li className="flex flex-col gap-1.5 border-t border-line-soft px-4 py-3.5 first:border-t-0 lg:grid lg:grid-cols-[72px_minmax(0,1.4fr)_130px_minmax(0,1fr)_110px_minmax(0,1.6fr)] lg:items-center lg:gap-4 lg:border-t lg:first:border-t">
      <div className="flex items-baseline justify-between gap-2 lg:contents">
        <span className="order-2 text-muted tabular-nums lg:order-none lg:font-bold lg:text-ink">
          <span className="sr-only">Programada a las </span>
          {formatTime(record.scheduledFor, zone)}
        </span>
        <b className="order-1 text-[19px] lg:order-none lg:text-base">{medication}</b>
      </div>
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 lg:contents">
        <span>
          {undone ? (
            // Deshecha: tono neutro, para no leerse como una toma dada u omitida vigente.
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border-[1.5px] border-muted bg-white px-3 py-1.5 text-sm font-bold text-muted">
              <UndoIcon size={18} />
              Deshecha
            </span>
          ) : (
            <StatusBadge status={skipped ? 'omitida' : 'dada'} />
          )}
        </span>
        <span className="flex items-center gap-2 text-[17px] lg:text-base">
          <span className="hidden lg:inline-flex">
            <Avatar name={record.recordedBy.name} size="sm" muted />
          </span>
          <span>
            <span className="lg:hidden">por </span>
            <b className="lg:font-normal">{record.recordedBy.name}</b>
            <span className="lg:hidden"> · {recordedAt}</span>
          </span>
        </span>
        <span className="hidden tabular-nums lg:inline">{recordedAt}</span>
      </div>
      {note || undone ? (
        <div className="flex flex-col gap-1 rounded-chip bg-canvas px-3 py-2 text-[17px] text-muted lg:bg-transparent lg:p-0">
          {note && <p>{note}</p>}
          {undone && <p className="font-bold text-ink">{undone}</p>}
        </div>
      ) : (
        <span className="hidden text-muted lg:inline" aria-hidden="true">
          —
        </span>
      )}
    </li>
  );
}

function groupByDay(records: HistoryRecord[], zone: string) {
  const days = new Map<string, HistoryRecord[]>();
  for (const record of records) {
    const date = isoDateInZone(record.scheduledFor, zone);
    const list = days.get(date) ?? [];
    list.push(record);
    days.set(date, list);
  }
  // Días del más reciente al más viejo; dentro del día, en el orden en que se toman.
  return [...days]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([date, list]) => ({
      date,
      records: [...list].sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor)),
    }));
}
