'use client';

import { Button } from '@/components/ui';
import { formatShortDate, isoDateInZone } from '@/lib/dates';
import { usePendingInvitations, useRevokeInvitation } from '@/lib/members';
import { ROLE_LABEL } from '@/lib/roles';

function expiresIn(iso: string): string {
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  return days <= 1 ? 'vence en menos de un día' : `vence en ${days} días`;
}

/** Links generados que nadie usó todavía. Anular uno lo deja inservible. */
export function PendingInvitations({
  groupId,
  timeZone,
  onNotify,
}: {
  groupId: string;
  timeZone: string;
  onNotify: (text: string, tone?: 'ok' | 'error') => void;
}) {
  const invitations = usePendingInvitations(groupId);
  const revoke = useRevokeInvitation(groupId);

  if (invitations.isError) {
    return <p className="text-sm text-muted">No se pudieron cargar las invitaciones pendientes.</p>;
  }
  if (!invitations.data?.length) return null;

  return (
    <section aria-labelledby="pendientes-h" className="flex flex-col gap-2.5">
      <h2 id="pendientes-h" className="text-h2 font-bold">
        Invitaciones pendientes
      </h2>
      <ul className="flex flex-col gap-2">
        {invitations.data.map((invitation) => (
          <li
            key={invitation.id}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-btn border border-line bg-white px-4 py-3"
          >
            <span className="min-w-0 flex-[1_1_260px]">
              <b>Link para {ROLE_LABEL[invitation.role].toLowerCase()}</b>
              {invitation.email && <> · {invitation.email}</>}
              <span className="block text-sm text-muted">
                Lo creó {invitation.createdBy.name} el {formatShortDate(isoDateInZone(invitation.createdAt, timeZone))} ·{' '}
                {expiresIn(invitation.expiresAt)}
              </span>
            </span>
            <Button
              variant="danger"
              disabled={revoke.isPending}
              onClick={() =>
                revoke.mutate(invitation.id, {
                  onSuccess: () => onNotify('Link anulado: ya no sirve para entrar.'),
                  onError: (error) => onNotify(error.message, 'error'),
                })
              }
            >
              Anular link
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
