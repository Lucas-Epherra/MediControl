'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import type { Medication } from './types';

export function useMedications(groupId: string, { includeInactive = false } = {}) {
  return useQuery({
    queryKey: ['groups', groupId, 'medications', { includeInactive }] as const,
    queryFn: () =>
      api<Medication[]>(`/groups/${groupId}/medications${includeInactive ? '?includeInactive=true' : ''}`),
  });
}

/** 'Enalapril 10 mg' */
export function medicationLabel(medication: { name: string; strength: string | null }): string {
  return medication.strength ? `${medication.name} ${medication.strength}` : medication.name;
}
