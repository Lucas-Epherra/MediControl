'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from './api';
import type { DoseHistory } from './types';

/** La API rechaza rangos más largos (MAX_HISTORY_DAYS en doses.service.ts). */
export const MAX_HISTORY_DAYS = 92;

export interface HistoryFilters {
  from: string;
  to: string;
  medicationId?: string;
}

export function useDoseHistory(groupId: string, filters: HistoryFilters, enabled = true) {
  const params = new URLSearchParams({ from: filters.from, to: filters.to });
  if (filters.medicationId) params.set('medicationId', filters.medicationId);
  return useQuery({
    queryKey: ['groups', groupId, 'doses', filters] as const,
    queryFn: () => api<DoseHistory>(`/groups/${groupId}/doses?${params}`),
    // Al cambiar un filtro se sigue viendo el resultado anterior hasta que llega el nuevo.
    placeholderData: keepPreviousData,
    enabled,
  });
}
