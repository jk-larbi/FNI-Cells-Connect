import React, { useState, useEffect } from 'react';
import { useBackHandler } from '../../hooks/useBackHandler';
import { useCall } from '../../context/CallContext';
import { Cell, CellMeetingReport, EvangelismReport, EvangelismContact } from '../../types';
import { CellService } from '../../services/cellService';
import { ReportService } from '../../services/reportService';
import { FollowUpService } from '../../services/followUpService';
import { CellMembersPanel } from '../CellMembersPanel';
import { CellLeadershipPanel } from './CellLeadershipPanel';
import { CellLocationsMap } from './CellLocationsMap';
import { supabase } from '../../lib/supabase';
import { SupabaseService } from '../../services/supabaseService';
import './cellGroupsStitch.css';
type StitchIconProps = React.HTMLAttributes<HTMLSpanElement>;
const StitchIcon = (symbol: string) => ({ className = '', ...props }: StitchIconProps) => (
  <span aria-hidden="true" {...props} className={`material-symbols-outlined ${className}`}>{symbol}</span>
);
const Building = StitchIcon('domain');
const Search = StitchIcon('search');
const Plus = StitchIcon('add');
const Filter = StitchIcon('filter_list');
const CheckCircle2 = StitchIcon('check_circle');
const AlertTriangle = StitchIcon('warning');
const XCircle = StitchIcon('cancel');
const Phone = StitchIcon('call');
const MapPin = StitchIcon('location_on');
const Calendar = StitchIcon('calendar_month');
const Users = StitchIcon('groups');
const Edit2 = StitchIcon('edit');
const Trash2 = StitchIcon('delete');
const Eye = StitchIcon('visibility');
const X = StitchIcon('close');
const FileText = StitchIcon('description');
const Flame = StitchIcon('local_fire_department');
const UserCheck = StitchIcon('how_to_reg');
const Archive = StitchIcon('archive');
const Video = StitchIcon('videocam');
const ArrowRight = StitchIcon('arrow_forward');

interface CellManagementViewProps {
  onBack?: () => void;
}

