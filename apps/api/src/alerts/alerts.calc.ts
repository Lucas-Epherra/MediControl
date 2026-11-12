import { daysBetween } from '../common/dates';

/** Avisar cuando el stock alcance para esta cantidad de días o menos. */
export const LOW_STOCK_COVERAGE_DAYS = 3;
/** Avisar cuando una receta venza dentro de esta cantidad de días. */
export const PRESCRIPTION_WARNING_DAYS = 7;

export type AlertType = 'LOW_STOCK' | 'PRESCRIPTION_EXPIRING' | 'PRESCRIPTION_EXPIRED';
export type AlertSeverity = 'warning' | 'critical';

export interface Alert {
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  medicationId?: string;
  prescriptionId?: string;
  data: Record<string, number | string | null>;
}

export interface StockInput {
  id: string;
  name: string;
  form: string | null;
  stock: number;
  lowStockThreshold: number;
  dailyUnits: number;
}

export function stockAlert(m: StockInput): Alert | null {
  const coverageDays = m.dailyUnits > 0 ? Math.max(0, m.stock) / m.dailyUnits : null;
  const belowThreshold = m.stock <= m.lowStockThreshold && m.lowStockThreshold > 0;
  const shortCoverage = coverageDays !== null && coverageDays <= LOW_STOCK_COVERAGE_DAYS;
  if (m.stock > 0 && !belowThreshold && !shortCoverage) return null;

  const units = `${formatNumber(Math.max(0, m.stock))} ${m.form ?? 'unidades'}`;
  const coverage = coverageDays === null ? '' : ` (≈ ${Math.floor(coverageDays)} días)`;
  return {
    type: 'LOW_STOCK',
    severity: m.stock <= 0 || (coverageDays !== null && coverageDays < 1) ? 'critical' : 'warning',
    message: m.stock <= 0 ? `${m.name}: sin stock` : `${m.name}: quedan ${units}${coverage}`,
    medicationId: m.id,
    data: { stock: m.stock, lowStockThreshold: m.lowStockThreshold, coverageDays },
  };
}

export interface PrescriptionInput {
  id: string;
  description: string;
  medicationId: string | null;
  expiresAtIso: string;
}

export type PrescriptionStatus = 'VALID' | 'EXPIRING' | 'EXPIRED';

/** Estado de una receta según los días que faltan para su vencimiento (negativo = vencida). */
export function prescriptionStatus(expiresAtIso: string, todayIso: string) {
  const daysLeft = daysBetween(todayIso, expiresAtIso);
  const status: PrescriptionStatus =
    daysLeft < 0 ? 'EXPIRED' : daysLeft <= PRESCRIPTION_WARNING_DAYS ? 'EXPIRING' : 'VALID';
  return { status, daysLeft };
}

export function prescriptionAlert(p: PrescriptionInput, todayIso: string): Alert | null {
  const { status, daysLeft } = prescriptionStatus(p.expiresAtIso, todayIso);
  if (status === 'VALID') return null;
  const base = {
    prescriptionId: p.id,
    medicationId: p.medicationId ?? undefined,
    data: { expiresAt: p.expiresAtIso, daysLeft },
  };
  if (daysLeft < 0) {
    return {
      ...base,
      type: 'PRESCRIPTION_EXPIRED',
      severity: 'critical',
      message: `${p.description}: venció hace ${-daysLeft} ${-daysLeft === 1 ? 'día' : 'días'}`,
    };
  }
  const when = daysLeft === 0 ? 'vence hoy' : `vence en ${daysLeft} ${daysLeft === 1 ? 'día' : 'días'}`;
  return {
    ...base,
    type: 'PRESCRIPTION_EXPIRING',
    severity: daysLeft <= 2 ? 'critical' : 'warning',
    message: `${p.description}: ${when}`,
  };
}

function formatNumber(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',');
}
