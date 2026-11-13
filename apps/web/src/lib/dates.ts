// Fechas en la zona horaria del grupo (no la del navegador). Las fechas sin
// hora viajan como 'YYYY-MM-DD', igual que en la API.

const isoDateFormatters = new Map<string, Intl.DateTimeFormat>();

/** 'YYYY-MM-DD' del instante dado en la zona indicada. */
export function isoDateInZone(instant: Date | string, zone: string): string {
  let formatter = isoDateFormatters.get(zone);
  if (!formatter) {
    // en-CA formatea como YYYY-MM-DD.
    formatter = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' });
    isoDateFormatters.set(zone, formatter);
  }
  return formatter.format(typeof instant === 'string' ? new Date(instant) : instant);
}

export function todayInZone(zone: string): string {
  return isoDateInZone(new Date(), zone);
}

export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000);
}

/** 'HH:MM' (24 h) del instante en la zona del grupo. */
export function formatTime(instant: string | Date, zone: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: zone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(instant));
}

// Una fecha sin hora se formatea al mediodía UTC para que ninguna zona la corra de día.
function calendarDate(isoDate: string) {
  return new Date(`${isoDate}T12:00:00Z`);
}

/** 'jueves 12 de noviembre' */
export function formatLongDate(isoDate: string): string {
  return new Intl.DateTimeFormat('es-AR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' })
    .format(calendarDate(isoDate))
    .replace(',', '');
}

/** 'Hoy · jueves 12 de noviembre', 'Ayer · …' o solo la fecha larga. */
export function formatDayHeading(isoDate: string, today: string): string {
  const long = formatLongDate(isoDate);
  if (isoDate === today) return `Hoy · ${long}`;
  if (isoDate === addDays(today, -1)) return `Ayer · ${long}`;
  return long.charAt(0).toUpperCase() + long.slice(1);
}

/** Lunes de la semana de `isoDate` (en Argentina la semana arranca el lunes). */
export function startOfWeek(isoDate: string): string {
  const weekday = calendarDate(isoDate).getUTCDay(); // 0 = domingo
  return addDays(isoDate, -((weekday + 6) % 7));
}

/** Primer día del mes de `isoDate`. */
export function startOfMonth(isoDate: string): string {
  return `${isoDate.slice(0, 8)}01`;
}

/** Primer día del mes siguiente (`months` = 1) o anterior (-1). */
export function addMonths(isoMonthStart: string, months: number): string {
  const date = new Date(`${isoMonthStart.slice(0, 8)}01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

/** Último día del mes de `isoDate`. */
export function endOfMonth(isoDate: string): string {
  return addDays(addMonths(startOfMonth(isoDate), 1), -1);
}

/** 'noviembre de 2026' */
export function formatMonth(isoDate: string): string {
  return new Intl.DateTimeFormat('es-AR', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(
    calendarDate(isoDate),
  );
}

/** 'lun', 'mar'… */
export function formatWeekdayShort(isoDate: string): string {
  return new Intl.DateTimeFormat('es-AR', { timeZone: 'UTC', weekday: 'short' })
    .format(calendarDate(isoDate))
    .replace('.', '');
}

/** '12/11' */
export function formatShortDate(isoDate: string): string {
  return new Intl.DateTimeFormat('es-AR', { timeZone: 'UTC', day: '2-digit', month: '2-digit' }).format(
    calendarDate(isoDate),
  );
}

/** 'hace 1 h 17 min' entre dos instantes. */
export function formatAgo(from: Date, now: Date = new Date()): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - from.getTime()) / 60_000));
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `hace ${hours} h ${rest} min` : `hace ${hours} h`;
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
