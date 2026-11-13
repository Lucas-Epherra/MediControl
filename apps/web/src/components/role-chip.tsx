import { ROLE_LABEL } from '@/lib/roles';
import type { GroupRole } from '@/lib/types';
import { HeartIcon, ShieldIcon } from './icons';

const ICON = { ADMIN: ShieldIcon, CAREGIVER: HeartIcon } satisfies Record<GroupRole, unknown>;

export function RoleChip({ role }: { role: GroupRole }) {
  const Icon = ICON[role];
  const admin = role === 'ADMIN';
  return (
    <span
      className={`inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-sm font-bold ${
        admin ? 'bg-primary-tint text-primary-hover' : 'border border-line bg-canvas text-ink'
      }`}
    >
      <Icon size={16} />
      {ROLE_LABEL[role]}
    </span>
  );
}
