import {
  AlertTriangleIcon,
  CheckIcon,
  ClockDashedIcon,
  ClockIcon,
  SkipIcon,
} from "./icons";

export type DoseStatus = "dada" | "omitida" | "ahora" | "pendiente" | "atrasada";
/** Estados de recetas y stock, con los mismos colores que las tomas (componente «Badge» del canvas). */
export type BadgeStatus = DoseStatus | "vigente" | "porvencer" | "vencida" | "stockbajo";

const CONFIG: Record<
  BadgeStatus,
  { label: string; classes: string; Icon: typeof CheckIcon }
> = {
  dada: {
    label: "Dada",
    classes: "bg-dada-tint text-dada border-dada",
    Icon: CheckIcon,
  },
  omitida: {
    label: "Omitida",
    classes: "bg-omitida-tint text-omitida border-omitida",
    Icon: SkipIcon,
  },
  ahora: {
    label: "Toca ahora",
    classes: "bg-ahora-badge text-ahora-text border-ahora",
    Icon: ClockIcon,
  },
  pendiente: {
    label: "Pendiente",
    classes: "bg-pendiente-tint text-pendiente border-line",
    Icon: ClockDashedIcon,
  },
  atrasada: {
    label: "Atrasada",
    classes: "bg-atrasada text-white border-atrasada",
    Icon: AlertTriangleIcon,
  },
  vigente: {
    label: "Vigente",
    classes: "bg-dada-tint text-dada border-dada",
    Icon: CheckIcon,
  },
  porvencer: {
    label: "Por vencer",
    classes: "bg-ahora-badge text-ahora-text border-ahora",
    Icon: ClockIcon,
  },
  vencida: {
    label: "Vencida",
    classes: "bg-atrasada text-white border-atrasada",
    Icon: AlertTriangleIcon,
  },
  stockbajo: {
    label: "Stock bajo",
    classes: "bg-ahora-badge text-ahora-text border-ahora",
    Icon: AlertTriangleIcon,
  },
};

export interface StatusBadgeProps {
  status: BadgeStatus;
  /** Reemplaza el texto por defecto; nunca se omite el texto. */
  text?: string;
  className?: string;
}

// Los 5 estados de una toma: siempre color + ícono + texto (nunca solo
// color), para que se distingan también en escala de grises.
export function StatusBadge({ status, text, className = "" }: StatusBadgeProps) {
  const { label, classes, Icon } = CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border-[1.5px] px-3 py-1.5 text-sm font-bold ${classes} ${className}`}
    >
      <Icon />
      {text ?? label}
    </span>
  );
}
