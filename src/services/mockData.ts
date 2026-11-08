import { Region, Cell, ReportingPeriod, CellReport, Profile, NotificationItem, AuditLog } from '../types';

// Ecclesiastical Regions (0 Mock Regions - Purely real data)
export const INITIAL_REGIONS: Region[] = [];

// 0 Mock Cells - Cell leaders register their real cells upon sign-in!
export const INITIAL_CELLS: Cell[] = [];

// Current Active Reporting Cycle
export const INITIAL_PERIODS: ReportingPeriod[] = [
  {
    id: 'prd-w45',
    name: '2026 - Week 45',
    year: 2026,
    week_number: 45,
    start_date: '2026-11-02',
    end_date: '2026-11-08',
    submission_deadline: '2026-11-08T18:00:00Z', // Sunday at exactly 6:00 PM Ghana Time (Africa/Accra, UTC+0)
    is_open: true,
    created_at: '2026-11-01T00:00:00Z',
  },
];

// Single Initial Admin Setup Account - NO Mock Cell Leaders!
export const INITIAL_PROFILES: Profile[] = [
  {
    id: 'usr-admin',
    email: 'admin@forerunners.org',
    full_name: 'System Administrator',
    role: 'admin',
    is_active: true,
    is_onboarded: true,
    must_change_password: true, // Temporary initial setup credentials require immediate change
    auth_provider: 'credentials',
    created_at: '2026-01-01T00:00:00Z',
  },
];

// 0 Mock Reports - Real reports only
export const INITIAL_REPORTS: CellReport[] = [];

// System Notifications (0 Mock Notifications - Generated live from real events)
export const INITIAL_NOTIFICATIONS: NotificationItem[] = [];

// Initial Audit Log
export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'aud-001',
    user_name: 'System Provisioner',
    action: 'INITIALIZE_SYSTEM',
    entity_type: 'system',
    details: { message: 'FNI Digital Reporting System initialized with fresh empty directory' },
    created_at: new Date().toISOString(),
  },
];
