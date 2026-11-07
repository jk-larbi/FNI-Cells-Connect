import { getSupabaseClient } from './supabase';
import { Cell, WeeklyReport, NotificationItem } from '../types';

export interface TablesStatus {
  connected: boolean;
  cellsTable: boolean;
  reportsTable: boolean;
  notificationsTable: boolean;
  profilesTable: boolean;
  errorMessage?: string;
}

/**
 * Check if the core tables exist in the configured Supabase database.
 */
export async function checkSupabaseTablesStatus(): Promise<TablesStatus> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      connected: false,
      cellsTable: false,
      reportsTable: false,
      notificationsTable: false,
      profilesTable: false,
      errorMessage: 'Supabase client is not configured. Provide Project URL and Anon Key.'
    };
  }

  const status: TablesStatus = {
    connected: true,
    cellsTable: false,
    reportsTable: false,
    notificationsTable: false,
    profilesTable: false
  };

  try {
    const [cellsRes, reportsRes, notifRes, profilesRes] = await Promise.all([
      supabase.from('cells').select('id', { head: true, count: 'exact' }),
      supabase.from('reports').select('id', { head: true, count: 'exact' }),
      supabase.from('notifications').select('id', { head: true, count: 'exact' }),
      supabase.from('profiles').select('id', { head: true, count: 'exact' })
    ]);

    status.cellsTable = !cellsRes.error || cellsRes.error.code === 'PGRST116';
    status.reportsTable = !reportsRes.error || reportsRes.error.code === 'PGRST116';
    status.notificationsTable = !notifRes.error || notifRes.error.code === 'PGRST116';
    status.profilesTable = !profilesRes.error || profilesRes.error.code === 'PGRST116';

    if (cellsRes.error && cellsRes.error.message.includes('FetchError')) {
      status.connected = false;
      status.errorMessage = 'Network error reaching Supabase. Please verify the Project URL.';
    }
  } catch (err: any) {
    status.connected = false;
    status.errorMessage = err.message || 'Failed to ping Supabase database.';
  }

  return status;
}

/**
 * Fetch all registered cells from Supabase PostgreSQL
 */
export async function fetchCellsFromSupabase(): Promise<Cell[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('cells')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.warn('Supabase fetchCells error:', error.message);
      return null;
    }

    if (!data) return [];

    return data.map((row: any) => ({
      id: row.id,
      name: row.name,
      leader: row.leader,
      area: row.area,
      leaderEmail: row.leader_email || undefined,
      leaderPhone: row.leader_phone || undefined,
      meetingDay: row.meeting_day || 'Wednesday',
      meetingTime: row.meeting_time || '18:30',
      active: row.active ?? true,
      createdAt: row.created_at ? row.created_at.slice(0, 10) : undefined
    }));
  } catch (err) {
    console.warn('Failed querying Supabase cells:', err);
    return null;
  }
}

/**
 * Seed initial cells to Supabase database if empty
 */
export async function seedCellsToSupabase(cells: Cell[]): Promise<{ success: boolean; insertedCount: number; message: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, insertedCount: 0, message: 'Supabase is not configured.' };
  }

  try {
    // Check if cells already exist
    const { count, error: countErr } = await supabase
      .from('cells')
      .select('*', { count: 'exact', head: true });

    if (countErr) {
      return { success: false, insertedCount: 0, message: `Database error: ${countErr.message}` };
    }

    if (count && count > 0) {
      return { success: true, insertedCount: 0, message: `Supabase database already contains ${count} cells.` };
    }

    const payload = cells.map(c => ({
      id: c.id,
      name: c.name,
      leader: c.leader,
      area: c.area,
      leader_email: c.leaderEmail || null,
      leader_phone: c.leaderPhone || null,
      meeting_day: c.meetingDay || 'Wednesday',
      meeting_time: c.meetingTime || '18:30',
      active: c.active
    }));

    const { error: insertErr } = await supabase
      .from('cells')
      .insert(payload);

    if (insertErr) {
      return { success: false, insertedCount: 0, message: insertErr.message };
    }

    return { success: true, insertedCount: payload.length, message: `Successfully seeded ${payload.length} fellowship cells to Supabase.` };
  } catch (err: any) {
    return { success: false, insertedCount: 0, message: err.message || 'Error seeding cells to Supabase.' };
  }
}

