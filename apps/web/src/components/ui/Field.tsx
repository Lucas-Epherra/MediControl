import { InputHTMLAttributes, forwardRef, useId } from "react";

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

// Field: label + input + error en rojo (o pista neutra) con los mismos
// tokens que la hoja "Campos" (altura 56px, borde 2px, radio btn).
export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, error, hint, id, className = "", ...props },
  ref
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="font-bold">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={`box-border min-h-action rounded-btn border-2 px-3.5 font-sans text-base ${
          error ? "border-atrasada" : "border-muted"
        } ${className}`}
        {...props}
      />
      {error ? (
        <span id={errorId} className="text-sm font-bold text-atrasada">
          {error}
        </span>
      ) : hint ? (
        <span id={hintId} className="text-sm text-muted">
          {hint}
        </span>
      ) : null}
    </div>
  );
});
