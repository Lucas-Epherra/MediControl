'use client';

import { createContext, useContext } from 'react';
import type { Group } from './types';

export const GroupContext = createContext<Group | null>(null);

/** Grupo actual dentro de /grupos/[groupId]. Lo provee el layout del grupo. */
export function useGroup(): Group {
  const group = useContext(GroupContext);
  if (!group) throw new Error('useGroup se usa dentro del layout de un grupo');
  return group;
}
