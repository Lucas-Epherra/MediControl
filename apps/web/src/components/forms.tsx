'use client';

import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { InfoIcon, SpinnerIcon } from './icons';

// Controles mínimos para los formularios de acceso. Cuando lleguen los componentes de #2
// (Button, Field), estos se reemplazan por aquellos.

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  hint?: string;
  error?: string;
  /** Contenido a la derecha del label, por ejemplo un enlace. */
  aside?: ReactNode;
}

export function TextField({ label, hint, error, aside, type, className, ...input }: TextFieldProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const isPassword = type === 'password';
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ''}`}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="font-bold">
          {label}
        </label>
        {aside}
      </div>
      <div className="relative">
        <input
          id={id}
          type={isPassword && visible ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`h-action w-full min-w-0 rounded-btn border-2 bg-surface px-3.5 text-base text-ink outline-offset-0 placeholder:text-muted focus-visible:border-primary ${
            error ? 'border-atrasada' : 'border-muted'
          } ${isPassword ? 'pr-24' : ''}`}
          {...input}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-pressed={visible}
            className="absolute top-1 right-1 h-touch rounded-btn px-3 text-sm font-bold text-primary underline underline-offset-3 hover:text-primary-hover"
          >
            {visible ? 'Ocultar' : 'Mostrar'}
          </button>
        )}
      </div>
      {error && (
        <span id={`${id}-error`} className="flex items-center gap-1.5 text-sm font-bold text-atrasada">
          <InfoIcon size={18} />
          {error}
        </span>
      )}
      {hint && (
        <span id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </span>
      )}
    </div>
  );
}

export function SubmitButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex min-h-action items-center justify-center gap-2 rounded-btn border-2 border-primary bg-primary px-5 text-[20px] font-bold text-white hover:border-primary-hover hover:bg-primary-hover disabled:border-line disabled:bg-line-soft disabled:text-muted"
    >
      {pending && <SpinnerIcon size={22} />}
      {children}
    </button>
  );
}

export function FormAlert({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-btn border-[1.5px] border-atrasada bg-atrasada-tint px-3.5 py-3 text-[17px] text-atrasada-text"
    >
      <InfoIcon size={22} className="mt-0.5 flex-none" />
      <span>{children}</span>
    </div>
  );
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
