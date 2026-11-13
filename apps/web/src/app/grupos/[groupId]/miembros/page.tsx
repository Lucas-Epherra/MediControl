'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { DoctorCard } from '@/components/miembros/doctor-card';
import { InvitePanel } from '@/components/miembros/invite-panel';
import { MemberList } from '@/components/miembros/member-list';
import { PatientCard } from '@/components/miembros/patient-card';
import { PendingInvitations } from '@/components/miembros/pending-invitations';
import { NoAccess } from '@/components/section-placeholder';
import { Toast, type ToastMessage } from '@/components/toast';
import { useGroup } from '@/lib/group-context';
import { queryKeys } from '@/lib/queries';
import { can } from '@/lib/roles';
import { useSession } from '@/lib/session';

export default function MiembrosPage() {
  const group = useGroup();
  const { user } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const notify = useCallback((text: string, tone: ToastMessage['tone'] = 'ok') => {
    setToast({ id: Date.now(), text, tone });
  }, []);
  const dismissToast = useCallback(() => setToast(null), []);

  if (!can(group.myRole, 'manageMembers')) return <NoAccess groupId={group.id} />;

  function left() {
    queryClient.removeQueries({ queryKey: queryKeys.group(group.id) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.groups });
    router.replace('/grupos?elegir=1');
  }

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 pb-8 pt-5 lg:gap-7 lg:px-10 lg:pt-10">
      <div>
        <h1 className="text-h1 font-bold lg:text-display">Miembros</h1>
        <p className="mt-1 text-muted">Quiénes forman parte del grupo, cómo sumar a alguien más, y los datos del o la paciente y de su médico.</p>
      </div>

      <div className="flex flex-wrap items-start gap-6 lg:gap-7">
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-6">
          <MemberList
            groupId={group.id}
            patientName={group.patientName}
            userId={user?.id ?? ''}
            onNotify={notify}
            onLeft={left}
          />
          <PendingInvitations groupId={group.id} timeZone={group.timezone} onNotify={notify} />
          {/* Debajo de la lista, para no dejar el hueco junto al panel de invitar. La key remonta el
              formulario con lo guardado. */}
          <PatientCard
            key={[group.patientName, group.patientBirthDate, group.patientAllergies, group.patientConditions, group.notes, group.name].join('|')}
            group={group}
            onNotify={notify}
          />
        </div>
        <aside className="flex min-w-0 flex-[1_1_340px] flex-col gap-6">
          <InvitePanel groupId={group.id} />
          <DoctorCard
            key={[group.doctorName, group.doctorSpecialty, group.doctorPhone, group.doctorEmail].join('|')}
            group={group}
            onNotify={notify}
          />
        </aside>
      </div>

      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}
