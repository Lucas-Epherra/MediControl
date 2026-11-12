'use client';

import { useRef, useState, type FormEvent } from 'react';
import { EMAIL_PATTERN, FormAlert } from '@/components/forms';
import { SpinnerIcon } from '@/components/icons';
import { Button, CheckIcon, Field } from '@/components/ui';
import { ROLE_DESCRIPTION, useCreateInvitation } from '@/lib/members';
import { ROLE_LABEL } from '@/lib/roles';
import type { GroupRole } from '@/lib/types';

const ROLES: GroupRole[] = ['CAREGIVER', 'VIEWER', 'ADMIN'];

/** Genera un link de invitación. El link se ve una sola vez: después solo queda como pendiente. */
export function InvitePanel({ groupId }: { groupId: string }) {
  const create = useCreateInvitation(groupId);
  const linkRef = useRef<HTMLInputElement>(null);
  const [role, setRole] = useState<GroupRole>('CAREGIVER');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string>();
  const [copied, setCopied] = useState(false);
  const link = create.data?.url;

  function reset() {
    create.reset();
    setCopied(false);
  }

  function generate(event: FormEvent) {
    event.preventDefault();
    const trimmed = email.trim();
    if (trimmed && !EMAIL_PATTERN.test(trimmed)) {
      setEmailError('Revisá el formato del email (ej.: nombre@correo.com)');
      return;
    }
    setEmailError(undefined);
    setCopied(false);
    create.mutate({ role, email: trimmed || undefined });
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // Sin permiso de portapapeles: se deja el texto seleccionado para copiarlo a mano.
      linkRef.current?.select();
      return;
    }
    setCopied(true);
  }

  return (
    <section aria-labelledby="invitar-h" className="flex flex-col gap-4 rounded-card border border-line bg-white p-5">
      <h2 id="invitar-h" className="text-h2 font-bold">
        Invitar a alguien
      </h2>

      {link ? (
        <div className="flex flex-col gap-2.5">
          <label htmlFor="invitacion-link" className="font-bold">
            Link para {ROLE_LABEL[create.data!.role].toLowerCase()}
            {create.data!.email && <span className="font-normal text-muted"> ({create.data!.email})</span>}
          </label>
          <input
            ref={linkRef}
            id="invitacion-link"
            readOnly
            value={link}
            onFocus={(e) => e.target.select()}
            className="box-border min-h-action w-full rounded-btn border-2 border-muted bg-canvas px-3.5 font-sans text-sm text-ink"
          />
          <Button
            variant="secondary"
            onClick={copy}
            icon={copied ? <CheckIcon width={22} height={22} /> : undefined}
            className={copied ? '!border-dada !bg-dada-tint !text-dada' : ''}
          >
            {copied ? '¡Copiado!' : 'Copiar link'}
          </Button>
          <p className="text-sm text-muted" aria-live="polite">
            Pegalo en WhatsApp o por mail. Sirve para una persona y vence en 7 días. Este link no se vuelve a mostrar.
          </p>
          <Button variant="neutral" onClick={reset}>
            Generar otro link
          </Button>
        </div>
      ) : (
        <form noValidate onSubmit={generate} className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 font-bold">¿Con qué rol entra?</legend>
            {ROLES.map((option) => {
              const checked = role === option;
              return (
                <label
                  key={option}
                  className={`flex cursor-pointer items-start gap-3 rounded-btn px-3.5 py-3 ${
                    checked ? 'border-2 border-primary bg-primary-tint' : 'border-[1.5px] border-line bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="rol-invitacion"
                    value={option}
                    checked={checked}
                    onChange={() => setRole(option)}
                    className="mt-0.5 h-[22px] w-[22px] flex-none accent-primary"
                  />
                  <span>
                    <b>{ROLE_LABEL[option]}</b>
                    <span className="block text-sm text-muted">{ROLE_DESCRIPTION[option]}</span>
                  </span>
                </label>
              );
            })}
          </fieldset>
          <Field
            label="Email (opcional)"
            type="email"
            inputMode="email"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            hint="Si lo completás, solo una cuenta con ese email puede aceptar."
            error={emailError}
          />
          {create.isError && <FormAlert>{create.error.message}</FormAlert>}
          <Button
            type="submit"
            disabled={create.isPending}
            icon={create.isPending ? <SpinnerIcon size={22} /> : undefined}
          >
            {create.isPending ? 'Generando…' : 'Generar link de invitación'}
          </Button>
        </form>
      )}
    </section>
  );
}