/**
 * Fetch all reports or cell-specific reports from Supabase
 */
export async function fetchReportsFromSupabase(cellId?: string): Promise<WeeklyReport[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    let query = supabase.from('reports').select('*').order('week', { ascending: false });
    if (cellId) {
      query = query.eq('cell_id', cellId);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Supabase fetchReports error:', error.message);
      return null;
    }

    if (!data) return [];

    return data.map((r: any) => ({
      id: r.id,
      cell: r.cell_id,
      week: r.week,
      att: Number(r.attendance) || 0,
      vis: Number(r.visitors) || 0,
      souls: Number(r.souls_won) || 0,
      fu: Number(r.follow_ups) || 0,
      evg: Number(r.evangelism_activities) || 0,
      meet: Number(r.cell_meetings) || 1,
      prayer: r.prayer_requests || '',
      test: r.testimonies || '',
      chal: r.challenges_remarks || '',
      status: r.status as any,
      date: r.submitted_at ? r.submitted_at.slice(0, 10) : r.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      note: r.reviewer_note || '',
      reviewedAt: r.reviewed_at || undefined,
      reviewedBy: r.reviewed_by || undefined
    }));
  } catch (err) {
    console.warn('Failed querying Supabase reports:', err);
    return null;
  }
}

/**
 * Upsert report in Supabase
 */
export async function upsertReportInSupabase(report: WeeklyReport): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase client not connected.' };

  try {
    const payload = {
      id: report.id,
      cell_id: report.cell,
      week: report.week,
      attendance: report.att,
      visitors: report.vis,
      souls_won: report.souls,
      follow_ups: report.fu,
      evangelism_activities: report.evg,
      cell_meetings: report.meet,
      prayer_requests: report.prayer || null,
      testimonies: report.test || null,
      challenges_remarks: report.chal || null,
      status: report.status,
      reviewer_note: report.note || null,
      submitted_at: report.status === 'Submitted' ? new Date().toISOString() : null,
      reviewed_at: report.reviewedAt || null,
      reviewed_by: report.reviewedBy || null
    };

    const { error } = await supabase
      .from('reports')
      .upsert(payload, { onConflict: 'cell_id,week' });

    if (error) {
      console.error('Supabase upsertReport error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unknown network error' };
  }
}

/**
 * Review report in Supabase (Approve or Return)
 */
export async function reviewReportInSupabase(
  reportId: string,
  newStatus: 'Approved' | 'Returned',
  reviewerNote: string,
  reviewerName = 'Administrator'
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase client not connected.' };

  try {
    const { error } = await supabase
      .from('reports')
      .update({
        status: newStatus,
        reviewer_note: reviewerNote,
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewerName
      })
      .eq('id', reportId);

    if (error) {
      console.error('Supabase reviewReport error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Fetch notifications from Supabase
 */
export async function fetchNotificationsFromSupabase(recipientTarget?: string): Promise<NotificationItem[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  try {
    let query = supabase.from('notifications').select('*').order('created_at', { ascending: false });
    if (recipientTarget && recipientTarget !== 'all') {
      query = query.or(`recipient_target.eq.${recipientTarget},recipient_target.eq.all`);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Supabase fetchNotifications error:', error.message);
      return null;
    }

    if (!data) return [];

    return data.map((n: any) => ({
      id: n.id,
      to: n.recipient_target,
      title: n.title || 'Notification',
      msg: n.message,
      date: n.date || n.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      read: n.is_read ?? false,
      type: (n.notification_type as any) || 'system',
      metadata: n.metadata || undefined
    }));
  } catch (err) {
    console.warn('Failed querying Supabase notifications:', err);
    return null;
  }
}

/**
 * Insert notification into Supabase
 */
export async function insertNotificationToSupabase(notif: NotificationItem): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, error: 'Supabase client not connected.' };

  try {
    const { error } = await supabase.from('notifications').insert({
      id: notif.id,
      recipient_target: notif.to,
      title: notif.title,
      message: notif.msg,
      date: notif.date,
      is_read: notif.read,
      notification_type: notif.type,
      metadata: notif.metadata || {}
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
