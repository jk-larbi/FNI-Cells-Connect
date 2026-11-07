export type UserRole = 'admin' | 'leader';

export type ReportStatus = 'Draft' | 'Submitted' | 'Approved' | 'Returned' | 'Overdue';

export type AuthProvider = 'google' | 'apple' | 'credentials';

export interface Cell {
  id: string;
  name: string;
  leader: string;
  area: string;
  leaderEmail: string;
  leaderPhone: string;
  meetingDay: string;
  meetingTime: string;
  active: boolean;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  cellId?: string;
  cellName?: string;
  phone?: string;
  authProvider: AuthProvider;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyReport {
  id: string;
  cell: string; // cell id
  week: string; // ISO date string for Monday of the week e.g. "2026-11-02"
  att: number; // Attendance
  vis: number; // Visitors
  souls: number; // Souls won
  fu: number; // Follow-ups
  evg: number; // Evangelism activities
  meet: number; // Cell meetings held
  prayer: string; // Prayer requests
  test: string; // Testimonies
  chal: string; // Challenges and remarks
  status: ReportStatus;
  note: string; // Reviewer feedback / instructions
  date: string; // Submission / last edit date
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface NotificationItem {
  id: string;
  to: string; // 'admin' | cellId | 'all'
  title?: string;
  msg: string;
  date: string;
  read: boolean;
  type?: 'submission' | 'review' | 'reminder' | 'broadcast';
  metadata?: {
    reportId?: string;
    week?: string;
    cellId?: string;
  };
}

export interface UserSession {
  id: string;
  role: UserRole;
  cellId?: string;
  cellName?: string;
  email: string;
  name: string;
  phone?: string;
  authProvider: AuthProvider;
  needsOnboarding?: boolean;
  needsPasswordChange?: boolean;
}

export interface AdminSecurityConfig {
  initialSetupDone: boolean;
  passwordHash: string;
  salt: string;
  lastChangedAt?: string;
  adminUsername: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  connected: boolean;
  lastChecked?: string;
}
