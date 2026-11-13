'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AuthShell } from '@/components/auth-shell';
import { FormAlert } from '@/components/forms';
import { InfoIcon, SpinnerIcon } from '@/components/icons';
import { RoleChip } from '@/components/role-chip';
import { Button } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { ROLE_DESCRIPTION, useAcceptInvitation, useInvitationPreview } from '@/lib/members';
import { useSession } from '@/lib/session';

export default function InvitacionPage() {
  const { token } = useParams<{ token: string }>();
  return (
    <AuthShell>
      <Invitation token={token} />
    </AuthShell>
  );
}

const linkButton =
  'flex min-h-action items-center justify-center rounded-btn border-2 px-6 text-base font-bold no-underline';

function Invitation({ token }: { token: string }) {
  const { status, user, logout } = useSession();
  const router = useRouter();
  const preview = useInvitationPreview(token);
  const accept = useAcceptInvitation(token);
  const here = `/invitaciones/${encodeURIComponent(token)}`;
  const next = `?siguiente=${encodeURIComponent(here)}`;

  if (preview.isPending || status === 'loading') {
    return (
      <p role="status" className="flex items-center gap-2 text-muted">
        <SpinnerIcon size={22} className="text-primary" /> Cargando invitación…
      </p>
    );
  }

  if (preview.isError) {
    const error = preview.error;
    const gone = error instanceof ApiError && (error.status === 410 || error.isNotFound);
    return (
      <div className="flex flex-col gap-5">
        <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-primary-tint text-primary">
          <InfoIcon size={28} />
        </span>
        <h1 className="text-[30px] font-bold leading-[1.2]">
          {gone ? 'Esta invitación ya no sirve' : 'No se pudo abrir la invitación'}
        </h1>
        <p className="text-muted">
          {error instanceof ApiError && error.isNotFound ? 'El link no existe o fue anulado.' : error.message}{' '}
          {gone && 'Pedile a quien te invitó que genere un link nuevo.'}
        </p>
        {!gone && (
          <Button variant="secondary" onClick={() => preview.refetch()}>
            Reintentar
          </Button>
        )}
        <Link href="/" className={`${linkButton} border-primary bg-white text-primary`}>
          Ir a MediControl
        </Link>
      </div>
    );
  }

  const invitation = preview.data;
  const wrongAccount = !!(user && invitation.email && invitation.email !== user.email);
  const alreadyMember = accept.error instanceof ApiError && accept.error.isConflict;

  function acceptAndEnter() {
    accept.mutate(undefined, { onSuccess: (group) => router.replace(`/grupos/${group.id}`) });
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[30px] font-bold leading-[1.2] lg:text-[36px] lg:leading-[1.15]">
        {invitation.invitedBy} te invitó a sumarte
      </h1>

      <dl className="flex flex-col gap-4 rounded-card border border-line bg-white p-5">
        <div>
          <dt className="text-sm text-muted">Grupo</dt>
          <dd className="text-card font-bold">{invitation.group.name}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Paciente</dt>
          <dd className="font-bold">{invitation.group.patientName}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Tu rol</dt>
          <dd className="mt-1 flex flex-col gap-1.5">
            <RoleChip role={invitation.role} />
            <span className="text-sm text-muted">{ROLE_DESCRIPTION[invitation.role]}</span>
          </dd>
        </div>
        {invitation.email && (
          <div>
            <dt className="text-sm text-muted">Es para</dt>
            <dd className="font-bold">{invitation.email}</dd>
          </div>
        )}
      </dl>

      {status === 'authenticated' && user ? (
        <div className="flex flex-col gap-3">
          {wrongAccount ? (
            <>
              <FormAlert>
                Esta invitación es para {invitation.email} y ingresaste como {user.email}. Entrá con esa cuenta para
                aceptarla.
              </FormAlert>
              <Button
                onClick={() => {
                  logout();
                  router.replace(`/login${next}`);
                }}
              >
                Cerrar sesión y entrar con otra cuenta
              </Button>
            </>
          ) : alreadyMember ? (
            <>
              <p className="rounded-btn bg-primary-tint px-4 py-3 font-bold text-primary-hover">
                Ya sos miembro de este grupo.
              </p>
              <Link href={`/grupos/${invitation.group.id}`} className={`${linkButton} border-primary bg-primary text-white hover:text-white`}>
                Entrar al grupo
              </Link>
            </>
          ) : (
            <>
              <p className="text-sm text-muted">
                Vas a entrar como <b className="text-ink">{user.name}</b> ({user.email}).
              </p>
              {accept.isError && <FormAlert>{accept.error.message}</FormAlert>}
              <Button
                onClick={acceptAndEnter}
                disabled={accept.isPending}
                icon={accept.isPending ? <SpinnerIcon size={22} /> : undefined}
              >
                {accept.isPending ? 'Entrando…' : 'Aceptar y entrar'}
              </Button>
            </>
          )}
          <Link href="/grupos" className={`${linkButton} border-primary bg-white text-primary`}>
            Ahora no
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Link href={`/login${next}`} className={`${linkButton} border-primary bg-primary text-white hover:text-white`}>
            Ingresar para aceptar
          </Link>
          <Link href={`/registro${next}`} className={`${linkButton} border-primary bg-white text-primary`}>
            Crear cuenta
          </Link>
          <p className="text-center text-sm text-muted">
            Después de ingresar o crear tu cuenta volvés a esta pantalla para aceptar.
          </p>
        </div>
      )}
    </div>
  );
}
