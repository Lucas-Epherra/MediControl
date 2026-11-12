'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import type { Medication, MedicationSummary, Schedule } from './types';

const medicationsKey = (groupId: string) => ['groups', groupId, 'medications'] as const;

export function useMedications(groupId: string, { includeInactive = false } = {}) {
  return useQuery({
    queryKey: [...medicationsKey(groupId), { includeInactive }] as const,
    queryFn: () =>
      api<Medication[]>(`/groups/${groupId}/medications${includeInactive ? '?includeInactive=true' : ''}`),
  });
}

export function useMedication(groupId: string, medicationId: string) {
  return useQuery({
    queryKey: [...medicationsKey(groupId), medicationId] as const,
    queryFn: () => api<Medication>(`/groups/${groupId}/medications/${medicationId}`),
  });
}

/** 'Enalapril 10 mg' */
export function medicationLabel(medication: { name: string; strength: string | null }): string {
  return medication.strength ? `${medication.name} ${medication.strength}` : medication.name;
}

/** Tras cambiar el plan o el stock se refresca todo lo del grupo: plan, Hoy, avisos e historial. */
function useInvalidateGroup(groupId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['groups', groupId] });
}

export interface MedicationInput {
  name: string;
  strength: string | null;
  form: string | null;
  instructions: string | null;
  lowStockThreshold: number;
}

export interface ScheduleInput {
  timeOfDay: string;
  /** 1 = lunes … 7 = domingo; vacío = todos los días. */
  daysOfWeek: number[];
  unitsPerDose: number;
  endDate: string | null;
}

export function useCreateMedication(groupId: string) {
  const invalidate = useInvalidateGroup(groupId);
  return useMutation({
    mutationFn: (input: MedicationInput & { stock: number; schedules: ScheduleInput[] }) =>
      api<Medication>(`/groups/${groupId}/medications`, {
        method: 'POST',
        // El alta no acepta null: los opcionales vacíos se omiten.
        body: {
          ...input,
          strength: input.strength ?? undefined,
          form: input.form ?? undefined,
          instructions: input.instructions ?? undefined,
          schedules: input.schedules.map((s) => ({ ...s, endDate: s.endDate ?? undefined })),
        },
      }),
    onSuccess: invalidate,
  });
}

export interface ScheduleChange {
  create: ScheduleInput[];
  update: (ScheduleInput & { id: string })[];
  archive: string[];
}

export function useUpdateMedication(groupId: string, medicationId: string) {
  const invalidate = useInvalidateGroup(groupId);
  const base = `/groups/${groupId}/medications/${medicationId}`;
  return useMutation({
    mutationFn: async ({ medication, schedules }: { medication: MedicationInput; schedules: ScheduleChange }) => {
      await api<Medication>(base, { method: 'PATCH', body: medication });
      await Promise.all([
        ...schedules.archive.map((id) => api<void>(`${base}/schedules/${id}`, { method: 'DELETE' })),
        ...schedules.update.map(({ id, ...body }) =>
          api<Schedule>(`${base}/schedules/${id}`, { method: 'PATCH', body }),
        ),
        ...schedules.create.map((s) =>
          api<Schedule>(`${base}/schedules`, { method: 'POST', body: { ...s, endDate: s.endDate ?? undefined } }),
        ),
      ]);
    },
    onSettled: invalidate,
  });
}

/** Archivar (la API no borra: conserva el historial) o volver a activar. */
export function useSetMedicationActive(groupId: string) {
  const invalidate = useInvalidateGroup(groupId);
  return useMutation({
    mutationFn: async ({ medicationId, active }: { medicationId: string; active: boolean }) => {
      const path = `/groups/${groupId}/medications/${medicationId}`;
      if (active) await api<Medication>(path, { method: 'PATCH', body: { active } });
      else await api<void>(path, { method: 'DELETE' });
    },
    onSuccess: invalidate,
  });
}

export type StockMovementType = 'RESTOCK' | 'ADJUSTMENT';

export function useStockMovement(groupId: string) {
  const invalidate = useInvalidateGroup(groupId);
  return useMutation({
    mutationFn: ({
      medicationId,
      ...body
    }: {
      medicationId: string;
      type: StockMovementType;
      quantity: number;
      note?: string;
    }) => api<{ stock: number }>(`/groups/${groupId}/medications/${medicationId}/stock`, { method: 'POST', body }),
    onSuccess: invalidate,
  });
}

/** Tomas de hoy (GET /day), para la agenda diaria del plan. */
export function useTodayAgenda(groupId: string) {
  return useQuery({
    queryKey: ['groups', groupId, 'day', 'agenda'] as const,
    queryFn: () =>
      api<{ doses: { key: string; scheduledFor: string; medication: MedicationSummary }[] }>(`/groups/${groupId}/day`),
  });
}
