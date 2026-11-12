'use client';

import { NoAccess, Ref, SectionPlaceholder } from '@/components/section-placeholder';
import { useGroup } from '@/lib/group-context';
import { can } from '@/lib/roles';

export default function PlanPage() {
  const group = useGroup();
  if (!can(group.myRole, 'viewPlan')) return <NoAccess groupId={group.id} />;
  return (
    <SectionPlaceholder title="Plan de medicación">
      Medicamentos, horarios, stock y recetas se construyen en <Ref>#5</Ref>.
    </SectionPlaceholder>
  );
}
