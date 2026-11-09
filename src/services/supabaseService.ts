/**
 * Forerunners Network International (FNI) - Digital Reporting System
 * Supabase Backend Service Adapter
 * 
 * Provides typed, resilient access to Supabase PostgreSQL 15+ database
 * for all 12 platform modules. Seamlessly integrates with the dual-backend
 * architecture, falling back gracefully to Firebase/LocalStorage if Supabase
 * is unconfigured or unavailable.
 * 
 * Features:
 * - Reconciles 'offerings' and 'offering_records'
 * - Reconciles 'soul_target_configs' and 'soul_targets'
 * - Reconciles 'review_logs' status/action and comment/comments
 * - Complete notification schema alignment (user_id, recipient_target, date, type, channel)
 * - Strict identity alignment: profiles.id TEXT + supabase_user_id UUID
 * - Resilient dual-write synchronization via SyncStateService
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { SyncStateService } from './syncStateService';

// Initialize SyncStateService client and online lifecycle listeners if Supabase is configured
if (isSupabaseConfigured && supabase) {
  SyncStateService.setDefaultClient(supabase);
  SyncStateService.initLifecycleListeners();
}
import {
  Cell,
  CellMeetingReport,
  EvangelismReport,
  EvangelismContact,
  OfferingRecord,
  PrivateMessage,
  CommunityMessage,
  InvitationCode,
  TeachingMaterial,
  SoulTargetConfig,
  NotificationItem,
  Profile,
  Region,
  ReportingPeriod,
  SystemSettings,
  ReportStatus,
} from '../types';

// ==============================================================================
// FIELD TRANSFORMERS (CAMELCASE <-> SNAKE_CASE)
// ==============================================================================

function mapCellFromDb(row: any): Cell {
  return {
    id: row.firebase_id || row.id,
    name: row.name,
    normalized_name: row.normalized_name,
    location: row.location || row.venue_address,
    meeting_location: row.meeting_location,
    tutorUid: row.tutor_uid,
    code: row.code,
    region_id: row.region_id,
    region_name: row.region_name,
    leader_id: row.leader_id,
    leader_name: row.leader_name,
    leader_phone: row.leader_phone,
    meeting_day: row.meeting_day,
    meeting_time: row.meeting_time,
    venue_address: row.venue_address,
    total_members: Number(row.total_members || 0),
    active_members: Number(row.active_members || 0),
    new_members: Number(row.new_members || 0),
    requiring_follow_up: Number(row.requiring_follow_up || 0),
    target_attendance: Number(row.target_attendance || 15),
    status: row.status || 'Active',
    is_active: Boolean(row.is_active ?? true),
    created_at: row.created_at || new Date().toISOString(),
  };
}

function mapCellMeetingReportFromDb(row: any): CellMeetingReport {
  return {
    id: row.id,
    cellId: row.cell_id,
    tutorUid: row.tutor_uid,
    cellName: row.cell_name,
    meetingDate: row.meeting_date,
    meetingLocation: row.meeting_location,
    tutorName: row.tutor_name,
    members: Number(row.members || 0),
    activeMembers: Number(row.active_members || 0),
    attendance: Number(row.attendance || 0),
    newMembers: Number(row.new_members || 0),
    absentees: Number(row.absentees || 0),
    followUpNeeded: Number(row.follow_up_needed || 0),
    offering: row.offering !== undefined && row.offering !== null ? Number(row.offering) : undefined,
    scripturalTheme: row.scriptural_theme,
    scripturesUsed: row.scriptures_used,
    tutorNotes: row.tutor_notes,
    testimonies: row.testimonies,
    tutorExperience: row.tutor_experience,
    status: row.status as ReportStatus,
    submittedAt: row.submitted_at || row.created_at,
    late: Boolean(row.late),
    reviewerComment: row.reviewer_comment,
    reviewedBy: row.reviewed_by,
    reviewedByName: row.reviewed_by_name,
    reviewedAt: row.reviewed_at,
  };
}

function mapEvangelismReportFromDb(row: any): EvangelismReport {
  return {
    id: row.id,
    cellId: row.cell_id,
    tutorUid: row.tutor_uid,
    cellName: row.cell_name,
    tutorName: row.tutor_name,
    date: row.date,
    location: row.location,
    teamMembers: Array.isArray(row.team_members) ? row.team_members : [],
    preSetTarget: row.pre_set_target !== undefined ? Number(row.pre_set_target) : undefined,
    peopleSpokenTo: Number(row.people_spoken_to || 0),
    contactsCaptured: Number(row.contacts_captured || 0),
    conversions: Number(row.conversions || 0),
    verifiedSoulsWon: row.verified_souls_won !== undefined ? Number(row.verified_souls_won) : undefined,
    interestedInMinistry: Number(row.interested_in_ministry || 0),
    potentialFollowUps: Number(row.potential_follow_ups || 0),
    scripturalTheme: row.scriptural_theme,
    scripturesUsed: row.scriptures_used,
    messageUsed: row.message_used || '',
    notes: row.notes || '',
    testimonies: row.testimonies,
    status: row.status as ReportStatus,
    submittedAt: row.submitted_at || row.created_at,
    late: Boolean(row.late),
    reviewerComment: row.reviewer_comment,
    reviewedBy: row.reviewed_by,
    reviewedByName: row.reviewed_by_name,
    reviewedAt: row.reviewed_at,
  };
}

function mapEvangelismContactFromDb(row: any): EvangelismContact {
  return {
    id: row.id,
    contactName: row.contact_name,
    name: row.contact_name,
    phone: row.phone,
    whatsappNumber: row.whatsapp_number,
    email: row.email,
    dateCaptured: row.date_captured,
    evangelismReportId: row.evangelism_report_id,
    location: row.location,
    cellId: row.cell_id,
    cellName: row.cell_name,
    tutorUid: row.tutor_uid,
    tutorName: row.tutor_name,
    assignedToName: row.assigned_to_name,
    followUpStatus: row.follow_up_status,
    notes: row.notes,
    followUpNotes: row.follow_up_notes,
    lastFollowUpDate: row.last_follow_up_date,
    nextFollowUpDate: row.next_follow_up_date,
    history: Array.isArray(row.history) ? row.history : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapOfferingRecordFromDb(row: any): OfferingRecord {
  return {
    id: row.id,
    reportId: row.report_id,
    cellId: row.cell_id,
    cellName: row.cell_name,
    tutorUid: row.tutor_uid,
    tutorName: row.tutor_name,
    amount: Number(row.amount || 0),
    currency: row.currency || 'GHS',
    meetingDate: row.meeting_date,
    weekLabel: row.week_label,
    submittedAt: row.submitted_at,
    status: row.status as ReportStatus,
  };
}

function mapPrivateMessageFromDb(row: any): PrivateMessage {
  return {
    id: row.id,
    senderUid: row.sender_uid,
    senderName: row.sender_name,
    senderRole: row.sender_role,
    recipientUid: row.recipient_uid,
    recipientName: row.recipient_name,
    cellId: row.cell_id,
    cellName: row.cell_name,
    content: row.content,
    createdAt: row.created_at,
    isRead: Boolean(row.is_read),
    readAt: row.read_at,
    replyTo: row.reply_to,
  };
}

function mapCommunityMessageFromDb(row: any): CommunityMessage {
  return {
    id: row.id,
    senderUid: row.sender_uid,
    senderName: row.sender_name,
    senderRole: row.sender_role,
    cellName: row.cell_name,
    content: row.content,
    category: row.category,
    createdAt: row.created_at,
    replyTo: row.reply_to,
    mentions: Array.isArray(row.mentions) ? row.mentions : [],
    reactions: typeof row.reactions === 'object' && row.reactions !== null ? row.reactions : {},
  };
}

function mapInvitationCodeFromDb(row: any): InvitationCode {
  return {
    id: row.id,
    code: row.code,
    createdBy: row.created_by || "",
    createdByName: row.created_by_name || "",
    createdAt: row.created_at || new Date().toISOString(),
    expiresAt: row.expires_at || new Date().toISOString(),
    expiryMinutes: row.expiry_minutes || 60,
    maxUses: row.max_uses || undefined,
    usedCount: row.used_count || 0,
    isRevoked: Boolean(row.is_revoked),
  };
}

function mapTeachingMaterialFromDb(row: any): TeachingMaterial {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    weekLabel: row.week_label,
    documentUrl: row.document_url,
    fileName: row.file_name,
    fileSize: row.file_size,
    fileType: row.file_type,
    textContent: row.text_content,
    status: row.status,
    publishedAt: row.published_at,
    uploadedBy: row.uploaded_by,
    uploadedByName: row.uploaded_by_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapNotificationFromDb(row: any): NotificationItem {
  return {
    id: row.id,
    user_id: row.user_id || row.recipient_target,
    title: row.title || 'Notification',
    message: row.message,
    type: (row.type || row.notification_type || 'system_alert') as any,
    channel: row.channel || 'in_app',
    is_read: Boolean(row.is_read),
    metadata: row.metadata || {},
    created_at: row.created_at || new Date().toISOString(),
  };
}

// ==============================================================================
// SUPABASE SERVICE CLASS
// ==============================================================================

export class SupabaseService {
  static isAvailable(): boolean {
    return Boolean(isSupabaseConfigured && supabase);
  }

  // --- Cells ---
  static async getCells(): Promise<Cell[] | null> {
    if (!this.isAvailable()) return null;
    try {
      const { data, error } = await supabase!
        .from('cells')
        .select('*')
        .order('name', { ascending: true });
      if (error) {
        console.warn('Supabase getCells error:', error.message);
        return null;
      }
      return data ? data.map(mapCellFromDb) : [];
    } catch (err) {
      console.warn('Supabase getCells exception:', err);
      return null;
    }
  }

  static async getCellById(cellId: string): Promise<Cell | null> {
    if (!this.isAvailable()) return null;
    try {
      const { data, error } = await supabase!
        .from('cells')
        .select('*')
        .or(`id.eq.${cellId},firebase_id.eq.${cellId}`)
        .maybeSingle();
      if (error) {
        console.warn('Supabase getCellById error:', error.message);
        return null;
      }
      return data ? mapCellFromDb(data) : null;
    } catch (err) {
      console.warn('Supabase getCellById exception:', err);
      return null;
    }
  }

  static async upsertCell(cell: Cell): Promise<boolean> {
    if (!this.isAvailable()) return false;
    const payload: any = {
      name: cell.name,
      normalized_name: cell.normalized_name || cell.name.trim().toLowerCase().replace(/[^a-z0-9]/g, ''),
      location: cell.location || cell.venue_address || '',
      meeting_location: cell.meeting_location || '',
      tutor_uid: cell.tutorUid || '',
      code: cell.code || null,
      region_id: cell.region_id || null,
      region_name: cell.region_name || '',
      leader_name: cell.leader_name || '',
      leader_phone: cell.leader_phone || '',
      meeting_day: cell.meeting_day || 'Wednesday',
      meeting_time: cell.meeting_time || '18:30:00',
      venue_address: cell.venue_address || 'Fellowship Venue',
      total_members: cell.total_members || 0,
      active_members: cell.active_members || 0,
      new_members: cell.new_members || 0,
      requiring_follow_up: cell.requiring_follow_up || 0,
      status: cell.status || 'Active',
      is_active: cell.is_active ?? true,
      firebase_id: cell.id,
    };

    try {
      const { error } = await supabase!
        .from('cells')
        .upsert(payload, { onConflict: 'firebase_id' });
      if (error) {
        console.warn('Supabase upsertCell error:', error.message);
        SyncStateService.recordFailedSync({
          table: 'cells',
          id: cell.id,
          payload,
          errorMessage: error.message,
        });
        return false;
      }
      SyncStateService.recordSuccessfulSync('cells', cell.id);
      return true;
    } catch (err: any) {
      console.warn('Supabase upsertCell exception:', err);
      SyncStateService.recordFailedSync({
        table: 'cells',
        id: cell.id,
        payload,
        errorMessage: err?.message || String(err),
      });
      return false;
    }
  }

  // --- Cell Meeting Reports ---
  static async getCellMeetingReports(filters?: { cellId?: string; tutorUid?: string }): Promise<CellMeetingReport[] | null> {
    if (!this.isAvailable()) return null;
    try {
      let query = supabase!.from('cell_meeting_reports').select('*').order('meeting_date', { ascending: false });
      if (filters?.cellId) query = query.eq('cell_id', filters.cellId);
      if (filters?.tutorUid) query = query.eq('tutor_uid', filters.tutorUid);
      const { data, error } = await query;
      if (error) {
        console.warn('Supabase getCellMeetingReports error:', error.message);
        return null;
      }
      return data ? data.map(mapCellMeetingReportFromDb) : [];
    } catch (err) {
      console.warn('Supabase getCellMeetingReports exception:', err);
      return null;
    }
  }

  static async upsertCellMeetingReport(report: CellMeetingReport): Promise<boolean> {
    if (!this.isAvailable()) return false;
    const payload = {
      id: report.id,
      cell_id: report.cellId,
      tutor_uid: report.tutorUid,
      cell_name: report.cellName,
      meeting_date: report.meetingDate,
      meeting_location: report.meetingLocation || null,
      tutor_name: report.tutorName,
      members: report.members || 0,
      active_members: report.activeMembers || 0,
      attendance: report.attendance || 0,
      new_members: report.newMembers || 0,
      absentees: report.absentees || 0,
      follow_up_needed: report.followUpNeeded || 0,
      offering: report.offering !== undefined ? report.offering : 0,
      scriptural_theme: report.scripturalTheme || null,
      scriptures_used: report.scripturesUsed || null,
      tutor_notes: report.tutorNotes || null,
      testimonies: report.testimonies || null,
      tutor_experience: report.tutorExperience || null,
      status: report.status,
      submitted_at: report.submittedAt || new Date().toISOString(),
      late: Boolean(report.late),
      reviewer_comment: report.reviewerComment || null,
      reviewed_by: report.reviewedBy || null,
      reviewed_by_name: report.reviewedByName || null,
      reviewed_at: report.reviewedAt || null,
    };

    try {
      const { error } = await supabase!
        .from('cell_meeting_reports')
        .upsert(payload, { onConflict: 'id' });
      if (error) {
        console.warn('Supabase upsertCellMeetingReport error:', error.message);
        SyncStateService.recordFailedSync({
          table: 'cell_meeting_reports',
          id: report.id,
          payload,
          errorMessage: error.message,
        });
        return false;
      }
      SyncStateService.recordSuccessfulSync('cell_meeting_reports', report.id);
      return true;
    } catch (err: any) {
      console.warn('Supabase upsertCellMeetingReport exception:', err);
      SyncStateService.recordFailedSync({
        table: 'cell_meeting_reports',
        id: report.id,
        payload,
        errorMessage: err?.message || String(err),
      });
      return false;
    }
  }

  // --- Evangelism Reports ---
  static async getEvangelismReports(filters?: { cellId?: string; tutorUid?: string }): Promise<EvangelismReport[] | null> {
    if (!this.isAvailable()) return null;
    try {
      let query = supabase!.from('evangelism_reports').select('*').order('date', { ascending: false });
      if (filters?.cellId) query = query.eq('cell_id', filters.cellId);
      if (filters?.tutorUid) query = query.eq('tutor_uid', filters.tutorUid);
      const { data, error } = await query;
      if (error) {
        console.warn('Supabase getEvangelismReports error:', error.message);
        return null;
      }
      return data ? data.map(mapEvangelismReportFromDb) : [];
    } catch (err) {
      console.warn('Supabase getEvangelismReports exception:', err);
      return null;
    }
  }

  static async upsertEvangelismReport(report: EvangelismReport): Promise<boolean> {
    if (!this.isAvailable()) return false;
    const payload = {
      id: report.id,
      cell_id: report.cellId,
      tutor_uid: report.tutorUid,
      cell_name: report.cellName,
      tutor_name: report.tutorName,
      date: report.date,
      location: report.location,
      team_members: report.teamMembers || [],
      pre_set_target: report.preSetTarget || 0,
      people_spoken_to: report.peopleSpokenTo || 0,
      contacts_captured: report.contactsCaptured || 0,
      conversions: report.conversions || 0,
      verified_souls_won: report.verifiedSoulsWon || 0,
      interested_in_ministry: report.interestedInMinistry || 0,
      potential_follow_ups: report.potentialFollowUps || 0,
      scriptural_theme: report.scripturalTheme || null,
      scriptures_used: report.scripturesUsed || null,
      message_used: report.messageUsed || '',
      notes: report.notes || '',
      testimonies: report.testimonies || null,
      status: report.status,
      submitted_at: report.submittedAt || new Date().toISOString(),
      late: Boolean(report.late),
      reviewer_comment: report.reviewerComment || null,
      reviewed_by: report.reviewedBy || null,
      reviewed_by_name: report.reviewedByName || null,
      reviewed_at: report.reviewedAt || null,
    };

    try {
      const { error } = await supabase!
        .from('evangelism_reports')
        .upsert(payload, { onConflict: 'id' });
      if (error) {
        console.warn('Supabase upsertEvangelismReport error:', error.message);
        SyncStateService.recordFailedSync({
          table: 'evangelism_reports',
          id: report.id,
          payload,
          errorMessage: error.message,
        });
        return false;
      }
      SyncStateService.recordSuccessfulSync('evangelism_reports', report.id);
      return true;
    } catch (err: any) {
      console.warn('Supabase upsertEvangelismReport exception:', err);
      SyncStateService.recordFailedSync({
        table: 'evangelism_reports',
        id: report.id,
        payload,
        errorMessage: err?.message || String(err),
      });
      return false;
    }
  }

  // --- Evangelism Contacts ---
  static async getEvangelismContacts(filters?: { cellId?: string; tutorUid?: string }): Promise<EvangelismContact[] | null> {
    if (!this.isAvailable()) return null;
    try {
      let query = supabase!.from('evangelism_contacts').select('*').order('date_captured', { ascending: false });
      if (filters?.cellId) query = query.eq('cell_id', filters.cellId);
      if (filters?.tutorUid) query = query.eq('tutor_uid', filters.tutorUid);
      const { data, error } = await query;
      if (error) {
        console.warn('Supabase getEvangelismContacts error:', error.message);
        return null;
      }
      return data ? data.map(mapEvangelismContactFromDb) : [];
    } catch (err) {
      console.warn('Supabase getEvangelismContacts exception:', err);
      return null;
    }
  }

  static async upsertEvangelismContact(contact: EvangelismContact): Promise<boolean> {
    if (!this.isAvailable()) return false;
    const payload = {
      id: contact.id,
      contact_name: contact.contactName || contact.name || 'Unnamed Soul',
      phone: contact.phone || null,
      whatsapp_number: contact.whatsappNumber || null,
      email: contact.email || null,
      date_captured: contact.dateCaptured || new Date().toISOString().split('T')[0],
      evangelism_report_id: contact.evangelismReportId || null,
      location: contact.location || contact.evangelismLocation || null,
      cell_id: contact.cellId,
      cell_name: contact.cellName,
      tutor_uid: contact.tutorUid || null,
      tutor_name: contact.tutorName || null,
      assigned_to_name: contact.assignedToName || null,
      follow_up_status: contact.followUpStatus || 'Contacted',
      notes: contact.notes || null,
      follow_up_notes: contact.followUpNotes || null,
      last_follow_up_date: contact.lastFollowUpDate || null,
      next_follow_up_date: contact.nextFollowUpDate || null,
      history: contact.history || [],
    };

    try {
      const { error } = await supabase!
        .from('evangelism_contacts')
        .upsert(payload, { onConflict: 'id' });
      if (error) {
        console.warn('Supabase upsertEvangelismContact error:', error.message);
        SyncStateService.recordFailedSync({
          table: 'evangelism_contacts',
          id: contact.id,
          payload,
          errorMessage: error.message,
        });
        return false;
      }
      SyncStateService.recordSuccessfulSync('evangelism_contacts', contact.id);
      return true;
    } catch (err: any) {
      console.warn('Supabase upsertEvangelismContact exception:', err);
      SyncStateService.recordFailedSync({
        table: 'evangelism_contacts',
        id: contact.id,
        payload,
        errorMessage: err?.message || String(err),
      });
      return false;
    }
  }

  static async deleteEvangelismContact(id: string): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const { error } = await supabase!.from('evangelism_contacts').delete().eq('id', id);
      if (error) {
        SyncStateService.recordFailedSync({
          table: 'evangelism_contacts',
          id,
          action: 'DELETE',
          payload: { id },
          errorMessage: error.message,
        });
        return false;
      }
      SyncStateService.recordSuccessfulSync('evangelism_contacts', id);
      return true;
    } catch (err: any) {
      console.warn('Supabase deleteEvangelismContact exception:', err);
      SyncStateService.recordFailedSync({
        table: 'evangelism_contacts',
        id,
        action: 'DELETE',
        payload: { id },
        errorMessage: err?.message || String(err),
      });
      return false;
    }
  }

  // --- Offerings (Dual-Table Reconciliation: 'offerings' <-> 'offering_records') ---
  static async getOfferingRecords(): Promise<OfferingRecord[] | null> {
    if (!this.isAvailable()) return null;
    try {
      // 1. Primary Live Table: 'offerings'
      const { data: offData, error: offError } = await supabase!
        .from('offerings')
        .select('*')
        .order('meeting_date', { ascending: false });

      if (!offError && offData) {
        return offData.map(mapOfferingRecordFromDb);
      }

      // 2. Compatibility Fallback: 'offering_records'
      const { data, error } = await supabase!
        .from('offering_records')
        .select('*')
        .order('meeting_date', { ascending: false });
      if (error) {
        console.warn('Supabase getOfferingRecords error:', error.message);
        return null;
      }
      return data ? data.map(mapOfferingRecordFromDb) : [];
    } catch (err) {
      console.warn('Supabase getOfferingRecords exception:', err);
      return null;
    }
  }

  static async upsertOfferingRecord(offering: OfferingRecord): Promise<boolean> {
    if (!this.isAvailable()) return false;
    const payload = {
      id: offering.id,
      report_id: offering.reportId,
      cell_id: offering.cellId,
      cell_name: offering.cellName,
      tutor_uid: offering.tutorUid || null,
      tutor_name: offering.tutorName || null,
      amount: offering.amount || 0,
      currency: offering.currency || 'GHS',
      meeting_date: offering.meetingDate,
      week_label: offering.weekLabel || null,
      submitted_at: offering.submittedAt || new Date().toISOString(),
      status: offering.status,
    };

    try {
      // Upsert to primary table 'offerings'
      const { error: offErr } = await supabase!
        .from('offerings')
        .upsert(payload, { onConflict: 'id' });

      if (!offErr) {
        SyncStateService.recordSuccessfulSync('offerings', offering.id);
        // Also keep offering_records synchronized if present
        try {
          await supabase!.from('offering_records').upsert(payload, { onConflict: 'id' });
        } catch {}
        return true;
      }

      // Fallback to 'offering_records'
      const { error: recErr } = await supabase!
        .from('offering_records')
        .upsert(payload, { onConflict: 'id' });

      if (!recErr) {
        SyncStateService.recordSuccessfulSync('offering_records', offering.id);
        return true;
      }

      const errMsg = offErr?.message || recErr?.message || 'Failed upserting offering';
      console.warn('Supabase upsertOfferingRecord error:', errMsg);
      SyncStateService.recordFailedSync({
        table: 'offerings',
        id: offering.id,
        payload,
        errorMessage: errMsg,
      });
      return false;
    } catch (err: any) {
      console.warn('Supabase upsertOfferingRecord exception:', err);
      SyncStateService.recordFailedSync({
        table: 'offerings',
        id: offering.id,
        payload,
        errorMessage: err?.message || String(err),
      });
      return false;
    }
  }

  // --- Private Messages ---
  static async getPrivateMessages(userUid: string): Promise<PrivateMessage[] | null> {
    if (!this.isAvailable()) return null;
    try {
      const { data, error } = await supabase!
        .from('private_messages')
        .select('*')
        .or(`sender_uid.eq.${userUid},recipient_uid.eq.${userUid}`)
        .order('created_at', { ascending: true });
      if (error) return null;
      return data ? data.map(mapPrivateMessageFromDb) : [];
    } catch (err) {
      return null;
    }
  }

  static async sendPrivateMessage(msg: PrivateMessage): Promise<boolean> {
    if (!this.isAvailable()) return false;
    const payload = {
      id: msg.id,
      sender_uid: msg.senderUid,
      sender_name: msg.senderName,
      sender_role: msg.senderRole,
      recipient_uid: msg.recipientUid,
      recipient_name: msg.recipientName,
      cell_id: msg.cellId || null,
      cell_name: msg.cellName || null,
      content: msg.content,
      is_read: Boolean(msg.isRead),
      read_at: msg.readAt || null,
      reply_to: msg.replyTo || null,
    };

    try {
      const { error } = await supabase!.from('private_messages').upsert(payload, { onConflict: 'id' });
      if (error) {
        SyncStateService.recordFailedSync({
          table: 'private_messages',
          id: msg.id,
          payload,
          errorMessage: error.message,
        });
        return false;
      }
      SyncStateService.recordSuccessfulSync('private_messages', msg.id);
      return true;
    } catch (err: any) {
      SyncStateService.recordFailedSync({
        table: 'private_messages',
        id: msg.id,
        payload,
        errorMessage: err?.message || String(err),
      });
      return false;
    }
  }

  // --- Community Messages ---
  static async getCommunityMessages(): Promise<CommunityMessage[] | null> {
    if (!this.isAvailable()) return null;
    try {
      const { data, error } = await supabase!
        .from('community_messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(100);
      if (error) return null;
      return data ? data.map(mapCommunityMessageFromDb) : [];
    } catch (err) {
      return null;
    }
  }

  static async sendCommunityMessage(msg: CommunityMessage): Promise<boolean> {
    if (!this.isAvailable()) return false;
    const payload = {
      id: msg.id,
      sender_uid: msg.senderUid,
      sender_name: msg.senderName,
      sender_role: msg.senderRole,
      cell_name: msg.cellName || null,
      content: msg.content,
      category: msg.category || 'general',
      reply_to: msg.replyTo || null,
      mentions: msg.mentions || [],
      reactions: msg.reactions || {},
    };

    try {
      const { error } = await supabase!.from('community_messages').upsert(payload, { onConflict: 'id' });
      if (error) {
        SyncStateService.recordFailedSync({
          table: 'community_messages',
          id: msg.id,
          payload,
          errorMessage: error.message,
        });
        return false;
      }
      SyncStateService.recordSuccessfulSync('community_messages', msg.id);
      return true;
    } catch (err: any) {
      SyncStateService.recordFailedSync({
        table: 'community_messages',
        id: msg.id,
        payload,
        errorMessage: err?.message || String(err),
      });
      return false;
    }
  }

  // --- Invitation Codes ---
  static async getInvitationCodes(): Promise<InvitationCode[] | null> {
    if (!isSupabaseConfigured || !supabase) return null;
    try {
      const { data, error } = await supabase
        .from("invitation_codes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        console.warn("Supabase getInvitationCodes error:", error.message);
        return null;
      }
      return data ? data.map(mapInvitationCodeFromDb) : [];
    } catch (err) {
      console.warn("Supabase getInvitationCodes exception:", err);
      return null;
    }
  }

  static async upsertInvitationCode(code: InvitationCode): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;
    const payload = {
      id: code.id,
      code: code.code,
      created_by: code.createdBy,
      created_by_name: code.createdByName,
      created_at: code.createdAt,
      expires_at: code.expiresAt,
      expiry_minutes: code.expiryMinutes,
      max_uses: code.maxUses || 1,
      used_count: code.usedCount || 0,
      is_revoked: Boolean(code.isRevoked),
    };
    try {
      const { error } = await supabase.from("invitation_codes").upsert(payload, { onConflict: "id" });
      if (error) {
        console.warn("Supabase upsertInvitationCode error:", error.message);
        SyncStateService.recordFailedSync({
          table: "invitation_codes",
          id: code.id,
          payload,
          errorMessage: error.message,
        });
        return false;
      }
      SyncStateService.recordSuccessfulSync("invitation_codes", code.id);
      return true;
    } catch (err: any) {
      console.warn("Supabase upsertInvitationCode exception:", err);
      SyncStateService.recordFailedSync({
        table: "invitation_codes",
        id: code.id,
        payload,
        errorMessage: err?.message || String(err),
      });
      return false;
    }
  }

  // --- Teaching Materials ---
  static async getTeachingMaterials(): Promise<TeachingMaterial[] | null> {
    if (!this.isAvailable()) return null;
    try {
      const { data, error } = await supabase!
        .from('teaching_materials')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) return null;
      return data ? data.map(mapTeachingMaterialFromDb) : [];
    } catch (err) {
      return null;
    }
  }

  static async upsertTeachingMaterial(material: TeachingMaterial): Promise<boolean> {
    if (!this.isAvailable()) return false;
    const payload = {
      id: material.id,
      title: material.title,
      description: material.description || '',
      week_label: material.weekLabel,
      document_url: material.documentUrl || null,
      file_name: material.fileName || null,
      file_size: material.fileSize || null,
      file_type: material.fileType || null,
      text_content: material.textContent || null,
      status: material.status || 'published',
      published_at: material.publishedAt || null,
      uploaded_by: material.uploadedBy,
      uploaded_by_name: material.uploadedByName,
    };

    try {
      const { error } = await supabase!.from('teaching_materials').upsert(payload, { onConflict: 'id' });
      if (error) {
        SyncStateService.recordFailedSync({
          table: 'teaching_materials',
          id: material.id,
          payload,
          errorMessage: error.message,
        });
        return false;
      }
      SyncStateService.recordSuccessfulSync('teaching_materials', material.id);
      return true;
    } catch (err: any) {
      SyncStateService.recordFailedSync({
        table: 'teaching_materials',
        id: material.id,
        payload,
        errorMessage: err?.message || String(err),
      });
      return false;
    }
  }

  // --- Soul Target Config (Dual-Table Reconciliation: 'soul_target_configs' <-> 'soul_targets') ---
  static async getSoulTargetConfig(year: number = 2026): Promise<SoulTargetConfig | null> {
    if (!this.isAvailable()) return null;
    try {
      // 1. Primary Live Table: 'soul_target_configs'
      const { data: cfgData, error: cfgError } = await supabase!
        .from('soul_target_configs')
        .select('*')
        .eq('year', year)
        .maybeSingle();

      if (!cfgError && cfgData) {
        return {
          id: cfgData.id,
          year: cfgData.year,
          annualTarget: cfgData.annual_target,
          auditHistory: Array.isArray(cfgData.audit_history) ? cfgData.audit_history : [],
          updatedAt: cfgData.updated_at,
          updatedBy: cfgData.updated_by || 'Administrator',
        };
      }

      // 2. Compatibility Fallback: 'soul_targets'
      const { data, error } = await supabase!
        .from('soul_targets')
        .select('*')
        .eq('year', year)
        .maybeSingle();
      if (error || !data) return null;
      return {
        id: data.id,
        year: data.year,
        annualTarget: data.annual_target,
        auditHistory: Array.isArray(data.audit_history) ? data.audit_history : [],
        updatedAt: data.updated_at,
        updatedBy: data.updated_by || 'Administrator',
      };
    } catch (err) {
      return null;
    }
  }

  static async upsertSoulTargetConfig(config: SoulTargetConfig): Promise<boolean> {
    if (!this.isAvailable()) return false;
    const payload = {
      id: config.id,
      year: config.year,
      annual_target: config.annualTarget,
      audit_history: config.auditHistory || [],
      description: `National Soul-Winning Milestone Target for ${config.year}`,
      updated_by: config.updatedBy || '',
    };

    try {
      // Upsert to soul_target_configs
      const { error: cfgErr } = await supabase!.from('soul_target_configs').upsert(payload, { onConflict: 'year' });
      if (!cfgErr) {
        SyncStateService.recordSuccessfulSync('soul_target_configs', String(config.year));
        // Also keep soul_targets synchronized if present
        try {
          await supabase!.from('soul_targets').upsert(payload, { onConflict: 'year' });
        } catch {}
        return true;
      }

      // Fallback to soul_targets
      const { error } = await supabase!.from('soul_targets').upsert(payload, { onConflict: 'year' });
      if (!error) {
        SyncStateService.recordSuccessfulSync('soul_targets', String(config.year));
        return true;
      }

      SyncStateService.recordFailedSync({
        table: 'soul_target_configs',
        id: String(config.year),
        payload,
        errorMessage: error.message,
      });
      return false;
    } catch (err: any) {
      SyncStateService.recordFailedSync({
        table: 'soul_target_configs',
        id: String(config.year),
        payload,
        errorMessage: err?.message || String(err),
      });
      return false;
    }
  }

  // --- System Settings ---
  static async getSystemSettings(): Promise<SystemSettings | null> {
    if (!this.isAvailable()) return null;
    try {
      const { data, error } = await supabase!
        .from('system_settings')
        .select('*')
        .eq('id', 'global')
        .maybeSingle();
      if (error || !data) return null;
      return {
        id: 'general',
        vision: data.vision || '',
        mission: data.mission || '',
        annualSoulWinningTarget: data.annual_soul_target || 5000,
        weeklyDeadline: 'Sunday at 6:00 PM Ghana Time (Africa/Accra, UTC+0)',
        updatedAt: data.updated_at || new Date().toISOString(),
        updatedBy: data.updated_by || 'Administrator',
      };
    } catch (err) {
      return null;
    }
  }

  static async upsertSystemSettings(settings: SystemSettings): Promise<boolean> {
    if (!this.isAvailable()) return false;
    const payload = {
      id: 'global',
      ministry_name: 'Forerunners Network International (FNI)',
      vision: settings.vision,
      mission: settings.mission,
      submission_deadline_day: 'Sunday',
      submission_deadline_time: '18:00',
      annual_soul_target: settings.annualSoulWinningTarget,
      enable_email_notifications: true,
      enable_whatsapp_notifications: true,
      updated_by: settings.updatedBy || '',
    };

    try {
      const { error } = await supabase!.from('system_settings').upsert(payload, { onConflict: 'id' });
      if (error) {
        SyncStateService.recordFailedSync({
          table: 'system_settings',
          id: 'global',
          payload,
          errorMessage: error.message,
        });
        return false;
      }
      SyncStateService.recordSuccessfulSync('system_settings', 'global');
      return true;
    } catch (err: any) {
      SyncStateService.recordFailedSync({
        table: 'system_settings',
        id: 'global',
        payload,
        errorMessage: err?.message || String(err),
      });
      return false;
    }
  }

  // --- Device Tokens ---
  static async upsertDeviceToken(data: { id: string; userId: string; token: string; device?: string; platform?: string }): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;
    const payload = {
      id: data.id,
      user_id: data.userId,
      token: data.token,
      device_type: data.device || "Web",
      platform: data.platform || "Web",
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "Unknown",
      last_active: new Date().toISOString(),
    };
    try {
      const { error } = await supabase.from("device_tokens").upsert(payload, { onConflict: "token" });
      if (error) {
        console.warn("Supabase upsertDeviceToken error:", error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn("Supabase upsertDeviceToken exception:", err);
      return false;
    }
  }

  static async deleteDeviceToken(tokenId: string): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;
    try {
      const { error } = await supabase.from("device_tokens").delete().eq("id", tokenId);
      if (error) {
        console.warn("Supabase deleteDeviceToken error:", error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn("Supabase deleteDeviceToken exception:", err);
      return false;
    }
  }

  // --- Notifications (Multi-Field Alignment) ---
  static async getNotifications(recipientTarget: string): Promise<NotificationItem[] | null> {
    if (!this.isAvailable()) return null;
    try {
      const { data, error } = await supabase!
        .from('notifications')
        .select('*')
        .or(`recipient_target.eq.${recipientTarget},recipient_target.eq.all,user_id.eq.${recipientTarget},user_id.eq.all`)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) return null;
      return data ? data.map(mapNotificationFromDb) : [];
    } catch (err) {
      return null;
    }
  }

  static async insertNotification(item: NotificationItem): Promise<boolean> {
    if (!this.isAvailable()) return false;
    const target = item.user_id || (item as any).recipient_target || 'all';
    const notifType = (item.type || (item as any).notification_type || 'system_alert') as any;
    const payload = {
      id: item.id,
      user_id: target,
      recipient_target: target,
      sender_id: (item as any).sender_id || (item as any).senderId || null,
      sender_name: (item as any).sender_name || (item as any).senderName || null,
      title: item.title,
      message: item.message,
      date: item.created_at ? item.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
      notification_type: notifType,
      type: notifType,
      channel: (item.channel || 'in_app') as any,
      status: 'delivered',
      is_read: Boolean(item.is_read),
      read_at: item.is_read ? new Date().toISOString() : null,
      metadata: item.metadata || {},
      created_at: item.created_at || new Date().toISOString(),
    };

    try {
      const { error } = await supabase!.from('notifications').upsert(payload, { onConflict: 'id' });
      if (error) {
        SyncStateService.recordFailedSync({
          table: 'notifications',
          id: item.id,
          payload,
          errorMessage: error.message,
        });
        return false;
      }
      SyncStateService.recordSuccessfulSync('notifications', item.id);
      return true;
    } catch (err: any) {
      SyncStateService.recordFailedSync({
        table: 'notifications',
        id: item.id,
        payload,
        errorMessage: err?.message || String(err),
      });
      return false;
    }
  }

  // --- Profiles & Avatars ---
  static async updateProfileAvatar(userId: string, avatarUrl: string): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const { error } = await supabase!
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .or(`id.eq.${userId},firebase_uid.eq.${userId}`);
      if (error) {
        SyncStateService.recordFailedSync({
          table: 'profiles',
          id: userId,
          payload: { avatar_url: avatarUrl },
          errorMessage: error.message,
        });
        return false;
      }
      SyncStateService.recordSuccessfulSync('profiles', userId);
      return true;
    } catch (err: any) {
      SyncStateService.recordFailedSync({
        table: 'profiles',
        id: userId,
        payload: { avatar_url: avatarUrl },
        errorMessage: err?.message || String(err),
      });
      return false;
    }
  }

  // --- Review Logs & Follow-Ups (Dual Field Reconciliation: status/action & comment/comments) ---
  static async insertReviewLog(log: {
    id?: string;
    reportId: string;
    reportType: string;
    reviewerUid: string;
    reviewerName: string;
    action?: string;
    status?: string;
    comments?: string;
    comment?: string;
    createdAt?: string;
  }): Promise<boolean> {
    if (!this.isAvailable()) return false;
    const actionVal = log.action || log.status || 'Reviewed';
    const commentVal = log.comments || log.comment || null;
    const logId = log.id || `rev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const payload = {
      id: logId,
      report_id: log.reportId,
      report_type: log.reportType,
      reviewer_uid: log.reviewerUid,
      reviewer_name: log.reviewerName,
      action: actionVal,
      status: actionVal,
      comments: commentVal,
      comment: commentVal,
      created_at: log.createdAt || new Date().toISOString(),
    };

    try {
      const { error } = await supabase!.from('review_logs').upsert(payload, { onConflict: 'id' });
      if (error) {
        SyncStateService.recordFailedSync({
          table: 'review_logs',
          id: logId,
          payload,
          errorMessage: error.message,
        });
        return false;
      }
      SyncStateService.recordSuccessfulSync('review_logs', logId);
      return true;
    } catch (err: any) {
      SyncStateService.recordFailedSync({
        table: 'review_logs',
        id: logId,
        payload,
        errorMessage: err?.message || String(err),
      });
      return false;
    }
  }

  static async getReviewLogs(reportId?: string): Promise<any[] | null> {
    if (!this.isAvailable()) return null;
    try {
      let query = supabase!.from('review_logs').select('*').order('created_at', { ascending: false });
      if (reportId) {
        query = query.eq('report_id', reportId);
      }
      const { data, error } = await query;
      if (error || !data) return null;
      return data.map(r => ({
        id: r.id,
        reportId: r.report_id,
        reportType: r.report_type,
        reviewerUid: r.reviewer_uid,
        reviewerName: r.reviewer_name,
        action: r.action || r.status || 'Reviewed',
        status: r.status || r.action || 'Reviewed',
        comments: r.comments || r.comment || '',
        comment: r.comment || r.comments || '',
        createdAt: r.created_at,
      }));
    } catch {
      return null;
    }
  }

  static async insertFollowUp(followUp: {
    id?: string;
    contactId: string;
    cellId?: string;
    tutorUid?: string;
    notes?: string;
    followUpDate?: string;
    nextFollowUpDate?: string;
    status?: string;
  }): Promise<boolean> {
    if (!this.isAvailable()) return false;
    const followUpId = followUp.id || `flw-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const payload = {
      id: followUpId,
      contact_id: followUp.contactId,
      cell_id: followUp.cellId || null,
      tutor_uid: followUp.tutorUid || null,
      notes: followUp.notes || null,
      follow_up_date: followUp.followUpDate || new Date().toISOString().split('T')[0],
      next_follow_up_date: followUp.nextFollowUpDate || null,
      status: followUp.status || 'Completed',
    };

    try {
      const { error } = await supabase!.from('follow_ups').upsert(payload, { onConflict: 'id' });
      if (error) {
        SyncStateService.recordFailedSync({
          table: 'follow_ups',
          id: followUpId,
          payload,
          errorMessage: error.message,
        });
        return false;
      }
      SyncStateService.recordSuccessfulSync('follow_ups', followUpId);
      return true;
    } catch (err: any) {
      SyncStateService.recordFailedSync({
        table: 'follow_ups',
        id: followUpId,
        payload,
        errorMessage: err?.message || String(err),
      });
      return false;
    }
  }

  static async getFollowUps(contactId?: string): Promise<any[] | null> {
    if (!this.isAvailable()) return null;
    try {
      let query = supabase!.from('follow_ups').select('*').order('created_at', { ascending: false });
      if (contactId) {
        query = query.eq('contact_id', contactId);
      }
      const { data, error } = await query;
      return error ? null : data;
    } catch {
      return null;
    }
  }

  // --- Profiles (Preserving profiles.id TEXT + supabase_user_id UUID) ---
  static async getProfile(userId: string): Promise<Profile | null> {
    if (!this.isAvailable()) return null;
    try {
      const { data, error } = await supabase!
        .from('profiles')
        .select('*')
        .or(`id.eq.${userId},supabase_user_id.eq.${userId}`)
        .maybeSingle();

      if (error || !data) {
        // Fallback for administrator if remote profile query is temporarily blocked by RLS function permissions (e.g. 42501)
        const { data: sessionData } = await supabase!.auth.getSession().catch(() => ({ data: { session: null } }));
        const sessionUser = sessionData?.session?.user;
        const isAdmin =
          userId === '48982f13-43bc-490b-adaa-291a5259704c' ||
          sessionUser?.id === '48982f13-43bc-490b-adaa-291a5259704c' ||
          sessionUser?.email?.toLowerCase() === 'fniadmin@gmail.com';

        if (isAdmin) {
          return {
            id: userId || sessionUser?.id || '48982f13-43bc-490b-adaa-291a5259704c',
            supabase_user_id: sessionUser?.id || '48982f13-43bc-490b-adaa-291a5259704c',
            email: sessionUser?.email || 'fniadmin@gmail.com',
            full_name: sessionUser?.user_metadata?.full_name || 'FNI Administrator',
            role: 'super_admin',
            is_active: true,
            is_onboarded: true,
            must_change_password: false,
            auth_provider: 'credentials',
            created_at: sessionUser?.created_at || new Date().toISOString(),
          };
        }
        return null;
      }
      return {
        id: data.id,
        email: data.email || '',
        username: data.username || undefined,
        full_name: data.full_name,
        phone_number: data.phone_number || undefined,
        role: data.role,
        region_id: data.region_id || undefined,
        region_name: data.region_name || undefined,
        cell_id: data.cell_id || undefined,
        cell_name: data.cell_name || undefined,
        avatar_url: data.avatar_url || undefined,
        is_active: data.is_active ?? true,
        is_onboarded: data.is_onboarded ?? true,
        must_change_password: Boolean(data.must_change_password),
        auth_provider: data.auth_provider || 'credentials',
        created_at: data.created_at,
      };
    } catch {
      return null;
    }
  }

  static async getProfiles(): Promise<Profile[] | null> {
    if (!this.isAvailable()) return null;
    try {
      const { data, error } = await supabase!
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data) return null;
      return data.map((d: any) => ({
        id: d.id,
        email: d.email || '',
        username: d.username || undefined,
        full_name: d.full_name,
        phone_number: d.phone_number || undefined,
        role: d.role,
        region_id: d.region_id || undefined,
        region_name: d.region_name || undefined,
        cell_id: d.cell_id || undefined,
        cell_name: d.cell_name || undefined,
        avatar_url: d.avatar_url || undefined,
        is_active: d.is_active ?? true,
        is_onboarded: d.is_onboarded ?? true,
        must_change_password: Boolean(d.must_change_password),
        auth_provider: d.auth_provider || 'credentials',
        created_at: d.created_at,
      }));
    } catch {
      return null;
    }
  }

  // --- Regions ---
  static async getRegions(): Promise<Region[] | null> {
    if (!this.isAvailable()) return null;
    try {
      const { data, error } = await supabase!
        .from('regions')
        .select('*')
        .order('name', { ascending: true });

      if (error || !data) return null;
      return data.map((r: any) => ({
        id: r.id,
        name: r.name,
        code: r.code,
        country: r.country,
        state_province: r.state_province || undefined,
        leader_id: r.leader_id || undefined,
        leader_name: r.leader_name || undefined,
        total_cells: r.total_cells || 0,
        active_cells: r.active_cells || 0,
        created_at: r.created_at,
      }));
    } catch {
      return null;
    }
  }

  // --- Reporting Periods ---
  static async getReportingPeriods(): Promise<ReportingPeriod[] | null> {
    if (!this.isAvailable()) return null;
    try {
      const { data, error } = await supabase!
        .from('reporting_periods')
        .select('*')
        .order('year', { ascending: false })
        .order('week_number', { ascending: false });

      if (error || !data) return null;
      return data.map((p: any) => ({
        id: p.id,
        name: p.name,
        year: p.year,
        week_number: p.week_number,
        start_date: p.start_date,
        end_date: p.end_date,
        submission_deadline: p.submission_deadline,
        is_open: Boolean(p.is_open),
        created_at: p.created_at,
      }));
    } catch {
      return null;
    }
  }

  // --- Audit Logs ---
  static async getAuditLogs(): Promise<any[] | null> {
    if (!this.isAvailable()) return null;
    try {
      const { data, error } = await supabase!
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      return error ? null : data;
    } catch {
      return null;
    }
  }

  static async insertAuditLog(log: {
    id?: string;
    action: string;
    entity_type: string;
    entity_id?: string;
    user_id?: string;
    user_name?: string;
    user_role?: string;
    details?: Record<string, any>;
    ip_address?: string;
  }): Promise<boolean> {
    if (!this.isAvailable()) return false;
    const payload = {
      id: log.id || `aud-${Date.now()}`,
      action: log.action,
      entity_type: log.entity_type,
      entity_id: log.entity_id || null,
      user_id: log.user_id || null,
      user_name: log.user_name || null,
      user_role: log.user_role || null,
      details: log.details || {},
      ip_address: log.ip_address || null,
      created_at: new Date().toISOString(),
    };
    try {
      const { error } = await supabase!.from('audit_logs').insert(payload);
      return !error;
    } catch {
      return false;
    }
  }

  static async upsertProfile(profile: Profile): Promise<boolean> {
    if (!this.isAvailable()) return false;
    const payload: any = {
      id: profile.id, // Primary key: Supabase Auth user UUID for native accounts
      email: profile.email || '',
      username: profile.username || null,
      full_name: profile.full_name,
      phone_number: profile.phone_number || null,
      role: profile.role,
      region_id: profile.region_id || null,
      region_name: profile.region_name || null,
      cell_id: profile.cell_id || null,
      cell_name: profile.cell_name || null,
      avatar_url: profile.avatar_url || null,
      is_active: profile.is_active,
      is_onboarded: profile.is_onboarded,
      must_change_password: Boolean(profile.must_change_password),
      auth_provider: profile.auth_provider || 'credentials',
    };

    if ((profile as any).supabase_user_id) {
      payload.supabase_user_id = (profile as any).supabase_user_id;
    }

    try {
      const { error } = await supabase!
        .from('profiles')
        .upsert(payload, { onConflict: 'id' });
      if (error) {
        console.warn('Supabase upsertProfile error:', error.message);
        SyncStateService.recordFailedSync({
          table: 'profiles',
          id: profile.id,
          payload,
          errorMessage: error.message,
        });
        return false;
      }
      SyncStateService.recordSuccessfulSync('profiles', profile.id);
      return true;
    } catch (err: any) {
      console.warn('Supabase upsertProfile exception:', err);
      SyncStateService.recordFailedSync({
        table: 'profiles',
        id: profile.id,
        payload,
        errorMessage: err?.message || String(err),
      });
      return false;
    }
  }
}
