export type UserRole = 
  | 'admin'
  | 'cell_leader'
  | 'super_admin' 
  | 'national_admin' 
  | 'regional_leader';

export type ReportStatus = 
  | 'draft' 
  | 'submitted' 
  | 'under_review' 
  | 'approved' 
  | 'needs_revision';

export type NotificationChannel = 'in_app' | 'email' | 'whatsapp';

export type NotificationType = 
  | 'report_submitted' 
  | 'report_approved' 
  | 'revision_requested' 
  | 'deadline_reminder' 
  | 'overdue_notice' 
  | 'system_alert';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone_number?: string;
  role: UserRole;
  region_id?: string;
  region_name?: string;
  cell_id?: string;
  cell_name?: string;
  avatar_url?: string;
  is_active: boolean;
  is_onboarded: boolean;
  must_change_password?: boolean;
  auth_provider?: 'google' | 'apple' | 'email' | 'credentials';
  created_at: string;
}

export interface Region {
  id: string;
  name: string;
  code: string;
  country: string;
  state_province?: string;
  leader_id?: string;
  leader_name?: string;
  total_cells?: number;
  active_cells?: number;
  created_at: string;
}

export interface Cell {
  id: string;
  name: string;
  normalized_name?: string;
  code: string;
  region_id: string;
  region_name?: string;
  leader_id?: string;
  leader_name?: string;
  leader_phone?: string;
  meeting_day: string;
  meeting_time: string;
  venue_address: string;
  target_attendance: number;
  is_active: boolean;
  created_at: string;
}

export interface ReportingPeriod {
  id: string;
  name: string;
  year: number;
  week_number: number;
  start_date: string;
  end_date: string;
  submission_deadline: string;
  is_open: boolean;
  created_at: string;
}

export interface CellReport {
  id: string;
  cell_id: string;
  cell_name?: string;
  region_id?: string;
  region_name?: string;
  period_id: string;
  period_name?: string;
  submitted_by: string;
  submitted_by_name?: string;
  status: ReportStatus;

  // Attendance
  members_present: number;
  visitors_count: number;
  total_attendance: number;

  // Evangelism & Souls
  souls_won: number;
  souls_won_details?: string;
  evangelism_outreaches_held: number;
  evangelism_locations?: string;

  // Follow-ups & Discipleship
  follow_ups_conducted: number;
  first_timers_contacted: number;
  converts_established: number;

  // Meeting Execution
  meeting_held: boolean;
  meeting_date: string;
  meeting_topic: string;
  offering_amount?: number;

  // Spiritual & Pastoral Notes
  prayer_requests?: string;
  testimonies?: string;
  challenges_faced?: string;
  additional_remarks?: string;

  // Audit & Workflow
  submitted_at?: string;
  reviewed_by?: string;
  reviewed_by_name?: string;
  last_reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ReportReview {
  id: string;
  report_id: string;
  reviewer_id: string;
  reviewer_name: string;
  reviewer_role: UserRole;
  previous_status: ReportStatus;
  new_status: ReportStatus;
  feedback: string;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  channel: NotificationChannel;
  is_read: boolean;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_name?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details: Record<string, any>;
  ip_address?: string;
  created_at: string;
}

export interface CellLeaderOnboardingInput {
  fullName: string;
  cellName: string;
  phoneNumber: string;
  regionId: string;
  meetingDay: string;
  meetingTime: string;
  venueAddress: string;
  targetAttendance?: number;
}

export interface DashboardStats {
  totalCells: number;
  activeCellLeaders: number;
  reportsSubmitted: number;
  pendingReports: number;
  soulsWon: number;
  visitorsRecorded: number;
  totalAttendance: number;
  complianceRate: number;
}
