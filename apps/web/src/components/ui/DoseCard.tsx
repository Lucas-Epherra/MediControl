import { ReactNode } from "react";
import { Button, ButtonVariant } from "./Button";
import { BoxIcon } from "./icons";
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
  registeredBy?: { name: string; time: string; reason?: string; note?: string };
  /** Solo para Atrasada: hace cuánto debía darse. */
  lateSince?: string;
  /** Detalle chico del stock que queda; `low` lo resalta (stock bajo o sin stock). */
  stock?: { text: string; low: boolean };
  /** Línea de apoyo bajo las indicaciones, por ejemplo "Se puede registrar desde las 06:00". */
  note?: string;
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
  note,
  stock,
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
      {stock && (
        <div
          className={`mt-1.5 flex items-center gap-1.5 text-sm ${
            stock.low ? "font-bold text-ahora-text" : "text-muted"
          }`}
        >
          <BoxIcon width={16} height={16} className="flex-none" />
          {stock.text}
        </div>
      )}

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

      {/* La nota de quien registró queda a la vista: suele ser lo que necesita saber el próximo turno. */}
      {registeredBy?.note && (
        <p className="mt-2 whitespace-pre-line break-words rounded-btn bg-canvas px-3 py-2 text-sm">
          <b>Nota:</b> {registeredBy.note}
        </p>
      )}

      {note && <div className="mt-2 text-sm text-muted">{note}</div>}

      {actions && actions.length > 0 && (
        <div className="mt-3.5 flex flex-wrap gap-2.5">
          {actions.map((action) => (
            <Button
              key={action.label}
              variant={action.variant ?? "secondary"}
              icon={action.icon}
              onClick={action.onClick}
              // Como en la hoja: la acción principal ocupa más; Deshacer queda a su tamaño.
              // Si no entran en una fila (celular angosto), la principal queda arriba a todo el ancho.
              className={
                action.variant === "primary"
                  ? "flex-[2_1_14rem]"
                  : action.variant === "neutral"
                    ? ""
                    : "flex-[1_1_8rem]"
              }
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
