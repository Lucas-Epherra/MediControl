'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { FormAlert } from '@/components/forms';
import { PlusIcon } from '@/components/icons';
import { ArchiveIcon, Button, Field, Modal, SelectField, Stepper } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { todayInZone } from '@/lib/dates';
import {
  medicationLabel,
  useCreateMedication,
  useSetMedicationActive,
  useUpdateMedication,
  type ScheduleInput,
} from '@/lib/medications';
import type { Medication } from '@/lib/types';
import { FORMS, WEEKDAYS, daysLabel, formatAmount } from './format';

interface ScheduleRow {
  key: string;
  id?: string;
  timeOfDay: string;
  /** Días marcados; los 7 = todos los días. */
  days: number[];
  endDate: string;
}

const ALL_DAYS = WEEKDAYS.map((d) => d.value as number);
let rowSeq = 0;
const newRow = (timeOfDay = '08:00'): ScheduleRow => ({ key: `n${rowSeq++}`, timeOfDay, days: ALL_DAYS, endDate: '' });

type Errors = Partial<Record<string, string>>;

function toInput(row: ScheduleRow, unitsPerDose: number): ScheduleInput {
  return {
    timeOfDay: row.timeOfDay,
    daysOfWeek: row.days.length === 7 ? [] : [...row.days].sort(),
    unitsPerDose,
    endDate: row.endDate || null,
  };
}

/** Reparte los mensajes de validación de la API en los campos («schedules.0.timeOfDay …» → horario 1). */
function apiFieldErrors(error: unknown): { fields: Errors; general: string | null } {
  if (!(error instanceof ApiError)) return { fields: {}, general: error instanceof Error ? error.message : null };
  const raw = error.body.message;
  const messages = Array.isArray(raw) ? raw.map(String) : [error.message];
  const fields: Errors = {};
  const rest: string[] = [];
  for (const message of messages) {
    const match = /^(?:schedules\.(\d+)\.)?(name|strength|form|instructions|stock|lowStockThreshold|timeOfDay|daysOfWeek|unitsPerDose|endDate)\b/.exec(message);
    if (match) fields[match[1] !== undefined ? `schedule.${match[1]}.${match[2]}` : match[2]] = message;
    else rest.push(message);
  }
  return { fields, general: rest.length ? rest.join('. ') : null };
}

