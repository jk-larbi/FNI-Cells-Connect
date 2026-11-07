export type UserRole = 'tutor' | 'admin' | 'cell_leader' | 'super_admin' | 'national_admin' | 'regional_leader';

export type ReportStatus =
  | 'Newly Submitted'
  | 'Approved'
  | 'Needs Correction'
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'needs_revision';

export type FollowUpStatus =
  | 'New Contact'
  | 'Follow-up Pending'
  | 'Contacted'
  | 'Interested'
  | 'Joined Ministry'
  | 'Completed'
  | 'Unreachable';

export type NotificationChannel = 'in_app' | 'email' | 'whatsapp';

export type NotificationType =
  | 'report_submitted'
  | 'report_approved'
  | 'revision_requested'
  | 'deadline_reminder'
  | 'overdue_notice'
  | 'system_alert'
  | 'follow_up_assigned'
  | 'follow_up_reminder';

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
  location?: string;
  tutorUid?: string;
  code?: string;
  region_id?: string;
  region_name?: string;
  leader_id?: string;
  leader_name?: string;
  leader_phone?: string;
  meeting_day?: string;
  meeting_time?: string;
  venue_address?: string;
  target_attendance?: number;
  status?: 'Active' | 'Suspended' | 'Deactivated';
  is_active: boolean;
  created_at: string;
  createdAt?: unknown;
}

export interface ReportingPeriod {
  id: string;
  name: string;
  year: number;
  week_number: number;
  start_date: string;
  end_date: string;
  submission_deadline: string; // Sunday 6:00 PM Africa/Accra
  is_open: boolean;
  created_at: string;
}

// 1. Cell Meeting Report
export interface CellMeetingReport {
  id: string;
  cellId: string;
  tutorUid: string;
  cellName: string;
  meetingDate: string;
  tutorName: string;
  members: number;
  activeMembers: number;
  attendance: number;
  newMembers: number;
  absentees: number;
  followUpNeeded: number;
  offering?: number;
  tutorNotes?: string;
  testimonies?: string;
  status: ReportStatus;
  submittedAt: string;
  late: boolean;
  reviewerComment?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
}

// 2. Evangelism Report
export interface EvangelismReport {
  id: string;
  cellId: string;
  tutorUid: string;
  cellName: string;
  tutorName: string;
  date: string;
  location: string;
  teamMembers: string[];
  peopleSpokenTo: number;
  contactsCaptured: number;
  conversions: number;
  interestedInMinistry: number;
  potentialFollowUps: number;
  messageUsed: string;
  notes: string;
  testimonies?: string;
  status: ReportStatus;
  submittedAt: string;
  late: boolean;
  reviewerComment?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
}

// Unified queue item for review
export type UnifiedReportItem = (
  | (CellMeetingReport & { reportType: 'meeting' })
  | (EvangelismReport & { reportType: 'evangelism' })
);

// Combined CellReport for backward compatibility
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
  members_present: number;
  visitors_count: number;
  total_attendance: number;
  souls_won: number;
  souls_won_details?: string;
  evangelism_outreaches_held: number;
  evangelism_locations?: string;
  follow_ups_conducted: number;
  first_timers_contacted: number;
  converts_established: number;
  meeting_held: boolean;
  meeting_date: string;
  meeting_topic: string;
  offering_amount?: number;
  prayer_requests?: string;
  testimonies?: string;
  challenges_faced?: string;
  additional_remarks?: string;
  submitted_at?: string;
  is_late?: boolean;
  submission_timing?: 'on_time' | 'late';
  deadline?: string;
  reviewed_by?: string;
  reviewed_by_name?: string;
  last_reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

// Evangelism Contact and Follow-up
export interface EvangelismContact {
  id: string;
  contactName?: string;
  name?: string;
  contactDetails?: string;
  phone?: string;
  email?: string;
  dateCaptured: string;
  evangelismLocation?: string;
  location?: string;
  cellId: string;
  cellName: string;
  tutorUid?: string;
  tutorName?: string;
  assignedToName?: string;
  followUpStatus: FollowUpStatus;
  followUpNotes?: string;
  notes?: string;
  lastFollowUpDate?: string;
  nextFollowUpDate?: string;
  createdAt: string;
  updatedAt: string;
}

// System Settings (Vision, Mission, Annual Target, Deadline)
export interface SystemSettings {
  id: string;
  vision: string;
  mission: string;
  annualSoulWinningTarget: number;
  weeklyDeadline: string; // e.g. "Every Sunday at 6:00 PM Ghana time (Africa/Accra)"
  updatedAt: string;
  updatedBy?: string;
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

export interface TutorRegistrationInput {
  fullName: string;
  cellName: string;
  password: string;
  confirmPassword?: string;
}

export interface TutorLoginInput {
  fullName: string;
  password: string;
  cellName?: string;
}

export interface CellLeaderRegistrationInput {
  fullName: string;
  cellName: string;
  password?: string;
  confirmPassword?: string;
  cellLocation?: string;
  email?: string;
  phoneNumber?: string;
  meetingDay?: string;
  meetingTime?: string;
}

export interface CellLeaderOnboardingInput {
  fullName: string;
  cellName: string;
  phoneNumber: string;
  regionId: string;
  location?: string;
  meetingDay: string;
  meetingTime: string;
  venueAddress: string;
  targetAttendance?: number;
}

export interface DashboardStats {
  totalCells: number;
  activeCellLeaders: number;
  reportsSubmitted: number;
  meetingReportsSubmitted?: number;
  evangelismReportsSubmitted?: number;
  approvedReports: number;
  pendingReports: number;
  awaitingReviewCount: number;
  needsCorrectionCount: number;
  lateReports: number;
  missingCellsCount: number;
  soulsWon: number;
  peopleReached: number;
  contactsCaptured: number;
  interestedInMinistry?: number;
  followUpsCompleted: number;
  outstandingFollowUps: number;
  visitorsRecorded: number;
  totalAttendance: number;
  complianceRate: number;
}

export type AdminNavTab =
  | 'dashboard'
  | 'cell-management'
  | 'cell-leaders'
  | 'report-review'
  | 'evangelism'
  | 'follow-ups'
  | 'analytics'
  | 'notifications'
  | 'settings';

export type TutorNavTab =
  | 'my-dashboard'
  | 'my-cell'
  | 'submit-cell-meeting-report'
  | 'submit-evangelism-report'
  | 'my-reports'
  | 'evangelism-contacts'
  | 'follow-ups'
  | 'cell-activity-history'
  | 'notifications'
  | 'my-account';

export type AppNavTab = AdminNavTab | TutorNavTab;
