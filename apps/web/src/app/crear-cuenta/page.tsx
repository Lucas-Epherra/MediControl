'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, type FormEvent } from 'react';
import { AuthShell } from '@/components/auth-shell';
import { EMAIL_PATTERN, FormAlert, SubmitButton, TextField } from '@/components/forms';
import { ChevronLeftIcon } from '@/components/icons';
import { ApiError } from '@/lib/api';
import { safeNextPath } from '@/lib/next-path';
import { useSession } from '@/lib/session';

const MIN_PASSWORD = 8;

export default function CrearCuentaPage() {
  return (
    <AuthShell>
      <Suspense>
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}

type Errors = { name?: string; email?: string; password?: string; form?: string };

function RegisterForm() {
  const { status, register } = useSession();
  const router = useRouter();
  const next = safeNextPath(useSearchParams().get('siguiente'));
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);
  const loginHref = next === '/grupos' ? '/ingresar' : `/ingresar?siguiente=${encodeURIComponent(next)}`;

  useEffect(() => {
    if (status === 'authenticated') router.replace(next);
  }, [status, router, next]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const found: Errors = {
      name: name.trim() ? undefined : 'Escribí tu nombre',
      email: !email.trim()
        ? 'Falta completar el email (ej.: nombre@correo.com)'
        : !EMAIL_PATTERN.test(email.trim())
          ? 'Revisá el formato del email (ej.: nombre@correo.com)'
          : undefined,
      password:
        password.length < MIN_PASSWORD ? `La contraseña necesita al menos ${MIN_PASSWORD} caracteres` : undefined,
    };
    setErrors(found);
    if (found.name || found.email || found.password) return;

    setPending(true);
    try {
      await register(name.trim(), email.trim(), password);
    } catch (error) {
      if (error instanceof ApiError && error.isConflict) {
        setErrors({ email: 'Ya hay una cuenta con ese email. Ingresá con ella.' });
      } else {
        setErrors({ form: error instanceof Error ? error.message : 'No se pudo crear la cuenta.' });
      }
      setPending(false);
    }
  }

  return (
    <>
      <Link
        href={loginHref}
        className="-mt-6 flex min-h-touch items-center gap-1.5 self-start font-bold no-underline lg:hidden"
      >
        <ChevronLeftIcon size={22} />
        Volver
      </Link>
      <div>
        <h1 className="text-[30px] leading-[1.2] font-bold lg:text-[36px] lg:leading-[1.15]">Crear cuenta</h1>
        <p className="mt-2 text-muted">Después vas a poder crear un grupo o sumarte a uno con una invitación.</p>
      </div>
      <form noValidate onSubmit={submit} className="flex flex-col gap-4.5">
        <TextField
          label="Nombre"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          hint="Así te van a ver los demás en el registro."
          error={errors.name}
        />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <TextField
          label="Contraseña"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          maxLength={72}
          hint={`Mínimo ${MIN_PASSWORD} caracteres.`}
          error={errors.password}
        />
        {errors.form && <FormAlert>{errors.form}</FormAlert>}
        <SubmitButton pending={pending}>{pending ? 'Creando cuenta…' : 'Crear cuenta'}</SubmitButton>
      </form>
      <p className="border-t border-line pt-5 text-center text-muted lg:text-left">
        ¿Ya tenés cuenta?{' '}
        <Link href={loginHref} className="inline-block min-h-touch leading-[48px] font-bold">
          Ingresar
        </Link>
      </p>
    </>
  );
}
