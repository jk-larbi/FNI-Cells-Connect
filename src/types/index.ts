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
  | 'Uncontacted'
  | 'Contacted'
  | 'Requiring Follow-up'
  | 'Active Discipleship'
  | 'Completed / Joined'
  | 'Established in Church'
  | 'Not contacted'
  | 'Follow-up required'
  | 'Interested'
  | 'Joined a cell'
  | 'Completed'
  | 'Unreachable'
  | 'New Contact'
  | 'Follow-up Pending'
  | 'Joined Ministry';

export type NotificationChannel = 'in_app' | 'email' | 'whatsapp';

export type NotificationPriority = 'urgent' | 'important' | 'general';

export type NotificationCategory =
  | 'reports'
  | 'assignments'
  | 'quizzes'
  | 'learning'
  | 'cells'
  | 'leadership'
  | 'meetings'
  | 'communication'
  | 'system';

export type NotificationType =
  // Reports
  | 'report_submitted'
  | 'report_approved'
  | 'revision_requested'
  | 'report_rejected'
  | 'report_overdue'
  | 'deadline_reminder'
  | 'overdue_notice'
  // Assignments
  | 'assignment_new'
  | 'assignment_submitted'
  | 'assignment_deadline'
  | 'assignment_overdue'
  | 'assignment_graded'
  | 'assignment_feedback'
  // Quizzes
  | 'quiz_new'
  | 'quiz_deadline'
  | 'quiz_submitted'
  | 'quiz_graded'
  | 'quiz_results'
  // Learning Portal
  | 'learning_material_new'
  | 'learning_event_new'
  | 'learning_announcement'
  | 'teaching_notes'
  // Cells
  | 'cell_member_added'
  | 'cell_member_removed'
  | 'cell_info_updated'
  // Leadership
  | 'leadership_assigned'
  | 'leadership_changed'
  | 'leadership_dismissed'
  // Meetings
  | 'meeting_upcoming'
  | 'meeting_reminder'
  | 'meeting_started'
  | 'meeting_cancelled'
  // Communication
  | 'direct_message'
  | 'community_message'
  | 'message_reply'
  | 'message_mention'
  | 'broadcast'
  | 'announcement'
  | 'incoming_call'
  | 'missed_call'
  // System & Security
  | 'password_changed'
  | 'new_device_login'
  | 'security_alert'
  | 'system_maintenance'
  | 'system_alert'
  // Follow-ups
  | 'follow_up_assigned'
  | 'follow_up_reminder';

export interface UserNotificationPreferences {
  inAppNotifications: boolean;
  devicePushNotifications?: boolean;
  reports?: boolean;
  assignments?: boolean;
  quizzes?: boolean;
  learningMaterials?: boolean;
  meetings?: boolean;
  cellAnnouncements?: boolean;
  messages?: boolean;
  adminBroadcasts?: boolean;
  // Backward compatibility fields
  assignmentNotifications?: boolean;
  quizNotifications?: boolean;
  reportDeadlineReminders?: boolean;
  cellMeetingReminders?: boolean;
  privateMessages?: boolean;
}

export interface AdminBroadcastRecord {
  id: string;
  title: string;
  message: string;
  priority: NotificationPriority;
  broadcastType: 'announcement' | 'alert';
  targetType: 'all' | 'cells' | 'individual';
  targetDetails?: {
    cellIds?: string[];
    cellNames?: string[];
    tutorId?: string;
    tutorName?: string;
  };
  recipientCount: number;
  sentBy: {
    uid: string;
    name: string;
    role: string;
  };
  sentAt: string;
}

export interface UserGeneralPreferences {
  language: 'en-UK' | 'en-GH';
  timeFormat: '12h' | '24h';
  dateFormat: 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'MM/DD/YYYY';
  defaultDashboard?: string;
  timezone: string; // 'Africa/Accra'
}

