import { CellReport, ReportStatus, ReportReview, Cell, Region, ReportingPeriod, AuditLog } from '../types';
import { INITIAL_REPORTS, INITIAL_CELLS, INITIAL_REGIONS, INITIAL_PERIODS, INITIAL_AUDIT_LOGS } from './mockData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const STORAGE_KEYS = {
  REPORTS: 'fni_reports_store_v3',
  CELLS: 'fni_cells_store_v3',
  REGIONS: 'fni_regions_store_v3',
  PERIODS: 'fni_periods_store_v3',
  AUDIT: 'fni_audit_store_v3',
};

// Local storage helper
function getStored<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    return fallback;
  }
}

function setStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('Failed to store locally', e);
  }
}

export class ReportService {
  static async getReports(filters?: {
    regionId?: string;
    cellId?: string;
    periodId?: string;
    status?: ReportStatus;
  }): Promise<CellReport[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from('cell_reports').select(`
          *,
          cell:cells(name, region:regions(name)),
          period:reporting_periods(name),
          submitter:profiles!submitted_by(full_name),
          reviewer:profiles!reviewed_by(full_name)
        `);

        if (filters?.cellId) query = query.eq('cell_id', filters.cellId);
        if (filters?.periodId) query = query.eq('period_id', filters.periodId);
        if (filters?.status) query = query.eq('status', filters.status);

        const { data, error } = await query;
        if (error) throw error;
        if (data && data.length > 0) {
          return data.map((d: any) => ({
            ...d,
            cell_name: d.cell?.name,
            region_name: d.cell?.region?.name,
            period_name: d.period?.name,
            submitted_by_name: d.submitter?.full_name,
            reviewed_by_name: d.reviewer?.full_name,
          }));
        }
      } catch (err) {
        console.warn('Supabase fetch failed, falling back to local store:', err);
      }
    }

    // Local real store
    let reports = getStored<CellReport[]>(STORAGE_KEYS.REPORTS, INITIAL_REPORTS);
    if (filters?.regionId) {
      reports = reports.filter(r => r.region_id === filters.regionId);
    }
    if (filters?.cellId) {
      reports = reports.filter(r => r.cell_id === filters.cellId);
    }
    if (filters?.periodId) {
      reports = reports.filter(r => r.period_id === filters.periodId);
    }
    if (filters?.status) {
      reports = reports.filter(r => r.status === filters.status);
    }

    return reports.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  static async getReportById(id: string): Promise<CellReport | null> {
    const reports = await this.getReports();
    return reports.find(r => r.id === id) || null;
  }

  static async submitReport(reportData: Partial<CellReport>, isDraft = false): Promise<CellReport> {
    const cells = await this.getCells();
    const periods = await this.getPeriods();
    const cell = cells.find(c => c.id === reportData.cell_id);
    const period = periods.find(p => p.id === reportData.period_id);

    const now = new Date().toISOString();
    const members = Number(reportData.members_present || 0);
    const visitors = Number(reportData.visitors_count || 0);

    const newReport: CellReport = {
      id: reportData.id || `rep-${Date.now()}`,
      cell_id: reportData.cell_id || '',
      cell_name: cell?.name || reportData.cell_name || 'Cell Fellowship',
      region_id: cell?.region_id || reportData.region_id || '',
      region_name: cell?.region_name || reportData.region_name || '',
      period_id: reportData.period_id || '',
      period_name: period?.name || reportData.period_name || '',
      submitted_by: reportData.submitted_by || 'usr-cell-leader',
      submitted_by_name: reportData.submitted_by_name || 'Brother Michael Okon',
      status: isDraft ? 'draft' : 'submitted',
      members_present: members,
      visitors_count: visitors,
      total_attendance: members + visitors,
      souls_won: Number(reportData.souls_won || 0),
      souls_won_details: reportData.souls_won_details || '',
      evangelism_outreaches_held: Number(reportData.evangelism_outreaches_held || 0),
      evangelism_locations: reportData.evangelism_locations || '',
      follow_ups_conducted: Number(reportData.follow_ups_conducted || 0),
      first_timers_contacted: Number(reportData.first_timers_contacted || 0),
      converts_established: Number(reportData.converts_established || 0),
      meeting_held: reportData.meeting_held ?? true,
      meeting_date: reportData.meeting_date || now.split('T')[0],
      meeting_topic: reportData.meeting_topic || '',
      offering_amount: Number(reportData.offering_amount || 0),
      prayer_requests: reportData.prayer_requests || '',
      testimonies: reportData.testimonies || '',
      challenges_faced: reportData.challenges_faced || '',
      additional_remarks: reportData.additional_remarks || '',
      submitted_at: isDraft ? undefined : now,
      created_at: reportData.created_at || now,
      updated_at: now,
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('cell_reports').upsert(newReport);
        if (error) console.error('Supabase write error:', error);
      } catch (err) {
        console.warn('Supabase insert failed:', err);
      }
    }

    const currentReports = getStored<CellReport[]>(STORAGE_KEYS.REPORTS, INITIAL_REPORTS);
    const existingIndex = currentReports.findIndex(r => r.id === newReport.id);
    let updatedReports: CellReport[];
    if (existingIndex >= 0) {
      updatedReports = [...currentReports];
      updatedReports[existingIndex] = newReport;
    } else {
      updatedReports = [newReport, ...currentReports];
    }
    setStored(STORAGE_KEYS.REPORTS, updatedReports);

    // Record audit log
    this.recordAuditLog({
      action: isDraft ? 'SAVE_DRAFT_REPORT' : 'SUBMIT_REPORT',
      entity_type: 'cell_reports',
      entity_id: newReport.id,
      details: {
        cell: newReport.cell_name,
        period: newReport.period_name,
        attendance: newReport.total_attendance,
        soulsWon: newReport.souls_won,
      },
    });

    return newReport;
  }

  static async reviewReport(
    reportId: string,
    newStatus: ReportStatus,
    feedback: string,
    reviewerId: string,
    reviewerName: string
  ): Promise<CellReport> {
    const currentReports = getStored<CellReport[]>(STORAGE_KEYS.REPORTS, INITIAL_REPORTS);
    const index = currentReports.findIndex(r => r.id === reportId);
    if (index === -1) {
      throw new Error(`Report ${reportId} not found`);
    }

    const prevStatus = currentReports[index].status;
    const now = new Date().toISOString();

    const updatedReport: CellReport = {
      ...currentReports[index],
      status: newStatus,
      reviewed_by: reviewerId,
      reviewed_by_name: reviewerName,
      last_reviewed_at: now,
      updated_at: now,
      additional_remarks: feedback 
        ? `${currentReports[index].additional_remarks ? currentReports[index].additional_remarks + '\n\n' : ''}[Admin Note - ${reviewerName}]: ${feedback}`
        : currentReports[index].additional_remarks,
    };

    currentReports[index] = updatedReport;
    setStored(STORAGE_KEYS.REPORTS, currentReports);

    const reviewRecord: ReportReview = {
      id: `rev-${Date.now()}`,
      report_id: reportId,
      reviewer_id: reviewerId,
      reviewer_name: reviewerName,
      reviewer_role: 'admin',
      previous_status: prevStatus,
      new_status: newStatus,
      feedback,
      created_at: now,
    };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('cell_reports').update({
          status: newStatus,
          reviewed_by: reviewerId,
          last_reviewed_at: now,
        }).eq('id', reportId);

        await supabase.from('report_reviews').insert(reviewRecord);
      } catch (err) {
        console.warn('Supabase review update failed:', err);
      }
    }

    this.recordAuditLog({
      action: newStatus === 'approved' ? 'APPROVE_REPORT' : newStatus === 'needs_revision' ? 'REQUEST_REVISION' : 'REVIEW_REPORT',
      entity_type: 'cell_reports',
      entity_id: reportId,
      details: {
        previousStatus: prevStatus,
        newStatus,
        feedback,
        reviewer: reviewerName,
      },
    });

    return updatedReport;
  }

  static async getCells(): Promise<Cell[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data } = await supabase.from('cells').select('*, region:regions(name), leader:profiles(full_name, phone_number)');
        if (data && data.length > 0) {
          return data.map((c: any) => ({
            ...c,
            region_name: c.region?.name,
            leader_name: c.leader?.full_name,
            leader_phone: c.leader?.phone_number,
          }));
        }
      } catch (err) {
        console.warn('Failed fetching cells from supabase:', err);
      }
    }
    return getStored<Cell[]>(STORAGE_KEYS.CELLS, INITIAL_CELLS);
  }

  static async addCell(cell: Cell): Promise<void> {
    const cells = await this.getCells();
    const updated = [cell, ...cells];
    setStored(STORAGE_KEYS.CELLS, updated);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('cells').insert(cell);
      } catch (e) {
        console.warn('Supabase cell insert failed', e);
      }
    }
  }

  static async updateCell(cell: Cell): Promise<void> {
    const cells = await this.getCells();
    const updated = cells.map(c => (c.id === cell.id ? cell : c));
    setStored(STORAGE_KEYS.CELLS, updated);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('cells').update({
          name: cell.name,
          leader_id: cell.leader_id,
          meeting_day: cell.meeting_day,
          meeting_time: cell.meeting_time,
          venue_address: cell.venue_address,
          target_attendance: cell.target_attendance,
        }).eq('id', cell.id);
      } catch (e) {
        console.warn('Supabase cell update failed', e);
      }
    }
  }

  static async getRegions(): Promise<Region[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data } = await supabase.from('regions').select('*, leader:profiles(full_name)');
        if (data && data.length > 0) {
          return data.map((r: any) => ({
            ...r,
            leader_name: r.leader?.full_name,
          }));
        }
      } catch (err) {
        console.warn('Failed fetching regions from supabase:', err);
      }
    }
    return getStored<Region[]>(STORAGE_KEYS.REGIONS, INITIAL_REGIONS);
  }

  static async addRegion(region: Region): Promise<void> {
    const regions = await this.getRegions();
    const updated = [...regions, region];
    setStored(STORAGE_KEYS.REGIONS, updated);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('regions').insert(region);
      } catch (e) {
        console.warn('Supabase region insert failed', e);
      }
    }
  }

  static async getPeriods(): Promise<ReportingPeriod[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data } = await supabase.from('reporting_periods').select('*').order('year', { ascending: false }).order('week_number', { ascending: false });
        if (data && data.length > 0) return data;
      } catch (err) {
        console.warn('Failed fetching periods from supabase:', err);
      }
    }
    return getStored<ReportingPeriod[]>(STORAGE_KEYS.PERIODS, INITIAL_PERIODS);
  }

  static async addPeriod(period: ReportingPeriod): Promise<void> {
    const periods = await this.getPeriods();
    const updated = [period, ...periods];
    setStored(STORAGE_KEYS.PERIODS, updated);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('reporting_periods').insert(period);
      } catch (e) {
        console.warn('Supabase period insert failed', e);
      }
    }
  }

  static async getAuditLogs(): Promise<AuditLog[]> {
    return getStored<AuditLog[]>(STORAGE_KEYS.AUDIT, INITIAL_AUDIT_LOGS);
  }

  static resetToCleanSlate(): void {
    localStorage.removeItem(STORAGE_KEYS.REPORTS);
    localStorage.removeItem(STORAGE_KEYS.CELLS);
    localStorage.removeItem(STORAGE_KEYS.REGIONS);
    localStorage.removeItem(STORAGE_KEYS.PERIODS);
    localStorage.removeItem(STORAGE_KEYS.AUDIT);
  }

  static recordAuditLog(log: Omit<AuditLog, 'id' | 'created_at'>): void {
    const currentLogs = getStored<AuditLog[]>(STORAGE_KEYS.AUDIT, INITIAL_AUDIT_LOGS);
    const newLog: AuditLog = {
      ...log,
      id: `aud-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    setStored(STORAGE_KEYS.AUDIT, [newLog, ...currentLogs]);
  }
}
