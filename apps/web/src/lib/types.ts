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
}

/** Respuesta de GET /groups/:groupId/doses. */
export interface DoseHistory {
  from: string;
  to: string;
  timezone: string;
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
}
