export interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Nombre del medicamento o recurso, para el aria-label de +/-. */
  label?: string;
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
}: StepperProps) {
  const suffix = label ? ` ${label}` : "";
  return (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        aria-label={`Restar${suffix}`}
        onClick={() => onChange(Math.max(min, round(value - step)))}
        disabled={value <= min}
        className="h-16 w-16 flex-none rounded-card border-2 border-primary text-3xl font-bold text-primary disabled:border-disabled disabled:text-muted"
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
        className="box-border h-16 w-0 min-w-[64px] max-w-[140px] flex-1 rounded-card border-2 border-muted text-center text-[32px] font-bold"
      />
      <button
        type="button"
        aria-label={`Sumar${suffix}`}
        onClick={() => onChange(Math.min(max, round(value + step)))}
        disabled={value >= max}
        className="h-16 w-16 flex-none rounded-card border-2 border-primary text-3xl font-bold text-primary disabled:border-disabled disabled:text-muted"
      >
        +
      </button>
    </div>
  );
}
