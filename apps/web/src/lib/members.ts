'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { queryKeys } from './queries';
import type { Group, GroupRole } from './types';

/** `flattenMember` de apps/api/src/groups/groups.service.ts. */
export interface Member {
  id: string;
  name: string;
  email: string;
  role: GroupRole;
  joinedAt: string;
}

/** `listPending` de apps/api/src/groups/invitations.service.ts. */
export interface PendingInvitation {
  id: string;
  email: string | null;
  role: GroupRole;
  expiresAt: string;
  createdAt: string;
  createdBy: { id: string; name: string };
}

/** Respuesta de POST /groups/:groupId/invitations: el token solo se ve esta vez. */
export interface CreatedInvitation {
  id: string;
  email: string | null;
  role: GroupRole;
  expiresAt: string;
  token: string;
  url: string;
}

/** Respuesta pública de GET /invitations/:token. */
export interface InvitationPreview {
  group: { id: string; name: string; patientName: string };
  role: GroupRole;
  email: string | null;
  invitedBy: string;
  expiresAt: string;
}

const keys = {
  members: (groupId: string) => ['groups', groupId, 'members'] as const,
  invitations: (groupId: string) => ['groups', groupId, 'invitations'] as const,
  preview: (token: string) => ['invitations', token] as const,
};

export function useMembers(groupId: string) {
  return useQuery({ queryKey: keys.members(groupId), queryFn: () => api<Member[]>(`/groups/${groupId}/members`) });
}

export function usePendingInvitations(groupId: string) {
  return useQuery({
    queryKey: keys.invitations(groupId),
    queryFn: () => api<PendingInvitation[]>(`/groups/${groupId}/invitations`),
  });
}

export function useUpdateMemberRole(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: GroupRole }) =>
      api<Member>(`/groups/${groupId}/members/${userId}`, { method: 'PATCH', body: { role } }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: keys.members(groupId) }),
  });
}

export function useRemoveMember(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api<void>(`/groups/${groupId}/members/${userId}`, { method: 'DELETE' }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: keys.members(groupId) }),
  });
}

export function useCreateInvitation(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { role: GroupRole; email?: string }) =>
      api<CreatedInvitation>(`/groups/${groupId}/invitations`, { method: 'POST', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.invitations(groupId) }),
  });
}

export function useRevokeInvitation(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) =>
      api<void>(`/groups/${groupId}/invitations/${invitationId}`, { method: 'DELETE' }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: keys.invitations(groupId) }),
  });
}

export function useUpdateGroup(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; patientName: string; notes: string }) =>
      api<Group>(`/groups/${groupId}`, { method: 'PATCH', body: input }),
    onSuccess: (group) => {
      queryClient.setQueryData(queryKeys.group(groupId), group);
      return queryClient.invalidateQueries({ queryKey: queryKeys.groups, exact: true });
    },
  });
}

export function useInvitationPreview(token: string) {
  return useQuery({
    queryKey: keys.preview(token),
    queryFn: () => api<InvitationPreview>(`/invitations/${encodeURIComponent(token)}`, { anonymous: true }),
    retry: false,
  });
}

export function useAcceptInvitation(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<Group>(`/invitations/${encodeURIComponent(token)}/accept`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.groups }),
  });
}

export const ROLE_DESCRIPTION: Record<GroupRole, string> = {
  CAREGIVER: 'Registra tomas y repone stock.',
  VIEWER: 'Solo mira.',
  ADMIN: 'Puede hacer todo.',
};
