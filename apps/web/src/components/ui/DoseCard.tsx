import { ReactNode } from "react";
import { Button, ButtonVariant } from "./Button";
import { DoseStatus, StatusBadge } from "./StatusBadge";

export interface DoseCardAction {
  label: string;
  variant?: ButtonVariant;
  icon?: ReactNode;
  onClick?: () => void;
}

export interface DoseCardProps {
  time: string;
  medication: string;
  instructions: string;
  status: DoseStatus;
  /** Quién la registró y cuándo (Dada/Omitida), con motivo si corresponde. */
  registeredBy?: { name: string; time: string; reason?: string };
  /** Solo para Atrasada: hace cuánto debía darse. */
  lateSince?: string;
  /**
   * Qué botones mostrar. El componente no decide permisos: lo resuelve
   * quien lo usa (según rol) y pasa solo las acciones permitidas.
   */
  actions?: DoseCardAction[];
}

const CARD_TONE: Record<DoseStatus, string> = {
  atrasada: "bg-atrasada-card border-[2.5px] border-atrasada",
  ahora: "bg-ahora-tint border-[2.5px] border-ahora",
  dada: "bg-white border border-line",
  omitida: "bg-white border border-line",
  pendiente: "bg-white border border-line",
};

// DoseCard: anatomía de la hoja "Tarjeta de toma" — hora (26px tabular) +
// insignia, medicamento y dosis, indicaciones, línea de registro, acciones.
export function DoseCard({
  time,
  medication,
  instructions,
  status,
  registeredBy,
  lateSince,
  actions,
}: DoseCardProps) {
  return (
    <div className={`box-border rounded-card p-4 ${CARD_TONE[status]}`}>
      <div className="flex items-center justify-between">
        <span className="font-sans text-[26px] font-bold tabular-nums">{time}</span>
        <StatusBadge status={status} />
      </div>
      <div className="mt-2.5 text-card font-bold">{medication}</div>
      <div className="text-muted">{instructions}</div>

      {status === "atrasada" && lateSince && (
        <div className="mt-1.5 text-sm font-bold text-atrasada">
          Debía darse a las {time} · {lateSince}
        </div>
      )}

      {registeredBy && (
        <div className="mt-2.5 text-sm">
          {status === "omitida" ? "Omitida" : "Dada"} por {registeredBy.name} ·{" "}
          {registeredBy.time}
          {registeredBy.reason ? ` · motivo: ${registeredBy.reason}` : ""}
        </div>
      )}

      {actions && actions.length > 0 && (
        <div className="mt-3.5 flex gap-2.5">
          {actions.map((action) => (
            <Button
              key={action.label}
              variant={action.variant ?? "secondary"}
              icon={action.icon}
              onClick={action.onClick}
              className="flex-1"
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
