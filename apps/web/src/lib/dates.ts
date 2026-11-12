// Fechas y horas siempre en la zona del grupo (group.timezone), no en la del navegador.

const timeFormatters = new Map<string, Intl.DateTimeFormat>();

/** "08:12" en la zona indicada. */
export function formatTime(iso: string | Date, timeZone: string): string {
  let formatter = timeFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone });
    timeFormatters.set(timeZone, formatter);
  }
  return formatter.format(typeof iso === 'string' ? new Date(iso) : iso);
}

/** Fecha local YYYY-MM-DD de un instante en la zona indicada. */
export function isoDateIn(timeZone: string, instant: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    instant,
  );
}

/** Suma días a una fecha YYYY-MM-DD (sin zona: es una fecha de calendario). */
export function shiftIsoDate(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

/** "jueves 12 de noviembre" para una fecha YYYY-MM-DD. */
export function formatLongDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(
    new Date(Date.UTC(y, m - 1, d, 12)),
  );
}

/** "hace 1 h 17 min" entre dos instantes. */
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
