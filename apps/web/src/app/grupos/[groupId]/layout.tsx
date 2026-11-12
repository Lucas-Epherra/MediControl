'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { FormAlert } from '@/components/forms';
import { FullScreenLoader } from '@/components/full-screen-loader';
import { GroupShell } from '@/components/group-shell';
import { InfoIcon } from '@/components/icons';
import { RequireSession } from '@/components/require-session';
import { ApiError } from '@/lib/api';
import { GroupContext } from '@/lib/group-context';
import { useGroupQuery } from '@/lib/queries';

export default function GroupLayout({ children }: { children: ReactNode }) {
  return (
    <RequireSession>
      <GroupGate>{children}</GroupGate>
    </RequireSession>
  );
}

function GroupGate({ children }: { children: ReactNode }) {
  const { groupId } = useParams<{ groupId: string }>();
  const group = useGroupQuery(groupId);

  if (group.isPending) return <FullScreenLoader />;

  if (group.isError) {
    // La API responde 404 tanto si el grupo no existe como si no sos miembro (no revela cuál).
    const notFound = group.error instanceof ApiError && group.error.isNotFound;
    return (
      <main className="mx-auto flex min-h-dvh max-w-[520px] flex-col justify-center gap-5 px-5">
        {notFound ? (
          <>
            <span className="flex size-[52px] items-center justify-center rounded-full bg-primary-tint text-primary">
              <InfoIcon size={28} />
            </span>
            <h1 className="text-h1 font-bold">No encontramos este grupo</h1>
            <p className="text-muted">
              Puede que el link esté mal o que no formes parte del grupo. Si te invitaron, abrí el link de invitación
              que te mandaron.
            </p>
          </>
        ) : (
          <FormAlert>{group.error.message}</FormAlert>
        )}
        <div className="flex flex-wrap gap-2.5">
          {!notFound && (
            <button
              type="button"
              onClick={() => group.refetch()}
              className="min-h-action rounded-btn border-2 border-primary bg-primary px-5 text-[19px] font-bold text-white hover:bg-primary-hover"
            >
              Reintentar
            </button>
          )}
          <Link
            href="/grupos?elegir=1"
            className="flex min-h-action items-center rounded-btn border-2 border-primary bg-white px-5 text-[19px] font-bold no-underline"
          >
            Ver mis grupos
          </Link>
        </div>
      </main>
    );
  }

  return (
    <GroupContext.Provider value={group.data}>
      <GroupShell group={group.data}>{children}</GroupShell>
    </GroupContext.Provider>
  );
}
