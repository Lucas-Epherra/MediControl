export interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Nombre del medicamento o recurso, para el aria-label de +/-. */
  label?: string;
  /** "compact" (48 px) para formularios en columnas; "large" (64 px) para el modal de stock. */
  size?: "large" | "compact";
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

// Stepper numérico (−/cantidad/+) para reponer o ajustar stock. Admite
// medias unidades vía `step`.
export function Stepper({
  value,
  onChange,
  min = 0,
  max = Infinity,
  step = 1,
  label,
  size = "large",
}: StepperProps) {
  const suffix = label ? ` ${label}` : "";
  const button =
    size === "large"
      ? "h-16 w-16 rounded-card text-3xl"
      : "h-12 w-12 rounded-btn text-2xl";
  const input =
    size === "large"
      ? "h-16 min-w-[64px] max-w-[140px] rounded-card text-[32px]"
      : "h-12 min-w-[56px] max-w-[96px] rounded-btn text-[22px]";
  return (
    <div className="flex min-w-0 items-center gap-2">
      <button
        type="button"
        aria-label={`Restar${suffix}`}
        onClick={() => onChange(Math.max(min, round(value - step)))}
        disabled={value <= min}
        className={`${button} flex-none border-2 border-primary font-bold text-primary disabled:border-disabled disabled:text-muted`}
      >
        −
      </button>
      <input
        type="number"
        inputMode="decimal"
        aria-label={label ?? "Cantidad"}
        value={value}
        step={step}
        min={min}
        max={max === Infinity ? undefined : max}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isNaN(n)) onChange(n);
        }}
        className={`${input} box-border w-0 flex-1 border-2 border-muted text-center font-bold`}
      />
      <button
        type="button"
        aria-label={`Sumar${suffix}`}
        onClick={() => onChange(Math.min(max, round(value + step)))}
        disabled={value >= max}
        className={`${button} flex-none border-2 border-primary font-bold text-primary disabled:border-disabled disabled:text-muted`}
      >
        +
      </button>
    </div>
  );
}
