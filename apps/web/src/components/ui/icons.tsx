// Íconos en línea, calcados de los `<svg>` del canvas de referencia
// (hoja "Sistema de diseño" y componente "Badge"). Son decorativos: el
// texto del estado siempre acompaña al ícono, nunca reemplaza.
import { SVGProps } from "react";

function base(props: SVGProps<SVGSVGElement>) {
  return {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...props,
  };
}

export function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)} strokeWidth={2.6}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export function SkipIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)} strokeWidth={2.4}>
      <path d="M4 16a8 8 0 0 1 14.5-6" />
      <path d="M19 4v6h-6" />
    </svg>
  );
}

export function ClockIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)} strokeWidth={2.4}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function ClockDashedIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)} strokeWidth={2}>
      <circle cx="12" cy="12" r="9" strokeDasharray="2 3" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function AlertTriangleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)} strokeWidth={2.4}>
      <path d="M12 3.5l9 16H3z" />
      <path d="M12 10v4" />
      <path d="M12 17v.01" />
    </svg>
  );
}

export function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)} strokeWidth={2.4}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
