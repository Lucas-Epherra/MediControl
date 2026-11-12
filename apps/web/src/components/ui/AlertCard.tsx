import { ReactNode } from "react";
import { Button } from "./Button";

export type AlertTone = "ahora" | "atrasada";

const TONE_CLASSES: Record<AlertTone, { card: string; chip: string }> = {
  ahora: {
    card: "bg-ahora-tint border border-ahora",
    chip: "bg-ahora-badge text-ahora-text",
  },
  atrasada: {
    card: "bg-atrasada-tint border border-atrasada",
    chip: "bg-atrasada text-white",
  },
};

export interface AlertCardProps {
  tone: AlertTone;
  icon: ReactNode;
  label: string;
  message: string;
  action?: { label: string; onClick?: () => void };
}

// AlertCard: avisos de stock bajo y recetas por vencer/vencidas. El tono
// (ahora = atención, atrasada = urgente) siempre va con ícono y texto.
export function AlertCard({ tone, icon, label, message, action }: AlertCardProps) {
  const classes = TONE_CLASSES[tone];
  return (
    <div className={`flex items-start gap-3.5 rounded-card p-4 ${classes.card}`}>
      <span
        className={`flex h-10 w-10 flex-none items-center justify-center rounded-full ${classes.chip}`}
      >
        {icon}
      </span>
      <div className="flex-1">
        <div className="font-bold">{label}</div>
        <div className="text-muted">{message}</div>
      </div>
      {action && (
        <Button variant="secondary" onClick={action.onClick} className="flex-none">
          {action.label}
        </Button>
      )}
    </div>
  );
}
