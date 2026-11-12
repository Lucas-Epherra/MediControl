'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Avatar } from '@/components/avatar';
import { FormAlert } from '@/components/forms';
import { SpinnerIcon } from '@/components/icons';
import { Button, Modal, SelectField } from '@/components/ui';
import { ROLE_DESCRIPTION, useMembers, useRemoveMember, useUpdateMemberRole, type Member } from '@/lib/members';
import { queryKeys } from '@/lib/queries';
import { ROLE_LABEL } from '@/lib/roles';
import type { GroupRole } from '@/lib/types';

const ROLE_OPTIONS: GroupRole[] = ['CAREGIVER', 'VIEWER', 'ADMIN'];

interface MemberListProps {
  groupId: string;
  patientName: string;
  userId: string;
  onNotify: (text: string, tone?: 'ok' | 'error') => void;
  /** Al salir del grupo, quien sale deja de tener acceso: la página lo saca de acá. */
  onLeft: () => void;
}

export function MemberList({ groupId, patientName, userId, onNotify, onLeft }: MemberListProps) {
  const members = useMembers(groupId);
  const updateRole = useUpdateMemberRole(groupId);
  const remove = useRemoveMember(groupId);
  const queryClient = useQueryClient();
  const [removing, setRemoving] = useState<Member | null>(null);

  if (members.isPending) {
    return (
      <p role="status" className="flex items-center gap-2 py-8 text-muted">
        <SpinnerIcon size={22} className="text-primary" /> Cargando miembros…
      </p>
    );
  }
  if (members.isError) {
    return (
      <div className="flex flex-col items-start gap-3">
        <FormAlert>{members.error.message}</FormAlert>
        <Button variant="secondary" onClick={() => members.refetch()}>
          Reintentar
        </Button>
      </div>
    );
  }

  const list = members.data;
  const admins = list.filter((m) => m.role === 'ADMIN').length;
  const isSelf = (m: Member) => m.id === userId;

  function changeRole(member: Member, role: GroupRole) {
    updateRole.mutate(
      { userId: member.id, role },
      {
        onSuccess: () => {
          onNotify(`${member.name} ahora es ${ROLE_LABEL[role].toLowerCase()}.`);
          // Si cambiaste tu propio rol, los permisos de la interfaz salen del grupo: se recarga.
          if (isSelf(member)) void queryClient.invalidateQueries({ queryKey: queryKeys.group(groupId) });
        },
        onError: (error) => onNotify(error.message, 'error'),
      },
    );
  }

  function confirmRemove() {
    if (!removing) return;
    const member = removing;
    remove.mutate(member.id, {
      onSuccess: () => {
        setRemoving(null);
        if (isSelf(member)) onLeft();
        else onNotify(`${member.name} ya no forma parte del grupo.`);
      },
    });
  }

  return (
    <section aria-labelledby="miembros-h" className="flex flex-col gap-2.5">
      <h2 id="miembros-h" className="text-h2 font-bold">
        {list.length === 1 ? 'Solo vos cuidás' : `${list.length} personas cuidan`} a {patientName}
      </h2>
      <ul className="overflow-hidden rounded-card border border-line bg-white">
        {list.map((member) => {
          const lastAdmin = member.role === 'ADMIN' && admins === 1;
          return (
            <li
              key={member.id}
              className="flex flex-col gap-3 border-t border-line-soft px-4 py-4 first:border-t-0 md:flex-row md:items-center md:gap-5"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar name={member.name} muted={member.role !== 'ADMIN'} />
                <span className="min-w-0">
                  <b className="block truncate">
                    {member.name}
                    {isSelf(member) && ' (vos)'}
                  </b>
                  <span className="block truncate text-sm text-muted">{member.email}</span>
                </span>
              </div>

              {lastAdmin ? (
                <p className="text-sm text-muted md:w-[240px]">
                  Único administrador. Para cambiar su rol, primero nombrá a otra persona como administrador.
                </p>
              ) : (
                <div className="md:w-[240px]">
                  <SelectField
                    label={`Rol de ${member.name}`}
                    value={member.role}
                    disabled={updateRole.isPending}
                    onChange={(e) => changeRole(member, e.target.value as GroupRole)}
                    options={ROLE_OPTIONS.map((role) => ({ value: role, label: ROLE_LABEL[role] }))}
                  />
                  <p className="mt-1 text-sm text-muted">{ROLE_DESCRIPTION[member.role]}</p>
                </div>
              )}

              <div className="md:flex-none">
                {!lastAdmin && (
                  <Button variant="danger" onClick={() => setRemoving(member)}>
                    {isSelf(member) ? 'Salir del grupo' : 'Quitar'}
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <Modal
        open={!!removing}
        onOpenChange={(open) => {
          if (!open) {
            setRemoving(null);
            remove.reset();
          }
        }}
        title={removing && isSelf(removing) ? '¿Salir del grupo?' : `¿Quitar a ${removing?.name ?? ''}?`}
        description={
          removing && isSelf(removing)
            ? 'Vas a dejar de ver las tomas de este grupo. Para volver, alguien tiene que invitarte de nuevo.'
            : 'Va a dejar de ver el grupo. Lo que registró queda en el historial.'
        }
      >
        {remove.isError && <FormAlert>{remove.error.message}</FormAlert>}
        <Button
          onClick={confirmRemove}
          disabled={remove.isPending}
          icon={remove.isPending ? <SpinnerIcon size={22} /> : undefined}
          className="w-full"
        >
          {removing && isSelf(removing) ? 'Sí, salir' : 'Sí, quitar'}
        </Button>
        <Button variant="secondary" onClick={() => setRemoving(null)} className="w-full">
          Cancelar
        </Button>
      </Modal>
    </section>
  );
}
