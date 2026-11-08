/**
 * Forerunners Network International (FNI) - Digital Reporting System
 * Supabase Backend Service Adapter
 * 
 * Provides typed, resilient access to Supabase PostgreSQL 15+ database
 * for all 12 platform modules. Seamlessly integrates with the dual-backend
 * architecture, falling back gracefully to Firebase/LocalStorage if Supabase
 * is unconfigured or unavailable.
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  Cell,
  CellMeetingReport,
  EvangelismReport,
  EvangelismContact,
  OfferingRecord,
  PrivateMessage,
  CommunityMessage,
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
    user_id: row.recipient_target,
    title: row.title || 'Notification',
    message: row.message,
    type: (row.notification_type || 'system_alert') as any,
    channel: 'in_app',
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
    try {
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

      const { error } = await supabase!
        .from('cells')
        .upsert(payload, { onConflict: 'firebase_id' });
      if (error) {
        console.warn('Supabase upsertCell error:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Supabase upsertCell exception:', err);
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
    try {
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

      const { error } = await supabase!
        .from('cell_meeting_reports')
        .upsert(payload, { onConflict: 'id' });
      if (error) {
        console.warn('Supabase upsertCellMeetingReport error:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Supabase upsertCellMeetingReport exception:', err);
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
    try {
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

      const { error } = await supabase!
        .from('evangelism_reports')
        .upsert(payload, { onConflict: 'id' });
      if (error) {
        console.warn('Supabase upsertEvangelismReport error:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Supabase upsertEvangelismReport exception:', err);
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
    try {
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

      const { error } = await supabase!
        .from('evangelism_contacts')
        .upsert(payload, { onConflict: 'id' });
      if (error) {
        console.warn('Supabase upsertEvangelismContact error:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Supabase upsertEvangelismContact exception:', err);
      return false;
    }
  }

  static async deleteEvangelismContact(id: string): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const { error } = await supabase!.from('evangelism_contacts').delete().eq('id', id);
      return !error;
    } catch (err) {
      console.warn('Supabase deleteEvangelismContact exception:', err);
      return false;
    }
  }

  // --- Offerings ---
  static async getOfferingRecords(): Promise<OfferingRecord[] | null> {
    if (!this.isAvailable()) return null;
    try {
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
    try {
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

      const { error } = await supabase!
        .from('offering_records')
        .upsert(payload, { onConflict: 'id' });
      return !error;
    } catch (err) {
      console.warn('Supabase upsertOfferingRecord exception:', err);
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
    try {
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
      const { error } = await supabase!.from('private_messages').upsert(payload, { onConflict: 'id' });
      return !error;
    } catch (err) {
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
    try {
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
      const { error } = await supabase!.from('community_messages').upsert(payload, { onConflict: 'id' });
      return !error;
    } catch (err) {
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
    try {
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
      const { error } = await supabase!.from('teaching_materials').upsert(payload, { onConflict: 'id' });
      return !error;
    } catch (err) {
      return false;
    }
  }

  // --- Soul Target Config ---
  static async getSoulTargetConfig(year: number = 2026): Promise<SoulTargetConfig | null> {
    if (!this.isAvailable()) return null;
    try {
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
    try {
      const payload = {
        id: config.id,
        year: config.year,
        annual_target: config.annualTarget,
        audit_history: config.auditHistory || [],
        description: `National Soul-Winning Milestone Target for ${config.year}`,
        updated_by: config.updatedBy || '',
      };
      const { error } = await supabase!.from('soul_targets').upsert(payload, { onConflict: 'year' });
      return !error;
    } catch (err) {
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
    try {
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
      const { error } = await supabase!.from('system_settings').upsert(payload, { onConflict: 'id' });
      return !error;
    } catch (err) {
      return false;
    }
  }

  // --- Notifications ---
  static async getNotifications(recipientTarget: string): Promise<NotificationItem[] | null> {
    if (!this.isAvailable()) return null;
    try {
      const { data, error } = await supabase!
        .from('notifications')
        .select('*')
        .or(`recipient_target.eq.${recipientTarget},recipient_target.eq.all`)
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
    try {
      const payload = {
        id: item.id,
        recipient_target: item.user_id,
        title: item.title,
        message: item.message,
        date: item.created_at ? item.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
        is_read: Boolean(item.is_read),
        notification_type: item.type || 'system_alert',
        metadata: item.metadata || {},
      };
      const { error } = await supabase!.from('notifications').upsert(payload, { onConflict: 'id' });
      return !error;
    } catch (err) {
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
      return !error;
    } catch (err) {
      return false;
    }
  }

  static async upsertProfile(profile: Profile): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const payload: any = {
        firebase_uid: profile.id,
        email: profile.email,
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
      const { error } = await supabase!
        .from('profiles')
        .upsert(payload, { onConflict: 'firebase_uid' });
      return !error;
    } catch (err) {
      return false;
    }
  }
}
