import { SelectHTMLAttributes, forwardRef, useId } from 'react';

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { value: string; label: string }[];
}

// Select nativo con el mismo aspecto que Field (el nativo es el más usable en celular).
export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, options, id, className = '', ...props },
  ref,
) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={selectId} className="text-sm font-bold">
        {label}
      </label>
      <select
        ref={ref}
        id={selectId}
        className={`box-border min-h-action min-w-0 rounded-btn border-2 border-muted bg-white px-2.5 font-sans text-base text-ink ${className}`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
});
