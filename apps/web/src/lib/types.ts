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

/** Respuesta de GET /groups/:groupId/day (un elemento de `doses`). */
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

export interface Group {
  id: string;
  name: string;
  patientName: string;
  notes: string | null;
  timezone: string;
  myRole: GroupRole;
}

/** `medicationSelect` de apps/api/src/doses/doses.service.ts. */
export interface MedicationSummary {
  id: string;
  name: string;
  strength: string | null;
  form: string | null;
  instructions: string | null;
}

export type DoseRecordStatus = 'GIVEN' | 'SKIPPED';

/** `presentRecord` de apps/api/src/doses/doses.service.ts. */
export interface DoseRecord {
  id: string;
  scheduleId: string;
  scheduledFor: string;
  status: DoseRecordStatus;
  unitsGiven: number;
  notes: string | null;
  recordedAt: string;
  recordedBy: { id: string; name: string };
  /** Deshacer no borra la toma: la marca. Solo el historial muestra las deshechas. */
  undoneAt: string | null;
  undoneBy: { id: string; name: string } | null;
}

/** Respuesta de GET /groups/:groupId/doses. */
export interface DoseHistory {
  from: string;
  to: string;
  timezone: string;
  /** Quienes registraron tomas en el período, sin aplicar los demás filtros. */
  recorders: { id: string; name: string }[];
  records: (DoseRecord & { medication: MedicationSummary })[];
}

export interface Schedule {
  id: string;
  medicationId: string;
  timeOfDay: string;
  daysOfWeek: number[];
  unitsPerDose: number;
  startDate: string;
  endDate: string | null;
  active: boolean;
}

/** `present` de apps/api/src/medications/medications.service.ts. */
export interface Medication extends MedicationSummary {
  groupId: string;
  stock: number;
  lowStockThreshold: number;
  active: boolean;
  schedules: Schedule[];
  dailyUnits: number;
  coverageDays: number | null;
  lowStock: boolean;
}
