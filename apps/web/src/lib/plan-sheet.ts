'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import type { PrescriptionStatus } from './prescriptions';

/** Respuesta de GET /groups/:groupId/plan-sheet (PlanSheet en apps/api/src/medications/plan-sheet.ts). */
export interface PlanSheet {
  date: string;
  patientName: string;
  allergies: string | null;
  groupName: string;
  notes: string | null;
  slots: { time: string; items: PlanSheetItem[] }[];
  prescriptions: {
    description: string;
    medication: string | null;
    expiresAt: string;
    status: PrescriptionStatus;
    daysLeft: number;
  }[];
}

export interface PlanSheetItem {
  medication: string;
  dose: string;
  instructions: string | null;
  days: string;
  period: string | null;
}

export function usePlanSheet(groupId: string) {
  return useQuery({
    queryKey: ['groups', groupId, 'plan-sheet'] as const,
    queryFn: () => api<PlanSheet>(`/groups/${groupId}/plan-sheet`),
  });
}
