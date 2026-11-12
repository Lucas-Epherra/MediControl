'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

export type PrescriptionStatus = 'VALID' | 'EXPIRING' | 'EXPIRED';

/** Respuesta de /groups/:groupId/prescriptions (apps/api/src/prescriptions). */
export interface Prescription {
  id: string;
  description: string;
  medicationId: string | null;
  medication: { id: string; name: string; strength: string | null } | null;
  issuedAt: string | null;
  expiresAt: string;
  notes: string | null;
  status: PrescriptionStatus;
  daysLeft: number;
}

export interface PrescriptionInput {
  description: string;
  medicationId: string | null;
  issuedAt: string | null;
  expiresAt: string;
  notes: string | null;
}

export function usePrescriptions(groupId: string) {
  return useQuery({
    queryKey: ['groups', groupId, 'prescriptions'] as const,
    queryFn: () => api<Prescription[]>(`/groups/${groupId}/prescriptions`),
  });
}

export function useSavePrescription(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: PrescriptionInput & { id?: string }) =>
      id
        ? api<Prescription>(`/groups/${groupId}/prescriptions/${id}`, { method: 'PATCH', body: input })
        : api<Prescription>(`/groups/${groupId}/prescriptions`, {
            method: 'POST',
            body: { ...input, notes: input.notes ?? undefined },
          }),
    // También cambian los avisos de Hoy.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups', groupId] }),
  });
}

export function useDeletePrescription(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/groups/${groupId}/prescriptions/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups', groupId] }),
  });
}

/** 'Venció hace 2 días', 'Vence hoy', 'Vence en 3 días'. */
export function expiryLabel(daysLeft: number): string {
  if (daysLeft < 0) return `Venció hace ${-daysLeft} ${daysLeft === -1 ? 'día' : 'días'}`;
  if (daysLeft === 0) return 'Vence hoy';
  return `Vence en ${daysLeft} ${daysLeft === 1 ? 'día' : 'días'}`;
}
