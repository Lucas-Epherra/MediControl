'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import type { Alert, DayResponse, DoseRecord, Group } from './types';

export const queryKeys = {
  groups: ['groups'] as const,
  group: (groupId: string) => ['groups', groupId] as const,
  day: (groupId: string, date?: string) => ['groups', groupId, 'day', date ?? 'hoy'] as const,
  days: (groupId: string) => ['groups', groupId, 'day'] as const,
  alerts: (groupId: string) => ['groups', groupId, 'alerts'] as const,
};

/** La vista del día se vuelve a pedir cada 30 s y al volver a la pestaña (sin WebSocket). */
const LIVE = { refetchInterval: 30_000, refetchOnWindowFocus: true, staleTime: 0 } as const;

export function useDay(groupId: string, date?: string) {
  return useQuery({
    queryKey: queryKeys.day(groupId, date),
    queryFn: () => api<DayResponse>(`/groups/${groupId}/day${date ? `?date=${date}` : ''}`),
    ...LIVE,
  });
}

export function useAlerts(groupId: string) {
  return useQuery({
    queryKey: queryKeys.alerts(groupId),
    queryFn: () => api<{ date: string; alerts: Alert[] }>(`/groups/${groupId}/alerts`),
    ...LIVE,
  });
}


export interface RecordDoseInput {
  scheduleId: string;
  scheduledFor: string;
  status: 'GIVEN' | 'SKIPPED';
  notes?: string;
}

/** Registrar, deshacer o reponer cambia tomas, stock y avisos: se refresca todo junto. */
function useRefreshDay(groupId: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.days(groupId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts(groupId) }),
      // Historial (lib/history.ts) y medicamentos con su stock (lib/medications.ts).
      queryClient.invalidateQueries({ queryKey: ['groups', groupId, 'doses'] }),
      queryClient.invalidateQueries({ queryKey: ['groups', groupId, 'medications'] }),
    ]);
}

export function useRecordDose(groupId: string) {
  const refresh = useRefreshDay(groupId);
  return useMutation({
    mutationFn: (input: RecordDoseInput) =>
      api<DoseRecord & { stock: number }>(`/groups/${groupId}/doses`, { method: 'POST', body: input }),
    // También tras un 409: la lista tiene que mostrar quién la registró.
    onSettled: refresh,
  });
}

export function useUndoDose(groupId: string) {
  const refresh = useRefreshDay(groupId);
  return useMutation({
    mutationFn: (doseId: string) => api<void>(`/groups/${groupId}/doses/${doseId}`, { method: 'DELETE' }),
    onSettled: refresh,
  });
}


export function useGroups() {
  return useQuery({ queryKey: queryKeys.groups, queryFn: () => api<Group[]>('/groups') });
}

export function useGroupQuery(groupId: string) {
  return useQuery({
    queryKey: queryKeys.group(groupId),
    queryFn: () => api<Group>(`/groups/${groupId}`),
  });
}

export interface CreateGroupInput {
  name: string;
  patientName: string;
  notes?: string;
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateGroupInput) => api<Group>('/groups', { method: 'POST', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.groups }),
  });
}