export function MedicationForm({
  groupId,
  timezone,
  medication,
}: {
  groupId: string;
  timezone: string;
  medication?: Medication;
}) {
  const router = useRouter();
  const editing = medication !== undefined;
  const planHref = `/grupos/${groupId}/plan`;
  const today = todayInZone(timezone);

  // El detalle de la API trae solo los horarios activos.
  const original = medication?.schedules ?? [];
  const [name, setName] = useState(medication?.name ?? '');
  const [strength, setStrength] = useState(medication?.strength ?? '');
  const [form, setForm] = useState(medication?.form ?? 'comprimidos');
  const [instructions, setInstructions] = useState(medication?.instructions ?? '');
  const [unitsPerDose, setUnitsPerDose] = useState(original[0]?.unitsPerDose ?? 1);
  const [stock, setStock] = useState('');
  const [threshold, setThreshold] = useState(medication ? String(medication.lowStockThreshold) : '');
  const [rows, setRows] = useState<ScheduleRow[]>(() =>
    editing
      ? original.map((s) => ({
            key: s.id,
            id: s.id,
            timeOfDay: s.timeOfDay,
            days: s.daysOfWeek.length === 0 ? ALL_DAYS : s.daysOfWeek,
            endDate: s.endDate?.slice(0, 10) ?? '',
          }))
      : [newRow()],
  );
  const [submitted, setSubmitted] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);

  const create = useCreateMedication(groupId);
  const update = useUpdateMedication(groupId, medication?.id ?? '');
  const archive = useSetMedicationActive(groupId);
  const saving = create.isPending || update.isPending;
  const saveError = create.error ?? update.error;
  const apiErrors = saveError ? apiFieldErrors(saveError) : { fields: {}, general: null };
  const errors: Errors = submitted ? validate() : {};
  const fieldError = (key: string) => errors[key] ?? apiErrors.fields[key];

  const mixedUnits = new Set(original.map((s) => s.unitsPerDose)).size > 1;
  const formOptions = FORMS.includes(form) ? FORMS : [form, ...FORMS];

  function updateRow(key: string, patch: Partial<ScheduleRow>) {
    setRows((current) => current.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function validate(): Errors {
    const next: Errors = {};
    if (!name.trim()) next.name = 'Escribí el nombre del medicamento.';
    if (!editing && (stock === '' || Number(stock) < 0)) next.stock = 'Poné cuántas unidades hay (0 si no hay).';
    if (threshold === '' || Number(threshold) < 0) next.lowStockThreshold = 'Poné desde cuántas unidades avisar (0 = no avisar por cantidad).';
    if (unitsPerDose <= 0) next.unitsPerDose = 'Tiene que ser mayor a 0.';
    rows.forEach((r, i) => {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(r.timeOfDay)) next[`schedule.${i}.timeOfDay`] = 'Elegí la hora.';
      if (r.days.length === 0) next[`schedule.${i}.daysOfWeek`] = 'Marcá al menos un día.';
      if (r.endDate && r.endDate < today) next[`schedule.${i}.endDate`] = 'La fecha de fin no puede ser anterior a hoy.';
    });
    const times = rows.map((r) => r.timeOfDay);
    rows.forEach((r, i) => {
      if (times.indexOf(r.timeOfDay) !== i) next[`schedule.${i}.timeOfDay`] = 'Ya hay otro horario a esta hora.';
    });
    return next;
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(validate()).length > 0) return;

    const base = {
      name: name.trim(),
      strength: strength.trim() || null,
      form: form.trim() || null,
      instructions: instructions.trim() || null,
      lowStockThreshold: Number(threshold),
    };
    const done = { onSuccess: () => router.push(planHref) };

    if (!editing) {
      create.mutate({ ...base, stock: Number(stock), schedules: rows.map((r) => toInput(r, unitsPerDose)) }, done);
      return;
    }

    const kept = new Set(rows.flatMap((r) => (r.id ? [r.id] : [])));
    const changed = rows.filter((r) => {
      if (!r.id) return false;
      const before = original.find((s) => s.id === r.id)!;
      const after = toInput(r, unitsPerDose);
      return (
        before.timeOfDay !== after.timeOfDay ||
        before.unitsPerDose !== after.unitsPerDose ||
        [...before.daysOfWeek].sort().join() !== after.daysOfWeek.join() ||
        (before.endDate?.slice(0, 10) ?? null) !== after.endDate
      );
    });
    update.mutate(
      {
        medication: base,
        schedules: {
          archive: original.filter((s) => !kept.has(s.id)).map((s) => s.id),
          update: changed.map((r) => ({ id: r.id!, ...toInput(r, unitsPerDose) })),
          create: rows.filter((r) => !r.id).map((r) => toInput(r, unitsPerDose)),
        },
      },
      done,
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-6 min-[1400px]:grid min-[1400px]:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] min-[1400px]:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <fieldset className="flex flex-col gap-4 rounded-card border border-line bg-white p-5 lg:p-6">
            <legend className="px-1.5 text-card font-bold">Medicamento</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Nombre"
                value={name}
                maxLength={120}
                autoComplete="off"
                onChange={(e) => setName(e.target.value)}
                error={fieldError('name')}
              />
              <Field
                label="Concentración"
                placeholder="Opcional. Ej.: 10 mg"
                value={strength}
                maxLength={60}
                onChange={(e) => setStrength(e.target.value)}
                error={fieldError('strength')}
              />
              <SelectField
                label="Forma"
                value={form}
                onChange={(e) => setForm(e.target.value)}
                options={formOptions.map((f) => ({ value: f, label: f.charAt(0).toUpperCase() + f.slice(1) }))}
              />
              <div className="flex flex-col gap-1.5">
                <span className="font-bold">Unidades por toma</span>
                <Stepper value={unitsPerDose} onChange={setUnitsPerDose} min={0.5} step={0.5} label="por toma" size="compact" />
                {fieldError('unitsPerDose') && (
                  <span className="text-sm font-bold text-atrasada">{fieldError('unitsPerDose')}</span>
                )}
                {mixedUnits && (
                  <span className="text-sm text-muted">
                    Hoy los horarios tienen cantidades distintas; al guardar se usa esta para todos.
                  </span>
                )}
              </div>
            </div>
            <Field
              label="Indicaciones"
              placeholder="Opcional. Ej.: En ayunas, con las comidas"
              value={instructions}
              maxLength={1000}
              onChange={(e) => setInstructions(e.target.value)}
              error={fieldError('instructions')}
            />
          </fieldset>

          <fieldset className="flex flex-col gap-4 rounded-card border border-line bg-white p-5 lg:p-6">
            <legend className="px-1.5 text-card font-bold">Stock</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              {editing ? (
                <div className="flex flex-col gap-1.5">
                  <span className="font-bold">Stock actual</span>
                  <p className="flex min-h-action items-center rounded-btn bg-canvas px-3.5 text-[20px] font-bold">
                    {formatAmount(medication.stock)} {form || 'unidades'}
                  </p>
                  <span className="text-sm text-muted">Se cambia con «Reponer» o «Ajustar» en el plan.</span>
                </div>
              ) : (
                <Field
                  label="Stock inicial"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={0.5}
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  error={fieldError('stock')}
                />
              )}
              <Field
                label="Avisar cuando queden"
                type="number"
                inputMode="decimal"
                min={0}
                step={0.5}
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                error={fieldError('lowStockThreshold')}
                hint="También avisa si el stock alcanza para pocos días."
              />
            </div>
          </fieldset>
        </div>

        <fieldset className="flex min-w-0 flex-col gap-3.5 rounded-card border border-line bg-white p-5 lg:p-6">
          <legend className="px-1.5 text-card font-bold">Horarios</legend>
          {rows.length === 0 && (
            <p className="text-muted">Sin horarios el medicamento queda en el plan pero no aparece en Hoy.</p>
          )}
          {rows.map((row, i) => (
            <div key={row.key} className="flex flex-col gap-3 rounded-[14px] border-[1.5px] border-line p-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-40">
                  <Field
                    label={`Hora ${rows.length > 1 ? i + 1 : ''}`.trim()}
                    type="time"
                    value={row.timeOfDay}
                    onChange={(e) => updateRow(row.key, { timeOfDay: e.target.value })}
                    error={fieldError(`schedule.${i}.timeOfDay`)}
                  />
                </div>
                <span className="flex-1 pb-3.5 text-sm text-muted">{row.days.length ? daysLabel(row.days) : ''}</span>
                <button
                  type="button"
                  onClick={() => setRows((current) => current.filter((r) => r.key !== row.key))}
                  aria-label={`Quitar el horario ${row.timeOfDay ? `de las ${row.timeOfDay}` : i + 1}`}
                  className="flex min-h-touch items-center gap-1.5 rounded-btn border-[1.5px] border-line bg-white px-3.5 text-sm font-bold text-atrasada hover:bg-atrasada-tint"
                >
                  <ArchiveIcon width={20} height={20} />
                  Quitar
                </button>
              </div>
              <div role="group" aria-label={`Días del horario de las ${row.timeOfDay}`} className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {WEEKDAYS.map((d) => {
                  const on = row.days.includes(d.value);
                  return (
                    <button
                      key={d.value}
                      type="button"
                      aria-pressed={on}
                      aria-label={d.long}
                      onClick={() =>
                        updateRow(row.key, { days: on ? row.days.filter((x) => x !== d.value) : [...row.days, d.value] })
                      }
                      className={`min-h-touch min-w-0 rounded-chip px-0 text-[15px] font-bold sm:text-[17px] ${
                        on ? 'border-2 border-primary bg-primary text-white' : 'border-[1.5px] border-line bg-white text-muted line-through'
                      }`}
                    >
                      {d.short}
                    </button>
                  );
                })}
              </div>
              {fieldError(`schedule.${i}.daysOfWeek`) && (
                <span className="text-sm font-bold text-atrasada">{fieldError(`schedule.${i}.daysOfWeek`)}</span>
              )}
              <div className="sm:w-60">
                <Field
                  label="Hasta"
                  type="date"
                  min={today}
                  value={row.endDate}
                  onChange={(e) => updateRow(row.key, { endDate: e.target.value })}
                  error={fieldError(`schedule.${i}.endDate`)}
                  hint={row.endDate ? undefined : 'Opcional. Vacío = sin fecha de fin.'}
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setRows((current) => [...current, newRow('')])}
            className="flex min-h-[52px] items-center justify-center gap-1.5 rounded-btn border-2 border-dashed border-primary bg-white font-bold text-primary hover:bg-primary-tint"
          >
            <PlusIcon size={22} />
            Agregar horario
          </button>
        </fieldset>
      </div>

      {apiErrors.general && <FormAlert>{apiErrors.general}</FormAlert>}
      {Object.keys(errors).length > 0 && <FormAlert>Revisá los campos marcados en rojo.</FormAlert>}

      <div className="flex flex-col-reverse gap-3 rounded-card border border-line bg-white px-5 py-4 sm:flex-row sm:flex-wrap sm:items-center">
        {editing && (
          <Button
            type="button"
            variant="danger"
            icon={<ArchiveIcon width={20} height={20} />}
            onClick={() => setConfirmArchive(true)}
          >
            Archivar medicamento
          </Button>
        )}
        <Link
          href={planHref}
          className="flex min-h-action items-center justify-center rounded-btn border-2 border-primary px-6 font-bold text-primary no-underline hover:bg-primary-tint sm:ml-auto"
        >
          Cancelar
        </Link>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Agregar al plan'}
        </Button>
      </div>

      {editing && (
        <Modal
          open={confirmArchive}
          onOpenChange={setConfirmArchive}
          title={`¿Archivar ${medicationLabel(medication)}?`}
          description="Deja de aparecer en Hoy y en el plan. Su historial se conserva y se puede volver a activar."
        >
          {archive.isError && <FormAlert>{archive.error.message}</FormAlert>}
          <Button
            variant="primary"
            disabled={archive.isPending}
            onClick={() =>
              archive.mutate({ medicationId: medication.id, active: false }, { onSuccess: () => router.push(planHref) })
            }
          >
            {archive.isPending ? 'Archivando…' : 'Archivar'}
          </Button>
          <Button variant="neutral" onClick={() => setConfirmArchive(false)}>
            Cancelar
          </Button>
        </Modal>
      )}
    </form>
  );
}
