'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId } from 'react';
import { useSession } from '@/lib/session';
import { Avatar } from './avatar';
import { ChevronDownIcon, LogoutIcon, SwitchIcon } from './icons';

/** Botón con la inicial del usuario que abre un menú nativo (popover: Esc y clic afuera lo cierran). */
export function UserMenu({ subtitle, showSwitchGroup = false }: { subtitle?: string; showSwitchGroup?: boolean }) {
  const { user, logout } = useSession();
  const router = useRouter();
  const id = useId();
  if (!user) return null;

  function signOut() {
    logout();
    router.replace('/login');
  }

  return (
    <>
      <button
        type="button"
        popoverTarget={id}
        aria-label={`Menú de ${user.name}`}
        className="flex min-h-touch items-center gap-1.5 rounded-full border-[1.5px] border-line bg-white py-0 pr-2.5 pl-1.5 text-ink hover:border-muted"
      >
        <Avatar name={user.name} size="sm" />
        <ChevronDownIcon size={18} />
      </button>
      <div
        id={id}
        popover="auto"
        className="fixed inset-auto top-[60px] right-3 m-0 w-[280px] rounded-[14px] border border-line bg-white p-2 text-ink shadow-[0_12px_32px_rgba(23,40,43,0.18)]"
      >
        <div className="border-b border-line-soft px-3 pt-2.5 pb-3">
          <div className="font-bold">{user.name}</div>
          <div className="text-sm text-muted">{subtitle ?? user.email}</div>
        </div>
        {showSwitchGroup && (
          <Link
            href="/grupos?elegir=1"
            className="flex min-h-[52px] items-center gap-2.5 rounded-btn px-3 text-ink no-underline hover:bg-canvas"
          >
            <SwitchIcon size={22} />
            Cambiar de grupo
          </Link>
        )}
        <button
          type="button"
          onClick={signOut}
          className="flex min-h-[52px] w-full items-center gap-2.5 rounded-btn px-3 text-left text-ink hover:bg-canvas"
        >
          <LogoutIcon size={22} />
          Cerrar sesión
        </button>
      </div>
    </>
  );
}