export interface Profile {
  id: string;
  supabase_user_id?: string;
  email: string;
  username?: string;
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
  is_test_account?: boolean;
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
  firebase_id?: string;
  normalized_name?: string;
  location?: string;
  meeting_location?: string;
  tutorUid?: string;
  code?: string;
  region_id?: string;
  region_name?: string;
  leader_id?: string;
  leader_name?: string;
  co_leader_name?: string;
  leader_phone?: string;
  meeting_day?: string;
  meeting_time?: string;
  venue_address?: string;
  meeting_latitude?: number | null;
  meeting_longitude?: number | null;
  total_members?: number;
  active_members?: number;
  new_members?: number;
  requiring_follow_up?: number;
  target_attendance?: number;
  status?: 'Active' | 'Suspended' | 'Deactivated';
  is_active: boolean;
  is_archived?: boolean;
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
  currency?: string;
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
  leadSource?: string;
  contactAttempts?: number;
  discipleshipProgress?: string | number;
  establishedDate?: string;
  completionDate?: string;
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
  senderUid?: string;
  content: string;
}

export interface ChatAttachment {
  name: string;
  path: string;
  mimeType: string;
  size: number;
}

export interface ChatPollOption {
  id: string;
  text: string;
  votes: number;
  voterUids?: string[];
}

export interface ChatPoll {
  id: string;
  question: string;
  options: ChatPollOption[];
  isAnonymous?: boolean;
  allowsMultipleAnswers?: boolean;
  isClosed?: boolean;
  totalVotes: number;
  createdByUid: string;
  createdByName: string;
  createdAt: string;
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
  attachments?: ChatAttachment[];
  reactions?: { [emoji: string]: string[] };
  isPinned?: boolean;
  pinnedAt?: string;
  pinnedBy?: string;
  pinnedByName?: string;
  pinnedNotify?: boolean;
  deletedForEveryoneAt?: string;
  editedAt?: string;
  mentions?: string[];
  poll?: ChatPoll;
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
  attachments?: ChatAttachment[];
  deletedForEveryoneAt?: string;
  editedAt?: string;
  isPinned?: boolean;
  pinnedAt?: string;
  pinnedBy?: string;
  pinnedByName?: string;
  pinnedNotify?: boolean;
  groupId?: string;
  poll?: ChatPoll;
}

export interface UserPinnedChat {
  id: string;
  user_id: string;
  chat_id: string;
  order_index: number;
  pinned_at: string;
  userId?: string;
  chatId?: string;
  orderIndex?: number;
  pinnedAt?: string;
}

export interface MessageReactionParticipant {
  id?: string;
  message_id?: string;
  user_id?: string;
  user_name?: string;
  emoji: string;
  created_at?: string;
  userId: string;
  userName: string;
  avatarUrl?: string;
  cellName?: string;
  role?: string;
  createdAt: string;
}

export interface GroupPermissions {
  send_messages: 'all' | 'admins';
  send_media: 'all' | 'admins';
  send_docs: 'all' | 'admins';
  send_links: 'all' | 'admins';
  add_members: 'all' | 'admins';
  edit_group_info: 'all' | 'admins';
  pin_messages: 'all' | 'admins_mods' | 'admins';
  start_calls: 'all' | 'admins';
}

export interface UserGroupPreferences {
  userId: string;
  groupId: string;
  isMuted: boolean;
  mutedUntil?: string | null;
  notifyMentions: boolean;
  notifyAnnouncements: boolean;
}

export interface CustomSticker {
  id: string;
  userId?: string;
  stickerType: 'custom' | 'favorite' | 'recent' | 'fellowship';
  imageUrl?: string;
  emoji?: string;
  label: string;
  usageCount?: number;
  createdAt?: string;
}

export interface CommunityGroup {
  id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  avatarUrl?: string;
  category?: string;
  is_official: boolean;
  isOfficial?: boolean;
  member_count?: number;
  memberCount?: number;
  created_by?: string;
  createdBy?: string;
  created_at: string;
  createdAt?: string;
  updated_at: string;
  updatedAt?: string;
  permissions?: GroupPermissions;
  announcement_mode?: boolean;
  invite_code?: string;
  require_approval?: boolean;
  disappearing_messages?: string;
  meeting_schedule?: string;
  meeting_location?: string;
  oversight_contact?: string;
}

export interface CommunityGroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'admin' | 'moderator' | 'member' | string;
  joined_at: string;
  is_active: boolean;
  groupId?: string;
  userId?: string;
  joinedAt?: string;
  isActive?: boolean;
}

