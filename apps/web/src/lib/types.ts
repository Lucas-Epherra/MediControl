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
