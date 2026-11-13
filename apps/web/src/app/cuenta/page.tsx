'use client';

import Link from 'next/link';
import { useCallback, useState, type FormEvent, type ReactNode } from 'react';
import { EMAIL_PATTERN, FormAlert, PasswordField } from '@/components/forms';
import { ChevronLeftIcon, SpinnerIcon } from '@/components/icons';
import { Logo } from '@/components/logo';
import { RequireSession } from '@/components/require-session';
import { RoleChip } from '@/components/role-chip';
import { Toast, type ToastMessage } from '@/components/toast';
import { Button, Field, Modal } from '@/components/ui';
import { UserMenu } from '@/components/user-menu';
import { useChangePassword, useUpdateMe } from '@/lib/account';
import { useRemoveMember } from '@/lib/members';
import { useGroups } from '@/lib/queries';
import { useSession } from '@/lib/session';
import type { AuthUser, Group } from '@/lib/types';

const MIN_PASSWORD = 8;

export default function CuentaPage() {
  return (
    <RequireSession>
      <Account />
    </RequireSession>
  );
}

type Notify = (text: string, tone?: ToastMessage['tone']) => void;

function Account() {
  const { user } = useSession();
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const notify = useCallback<Notify>((text, tone = 'ok') => setToast({ id: Date.now(), text, tone }), []);
  const dismissToast = useCallback(() => setToast(null), []);
  if (!user) return null;

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 lg:px-8">
          <Logo />
          <UserMenu />
        </div>
      </header>

      <main className="mx-auto flex max-w-[760px] flex-col gap-6 px-4 py-6 lg:px-8 lg:py-10">
        <Link href="/grupos?elegir=1" className="-mb-2 flex min-h-touch items-center gap-1.5 self-start font-bold no-underline">
          <ChevronLeftIcon size={22} />
          Mis grupos
        </Link>
        <div>
          <h1 className="text-h1 font-bold lg:text-display">Mi cuenta</h1>
          <p className="mt-1 text-muted">Tus datos valen para todos los grupos en los que participás.</p>
        </div>

        {/* La key remonta el formulario con lo guardado. */}
        <ProfileCard key={`${user.name}|${user.email}`} user={user} onNotify={notify} />
        <PasswordCard onNotify={notify} />
        <GroupsCard userId={user.id} onNotify={notify} />
      </main>

      <Toast toast={toast} onDismiss={dismissToast} />
    </div>
  );
}

function Card({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4 rounded-card border border-line bg-white p-5 lg:p-6">
      <h2 id={id} className="text-h2 font-bold">
        {title}
      </h2>
      {children}
    </section>
  );
}

function ProfileCard({ user, onNotify }: { user: AuthUser; onNotify: Notify }) {
  const update = useUpdateMe();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [currentPassword, setCurrentPassword] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string; currentPassword?: string }>({});
  const emailChanged = email.trim().toLowerCase() !== user.email;
  const dirty = name.trim() !== user.name || emailChanged;

  function save(event: FormEvent) {
    event.preventDefault();
    const found = {
      name: name.trim() ? undefined : 'Escribí tu nombre',
      email: !email.trim()
        ? 'Escribí tu email'
        : !EMAIL_PATTERN.test(email.trim())
          ? 'Revisá el formato del email (ej.: nombre@correo.com)'
          : undefined,
      currentPassword: emailChanged && !currentPassword ? 'Para cambiar el email, escribí tu contraseña actual' : undefined,
    };
    setErrors(found);
    if (found.name || found.email || found.currentPassword) return;
    update.mutate(
      {
        name: name.trim(),
        ...(emailChanged ? { email: email.trim(), currentPassword } : {}),
      },
      { onSuccess: () => onNotify('Tus datos quedaron guardados.') },
    );
  }

  return (
    <Card id="datos-h" title="Datos personales">
      <form noValidate onSubmit={save} className="flex flex-col gap-4">
        <Field
          label="Nombre"
          autoComplete="name"
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          hint="Así te ven los demás en el registro de tomas."
        />
        <Field
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          hint="Es el que usás para ingresar."
        />
        {emailChanged && (
          <PasswordField
            label="Contraseña actual"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            error={errors.currentPassword}
            hint="Por seguridad, para cambiar el email."
          />
        )}
        {update.isError && <FormAlert>{update.error.message}</FormAlert>}
        <Button
          type="submit"
          disabled={!dirty || update.isPending}
          icon={update.isPending ? <SpinnerIcon size={22} /> : undefined}
          className="self-start"
        >
          {update.isPending ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </form>
    </Card>
  );
}

