'use client';

import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { InfoIcon } from './icons';

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'type'> {
  label: string;
  hint?: string;
  error?: string;
}

/** Igual que `Field` de components/ui, más el botón Mostrar/Ocultar del diseño de Ingresar. */
export function PasswordField({ label, hint, error, ...input }: PasswordFieldProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-bold">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`box-border min-h-action w-full rounded-btn border-2 px-3.5 pr-24 font-sans text-base ${
            error ? 'border-atrasada' : 'border-muted'
          }`}
          {...input}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          className="absolute right-1 top-1 min-h-touch rounded-btn px-3 text-sm font-bold text-primary underline underline-offset-[3px] hover:text-primary-hover"
        >
          {visible ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>
      {error ? (
        <span id={`${id}-error`} className="text-sm font-bold text-atrasada">
          {error}
        </span>
      ) : hint ? (
        <span id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </span>
      ) : null}
    </div>
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
