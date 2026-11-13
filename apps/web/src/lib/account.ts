'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { useSession } from './session';
import type { AuthUser } from './types';

/** `UpdateMeDto` de apps/api/src/auth/auth.dto.ts. */
export interface UpdateMeInput {
  name?: string;
  email?: string;
  currentPassword?: string;
}

export function useUpdateMe() {
  const { updateUser } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateMeInput) => api<AuthUser>('/auth/me', { method: 'PATCH', body: input }),
    onSuccess: (user) => {
      updateUser(user);
      // El nombre aparece en Hoy, Historial y Miembros: se vuelve a pedir todo.
      return queryClient.invalidateQueries();
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) =>
      api<void>('/auth/me/password', { method: 'PATCH', body: input }),
  });
}
