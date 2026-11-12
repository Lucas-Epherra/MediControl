import { ButtonHTMLAttributes, ReactNode, forwardRef } from "react";

export type ButtonVariant = "primary" | "secondary" | "neutral" | "danger";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: ReactNode;
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-btn font-bold font-sans transition-colors disabled:cursor-not-allowed";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "min-h-action px-6 text-base border-2 border-primary bg-primary text-white hover:bg-primary-hover disabled:border-disabled disabled:bg-disabled disabled:text-muted disabled:hover:bg-disabled",
  secondary:
    "min-h-action px-6 text-base border-2 border-primary bg-white text-primary hover:bg-primary-tint disabled:border-disabled disabled:bg-disabled disabled:text-muted disabled:hover:bg-disabled",
  neutral:
    "min-h-touch px-4 text-sm border-[1.5px] border-line bg-white text-ink hover:bg-canvas disabled:border-disabled disabled:bg-disabled disabled:text-muted disabled:hover:bg-disabled",
  danger:
    "min-h-touch px-4 text-base border-0 bg-transparent text-atrasada hover:underline disabled:text-muted disabled:hover:no-underline",
};

// Button: variantes primary/secondary/neutral/danger de la issue #2.
// Primario = única acción por tarjeta o modal; secundario = alternativa
// segura; neutro = corrección (Deshacer); danger = texto solo, peligro.
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ variant = "primary", icon, className = "", children, ...props }, ref) {
    return (
      <button
        ref={ref}
        className={`${base} ${variantClasses[variant]} ${className}`}
        {...props}
      >
        {icon}
        {children}
      </button>
    );
  }
);
