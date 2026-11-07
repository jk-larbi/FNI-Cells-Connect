import { Region, Cell, ReportingPeriod, CellReport, Profile, NotificationItem, AuditLog } from '../types';

// Ecclesiastical Regions (Fresh Setup - No assigned leaders or mock cells)
export const INITIAL_REGIONS: Region[] = [
  {
    id: 'reg-lagos',
    name: 'Lagos Central Region',
    code: 'FNI-REG-LOS',
    country: 'Nigeria',
    state_province: 'Lagos',
    total_cells: 0,
    active_cells: 0,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'reg-abuja',
    name: 'Abuja Capital Region',
    code: 'FNI-REG-ABJ',
    country: 'Nigeria',
    state_province: 'FCT Abuja',
    total_cells: 0,
    active_cells: 0,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'reg-london',
    name: 'London Diaspora Region',
    code: 'FNI-REG-LON',
    country: 'United Kingdom',
    state_province: 'Greater London',
    total_cells: 0,
    active_cells: 0,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'reg-accra',
    name: 'Accra Hub Region',
    code: 'FNI-REG-ACC',
    country: 'Ghana',
    state_province: 'Greater Accra',
    total_cells: 0,
    active_cells: 0,
    created_at: '2026-01-01T00:00:00Z',
  },
];

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
    submission_deadline: '2026-11-10T23:59:59Z',
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

// System Notifications
export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-001',
    user_id: 'all',
    title: 'FNI Reporting Portal Initialized',
    message: 'Welcome to the FNI Digital Reporting System. Weekly reporting cycle 2026 - Week 45 is open.',
    type: 'deadline_reminder',
    channel: 'in_app',
    is_read: false,
    created_at: new Date().toISOString(),
  },
];

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
