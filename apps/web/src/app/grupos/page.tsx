'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, type FormEvent } from 'react';
import { FormAlert } from '@/components/forms';
import { FullScreenLoader } from '@/components/full-screen-loader';
import { PatientAlerts } from '@/components/patient-info';
import { ChevronRightIcon, PlusIcon, SpinnerIcon } from '@/components/icons';
import { Button, Field } from '@/components/ui';
import { Logo } from '@/components/logo';
import { RequireSession } from '@/components/require-session';
import { RoleChip } from '@/components/role-chip';
import { UserMenu } from '@/components/user-menu';
import { useCreateGroup, useGroups } from '@/lib/queries';
import { useSession } from '@/lib/session';

export default function GruposPage() {
  return (
    <RequireSession>
      <Suspense>
        <GroupPicker />
      </Suspense>
    </RequireSession>
  );
}

function GroupPicker() {
  const { user } = useSession();
  const router = useRouter();
  const choosing = useSearchParams().get('elegir') === '1';
  const groups = useGroups();
  const [creating, setCreating] = useState(false);

  // Con un solo grupo no hay nada que elegir: se entra directo (salvo que venga de «Cambiar de grupo»).
  const only = groups.data?.length === 1 && !choosing ? groups.data[0] : null;
  useEffect(() => {
    if (only) router.replace(`/grupos/${only.id}`);
  }, [only, router]);

  if (groups.isPending || only) return <FullScreenLoader />;

  const firstName = user?.name.split(' ')[0] ?? '';
  const list = groups.data ?? [];
  const empty = list.length === 0;

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 lg:px-8">
          <Logo />
          <UserMenu />
        </div>
      </header>

      <main className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-6 lg:gap-7 lg:px-8 lg:py-14">
        <div>
          <h1 className="text-h1 font-bold lg:text-[40px] lg:leading-[1.15]">Hola, {firstName}</h1>
          <p className="mt-1.5 text-muted lg:mt-2 lg:text-[20px]">
            {empty ? 'Todavía no participás en ningún grupo de cuidado.' : 'Elegí a quién vas a cuidar hoy.'}
          </p>
        </div>

        {groups.isError ? (
          <div className="flex flex-col items-start gap-3">
            <FormAlert>{groups.error.message}</FormAlert>
            <button
              type="button"
              onClick={() => groups.refetch()}
              className="min-h-touch rounded-btn border-2 border-primary bg-white px-4 font-bold text-primary"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(320px,1fr))] lg:gap-5">
            {list.map((group, index) => (
              <li key={group.id}>
                <Link
                  href={`/grupos/${group.id}`}
                  className={`flex h-full items-center gap-3.5 rounded-card bg-white px-4 py-[18px] text-ink no-underline hover:border-primary hover:text-ink lg:min-h-[220px] lg:flex-col lg:items-stretch lg:p-6 ${
                    index === 0 ? 'border-2 border-primary' : 'border-[1.5px] border-line'
                  }`}
                >
                  <span className="flex flex-1 flex-col gap-1">
                    <span className="text-card font-bold lg:text-[26px] lg:leading-[1.2]">{group.name}</span>
                    <span className="text-muted">Persona cuidada: {group.patientName}</span>
                    <span className="mt-1.5 flex flex-wrap gap-2">
                      <RoleChip role={group.myRole} />
                    </span>
                    <span className="mt-1.5 hidden lg:flex">
                      <PatientAlerts group={group} />
                    </span>
                  </span>
                  <span className="flex flex-none items-center gap-1.5 font-bold text-primary lg:mt-auto lg:pt-4">
                    <span className="hidden lg:inline">Entrar</span>
                    <ChevronRightIcon size={24} />
                  </span>
                </Link>
              </li>
            ))}
            {!creating && !empty && (
              <li>
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="flex h-full min-h-[88px] w-full items-center justify-center gap-2.5 rounded-card border-2 border-dashed border-[#9aa7a9] text-[20px] font-bold text-primary hover:border-primary hover:bg-primary-tint lg:min-h-[220px] lg:flex-col"
                >
                  <PlusIcon size={28} />
                  Crear un grupo nuevo
                </button>
              </li>
            )}
          </ul>
        )}

        {(creating || empty) && !groups.isError && (
          <CreateGroupForm
            onCancel={empty ? undefined : () => setCreating(false)}
            onCreated={(id) => router.push(`/grupos/${id}`)}
          />
        )}
        {empty && (
          <p className="text-muted">
            ¿Te invitaron a un grupo? Abrí el link de invitación que te mandaron y vas a entrar directo.
          </p>
        )}
      </main>
    </div>
  );
}

function CreateGroupForm({ onCancel, onCreated }: { onCancel?: () => void; onCreated: (id: string) => void }) {
  const create = useCreateGroup();
  const [name, setName] = useState('');
  const [patientName, setPatientName] = useState('');
  const [allergies, setAllergies] = useState('');
  const [errors, setErrors] = useState<{ name?: string; patientName?: string }>({});

  function submit(event: FormEvent) {
    event.preventDefault();
    const found = {
      name: name.trim() ? undefined : 'Escribí un nombre para el grupo',
      patientName: patientName.trim() ? undefined : 'Escribí el nombre de la persona que cuidan',
    };
    setErrors(found);
    if (found.name || found.patientName) return;
    create.mutate(
      { name: name.trim(), patientName: patientName.trim(), patientAllergies: allergies.trim() || undefined },
      { onSuccess: (group) => onCreated(group.id) },
    );
  }

  return (
    <section
      aria-labelledby="crear-grupo"
      className="max-w-[640px] rounded-card border-[1.5px] border-line bg-white p-5 lg:p-7"
    >
      <h2 id="crear-grupo" className="text-h2 font-bold">
        Crear un grupo de cuidado
      </h2>
      <p className="mt-1 text-muted">Vas a quedar como administrador y después podés invitar a los demás.</p>
      <form noValidate onSubmit={submit} className="mt-5 flex flex-col gap-[18px]">
        <Field
          label="Nombre del grupo"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          hint="Por ejemplo: Cuidado de Marta."
          error={errors.name}
        />
        <Field
          label="Persona cuidada"
          autoComplete="off"
          value={patientName}
          onChange={(e) => setPatientName(e.target.value)}
          maxLength={80}
          error={errors.patientName}
        />
        <Field
          label="Alergias"
          value={allergies}
          onChange={(e) => setAllergies(e.target.value)}
          maxLength={500}
          hint="Opcional. Se ven siempre arriba de las tomas del día. El médico y otros datos se completan después en Miembros."
        />
        {create.isError && <FormAlert>{create.error.message}</FormAlert>}
        <div className="flex flex-wrap gap-2.5">
          <Button
            type="submit"
            disabled={create.isPending}
            icon={create.isPending ? <SpinnerIcon size={22} /> : undefined}
          >
            {create.isPending ? 'Creando…' : 'Crear grupo'}
          </Button>
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancelar
            </Button>
          )}
        </div>
      </form>
    </section>
  );
}
