import type { GroupRole } from './types';

/** Acciones que la interfaz muestra u oculta según el rol (docs/ARQUITECTURA.md §3.3). */
export type Action =
  | 'recordDose'
  | 'undoOthersDose'
  | 'adjustStock'
  | 'editPlan'
  | 'manageMembers'
  | 'viewPlan'
  | 'viewMembers';

const ALLOWED: Record<Action, GroupRole[]> = {
  recordDose: ['ADMIN', 'CAREGIVER'],
  undoOthersDose: ['ADMIN'],
  adjustStock: ['ADMIN', 'CAREGIVER'],
  editPlan: ['ADMIN'],
  viewPlan: ['ADMIN', 'CAREGIVER'],
  manageMembers: ['ADMIN'],
  viewMembers: ['ADMIN'],
};

export function can(role: GroupRole | undefined, action: Action): boolean {
  return role !== undefined && ALLOWED[action].includes(role);
}

export const ROLE_LABEL: Record<GroupRole, string> = {
  ADMIN: 'Administrador',
  CAREGIVER: 'Cuidador',
  VIEWER: 'Observador',
};
