'use client';

import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, getToken, onUnauthorized, setToken } from './api';
import type { AuthUser, Session } from './types';

type Status = 'loading' | 'authenticated' | 'anonymous';

interface SessionValue {
  status: Status;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  /** Después de editar la cuenta: el token sigue valiendo, cambian los datos que se muestran. */
  updateUser: (user: AuthUser) => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);

  const clear = useCallback(() => {
    setToken(null);
    setUser(null);
    setStatus('anonymous');
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => onUnauthorized(clear), [clear]);

  useEffect(() => {
    if (!getToken()) {
      setStatus('anonymous');
      return;
    }
    api<AuthUser>('/auth/me')
      .then((me) => {
        setUser(me);
        setStatus('authenticated');
      })
      // Un 401 ya cerró la sesión vía onUnauthorized; sin red, se vuelve a ingresar.
      .catch(clear);
  }, [clear]);

  const start = useCallback((session: Session) => {
    setToken(session.accessToken);
    setUser(session.user);
    setStatus('authenticated');
  }, []);

  const value = useMemo<SessionValue>(
    () => ({
      status,
      user,
      login: async (email, password) =>
        start(await api<Session>('/auth/login', { method: 'POST', body: { email, password }, anonymous: true })),
      register: async (name, email, password) =>
        start(await api<Session>('/auth/register', { method: 'POST', body: { name, email, password }, anonymous: true })),
      logout: clear,
      updateUser: setUser,
    }),
    [status, user, start, clear],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession se usa dentro de SessionProvider');
  return value;
}
