export const WEEKDAYS = [
  { value: 1, short: 'Lun', long: 'lunes' },
  { value: 2, short: 'Mar', long: 'martes' },
  { value: 3, short: 'Mié', long: 'miércoles' },
  { value: 4, short: 'Jue', long: 'jueves' },
  { value: 5, short: 'Vie', long: 'viernes' },
  { value: 6, short: 'Sáb', long: 'sábados' },
  { value: 7, short: 'Dom', long: 'domingos' },
] as const;

/** La API usa [] para «todos los días». */
export function daysLabel(daysOfWeek: number[]): string {
  const days = [...new Set(daysOfWeek)].sort();
  if (days.length === 0 || days.length === 7) return 'Todos los días';
  if (days.join() === '1,2,3,4,5') return 'De lunes a viernes';
  if (days.join() === '6,7') return 'Sábados y domingos';
  return days.map((d) => WEEKDAYS[d - 1].short).join(', ');
}

/** 1 → '1', 0.5 → '0,5'. */
export function formatAmount(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toLocaleString('es-AR', { maximumFractionDigits: 2 });
}

/** '5 comprimidos'; sin forma cargada, 'unidades'. */
export function formatUnits(n: number, form: string | null): string {
  return `${formatAmount(n)} ${form ?? 'unidades'}`;
}

/** Formas de uso común; la API acepta texto libre. */
export const FORMS = ['comprimidos', 'cápsulas', 'gotas', 'ml', 'ampollas', 'sobres', 'aplicaciones'];
