export type GroupRole = 'ADMIN' | 'CAREGIVER' | 'VIEWER';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface Session {
  accessToken: string;
  user: AuthUser;
}

/** Estados de una toma en la vista del día (docs/ARQUITECTURA.md §3.4). */
export type DoseSlotStatus = 'GIVEN' | 'SKIPPED' | 'DUE' | 'UPCOMING' | 'OVERDUE';

export interface MedicationSummary {
  id: string;
  name: string;
  strength: string | null;
  form: string | null;
  instructions: string | null;
}

export interface DoseRecord {
  id: string;
  scheduleId: string;
  scheduledFor: string;
  status: 'GIVEN' | 'SKIPPED';
  unitsGiven: number;
  notes: string | null;
  recordedAt: string;
  recordedBy: { id: string; name: string };
}

export interface DaySlot {
  key: string;
  scheduleId: string;
  scheduledFor: string;
  timeOfDay: string;
  unitsPerDose: number;
  medication: MedicationSummary;
  status: DoseSlotStatus;
  record: DoseRecord | null;
}

export interface DayResponse {
  date: string;
  timezone: string;
  now: string;
  summary: Record<DoseSlotStatus, number> & { total: number };
  doses: DaySlot[];
}

export interface Alert {
  type: 'LOW_STOCK' | 'PRESCRIPTION_EXPIRING' | 'PRESCRIPTION_EXPIRED';
  severity: 'warning' | 'critical';
  message: string;
  medicationId?: string;
  prescriptionId?: string;
  data: Record<string, number | string | null>;
}

export interface Medication extends MedicationSummary {
  stock: number;
  lowStockThreshold: number;
  active: boolean;
}

export interface Group {
  id: string;
  name: string;
  patientName: string;
  notes: string | null;
  timezone: string;
  myRole: GroupRole;
}