export const CellManagementView: React.FC<CellManagementViewProps> = ({ onBack }) => {
  const { startCellMeeting } = useCall();
  const [cells, setCells] = useState<Cell[]>([]);
  const [meetingReports, setMeetingReports] = useState<CellMeetingReport[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Suspended' | 'Deactivated'>('All');
  const [mobileFilter, setMobileFilter] = useState<'all' | 'attention' | 'ontrack'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedCellIds, setSelectedCellIds] = useState<string[]>([]);
  const [isDeletingCells, setIsDeletingCells] = useState(false);

  // Profile Drawer / Modal state
  const [selectedCell, setSelectedCell] = useState<Cell | null>(null);
  const [cellMeetings, setCellMeetings] = useState<CellMeetingReport[]>([]);
  const [cellEvang, setCellEvang] = useState<EvangelismReport[]>([]);
  const [cellContacts, setCellContacts] = useState<EvangelismContact[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [expandedMeetingReportId, setExpandedMeetingReportId] = useState<string | null>(null);
  const [expandedEvangelismReportId, setExpandedEvangelismReportId] = useState<string | null>(null);
  const [expandedFollowUpContactId, setExpandedFollowUpContactId] = useState<string | null>(null);

  // Edit / Add Cell modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCell, setEditingCell] = useState<Partial<Cell>>({});

  // Back navigation interceptor: closes detail drawer or modal before leaving page
  useBackHandler(() => {
    if (selectedCell) {
      setSelectedCell(null);
      return true;
    }
    if (isEditModalOpen) {
      setIsEditModalOpen(false);
      return true;
    }
    return false;
  }, Boolean(selectedCell || isEditModalOpen));

  const handleBackNavigation = () => {
    if (selectedCell) {
      setSelectedCell(null);
    } else if (isEditModalOpen) {
      setIsEditModalOpen(false);
    } else if (onBack) {
      onBack();
    }
  };

  const loadCells = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const [list, reports] = await Promise.all([
        CellService.getCells(),
        ReportService.getCellMeetingReports(),
      ]);
      const memberCounts = await SupabaseService.getCellMemberCounts();
      setCells(list.filter(cell => !cell.is_archived).map(cell => {
        const counts = memberCounts?.[cell.id] || { total: 0, active: 0, followUp: 0 };
        return memberCounts !== null ? {
          ...cell,
          total_members: counts.total,
          active_members: counts.active,
          requiring_follow_up: counts.followUp,
        } : cell;
      }));
      setMeetingReports(reports);
    } catch (error) {
      console.error('Could not load the cell directory:', error);
      setLoadError('The cell directory could not be loaded. Check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCells();
  }, []);

  useEffect(() => {
    const handleCloudChange = (event: Event) => {
      const table = (event as CustomEvent).detail?.table;
      if (table === '*' || ['cells', 'cell_members', 'cell_leadership_history'].includes(table)) {
        void loadCells();
      }
    };
    window.addEventListener('fni:cloud-data-changed', handleCloudChange);
    return () => window.removeEventListener('fni:cloud-data-changed', handleCloudChange);
  }, []);

  const openCellProfile = async (cell: Cell) => {
    setSelectedCell(cell);
    setIsLoadingDetails(true);
    setDetailsError(null);
    setCellMeetings([]);
    setCellEvang([]);
    setCellContacts([]);
    try {
      const [mList, eList, cList] = await Promise.all([
        ReportService.getCellMeetingReports({ cellId: cell.id }),
        ReportService.getEvangelismReports({ cellId: cell.id }),
        FollowUpService.getContacts(cell.id),
      ]);
      setCellMeetings(mList);
      setCellEvang(eList);
      setCellContacts(cList);
    } catch (error) {
      console.error('Could not load cell profile details:', error);
      setDetailsError('Some cell history could not be loaded. Check your connection and retry.');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleToggleStatus = async (cell: Cell, newStatus: 'Active' | 'Suspended' | 'Deactivated') => {
    const updated: Cell = {
      ...cell,
      status: newStatus,
      is_active: newStatus === 'Active',
    };
    await CellService.updateCell(updated);
    setCells(prev => prev.map(c => (c.id === cell.id ? updated : c)));
    if (selectedCell && selectedCell.id === cell.id) {
      setSelectedCell(updated);
    }
  };

  const handleSaveCell = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = editingCell.name?.trim();
    if (!name) return;

    try {
      if (editingCell.id) {
        const full = cells.find(c => c.id === editingCell.id);
        if (full) {
          const updated = {
            ...full,
            ...editingCell,
            name,
            normalized_name: name.toLowerCase().replace(/[^a-z0-9]/g, ''),
            venue_address: editingCell.venue_address?.trim() || '',
            meeting_latitude: editingCell.meeting_latitude ?? null,
            meeting_longitude: editingCell.meeting_longitude ?? null,
          };
          await CellService.updateCell(updated);
          setCells(prev => prev.map(c => c.id === updated.id ? updated : c));
          if (selectedCell?.id === updated.id) setSelectedCell(updated);
        }
      } else {
        let cell = await CellService.createAdminCell(name);
        if (editingCell.venue_address || editingCell.meeting_latitude != null || editingCell.meeting_longitude != null) {
          cell = {
            ...cell,
            venue_address: editingCell.venue_address?.trim() || '',
            meeting_latitude: editingCell.meeting_latitude ?? null,
            meeting_longitude: editingCell.meeting_longitude ?? null,
          };
          await CellService.updateCell(cell);
        }
        setCells(prev => [cell, ...prev.filter(existing => existing.id !== cell.id)]);
      }
      setIsEditModalOpen(false);
      setEditingCell({});
    } catch (error: any) {
      console.error('Cell registration/update failed:', error);
      window.alert(error?.message || 'The cell could not be saved. Please check the details and try again.');
    }
  };

  const handleArchiveCells = async (ids: string[], label: string) => {
    if (!ids.length || isDeletingCells) return;
    const confirmed = window.confirm('Clear ' + label + ' from the active FNI directory? The cell and its linked information will no longer appear anywhere in the Admin Portal. Historical records remain stored for record-keeping.');
    if (!confirmed) return;
    try {
      setIsDeletingCells(true);
      const success = await CellService.archiveCells(ids);
      if (!success) { window.alert('The cells could not be cleared. Check administrator permissions and try again.'); return; }
      const archived = new Set(ids);
      setCells(prev => prev.filter(cell => !archived.has(cell.id)));
      setSelectedCellIds([]);
      if (selectedCell && archived.has(selectedCell.id)) setSelectedCell(null);
      window.alert(ids.length + ' cell registration(s) cleared from the directory. Their data and leader assignments were preserved.');
    } catch (error) { console.error('Cell archive failed:', error); window.alert('Could not clear the cells.'); }
    finally { setIsDeletingCells(false); }
  };

  const handleDeleteCells = async (ids: string[], label: string) => {
    if (!ids.length || isDeletingCells) return;
    const confirmed = window.confirm(
      `Permanently delete ${ids.length} ${label}? This also removes their meeting and evangelism reports, follow-up contacts, follow-up history, and offering records. Cell leader accounts and the audit trail will be retained. This action cannot be undone.`
    );
    if (!confirmed) return;
    try {
      setIsDeletingCells(true);
      const success = await CellService.deleteCells(ids);
      if (!success) {
        window.alert('The cells could not be deleted. Check the database migration and administrator permissions, then try again.');
        return;
      }
      const removed = new Set(ids);
      setCells(prev => prev.filter(cell => !removed.has(cell.id)));
      setSelectedCellIds([]);
      if (selectedCell && removed.has(selectedCell.id)) setSelectedCell(null);
      window.alert(`${ids.length} cell registration(s) and their associated records were deleted.`);
    } catch (error) {
      console.error('Cell deletion failed:', error);
      window.alert('Cell deletion failed. No success was reported.');
    } finally {
      setIsDeletingCells(false);
    }
  };

  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const thisWeeksReports = meetingReports.filter(report => {
    const meetingDate = new Date(`${report.meetingDate}T00:00:00`);
    return !Number.isNaN(meetingDate.getTime()) && meetingDate >= weekStart && meetingDate < weekEnd;
  });
  const reportedCellIds = new Set(thisWeeksReports.map(report => report.cellId));
  const hasWeeklyReport = (cell: Cell) => reportedCellIds.has(cell.id) || Boolean(cell.firebase_id && reportedCellIds.has(cell.firebase_id));
  const missingReportCount = cells.filter(cell => !cell.is_archived && !hasWeeklyReport(cell)).length;

  const activeCellCount = cells.filter(cell => !cell.is_archived && (cell.status || (cell.is_active ? 'Active' : 'Suspended')) === 'Active').length;
  const assignedLeaderCount = cells.filter(cell => !cell.is_archived && Boolean(cell.leader_id || cell.tutorUid || cell.leader_name?.trim())).length;
  const venueDetailsCount = cells.filter(cell => !cell.is_archived && Boolean(cell.venue_address?.trim() || cell.meeting_location?.trim() || cell.location?.trim())).length;
  const needsAttentionForCell = (cell: Cell) => {
    const currentStatus = cell.status || (cell.is_active ? 'Active' : 'Suspended');
    return !cell.leader_name?.trim() || !cell.meeting_day?.trim() || !cell.meeting_time?.trim() || currentStatus !== 'Active' || !hasWeeklyReport(cell);
  };
  const cellsNeedingAttention = cells.filter(cell => !cell.is_archived && needsAttentionForCell(cell)).length;

  // Filter cells from live records only; weekly reporting is part of the attention state.
  const filteredCells = cells.filter(cell => !cell.is_archived).filter(cell => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      cell.name.toLowerCase().includes(q) ||
      (cell.location && cell.location.toLowerCase().includes(q)) ||
      (cell.leader_name && cell.leader_name.toLowerCase().includes(q));

    const currentStatus = cell.status || (cell.is_active ? 'Active' : 'Suspended');
    const matchesStatus = statusFilter === 'All' || currentStatus === statusFilter;
    const needsAttention = needsAttentionForCell(cell);
    const matchesDirectoryFilter = mobileFilter === 'all' || (mobileFilter === 'attention' ? needsAttention : !needsAttention);

    return matchesSearch && matchesStatus && matchesDirectoryFilter;
  });

  const isApprovedMeeting = (report: CellMeetingReport) => report.status === 'Approved' || report.status === 'approved';
  const approvedCellMeetings = cellMeetings.filter(isApprovedMeeting);
  // These statuses represent a completed outcome; all other contact statuses remain in the follow-up pipeline.
  const completedFollowUpStatuses = new Set([
    'Completed',
    'Completed / Joined',
    'Established in Church',
    'Joined a cell',
    'Joined Ministry',
  ]);
  const requiringFollowUpCount = cellContacts.filter(
    contact => !completedFollowUpStatuses.has(contact.followUpStatus)
  ).length;
  const meetingPerformance = approvedCellMeetings.reduce((totals, report) => ({
    attendance: totals.attendance + (Number(report.attendance) || 0),
    absentees: totals.absentees + (Number(report.absentees) || 0),
    newMembers: totals.newMembers + (Number(report.newMembers) || 0),
    followUpNeeded: totals.followUpNeeded + (Number(report.followUpNeeded) || 0),
  }), { attendance: 0, absentees: 0, newMembers: 0, followUpNeeded: 0 });
  const averageAttendance = approvedCellMeetings.length
    ? Math.round(meetingPerformance.attendance / approvedCellMeetings.length)
    : 0;

  return (
    <div className="fni-cell-groups-stitch space-y-5 sm:space-y-6">
      {/* Top Header */}
      <div className="hidden md:flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold leading-9 tracking-tight text-[#142842]">
            Cell groups
          </h1>
          <p className="text-xs text-[#5A6B7C] mt-0.5">
            Find a cell. See what needs attention across your network.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedCellIds.length > 0 && (
            <button
              type="button"
              disabled={isDeletingCells}
              onClick={() => handleDeleteCells(selectedCellIds, 'selected cell registration(s)')}
              className="px-3 py-2 rounded-md border border-[#FFDAD6] bg-[#FFDAD6] text-[#93000A] text-xs font-bold hover:bg-[#FFDAD6] disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5 inline mr-1" /> Delete Selected ({selectedCellIds.length})
            </button>
          )}
          <details className="relative">
            <summary className="flex min-h-10 cursor-pointer list-none items-center justify-center gap-1.5 rounded-md border border-[#DCE3EC] bg-white px-3 py-2 text-xs font-bold text-[#5A6B7C] hover:bg-[#F8FAFC] [&::-webkit-details-marker]:hidden">
              <Filter className="h-3.5 w-3.5" /> Directory tools
            </summary>
            <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-md border border-[#DCE3EC] bg-white p-2 shadow-none">
              <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#5A6B7C]">Maintenance</p>
              <button type="button" disabled={!cells.length || isDeletingCells} onClick={() => handleArchiveCells(cells.map(cell => cell.id), 'all registered cells')} className="flex min-h-10 w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-bold text-[#5D4200] hover:bg-[#FDF8E8] disabled:opacity-50">
                <Archive className="h-3.5 w-3.5 shrink-0" /> Archive all cells (keep records)
              </button>
              <p className="px-2 pb-1 pt-2 text-[10px] leading-relaxed text-[#5A6B7C]">Archived cells are removed from the active directory. Historical records are retained.</p>
            </div>
          </details>
          <button
            onClick={() => {
              setEditingCell({
                meeting_day: 'Wednesday',
                meeting_time: '18:30',
                target_attendance: 25,
              });
              setIsEditModalOpen(true);
            }}
            className="min-h-10 px-3.5 py-2 rounded-xl bg-[#142842] text-white text-xs font-bold hover:bg-[#354863] transition-colors shadow-none flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-[#8E6C23]" />
            <span>Register cell</span>
          </button>
        </div>
      </div>

      <article className="hidden md:flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[#DCE3EC] bg-[#FDF8E8] p-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[#DCE3EC] bg-white text-[#8E6C23]"><Calendar className="h-5 w-5" /></span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-[#142842]">{cellsNeedingAttention} {cellsNeedingAttention === 1 ? 'cell needs' : 'cells need'} attention</h2>
            <p className="text-sm text-[#8E6C23]">{missingReportCount} missing weekly reports · {cells.filter(cell => !cell.is_archived && (!cell.meeting_day?.trim() || !cell.meeting_time?.trim())).length} unconfirmed meeting schedules</p>
          </div>
        </div>
        <button type="button" onClick={() => setMobileFilter('attention')} className="inline-flex items-center justify-center rounded-full border border-[#DCE3EC] bg-white px-4 py-2 text-sm font-semibold text-[#142842] hover:bg-[#EEF2F7]">View flagged cells</button>
      </article>

      <section aria-label="Cell directory summary" className="hidden md:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        <div className="min-w-0 rounded-lg border border-[#DCE3EC] bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-[#5A6B7C]">Registered cells</span>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#E4ECF7] text-[#142842]"><Building className="h-4 w-4" /></span>
          </div>
          <p className="mt-2 text-2xl font-black tracking-tight text-[#142842] tabular-nums">{isLoading && cells.length === 0 ? '—' : cells.filter(cell => !cell.is_archived).length}</p>
          <p className="mt-0.5 text-[10px] text-[#5A6B7C]">In the active directory</p>
        </div>
        <div className="min-w-0 rounded-lg border border-[#DCE3EC] bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-[#5A6B7C]">Cells with assigned leaders</span>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#DCF2E5] text-[#0B3D22]"><CheckCircle2 className="h-4 w-4" /></span>
          </div>
          <p className="mt-2 text-2xl font-black tracking-tight text-[#142842] tabular-nums">{isLoading && cells.length === 0 ? '—' : assignedLeaderCount}</p>
          <p className="mt-0.5 text-[10px] text-[#5A6B7C]">{assignedLeaderCount} of {cells.filter(cell => !cell.is_archived).length} cells have a leader</p>
        </div>
        <div className="min-w-0 rounded-lg border border-[#DCE3EC] bg-white p-3.5 shadow-none sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-[#5A6B7C]">On track</span>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#FDF8E8] text-[#8E6C23]"><UserCheck className="h-4 w-4" /></span>
          </div>
          <p className="mt-2 text-2xl font-black tracking-tight text-[#142842] tabular-nums">{isLoading && cells.length === 0 ? '—' : Math.max(0, cells.filter(cell => !cell.is_archived).length - cellsNeedingAttention)}</p>
          <p className="mt-0.5 text-[10px] text-[#5A6B7C]" >Cells with no outstanding flags</p>
        </div>
        <div className="min-w-0 rounded-lg border border-[#DCE3EC] bg-white p-3.5 shadow-none sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-[#5A6B7C]">Missing reports</span>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#FDF8E8] text-[#8E6C23]"><FileText className="h-4 w-4" /></span>
          </div>
          <p className="mt-2 text-2xl font-black tracking-tight text-[#142842] tabular-nums">{isLoading && cells.length === 0 ? '—' : missingReportCount}</p>
          <p className="mt-0.5 text-[10px] text-[#5A6B7C]">Follow-up required</p>
        </div>
      </section>

      {loadError && (
        <div role="alert" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[#FFDAD6] bg-[#FFDAD6] px-4 py-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-[#93000A] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-[#142842]">{cells.length ? 'Directory refresh failed' : 'Unable to load cells'}</p>
              <p className="text-xs text-[#5A6B7C]">{loadError}{cells.length ? ' Previously loaded cells are still shown.' : ''}</p>
            </div>
          </div>
          <button type="button" onClick={() => void loadCells()} disabled={isLoading} className="min-h-10 shrink-0 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-[#142842] disabled:opacity-60">
            {isLoading ? 'Retrying…' : 'Try again'}
          </button>
        </div>
      )}

      <details className="hidden md:block rounded-lg border border-[#DCE3EC] bg-white px-4 py-3"><summary className="cursor-pointer list-none text-sm font-semibold text-[#142842]">View cell locations map</summary><div className="pt-4"><CellLocationsMap cells={cells.filter(cell => cell.is_active && !cell.is_archived)} /></div></details>

      {/* Desktop cell directory controls — aligned to the Stitch reference. */}
      <section className="hidden md:flex rounded-lg border border-[#DCE3EC] bg-white p-5 flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid grid-cols-3 rounded-full bg-[#EEF2F7] p-1" role="tablist" aria-label="Cell directory views">
            {([
              { id: 'all', label: 'All cells', count: cells.filter(cell => !cell.is_archived).length },
              { id: 'attention', label: 'Attention', count: cellsNeedingAttention },
              { id: 'ontrack', label: 'On track', count: Math.max(0, cells.length - cellsNeedingAttention) },
            ] as const).map(tab => (
              <button key={tab.id} type="button" role="tab" aria-selected={mobileFilter === tab.id} onClick={() => setMobileFilter(tab.id)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors duration-150 ${mobileFilter === tab.id ? 'bg-white text-[#142842] shadow-sm' : 'text-[#5A6B7C] hover:text-[#142842]'}`}>
                {tab.label} <span className="tabular-nums">· {tab.count}</span>
              </button>
            ))}
          </div>
          <label className="flex w-full sm:w-72 items-center gap-2 rounded-md border border-[#DCE3EC] bg-[#F7F9FC] px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-[#5A6B7C]" />
            <input type="search" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Search cell name or leader"
              className="w-full min-w-0 border-0 bg-transparent p-0 text-sm text-[#142842] placeholder:text-[#5A6B7C] focus:ring-0" />
          </label>
        </div>
      </section>

      {/* Mobile-first cell directory — values come only from the live cell records. */}
      <section className="space-y-4 md:hidden">
        <header className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#5A6B7C]">FNI · Cells Connect</p>
              <h1 className="mt-1 text-[28px] font-bold leading-9 tracking-tight text-[#142842]">Cell groups</h1>
              <p className="mt-1 text-sm text-[#5A6B7C]">Find a cell. See what needs attention.</p>
            </div>
            <button type="button" onClick={() => { setEditingCell({ meeting_day: 'Wednesday', meeting_time: '18:30', target_attendance: 25 }); setIsEditModalOpen(true); }} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#142842] text-white shadow-sm transition-colors hover:bg-[#203D63]" aria-label="Register a new cell">
              <Plus className="h-5 w-5 text-white" />
            </button>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-[#DCE3EC] bg-white p-4">
            <span className="block text-xs text-[#5A6B7C]">Registered cells</span>
            <strong className="mt-1 block text-3xl font-bold tabular-nums text-[#142842]">{isLoading && cells.length === 0 ? '—' : cells.length}</strong>
          </div>
          <div className="rounded-lg border border-[#DCE3EC] bg-white p-4">
            <span className="block text-xs text-[#5A6B7C]">Missing reports</span>
            <strong className="mt-1 block text-3xl font-bold tabular-nums text-[#142842]">{isLoading && cells.length === 0 ? '—' : missingReportCount}</strong>
          </div>
        </div>

        <label className="block rounded-lg border border-[#DCE3EC] bg-white p-3.5">
          <span className="mb-2 block text-xs font-medium text-[#5A6B7C]">Find a cell</span>
          <span className="flex items-center gap-2">
            <Search className="h-4 w-4 shrink-0 text-[#5A6B7C]" />
            <input type="search" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Search cell name or leader" className="w-full min-w-0 border-0 bg-transparent p-0 text-sm text-[#142842] outline-none placeholder:text-[#5A6B7C] focus:ring-0" />
          </span>
        </label>

        <div className="grid grid-cols-2 gap-1 rounded-full bg-[#EEF2F7] p-1">
          <button type="button" onClick={() => setMobileFilter('all')} className={`min-h-10 rounded-xl px-3 text-xs font-semibold transition-colors ${mobileFilter === 'all' ? 'bg-white text-[#142842] shadow-sm' : 'text-[#5A6B7C]'}`}>All cells</button>
          <button type="button" onClick={() => setMobileFilter('attention')} className={`min-h-10 rounded-xl px-3 text-xs font-semibold transition-colors ${mobileFilter === 'attention' ? 'bg-white text-[#142842] shadow-sm' : 'text-[#5A6B7C]'}`}>Needs attention</button>
        </div>

        <div className="space-y-3">
          {isLoading && cells.length === 0 ? (
            <div className="rounded-2xl border border-[#DCE3EC] bg-white p-6 text-center text-sm text-[#5A6B7C]">Loading cells…</div>
          ) : loadError && cells.length === 0 ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center text-sm text-[#93000A]">The cell directory could not be loaded. Please retry.</div>
          ) : filteredCells.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#DCE3EC] bg-white p-6 text-center">
              <Building className="mx-auto h-6 w-6 text-[#98A2B3]" />
              <p className="mt-2 text-sm font-semibold text-[#142842]">{mobileFilter === 'attention' ? 'No cells need attention' : mobileFilter === 'ontrack' ? 'No cells are currently on track' : 'No cells found'}</p>
              <p className="mt-1 text-xs text-[#5A6B7C]">{mobileFilter === 'attention' ? 'All recorded cell details are up to date.' : mobileFilter === 'ontrack' ? 'Review the attention list for outstanding items.' : 'Try another search or register a cell.'}</p>
            </div>
          ) : filteredCells.map(cell => {
            const status = cell.status || (cell.is_active ? 'Active' : 'Suspended');
            const missingLeader = !cell.leader_name?.trim();
            const missingSchedule = !cell.meeting_day?.trim() || !cell.meeting_time?.trim();
            const needsAttention = missingLeader || missingSchedule || status !== 'Active' || !hasWeeklyReport(cell);
            const cellReports = meetingReports
              .filter(report => report.cellId === cell.id || (cell.firebase_id && report.cellId === cell.firebase_id))
              .sort((a, b) => new Date(b.meetingDate).getTime() - new Date(a.meetingDate).getTime());
            const latestReport = cellReports[0];
            const submittedThisWeek = reportedCellIds.has(cell.id) || Boolean(cell.firebase_id && reportedCellIds.has(cell.firebase_id));
            return (
              <button key={cell.id} type="button" onClick={() => openCellProfile(cell)} className={`block w-full rounded-2xl border p-4 text-left transition-all active:scale-[0.99] ${needsAttention ? 'border-[#DCE3EC] bg-[#FDF8E8]' : 'border-[#DCE3EC] bg-white'}`}>
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block break-words text-base font-bold text-[#142842]">{cell.name}</span>
                    <span className="mt-1 block text-xs text-[#5A6B7C]">{cell.leader_name || 'Leader not assigned'}{cell.location ? ` · ${cell.location}` : ''}</span>
                  </span>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${status === 'Active' ? 'bg-[#DCF2E5] text-[#0B3D22]' : 'bg-[#FFDAD6] text-[#93000A]'}`}>{status}</span>
                </span>
                <span className="mt-3 block text-xs font-medium text-[#142842]">
                  {latestReport
                    ? `${latestReport.attendance} attended · ${latestReport.meetingDate}`
                    : missingSchedule ? 'Meeting schedule: Not set' : `Meeting: ${cell.meeting_day} · ${cell.meeting_time}`}
                </span>
                <span className={`mt-1 block text-[11px] font-medium ${submittedThisWeek ? 'text-[#1F6E43]' : 'text-[#8E6C23]'}`}>
                  {submittedThisWeek ? 'Weekly report submitted' : 'Weekly report not submitted'}
                </span>
                {needsAttention && (
                  <span className="mt-1 block text-[11px] font-medium text-[#8E6C23]">
                    {missingLeader ? 'Assign a cell leader' : missingSchedule ? 'Confirm schedule with the leader' : status !== 'Active' ? 'Review cell status' : 'Follow up on the weekly report'}
                  </span>
                )}
                <span className="mt-3 flex items-center justify-between border-t border-[#DCE3EC] pt-3 text-xs font-semibold text-[#142842]">
                  View cell details <ArrowRight className="h-4 w-4 text-[#8E6C23]" />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Cells Table (Reference Image Design) */}
      <div className="bg-white rounded-2xl border border-[#DCE3EC] shadow-sm overflow-hidden">
        <div className="py-4 px-6 border-b border-[#DCE3EC] flex items-center justify-between">
          <h2 className="text-base font-bold text-[#142842]">
            Registered Cells ({filteredCells.length})
          </h2>
          <span className="text-xs text-[#5A6B7C]">
            Auto-populated from active tutor registrations & admin additions
          </span>
        </div>

        <div className="hidden md:hidden divide-y divide-[#DCE3EC]">
          {isLoading && cells.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#5A6B7C]">Loading registered cells…</div>
          ) : loadError && cells.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#5A6B7C]">The cell directory is unavailable. Use Try again above to reload it.</div>
          ) : filteredCells.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#5A6B7C]">{searchQuery || statusFilter !== 'All' ? 'No cells match your search or filter.' : 'No cells have been registered yet.'}</div>
          ) : filteredCells.map(cell => {
            const status = cell.status || (cell.is_active ? 'Active' : 'Suspended');
            const suspended = status === 'Suspended' || status === 'Deactivated';
            return (
              <div key={cell.id} className={`p-4 ${suspended ? 'bg-rose-50/50' : 'bg-white'}`}>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    aria-label={`Select ${cell.name}`}
                    checked={selectedCellIds.includes(cell.id)}
                    onChange={event => setSelectedCellIds(prev => event.target.checked ? [...prev, cell.id] : prev.filter(id => id !== cell.id))}
                    className="h-4 w-4 accent-[#142842] mt-1 shrink-0"
                  />
                  <button type="button" onClick={() => openCellProfile(cell)} className="min-w-0 flex-1 text-left">
                    <div className="font-bold text-sm text-[#182230] break-words">{cell.name}</div>
                    <div className="text-xs text-[#5A6B7C] mt-1 break-words">{cell.location || 'Campus / Territory'}</div>
                    <div className="text-xs font-semibold text-[#182230] mt-2">{cell.leader_name || 'Unassigned Leader'}</div>
                    <div className="text-[11px] text-[#5A6B7C]">{cell.leader_phone || 'No phone recorded'}</div>
                  </button>
                  <button type="button" onClick={() => openCellProfile(cell)} className="text-[#142842] p-1" aria-label={`View ${cell.name} history`}><Eye className="w-4 h-4" /></button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3 ml-7">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${status === 'Active' ? 'bg-[#DCF2E5] text-[#0B3D22]' : status === 'Deactivated' ? 'bg-rose-50 text-rose-700' : 'bg-[#FDF8E8] text-amber-700'}`}>{status}</span>
                  <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold bg-slate-100 text-slate-700">Target: {cell.target_attendance ?? '—'}</span>
                  <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold bg-slate-100 text-slate-700">{cell.meeting_day || cell.meeting_time ? [cell.meeting_day, cell.meeting_time].filter(Boolean).join(' · ') + ' GMT' : 'Meeting time not set'}</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-3 ml-7">
                  <button type="button" onClick={() => startCellMeeting({ cellId: cell.id, cellName: cell.name, callType: 'video' })} className="flex-1 min-w-[100px] px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold inline-flex items-center justify-center gap-1.5"><Video className="w-3.5 h-3.5" /> Meet</button>
                  <button type="button" onClick={() => { setEditingCell(cell); setIsEditModalOpen(true); }} className="flex-1 min-w-[100px] px-3 py-2 rounded-lg bg-[#E4ECF7] text-[#142842] text-xs font-semibold inline-flex items-center justify-center gap-1.5"><Edit2 className="w-3.5 h-3.5" /> Edit</button>
                  <button type="button" disabled={isDeletingCells} onClick={() => handleDeleteCells([cell.id], 'cell registration')} className="flex-1 min-w-[100px] px-3 py-2 rounded-lg bg-rose-50 text-rose-700 text-xs font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-50"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="hidden md:block table-scroll-container">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#DCE3EC] text-[11px] font-semibold uppercase tracking-wider text-[#5A6B7C] bg-[#EEF2F7]">
                <th className="py-3 px-5 w-12 text-center">
                  <input
                    type="checkbox"
                    aria-label="Select all visible cells"
                    checked={filteredCells.length > 0 && filteredCells.every(cell => selectedCellIds.includes(cell.id))}
                    onChange={event => setSelectedCellIds(prev => event.target.checked
                      ? Array.from(new Set([...prev, ...filteredCells.map(cell => cell.id)]))
                      : prev.filter(id => !filteredCells.some(cell => cell.id === id)))}
                    onClick={event => event.stopPropagation()}
                    className="h-4 w-4 accent-[#142842]"
                  />
                </th>
                <th className="py-3 px-4">CELL NAME & LOCATION</th>
                <th className="py-3 px-4">ASSIGNED LEADER</th>
                <th className="py-3 px-4">TARGET ATTENDANCE</th>
                <th className="py-3 px-4">STATUS</th>
                <th className="py-3 px-4">MEETING TIME</th>
                <th className="py-3 px-5 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE3EC]">
              {isLoading && cells.length === 0 ? (
                <tr><td colSpan={7} className="py-10 text-center text-xs text-[#5A6B7C]">Loading registered cells…</td></tr>
              ) : loadError && cells.length === 0 ? (
                <tr><td colSpan={7} className="py-10 text-center text-xs text-[#5A6B7C]">The cell directory is unavailable. Use Try again above to reload it.</td></tr>
              ) : filteredCells.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#5A6B7C]">
                    <Building className="w-8 h-8 text-[#CBD5E1] mx-auto mb-2" />
                    <p className="text-xs font-semibold">No cells found matching your criteria.</p>
                    <p className="text-[11px] text-[#5A6B7C] mt-0.5">
                      Cells registered by tutors will automatically appear in this central directory.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCells.map(cell => {
                  const status = cell.status || (cell.is_active ? 'Active' : 'Suspended');
                  const isSuspended = status === 'Suspended' || status === 'Deactivated';

                  return (
                    <tr
                      key={cell.id}
                      onClick={() => openCellProfile(cell)}
                      className={`cursor-pointer transition-colors ${
                        isSuspended
                          ? 'bg-[#FDF8E8] border-l-4 border-[#BA1A1A]'
                          : 'hover:bg-[#EEF2F7]'
                      }`}
                    >
                      <td className="py-4 px-5 text-center" onClick={event => event.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Select ${cell.name}`}
                          checked={selectedCellIds.includes(cell.id)}
                          onChange={event => setSelectedCellIds(prev => event.target.checked
                            ? [...prev, cell.id]
                            : prev.filter(id => id !== cell.id))}
                          className="h-4 w-4 accent-[#142842]"
                        />
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#142842] text-[#8E6C23] font-bold text-xs flex items-center justify-center shrink-0">
                            {cell.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-[#182230] leading-tight">
                              {cell.name}
                            </div>
                            <div className="text-[11px] text-[#5A6B7C] mt-0.5 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              <span>{cell.location || 'Campus / Territory'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="font-bold text-[#182230]">
                          {cell.leader_name || 'Unassigned Leader'}
                        </div>
                        <div className="text-[11px] text-[#5A6B7C] flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" />
                          <span>{cell.leader_phone || 'No phone'}</span>
                        </div>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="font-bold text-[#182230] text-sm">
                          {cell.target_attendance ?? '—'}
                        </span>
                        <div className="text-[10px] text-[#5A6B7C]">Members Target</div>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        {status === 'Active' && (
                          <span className="inline-flex items-center gap-1.5 font-medium text-[#1F6E43]">
                            <span className="w-2 h-2 rounded-full bg-[#1F6E43]" />
                            Active
                          </span>
                        )}
                        {status === 'Suspended' && (
                          <span className="inline-flex items-center gap-1.5 font-medium text-[#8E6C23]">
                            <span className="w-2 h-2 rounded-full bg-[#8E6C23]" />
                            Suspended
                          </span>
                        )}
                        {status === 'Deactivated' && (
                          <span className="inline-flex items-center gap-1.5 font-medium text-[#BA1A1A]">
                            <span className="w-2 h-2 rounded-full bg-[#BA1A1A]" />
                            Deactivated
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap text-[#5A6B7C]">
                        <div className="font-medium text-[#182230]">
                          {cell.meeting_day || cell.meeting_time ? [cell.meeting_day, cell.meeting_time].filter(Boolean).join(' · ') : 'Not set'}
                        </div>
                        <div className="text-[11px]">{cell.meeting_day || cell.meeting_time ? 'Scheduled meeting' : 'No schedule recorded'}</div>
                      </td>

                      <td className="py-4 px-5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              startCellMeeting({
                                cellId: cell.id,
                                cellName: cell.name,
                                callType: 'video',
                              });
                            }}
                            className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 hover:bg-[#DCF2E5] inline-flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                            title="Start Cell Video Meeting"
                          >
                            <Video className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setEditingCell(cell);
                              setIsEditModalOpen(true);
                            }}
                            className="w-8 h-8 rounded-full bg-sky-50 text-sky-600 hover:bg-sky-100 inline-flex items-center justify-center transition-colors shadow-2xs"
                            title="Edit Cell"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              openCellProfile(cell);
                            }}
                            className="w-8 h-8 rounded-full text-[#5A6B7C] hover:text-[#142842] hover:bg-[#EEF2F7] inline-flex items-center justify-center transition-colors"
                            title="View History"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={isDeletingCells}
                            onClick={e => {
                              e.stopPropagation();
                              handleDeleteCells([cell.id], 'cell registration');
                            }}
                            className="w-8 h-8 rounded-full text-rose-600 hover:bg-rose-50 inline-flex items-center justify-center transition-colors disabled:opacity-50"
                            title="Permanently Delete Cell and Its Records"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CELL PROFILE MODAL (Showing Meeting History, Evangelism History, Follow-ups, etc.) */}
      {selectedCell && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-stretch bg-[#142842]/50 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] sm:items-center sm:justify-center sm:p-4 sm:pt-4 sm:pb-4">
          <div className="bg-white h-full w-full max-w-6xl p-4 shadow-xl border border-[#DCE3EC] overflow-y-auto overscroll-contain custom-scrollbar space-y-6 sm:h-auto sm:max-h-[92vh] sm:rounded-3xl sm:p-7 lg:p-8">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#DCE3EC]">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-[#142842]">{selectedCell.name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    selectedCell.is_active ? 'bg-emerald-50 text-[#1F6E43]' : 'bg-rose-50 text-[#C74646]'
                  }`}>
                    {selectedCell.status || (selectedCell.is_active ? 'Active' : 'Suspended')}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-[#5A6B7C]">
                  <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-[#8E6C23]" />{selectedCell.venue_address || selectedCell.meeting_location || selectedCell.location || 'Venue not recorded'}</span>
                  <span className="inline-flex items-center gap-1.5"><UserCheck className="h-3.5 w-3.5 text-[#8E6C23]" />{selectedCell.leader_name || 'Leader not assigned'}</span>
                  <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-[#8E6C23]" />{[selectedCell.meeting_day, selectedCell.meeting_time].filter(Boolean).join(' · ') || 'Schedule not set'}</span>
                  {selectedCell.leader_phone && <a href={`tel:${selectedCell.leader_phone}`} className="inline-flex items-center gap-1.5 font-semibold text-[#142842] hover:text-[#8E6C23]"><Phone className="h-3.5 w-3.5" />{selectedCell.leader_phone}</a>}
                </div>
              </div>
              <button
                onClick={() => setSelectedCell(null)}
                className="p-1 rounded-lg text-[#5A6B7C] hover:text-[#182230] hover:bg-[#EEF2F7]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cell Quick Actions: Activate / Suspend */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs font-semibold text-[#5A6B7C]">Status Action:</span>
              <button
                onClick={() => handleToggleStatus(selectedCell, 'Active')}
                className="px-2.5 py-1 rounded-lg bg-emerald-50 text-[#23845B] hover:bg-[#DCF2E5] text-xs font-bold"
              >
                Set Active
              </button>
              <button
                onClick={() => handleToggleStatus(selectedCell, 'Suspended')}
                className="px-2.5 py-1 rounded-lg bg-amber-50 text-[#8E6C23] hover:bg-amber-100 text-xs font-bold"
              >
                Suspend
              </button>
              <button
                onClick={() => handleToggleStatus(selectedCell, 'Deactivated')}
                className="px-2.5 py-1 rounded-lg bg-rose-50 text-[#C74646] hover:bg-rose-100 text-xs font-bold"
              >
                Deactivate
              </button>
            </div>

            {detailsError && (
              <div role="alert" className="flex flex-col gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 sm:flex-row sm:items-center sm:justify-between">
                <span>{detailsError}</span>
                <button type="button" onClick={() => void openCellProfile(selectedCell)} disabled={isLoadingDetails} className="min-h-9 shrink-0 rounded-lg border border-rose-300 px-3 font-bold disabled:opacity-50">{isLoadingDetails ? 'Retrying…' : 'Retry history'}</button>
              </div>
            )}
            {isLoadingDetails && <p className="text-xs text-[#5A6B7C]">Loading cell history…</p>}

            {/* Performance Stats Cards — meeting outcomes use approved reports only */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
                <div className="p-3 bg-[#EEF2F7] rounded-xl border border-[#DCE3EC]">
                  <div className="text-[10px] font-semibold text-[#5A6B7C]">Meeting Reports</div>
                  <div className="text-lg font-bold text-[#142842] mt-0.5">{cellMeetings.length}</div>
                  <div className="text-[10px] text-[#5A6B7C] mt-0.5">{cellMeetings.filter(isApprovedMeeting).length} approved</div>
                </div>
                <div className="p-3 bg-[#EEF2F7] rounded-xl border border-[#DCE3EC]">
                  <div className="text-[10px] font-semibold text-[#5A6B7C]">Evangelism Outreaches</div>
                  <div className="text-lg font-bold text-[#23845B] mt-0.5">{cellEvang.length}</div>
                </div>
                <div className="p-3 bg-[#EEF2F7] rounded-xl border border-[#DCE3EC]">
                  <div className="text-[10px] font-semibold text-[#5A6B7C]">Outreach Contacts</div>
                  <div className="text-lg font-bold text-[#8E6C23] mt-0.5">{cellContacts.length}</div>
                </div>
              </div>
              <div>
                <h5 className="text-[10px] font-bold uppercase tracking-wider text-[#5A6B7C] mb-2">Approved meeting performance</h5>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  <div className="p-3 bg-white rounded-xl border border-[#DCE3EC]">
                    <div className="text-[10px] font-semibold text-[#5A6B7C]">Total attendance</div>
                    <div className="text-lg font-bold text-[#142842] mt-0.5">{meetingPerformance.attendance}</div>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-[#DCE3EC]">
                    <div className="text-[10px] font-semibold text-[#5A6B7C]">Average attendance</div>
                    <div className="text-lg font-bold text-[#142842] mt-0.5">{averageAttendance}</div>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-[#DCE3EC]">
                    <div className="text-[10px] font-semibold text-[#5A6B7C]">Absentees reported</div>
                    <div className="text-lg font-bold text-[#142842] mt-0.5">{meetingPerformance.absentees}</div>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-[#DCE3EC]">
                    <div className="text-[10px] font-semibold text-[#5A6B7C]">New members</div>
                    <div className="text-lg font-bold text-[#23845B] mt-0.5">{meetingPerformance.newMembers}</div>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-[#DCE3EC]">
                    <div className="text-[10px] font-semibold text-[#5A6B7C]">Follow-up needed</div>
                    <div className="text-lg font-bold text-[#8E6C23] mt-0.5">{meetingPerformance.followUpNeeded}</div>
                  </div>
                </div>
                <p className="text-[10px] text-[#5A6B7C] mt-2">Performance totals include approved meeting reports only. Visitor numbers are not captured as a separate field in the current meeting report form.</p>
              </div>
            </div>

            {/* Cell Membership Roster & Pastoral Breakdown */}
            <div className="p-4 lg:p-5 bg-[#EEF2F7] rounded-2xl border border-[#DCE3EC] space-y-3">
              <span className="font-bold text-[#142842] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#8E6C23]" />
                Cell Roster & Membership Details
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 bg-white rounded-xl border border-[#DCE3EC]">
                  <div className="text-[10px] text-[#5A6B7C] font-semibold">Total Members</div>
                  <div className="text-base font-black text-[#142842] mt-0.5">{selectedCell.total_members ?? '—'}</div>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-[#DCE3EC]">
                  <div className="text-[10px] text-[#5A6B7C] font-semibold">Active Members</div>
                  <div className="text-base font-black text-[#23845B] mt-0.5">{selectedCell.active_members ?? '—'}</div>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-[#DCE3EC]">
                  <div className="text-[10px] text-[#5A6B7C] font-semibold">New Members</div>
                  <div className="text-base font-black text-[#8E6C23] mt-0.5">{selectedCell.new_members ?? '—'}</div>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-[#DCE3EC]">
                  <div className="text-[10px] text-[#5A6B7C] font-semibold">Requiring Follow-up</div>
                  <div className="text-base font-black text-[#C74646] mt-0.5">
                    {requiringFollowUpCount}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 lg:gap-6 items-start">
              <div className="min-w-0 space-y-5">
                <CellMembersPanel cellId={selectedCell.id} canEdit />
                <CellLeadershipPanel
                  cell={selectedCell}
                  onUpdated={async () => {
                    await loadCells();
                    const refreshed = await CellService.getCellById(selectedCell.id);
                    if (refreshed) setSelectedCell(refreshed);
                  }}
                />
              </div>
              <div className="min-w-0 space-y-5">
            {/* Meeting Reports History */}
            <div>
              <h4 className="text-xs font-bold text-[#142842] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Cell Meeting Reports ({cellMeetings.length})
              </h4>
              {cellMeetings.length === 0 ? (
                <p className="text-xs text-[#5A6B7C] italic p-3 bg-[#EEF2F7] rounded-xl">
                  No meeting reports filed yet by this cell.
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                  {cellMeetings.map(m => {
                    const expanded = expandedMeetingReportId === m.id;
                    const detailFields = [
                      { label: 'Meeting theme', value: m.scripturalTheme },
                      { label: 'Scriptures used', value: m.scripturesUsed },
                      { label: 'Testimonies', value: m.testimonies },
                      { label: 'Tutor notes', value: m.tutorNotes },
                      { label: 'Tutor experience', value: m.tutorExperience },
                      { label: 'Meeting location', value: m.meetingLocation },
                    ].filter(field => Boolean(field.value?.trim()));
                    return (
                      <div key={m.id} className="fni-cell-report-card rounded-xl border border-[#DCE3EC] overflow-hidden">
                        <button
                          type="button"
                          aria-expanded={expanded}
                          onClick={() => setExpandedMeetingReportId(expanded ? null : m.id)}
                          className="fni-cell-report-toggle w-full p-3 flex items-center justify-between gap-3 text-left text-xs hover:bg-[#F8FAFC] transition-colors"
                        >
                          <span className="min-w-0">
                            <span className="block font-bold text-[#182230]">Meeting on {m.meetingDate}</span>
                            <span className="block text-[11px] text-[#5A6B7C] mt-0.5">
                              Attendance: {m.attendance} &bull; Members: {m.members} &bull; Absentees: {m.absentees}
                            </span>
                            <span className="block text-[10px] text-[#5A6B7C] mt-1">Submitted by {m.tutorName}</span>
                          </span>
                          <span className="shrink-0 flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isApprovedMeeting(m) ? 'bg-emerald-50 text-[#23845B]' : 'bg-amber-50 text-[#D99A32]'
                            }`}>{m.status}</span>
                            <span className="text-[#5A6B7C]">{expanded ? '−' : '+'}</span>
                          </span>
                        </button>
                        {expanded && (
                          <div className="fni-cell-report-details border-t border-[#DCE3EC] bg-[#F8FAFC] p-3 space-y-3 text-xs">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              <div><span className="block text-[10px] text-[#5A6B7C]">New members</span><strong className="text-[#182230]">{m.newMembers}</strong></div>
                              <div><span className="block text-[10px] text-[#5A6B7C]">Follow-up needed</span><strong className="text-[#182230]">{m.followUpNeeded}</strong></div>
                              <div><span className="block text-[10px] text-[#5A6B7C]">Active members</span><strong className="text-[#182230]">{m.activeMembers}</strong></div>
                              {m.offering !== undefined && <div><span className="block text-[10px] text-[#5A6B7C]">Offering</span><strong className="text-[#182230]">{m.currency || 'GHS'} {Number(m.offering).toFixed(2)}</strong></div>}
                            </div>
                            {detailFields.length ? detailFields.map(field => (
                              <div key={field.label}>
                                <div className="text-[10px] font-bold uppercase tracking-wide text-[#5A6B7C] mb-1">{field.label}</div>
                                <p className="whitespace-pre-wrap break-words text-[#25384A] leading-relaxed">{field.value}</p>
                              </div>
                            )) : <p className="text-[#5A6B7C] italic">No theme, scripture, testimony or tutor notes were included in this report.</p>}
                            {m.reviewerComment && (
                              <div className="fni-cell-report-reviewer-comment rounded-lg border border-[#E7D9B5] bg-[#FDF8E8] p-2">
                                <div className="text-[10px] font-bold uppercase tracking-wide text-[#8E6C23] mb-1">Reviewer comment</div>
                                <p className="whitespace-pre-wrap break-words text-[#5D4200]">{m.reviewerComment}</p>
                              </div>
                            )}
                            <div className="text-[10px] text-[#5A6B7C]">Submitted {m.submittedAt ? new Date(m.submittedAt).toLocaleString() : 'date not recorded'}{m.reviewedAt ? ` · Reviewed ${new Date(m.reviewedAt).toLocaleString()}` : ''}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Evangelism History */}
            <div>
              <h4 className="text-xs font-bold text-[#142842] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-[#8E6C23]" />
                Evangelism Outreaches ({cellEvang.length})
              </h4>
              {cellEvang.length === 0 ? (
                <p className="text-xs text-[#5A6B7C] italic p-3 bg-[#EEF2F7] rounded-xl">
                  No evangelism reports filed yet by this cell.
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                  {cellEvang.map(e => {
                    const expanded = expandedEvangelismReportId === e.id;
                    const detailFields = [
                      { label: 'Outreach theme', value: e.scripturalTheme },
                      { label: 'Scriptures used', value: e.scripturesUsed },
                      { label: 'Message shared', value: e.messageUsed },
                      { label: 'Testimonies', value: e.testimonies },
                      { label: 'Outreach notes', value: e.notes },
                    ].filter(field => Boolean(field.value?.trim()));
                    return (
                      <div key={e.id} className="fni-cell-report-card rounded-xl border border-[#DCE3EC] overflow-hidden">
                        <button
                          type="button"
                          aria-expanded={expanded}
                          onClick={() => setExpandedEvangelismReportId(expanded ? null : e.id)}
                          className="fni-cell-report-toggle w-full p-3 flex items-center justify-between gap-3 text-left text-xs hover:bg-[#F8FAFC] transition-colors"
                        >
                          <span className="min-w-0">
                            <span className="block font-bold text-[#182230]">Outreach on {e.date}</span>
                            <span className="block text-[11px] text-[#5A6B7C] mt-0.5">
                              Souls Won: <strong className="text-[#23845B]">+{e.verifiedSoulsWon ?? e.conversions}</strong> &bull; People Reached: {e.peopleSpokenTo} &bull; Contacts: {e.contactsCaptured}
                            </span>
                            <span className="block text-[10px] text-[#5A6B7C] mt-1">{e.location} · Led by {e.tutorName}</span>
                          </span>
                          <span className="shrink-0 flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              e.status === 'Approved' || e.status === 'approved' ? 'bg-emerald-50 text-[#23845B]' : 'bg-amber-50 text-[#D99A32]'
                            }`}>{e.status}</span>
                            <span className="text-[#5A6B7C]">{expanded ? '−' : '+'}</span>
                          </span>
                        </button>
                        {expanded && (
                          <div className="fni-cell-report-details border-t border-[#DCE3EC] bg-[#F8FAFC] p-3 space-y-3 text-xs">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              <div><span className="block text-[10px] text-[#5A6B7C]">Contacts captured</span><strong className="text-[#182230]">{e.contactsCaptured}</strong></div>
                              <div><span className="block text-[10px] text-[#5A6B7C]">Interested in ministry</span><strong className="text-[#182230]">{e.interestedInMinistry}</strong></div>
                              <div><span className="block text-[10px] text-[#5A6B7C]">Potential follow-ups</span><strong className="text-[#182230]">{e.potentialFollowUps}</strong></div>
                              {e.preSetTarget !== undefined && <div><span className="block text-[10px] text-[#5A6B7C]">Outreach target</span><strong className="text-[#182230]">{e.preSetTarget}</strong></div>}
                              <div><span className="block text-[10px] text-[#5A6B7C]">Verified souls won</span><strong className="text-[#23845B]">{e.verifiedSoulsWon ?? 'Not separately verified'}</strong></div>
                            </div>
                            {e.teamMembers?.length > 0 && (
                              <div>
                                <div className="text-[10px] font-bold uppercase tracking-wide text-[#5A6B7C] mb-1">Outreach team</div>
                                <p className="text-[#25384A] break-words">{e.teamMembers.join(', ')}</p>
                              </div>
                            )}
                            {detailFields.length ? detailFields.map(field => (
                              <div key={field.label}>
                                <div className="text-[10px] font-bold uppercase tracking-wide text-[#5A6B7C] mb-1">{field.label}</div>
                                <p className="whitespace-pre-wrap break-words text-[#25384A] leading-relaxed">{field.value}</p>
                              </div>
                            )) : <p className="text-[#5A6B7C] italic">No additional outreach narrative was included in this report.</p>}
                            {e.reviewerComment && (
                              <div className="fni-cell-report-reviewer-comment rounded-lg border border-[#E7D9B5] bg-[#FDF8E8] p-2">
                                <div className="text-[10px] font-bold uppercase tracking-wide text-[#8E6C23] mb-1">Reviewer comment</div>
                                <p className="whitespace-pre-wrap break-words text-[#5D4200]">{e.reviewerComment}</p>
                              </div>
                            )}
                            <div className="text-[10px] text-[#5A6B7C]">Submitted {e.submittedAt ? new Date(e.submittedAt).toLocaleString() : 'date not recorded'}{e.reviewedAt ? ` · Reviewed ${new Date(e.reviewedAt).toLocaleString()}` : ''}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

                {/* Follow-up history — live contact records and recorded status transitions */}
                <section className="mt-5 border-t border-[#DCE3EC] pt-5">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#142842]">
                      <UserCheck className="h-3.5 w-3.5 text-[#8E6C23]" />
                      Follow-up history ({cellContacts.length})
                    </h4>
                    <span className="text-[10px] text-[#5A6B7C]">Contact records from this cell</span>
                  </div>
                  {cellContacts.length === 0 ? (
                    <p className="rounded-xl border border-[#DCE3EC] bg-[#EEF2F7] p-3 text-xs italic text-[#5A6B7C]">
                      No follow-up contact records have been captured for this cell.
                    </p>
                  ) : (
                    <div className="max-h-[28rem] space-y-2 overflow-y-auto custom-scrollbar">
                      {cellContacts.map(contact => {
                        const expanded = expandedFollowUpContactId === contact.id;
                        const contactName = contact.contactName || contact.name || 'Name not recorded';
                        const contactLocation = contact.location || contact.evangelismLocation;
                        const contactNotes = contact.followUpNotes || contact.notes;
                        const history = [...(contact.history || [])].sort(
                          (a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
                        );
                        const completed = ['Completed', 'Completed / Joined', 'Joined a cell', 'Joined Ministry', 'Established in Church'].includes(contact.followUpStatus);
                        return (
                          <article key={contact.id} className="overflow-hidden rounded-xl border border-[#DCE3EC] bg-white">
                            <button
                              type="button"
                              aria-expanded={expanded}
                              onClick={() => setExpandedFollowUpContactId(expanded ? null : contact.id)}
                              className="flex w-full items-center justify-between gap-3 p-3 text-left transition-colors hover:bg-[#F8FAFC]"
                            >
                              <span className="min-w-0">
                                <span className="block truncate text-xs font-bold text-[#182230]">{contactName}</span>
                                <span className="mt-0.5 block text-[10px] text-[#5A6B7C]">
                                  Captured {contact.dateCaptured || 'date not recorded'}
                                  {contact.assignedToName || contact.tutorName ? ` · Assigned to ${contact.assignedToName || contact.tutorName}` : ''}
                                </span>
                                {(contact.contactAttempts !== undefined || contact.nextFollowUpDate) && (
                                  <span className="mt-1 block text-[10px] text-[#5A6B7C]">
                                    {contact.contactAttempts !== undefined ? `${contact.contactAttempts} recorded contact attempts` : ''}
                                    {contact.contactAttempts !== undefined && contact.nextFollowUpDate ? ' · ' : ''}
                                    {contact.nextFollowUpDate ? `Next: ${contact.nextFollowUpDate}` : ''}
                                  </span>
                                )}
                              </span>
                              <span className="flex shrink-0 items-center gap-2">
                                <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${completed ? 'bg-emerald-50 text-[#1F6E43]' : 'bg-[#FDF8E8] text-[#8E6C23]'}`}>
                                  {contact.followUpStatus}
                                </span>
                                <span className="text-xs text-[#5A6B7C]">{expanded ? '−' : '+'}</span>
                              </span>
                            </button>
                            {expanded && (
                              <div className="space-y-3 border-t border-[#DCE3EC] bg-[#F8FAFC] p-3 text-xs">
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                  {contact.phone && <div><span className="block text-[10px] font-semibold text-[#5A6B7C]">Phone</span><a className="font-semibold text-[#142842] underline-offset-2 hover:underline" href={`tel:${contact.phone}`}>{contact.phone}</a></div>}
                                  {contact.whatsappNumber && <div><span className="block text-[10px] font-semibold text-[#5A6B7C]">WhatsApp</span><a className="font-semibold text-[#142842] underline-offset-2 hover:underline" href={`https://wa.me/${contact.whatsappNumber.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer">{contact.whatsappNumber}</a></div>}
                                  {contact.email && <div><span className="block text-[10px] font-semibold text-[#5A6B7C]">Email</span><a className="break-all font-semibold text-[#142842] underline-offset-2 hover:underline" href={`mailto:${contact.email}`}>{contact.email}</a></div>}
                                  {contactLocation && <div><span className="block text-[10px] font-semibold text-[#5A6B7C]">Outreach location</span><span className="text-[#25384A]">{contactLocation}</span></div>}
                                  {contact.leadSource && <div><span className="block text-[10px] font-semibold text-[#5A6B7C]">Lead source</span><span className="text-[#25384A]">{contact.leadSource}</span></div>}
                                  {contact.discipleshipProgress !== undefined && <div><span className="block text-[10px] font-semibold text-[#5A6B7C]">Discipleship progress</span><span className="text-[#25384A]">{contact.discipleshipProgress}</span></div>}
                                  {contact.lastFollowUpDate && <div><span className="block text-[10px] font-semibold text-[#5A6B7C]">Last follow-up</span><span className="text-[#25384A]">{contact.lastFollowUpDate}</span></div>}
                                  {contact.establishedDate && <div><span className="block text-[10px] font-semibold text-[#5A6B7C]">Established in church</span><span className="text-[#25384A]">{contact.establishedDate}</span></div>}
                                  {contact.completionDate && <div><span className="block text-[10px] font-semibold text-[#5A6B7C]">Completion date</span><span className="text-[#25384A]">{contact.completionDate}</span></div>}
                                </div>
                                {contactNotes && (
                                  <div>
                                    <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#5A6B7C]">Follow-up notes</div>
                                    <p className="whitespace-pre-wrap break-words leading-relaxed text-[#25384A]">{contactNotes}</p>
                                  </div>
                                )}
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[#5A6B7C]">
                                  <span>Created {contact.createdAt ? new Date(contact.createdAt).toLocaleString() : 'date not recorded'}</span>
                                  <span>Updated {contact.updatedAt ? new Date(contact.updatedAt).toLocaleString() : 'date not recorded'}</span>
                                </div>
                                <div>
                                  <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[#5A6B7C]">Status and interaction history ({history.length})</div>
                                  {history.length ? (
                                    <ol className="space-y-2">
                                      {history.map((entry, index) => (
                                        <li key={`${contact.id}-history-${index}`} className="border-l-2 border-[#D9BD7B] pl-3">
                                          <div className="flex flex-wrap items-center justify-between gap-2">
                                            <strong className="text-[#25384A]">{entry.status}</strong>
                                            <time className="text-[10px] text-[#5A6B7C]">{entry.changedAt ? new Date(entry.changedAt).toLocaleString() : 'Date not recorded'}</time>
                                          </div>
                                          {entry.note && <p className="mt-0.5 whitespace-pre-wrap break-words text-[#5A6B7C]">{entry.note}</p>}
                                          {entry.changedBy && <p className="mt-0.5 text-[10px] text-[#5A6B7C]">Recorded by {entry.changedBy}</p>}
                                        </li>
                                      ))}
                                    </ol>
                                  ) : (
                                    <p className="text-[10px] italic text-[#5A6B7C]">No separate status-change history was recorded for this contact.</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT CELL MODAL — Stitch desktop and mobile */}
      {isEditModalOpen && (
        <div className="fni-edit-cell-overlay fixed inset-0 z-50 flex items-stretch justify-center bg-[#142842]/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-4">
          <div className="fni-edit-cell-panel flex h-full w-full max-w-4xl flex-col overflow-y-auto overscroll-contain bg-white p-4 shadow-2xl sm:h-auto sm:max-h-[92dvh] sm:rounded-2xl sm:border sm:border-[#DCE3EC] sm:p-6">
            <div className="mb-5 flex items-center justify-between border-b border-[#DCE3EC] pb-4">
              <div>
                <p className="fni-edit-cell-eyebrow">FNI ADMIN WORKSPACE · CELL DIRECTORY</p>
                <h3 className="text-xl font-bold text-[#142842] sm:text-2xl">
                  {editingCell.id ? 'Edit cell details' : 'Register a cell'}
                </h3>
                <p className="mt-1 text-sm text-[#5A6B7C]">Update the cell identity, meeting schedule and verified venue information.</p>
              </div>
              <button type="button" onClick={() => setIsEditModalOpen(false)} aria-label="Close cell form" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#DCE3EC] text-[#5A6B7C] hover:bg-[#F7F9FC]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCell} className="fni-edit-cell-form grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="fni-edit-cell-field">
                <label htmlFor="fni-cell-name">Cell name</label>
                <input id="fni-cell-name" type="text" value={editingCell.name || ''} onChange={e => setEditingCell({ ...editingCell, name: e.target.value })} required maxLength={120} placeholder="e.g. Agape Cell" />
              </div>
              <div className="fni-edit-cell-field">
                <label htmlFor="fni-cell-leader">Assigned leader</label>
                <input id="fni-cell-leader" type="text" value={editingCell.leader_name || ''} readOnly aria-readonly="true" placeholder="No leader assigned" />
                <small>Leader assignments are managed from Cell Leaders to preserve account links.</small>
              </div>
              <div className="fni-edit-cell-field">
                <label htmlFor="fni-cell-day">Meeting day</label>
                <select id="fni-cell-day" value={editingCell.meeting_day || ''} onChange={e => setEditingCell({ ...editingCell, meeting_day: e.target.value })}>
                  <option value="">Select meeting day</option>
                  {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(day => <option key={day} value={day}>{day}</option>)}
                </select>
              </div>
              <div className="fni-edit-cell-field">
                <label htmlFor="fni-cell-time">Meeting time</label>
                <input id="fni-cell-time" type="time" value={editingCell.meeting_time || ''} onChange={e => setEditingCell({ ...editingCell, meeting_time: e.target.value })} />
              </div>
              <div className="fni-edit-cell-field md:col-span-2">
                <label htmlFor="fni-cell-venue">Meeting venue address</label>
                <input id="fni-cell-venue" type="text" value={editingCell.venue_address || ''} onChange={e => setEditingCell({ ...editingCell, venue_address: e.target.value })} placeholder="Enter the actual cell meeting venue" />
              </div>
              <div className="fni-edit-cell-coordinate md:col-span-2">
                <div>
                  <strong>Verified map coordinates</strong>
                  <p>Only enter coordinates copied from the actual venue pin. Unverified locations are not plotted on the cell map.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="fni-edit-cell-field">
                    <label htmlFor="fni-cell-latitude">Latitude</label>
                    <input id="fni-cell-latitude" type="number" step="any" min="-90" max="90" value={editingCell.meeting_latitude ?? ''} onChange={e => setEditingCell({ ...editingCell, meeting_latitude: e.target.value === '' ? null : Number(e.target.value) })} placeholder="Latitude" />
                  </div>
                  <div className="fni-edit-cell-field">
                    <label htmlFor="fni-cell-longitude">Longitude</label>
                    <input id="fni-cell-longitude" type="number" step="any" min="-180" max="180" value={editingCell.meeting_longitude ?? ''} onChange={e => setEditingCell({ ...editingCell, meeting_longitude: e.target.value === '' ? null : Number(e.target.value) })} placeholder="Longitude" />
                  </div>
                </div>
              </div>
              <div className="fni-edit-cell-actions md:col-span-2">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="fni-edit-cell-cancel">Cancel</button>
                <button type="submit" className="fni-edit-cell-save">{editingCell.id ? 'Save changes' : 'Create cell'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};