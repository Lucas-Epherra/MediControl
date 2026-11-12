'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, type FormEvent } from 'react';
import { AuthShell } from '@/components/auth-shell';
import { EMAIL_PATTERN, FormAlert, PasswordField } from '@/components/forms';
import { SpinnerIcon } from '@/components/icons';
import { Button, Field } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { safeNextPath } from '@/lib/next-path';
import { useSession } from '@/lib/session';

export default function IngresarPage() {
  return (
    <AuthShell>
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}

function LoginForm() {
  const { status, login } = useSession();
  const router = useRouter();
  const next = safeNextPath(useSearchParams().get('siguiente'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') router.replace(next);
  }, [status, router, next]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const found = {
      email: !email.trim()
        ? 'Escribí tu email'
        : !EMAIL_PATTERN.test(email.trim())
          ? 'Revisá el formato del email (ej.: nombre@correo.com)'
          : undefined,
      password: password ? undefined : 'Escribí tu contraseña',
    };
    setErrors(found);
    if (found.email || found.password) return;

    setPending(true);
    try {
      await login(email.trim(), password);
    } catch (error) {
      setErrors({
        form:
          error instanceof ApiError && error.isUnauthorized
            ? 'El email o la contraseña no coinciden. Revisalos e intentá de nuevo.'
            : error instanceof Error
              ? error.message
              : 'No se pudo ingresar.',
      });
      setPending(false);
    }
  }

  return (
    <>
      <div>
        <h1 className="text-[30px] leading-[1.2] font-bold lg:text-[36px] lg:leading-[1.15]">Ingresar</h1>
        <p className="mt-2 text-muted">Usá el email con el que te invitaron o te registraste.</p>
      </div>
      <form noValidate onSubmit={submit} className="flex flex-col gap-[18px]">
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <PasswordField
          label="Contraseña"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        {errors.form && <FormAlert>{errors.form}</FormAlert>}
        <Button type="submit" disabled={pending} icon={pending ? <SpinnerIcon size={22} /> : undefined}>
          {pending ? 'Ingresando…' : 'Ingresar'}
        </Button>
      </form>
      <div className="flex flex-col items-center gap-2 border-t border-line pt-5 lg:block">
        <span className="text-muted">¿Es tu primera vez? </span>
        <Link
          href={next === '/grupos' ? '/registro' : `/registro?siguiente=${encodeURIComponent(next)}`}
          className="flex min-h-action w-full items-center justify-center rounded-btn border-2 border-primary bg-white text-[19px] font-bold no-underline lg:inline lg:min-h-0 lg:w-auto lg:border-0 lg:bg-transparent lg:text-base lg:underline"
        >
          Crear cuenta
        </Link>
      </div>
    </>
  );
}