export interface OfficialGroupHistoryRecord {
  id: string;
  previous_group_id: string;
  previous_group_name: string;
  new_group_id: string;
  new_group_name: string;
  changed_by_uid: string;
  changed_by_name: string;
  changed_at: string;
  reason?: string;
  previousGroupId?: string;
  previousGroupName?: string;
  newGroupId?: string;
  newGroupName?: string;
  changedByUid?: string;
  changedByName?: string;
  changedAt?: string;
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
export type SoulTargetPeriod = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface CellTargetProgress {
  cellId: string;
  cellName: string;
  tutorName?: string;
  target: number;
  achieved: number;
  remaining: number;
  percentage: number;
  status: 'achieved' | 'on_track' | 'behind';
  fromEvangelism: number;
  fromCells: number;
}

export interface SoulTargetConfig {
  id: string;
  year: number;
  annualTarget: number;
  targetPeriod?: SoulTargetPeriod;
  ministryTarget?: number;
  cellTargets?: Record<string, number>;
  updatedAt: string;
  updatedBy: string;
  auditHistory: Array<{
    previousTarget: number;
    newTarget: number;
    changedBy: string;
    reason: string;
    timestamp: string;
    period?: SoulTargetPeriod;
    cellTargets?: Record<string, number>;
  }>;
}

export interface SoulTargetMetrics {
  annualTarget: number;
  targetPeriod?: SoulTargetPeriod;
  year: number;
  verifiedSoulsWon: number;
  remainingSouls: number;
  percentageAchieved: number;
  soulsFromEvangelism: number;
  soulsFromCells: number;
  firstTimersFromCells: number;
  pendingSouls: number;
  weeklyProgress: Array<{ week: string; souls: number }>;
  monthlyProgress: Array<{ month: string; souls: number }>;
  quarterlyProgress: Array<{ quarter: string; souls: number }>;
  cellContributions: Array<{ cellId: string; cellName: string; souls: number; percentage: number; fromEvangelism?: number; fromCells?: number }>;
  cellTargetProgress?: CellTargetProgress[];
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
  priority?: NotificationPriority;
  category?: NotificationCategory;
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
  cellId: string;
  username?: string;
  phoneNumber?: string;
  cellName?: string;
  coLeaderName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export interface TutorLoginInput {
  cellId?: string;
  username?: string;
  email?: string;
  fullName?: string;
  password: string;
  cellName?: string;
}

export interface AdminLoginInput {
  username?: string;
  email?: string;
  password: string;
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

export interface CellLocationRecord {
  id: string;
  cell_id: string;
  cell_name: string;
  venue: string;
  meeting_date: string;
  leader_id?: string;
  leader_name: string;
  notes?: string;
  created_at: string;
  created_by?: string;
}

export type AdminNavTab =
  | 'dashboard'
  | 'location-sharing'
  | 'cell-management'
  | 'cell-leaders'
  | 'cell-location-history'
  | 'report-review'
  | 'report-history'
  | 'received-reports'
  | 'report-deadlines'
  | 'learning-portal'
  | 'learning-assignments'
  | 'learning-quizzes'
  | 'learning-participation'
  | 'learning-grades'
  | 'learning-events'
  | 'learning-materials'
  | 'evangelism'
  | 'follow-ups'
  | 'finance'
  | 'materials'
  | 'messages'
  | 'call-history'
  | 'analytics'
  | 'notifications'
  | 'settings';

export type TutorNavTab =
  | 'my-dashboard'
  | 'my-cell'
  | 'submit-cell-meeting-report'
  | 'submit-evangelism-report'
  | 'my-reports'
  | 'learning-portal'
  | 'learning-assignments'
  | 'learning-quizzes'
  | 'learning-participation'
  | 'learning-grades'
  | 'learning-events'
  | 'learning-materials'
  | 'evangelism-contacts'
  | 'follow-ups'
  | 'materials'
  | 'messages'
  | 'call-history'
  | 'cell-activity-history'
  | 'notifications'
  | 'my-account';

export type AppNavTab = AdminNavTab | TutorNavTab;

export * from './calling';
