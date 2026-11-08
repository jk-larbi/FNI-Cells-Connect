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
  | 'Not contacted'
  | 'Follow-up required'
  | 'Contacted'
  | 'Interested'
  | 'Joined a cell'
  | 'Completed'
  | 'Unreachable'
  | 'New Contact'
  | 'Follow-up Pending'
  | 'Joined Ministry';

export type NotificationChannel = 'in_app' | 'email' | 'whatsapp';

export type NotificationType =
  | 'report_submitted'
  | 'report_approved'
  | 'revision_requested'
  | 'report_rejected'
  | 'direct_message'
  | 'community_message'
  | 'teaching_notes'
  | 'announcement'
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
  meeting_location?: string;
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
  total_members?: number;
  active_members?: number;
  new_members?: number;
  requiring_follow_up?: number;
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
  meetingLocation?: string;
  tutorName: string;
  members: number;
  activeMembers: number;
  attendance: number;
  newMembers: number;
  absentees: number;
  followUpNeeded: number;
  offering?: number;
  scripturalTheme?: string;
  scripturesUsed?: string;
  tutorNotes?: string;
  testimonies?: string;
  tutorExperience?: string;
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
  preSetTarget?: number;
  peopleSpokenTo: number;
  contactsCaptured: number;
  conversions: number;
  verifiedSoulsWon?: number;
  interestedInMinistry: number;
  potentialFollowUps: number;
  scripturalTheme?: string;
  scripturesUsed?: string;
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
  whatsappNumber?: string;
  email?: string;
  dateCaptured: string;
  evangelismReportId?: string;
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
  history?: Array<{
    status: FollowUpStatus;
    note?: string;
    changedAt: string;
    changedBy?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

// Offering / Financial Management
export interface OfferingRecord {
  id: string;
  reportId: string;
  cellId: string;
  cellName: string;
  tutorUid?: string;
  tutorName?: string;
  amount: number;
  currency?: string;
  meetingDate: string;
  weekLabel?: string;
  submittedAt: string;
  status: ReportStatus;
}

export interface OfferingAggregation {
  weekly: Array<{ period: string; amount: number; reportCount: number }>;
  monthly: Array<{ month: string; amount: number; reportCount: number }>;
  quarterly: Array<{ quarter: string; amount: number; reportCount: number }>;
  annual: number;
  cellBreakdown: Array<{ cellId: string; cellName: string; totalAmount: number; reportCount: number }>;
}

// Communication: Private Tutor-Admin & Community
export interface MessageReply {
  id: string;
  senderName: string;
  content: string;
}

export interface PrivateMessage {
  id: string;
  senderUid: string;
  senderName: string;
  senderRole: UserRole;
  recipientUid: string;
  recipientName: string;
  cellId?: string;
  cellName?: string;
  content: string;
  createdAt: string;
  isRead: boolean;
  readAt?: string;
  replyTo?: MessageReply;
}

export interface CommunityMessage {
  id: string;
  senderUid: string;
  senderName: string;
  senderRole: UserRole;
  cellName?: string;
  content: string;
  category?: 'general' | 'announcement' | 'prayer_request' | 'testimony';
  createdAt: string;
  replyTo?: MessageReply;
  mentions?: string[];
  reactions?: { [emoji: string]: string[] };
}

export interface InvitationCode {
  id: string;
  code: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  expiresAt: string;
  expiryMinutes: number;
  maxUses?: number;
  usedCount: number;
  isRevoked: boolean;
}

// Teaching Materials
export interface TeachingMaterial {
  id: string;
  title: string;
  description: string;
  weekLabel: string;
  documentUrl?: string;
  fileName?: string;
  fileSize?: string;
  fileType?: string;
  textContent?: string;
  status: 'published' | 'archived';
  publishedAt?: string;
  uploadedBy: string;
  uploadedByName: string;
  createdAt: string;
  updatedAt: string;
}

// Soul Target Tracking
export interface SoulTargetConfig {
  id: string;
  year: number;
  annualTarget: number;
  updatedAt: string;
  updatedBy: string;
  auditHistory: Array<{
    previousTarget: number;
    newTarget: number;
    changedBy: string;
    reason: string;
    timestamp: string;
  }>;
}

export interface SoulTargetMetrics {
  annualTarget: number;
  year: number;
  verifiedSoulsWon: number;
  remainingSouls: number;
  percentageAchieved: number;
  soulsFromEvangelism: number;
  soulsFromCells: number;
  weeklyProgress: Array<{ week: string; souls: number }>;
  monthlyProgress: Array<{ month: string; souls: number }>;
  quarterlyProgress: Array<{ quarter: string; souls: number }>;
  cellContributions: Array<{ cellId: string; cellName: string; souls: number; percentage: number; fromEvangelism?: number; fromCells?: number }>;
  teamContributions: Array<{ leaderName: string; souls: number; outings: number }>;
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

export interface CellPerformanceRecord {
  id: string;
  name: string;
  code: string;
  leaderName: string;
  leaderPhone: string;
  location: string;
  targetAttendance: number;
  meetingReportsCount: number;
  evangelismReportsCount: number;
  totalAttendance: number;
  soulsWon: number;
  peopleReached: number;
  offeringsGhs: number;
  compliance: number;
  status: 'On Track' | 'Awaiting Review' | 'Needs Correction' | 'Missing Report';
  statusColor: 'emerald' | 'amber' | 'rose';
  latestMeetingDate?: string;
  latestSubmissionIso?: string;
}

export type AdminNavTab =
  | 'dashboard'
  | 'cell-management'
  | 'cell-leaders'
  | 'report-review'
  | 'evangelism'
  | 'follow-ups'
  | 'finance'
  | 'materials'
  | 'messages'
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
  | 'materials'
  | 'messages'
  | 'cell-activity-history'
  | 'notifications'
  | 'my-account';

export type AppNavTab = AdminNavTab | TutorNavTab;