function PasswordCard({ onNotify }: { onNotify: Notify }) {
  const change = useChangePassword();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [errors, setErrors] = useState<{ current?: string; next?: string }>({});

  function save(event: FormEvent) {
    event.preventDefault();
    const found = {
      current: current ? undefined : 'Escribí tu contraseña actual',
      next:
        next.length < MIN_PASSWORD
          ? `La contraseña nueva necesita al menos ${MIN_PASSWORD} caracteres`
          : next === current
            ? 'La contraseña nueva tiene que ser distinta de la actual'
            : undefined,
    };
    setErrors(found);
    if (found.current || found.next) return;
    change.mutate(
      { currentPassword: current, newPassword: next },
      {
        onSuccess: () => {
          setCurrent('');
          setNext('');
          onNotify('Listo, cambiaste tu contraseña.');
        },
      },
    );
  }

  return (
    <Card id="clave-h" title="Contraseña">
      <form noValidate onSubmit={save} className="flex flex-col gap-4">
        <PasswordField
          label="Contraseña actual"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          error={errors.current}
        />
        <PasswordField
          label="Contraseña nueva"
          autoComplete="new-password"
          value={next}
          maxLength={72}
          onChange={(e) => setNext(e.target.value)}
          error={errors.next}
          hint={`Mínimo ${MIN_PASSWORD} caracteres.`}
        />
        {change.isError && <FormAlert>{change.error.message}</FormAlert>}
        <Button
          type="submit"
          disabled={change.isPending}
          icon={change.isPending ? <SpinnerIcon size={22} /> : undefined}
          className="self-start"
        >
          {change.isPending ? 'Cambiando…' : 'Cambiar contraseña'}
        </Button>
      </form>
    </Card>
  );
}

function GroupsCard({ userId, onNotify }: { userId: string; onNotify: Notify }) {
  const groups = useGroups();

  return (
    <Card id="grupos-h" title="Mis grupos">
      {groups.isPending ? (
        <p role="status" className="flex items-center gap-2 text-muted">
          <SpinnerIcon size={22} className="text-primary" /> Cargando grupos…
        </p>
      ) : groups.isError ? (
        <div className="flex flex-col items-start gap-3">
          <FormAlert>{groups.error.message}</FormAlert>
          <Button variant="secondary" onClick={() => groups.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : groups.data.length === 0 ? (
        <p className="text-muted">Todavía no participás en ningún grupo.</p>
      ) : (
        <ul className="-my-1 flex flex-col">
          {groups.data.map((group) => (
            <GroupRow key={group.id} group={group} userId={userId} onNotify={onNotify} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function GroupRow({ group, userId, onNotify }: { group: Group; userId: string; onNotify: Notify }) {
  const leave = useRemoveMember(group.id);
  const groups = useGroups();
  const [confirming, setConfirming] = useState(false);

  function confirmLeave() {
    leave.mutate(userId, {
      onSuccess: () => {
        setConfirming(false);
        void groups.refetch();
        onNotify(`Saliste de ${group.name}.`);
      },
    });
  }

  return (
    <li className="flex flex-col gap-3 border-t border-line-soft py-4 first:border-t-0 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Link href={`/grupos/${group.id}`} className="font-bold">
          {group.name}
        </Link>
        <span className="text-sm text-muted">Paciente: {group.patientName}</span>
        <RoleChip role={group.myRole} />
      </div>
      <Button variant="danger" onClick={() => setConfirming(true)} className="self-start sm:self-center">
        Salir del grupo
      </Button>

      <Modal
        open={confirming}
        onOpenChange={(open) => {
          if (!open) {
            setConfirming(false);
            leave.reset();
          }
        }}
        title={`¿Salir de ${group.name}?`}
        description="Vas a dejar de ver las tomas de este grupo. Para volver, alguien tiene que invitarte de nuevo."
      >
        {leave.isError && <FormAlert>{leave.error.message}</FormAlert>}
        <Button
          onClick={confirmLeave}
          disabled={leave.isPending}
          icon={leave.isPending ? <SpinnerIcon size={22} /> : undefined}
          className="w-full"
        >
          Sí, salir
        </Button>
        <Button variant="secondary" onClick={() => setConfirming(false)} className="w-full">
          Cancelar
        </Button>
      </Modal>
    </li>
  );
}
