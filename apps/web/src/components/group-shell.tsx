'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ComponentType, ReactNode } from 'react';
import { can, ROLE_LABEL } from '@/lib/roles';
import { useSession } from '@/lib/session';
import type { Group } from '@/lib/types';
import { Avatar } from './avatar';
import { DoctorCallLink, PatientAlerts } from './patient-info';
import { CalendarIcon, ChevronDownIcon, ChevronRightIcon, HistoryIcon, LogoutIcon, PeopleIcon, PillIcon } from './icons';
import { Logo } from './logo';
import { UserMenu } from './user-menu';

interface NavItem {
  href: string;
  label: string;
  Icon: ComponentType<{ size?: number }>;
}

function navItems(group: Group): NavItem[] {
  const base = `/grupos/${group.id}`;
  const items: NavItem[] = [
    { href: base, label: 'Hoy', Icon: CalendarIcon },
    { href: `${base}/historial`, label: 'Historial', Icon: HistoryIcon },
  ];
  if (can(group.myRole, 'viewPlan')) items.push({ href: `${base}/plan`, label: 'Plan', Icon: PillIcon });
  if (can(group.myRole, 'viewMembers')) items.push({ href: `${base}/miembros`, label: 'Miembros', Icon: PeopleIcon });
  return items;
}

/** Barra lateral en escritorio; encabezado y barra inferior en celular. */
export function GroupShell({ group, children }: { group: Group; children: ReactNode }) {
  const pathname = usePathname();
  const items = navItems(group);
  const isCurrent = (href: string) => (href === `/grupos/${group.id}` ? pathname === href : pathname.startsWith(href));

  return (
    <div className="min-h-dvh lg:flex">
      <a
        href="#contenido"
        className="sr-only z-50 rounded-btn bg-primary px-4 py-3 font-bold text-white focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Saltar al contenido
      </a>

      <Sidebar group={group} items={items} isCurrent={isCurrent} />

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-16 print:!hidden items-center justify-between border-b border-line bg-white pr-3 pl-2 lg:hidden">
          <Link
            href="/grupos?elegir=1"
            aria-label={`${group.name}. Cambiar de grupo`}
            className="flex min-h-touch min-w-0 items-center gap-1.5 px-2 text-[20px] font-bold text-ink no-underline hover:text-ink"
          >
            <span className="truncate">{group.name}</span>
            <ChevronDownIcon size={20} className="flex-none" />
          </Link>
          <UserMenu subtitle={`${ROLE_LABEL[group.myRole]} · ${group.name}`} showSwitchGroup />
        </header>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-white px-4 pt-2.5 pb-3 lg:hidden print:!hidden">
          <span className="font-bold">{group.patientName}</span>
          <PatientAlerts group={group} />
          <DoctorCallLink group={group} />
        </div>

        <main id="contenido" tabIndex={-1} className="pb-[110px] outline-none lg:pb-12 print:!pb-0">
          {children}
        </main>

        <nav
          aria-label="Principal"
          className="fixed inset-x-0 bottom-0 z-20 grid h-[76px] print:!hidden border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
          style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
        >
          {items.map(({ href, label, Icon }) => {
            const current = isCurrent(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={current ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-0.5 text-nav no-underline ${
                  current
                    ? 'font-bold text-primary shadow-[inset_0_3px_0_#0D5C63]'
                    : 'text-muted hover:text-ink'
                }`}
              >
                <Icon size={26} />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

function Sidebar({
  group,
  items,
  isCurrent,
}: {
  group: Group;
  items: NavItem[];
  isCurrent: (href: string) => boolean;
}) {
  const { user, logout } = useSession();
  const router = useRouter();

  return (
    <aside className="sticky top-0 hidden h-dvh w-[264px] print:!hidden flex-none flex-col gap-[22px] overflow-y-auto border-r border-line bg-white px-4 py-5 lg:flex">
      <Logo size="sm" />
      <div className="flex flex-col gap-1.5 rounded-[14px] bg-canvas p-3.5">
        <span className="text-card font-bold">{group.name}</span>
        <span className="text-sm text-muted">Persona cuidada: {group.patientName}</span>
        <PatientAlerts group={group} compact />
        <DoctorCallLink group={group} />
        <Link
          href="/grupos?elegir=1"
          className="flex min-h-[44px] items-center gap-1.5 self-start text-sm font-bold no-underline"
        >
          Cambiar de grupo
          <ChevronRightIcon size={16} />
        </Link>
      </div>
      <nav aria-label="Principal">
        <ul className="flex flex-col gap-1">
          {items.map(({ href, label, Icon }) => {
            const current = isCurrent(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={current ? 'page' : undefined}
                  className={`flex min-h-[52px] items-center gap-3 rounded-btn px-3.5 text-[19px] no-underline ${
                    current
                      ? 'bg-primary font-bold text-white hover:text-white'
                      : 'text-ink hover:bg-canvas hover:text-ink'
                  }`}
                >
                  <Icon size={24} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {user && (
        <div className="mt-auto flex flex-col gap-3 border-t border-line pt-4">
          <Link
            href="/cuenta"
            aria-label={`${user.name}, ${ROLE_LABEL[group.myRole]}. Mi cuenta`}
            className="-mx-2 flex items-center gap-2.5 rounded-btn px-2 py-1.5 text-ink no-underline hover:bg-canvas hover:text-ink"
          >
            <Avatar name={user.name} muted={group.myRole !== 'ADMIN'} />
            <span className="flex min-w-0 flex-1 flex-col leading-tight">
              <b className="truncate">{user.name}</b>
              <span className="text-sm text-muted">{ROLE_LABEL[group.myRole]} · Mi cuenta</span>
            </span>
            <ChevronRightIcon size={18} className="flex-none text-muted" />
          </Link>
          <button
            type="button"
            onClick={() => {
              logout();
              router.replace('/login');
            }}
            className="flex min-h-touch items-center justify-center gap-2 rounded-btn border-[1.5px] border-line bg-white text-[17px] font-bold text-ink hover:border-muted"
          >
            <LogoutIcon size={20} />
            Cerrar sesión
          </button>
        </div>
      )}
    </aside>
  );
}
