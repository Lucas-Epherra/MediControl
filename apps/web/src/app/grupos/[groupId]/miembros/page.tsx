'use client';

import { NoAccess, Ref, SectionPlaceholder } from '@/components/section-placeholder';
import { useGroup } from '@/lib/group-context';
import { can } from '@/lib/roles';

export default function MiembrosPage() {
  const group = useGroup();
  if (!can(group.myRole, 'viewMembers')) return <NoAccess groupId={group.id} />;
  return (
    <SectionPlaceholder title="Miembros">
      Miembros e invitaciones se construyen en <Ref>#6</Ref>.
    </SectionPlaceholder>
  );
}
