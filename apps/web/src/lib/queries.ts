'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import type { Group } from './types';

export const queryKeys = {
  groups: ['groups'] as const,
  group: (groupId: string) => ['groups', groupId] as const,
};

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
