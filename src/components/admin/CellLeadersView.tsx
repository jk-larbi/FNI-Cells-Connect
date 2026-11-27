import React, { useState, useEffect } from 'react';
import './cellLeadersView.css';
import { Profile, Cell, CellMeetingReport, EvangelismReport } from '../../types';
import { AuthService } from '../../services/authService';
import { CellService } from '../../services/cellService';
import { ReportService } from '../../services/reportService';
import { SupabaseService } from '../../services/supabaseService';
import {
  Users,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Phone,
  Mail,
  Building,
  Calendar,
  FileCheck,
  Eye,
  X,
  FileText,
  Flame,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';

const MaterialSymbol: React.FC<{ name: string; className?: string }> = ({ name, className = '' }) => (
  <span className={`material-symbols-outlined ${className}`} aria-hidden="true">{name}</span>
);

interface CellLeadersViewProps {
  onBack?: () => void;
  onNavigateToTab?: (tab: 'cell-management') => void;
}

export const CellLeadersView: React.FC<CellLeadersViewProps> = ({ onBack, onNavigateToTab }) => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [cells, setCells] = useState<Cell[]>([]);
  const [meetingReports, setMeetingReports] = useState<CellMeetingReport[]>([]);
  const [evangReports, setEvangReports] = useState<EvangelismReport[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Suspended'>('All');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Tutor Profile Inspection Modal
  const [selectedLeader, setSelectedLeader] = useState<Profile | null>(null);
  const [leaderCell, setLeaderCell] = useState<Cell | null>(null);
  const [leaderMeetings, setLeaderMeetings] = useState<CellMeetingReport[]>([]);
  const [leaderEvang, setLeaderEvang] = useState<EvangelismReport[]>([]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const [remoteProfiles, cList, mList, eList] = await Promise.all([
        SupabaseService.getProfiles(),
        CellService.getCells(),
        ReportService.getCellMeetingReports(),
        ReportService.getEvangelismReports(),
      ]);
      if (remoteProfiles === null) {
        throw new Error('The live leader directory could not be reached. Check administrator access and your connection, then retry.');
      }

      const activeCells = cList.filter(cell => !cell.is_archived);
      const activeCellIds = new Set(activeCells.flatMap(cell =>
        [cell.id, cell.firebase_id].filter((id): id is string => Boolean(id))
      ));
      const normalizedName = (value?: string) => (value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const activeTutors = remoteProfiles.filter(profile =>
        (profile.role === 'tutor' || profile.role === 'cell_leader') &&
        activeCells.some(cell =>
          (profile.cell_id && [cell.id, cell.firebase_id].includes(profile.cell_id)) ||
          cell.tutorUid === profile.id ||
          (!profile.cell_id && Boolean(profile.cell_name) && normalizedName(cell.name) === normalizedName(profile.cell_name))
        )
      );
      setProfiles(activeTutors);
      setCells(activeCells);
      setMeetingReports(mList.filter(report => activeCellIds.has(report.cellId)));
      setEvangReports(eList.filter(report => activeCellIds.has(report.cellId)));
      return activeTutors;
    } catch (error: any) {
      console.error('Could not load the live cell leader directory:', error);
      setLoadError(error?.message || 'The cell leader directory could not be loaded. Check your connection and try again.');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    const handleCloudChange = (event: Event) => {
      const table = (event as CustomEvent).detail?.table;
      if (table === '*' || ['profiles', 'cells', 'cell_meeting_reports', 'evangelism_reports'].includes(table)) {
        void loadData();
      }
    };
    window.addEventListener('fni:cloud-data-changed', handleCloudChange);
    return () => window.removeEventListener('fni:cloud-data-changed', handleCloudChange);
  }, []);

  const openLeaderProfile = (leader: Profile) => {
    setSelectedLeader(leader);
    const matchedCell = cells.find(c => (leader.cell_id && [c.id, c.firebase_id].includes(leader.cell_id)) || c.tutorUid === leader.id || c.leader_id === leader.id) || null;
    setLeaderCell(matchedCell);
    setLeaderMeetings(meetingReports.filter(m => m.tutorUid === leader.id || (matchedCell && m.cellId === matchedCell.id)));
    setLeaderEvang(evangReports.filter(e => e.tutorUid === leader.id || (matchedCell && e.cellId === matchedCell.id)));
  };

  const handleToggleStatus = async (leader: Profile) => {
    const isSuspending = leader.is_active;
    if (isSuspending) {
      const reason = window.prompt(
        `Enter suspension reason for ${leader.full_name}:`,
        'Administrative review pending'
      );
      if (reason === null) return;
      const success = await AuthService.suspendTutor(leader.id, reason || 'Administrative review', 'FNI Administrator');
      if (!success) {
        window.alert('The account could not be suspended. Check administrator permissions and try again.');
        return;
      }
    } else {
      const confirmReactivate = window.confirm(`Reactivate tutor account for ${leader.full_name}?`);
      if (!confirmReactivate) return;
      const success = await AuthService.reactivateTutor(leader.id, 'FNI Administrator');
      if (!success) {
        window.alert('The account could not be reactivated. Check administrator permissions and try again.');
        return;
      }
    }
    const refreshedProfiles = await loadData();
    const updated = refreshedProfiles?.find(profile => profile.id === leader.id);
    if (updated) setSelectedLeader(updated);
  };

  // Filtered tutors
  const filteredLeaders = profiles.filter(leader => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      leader.full_name.toLowerCase().includes(q) ||
      leader.email.toLowerCase().includes(q) ||
      (leader.cell_name && leader.cell_name.toLowerCase().includes(q));

    const matchesStatus =
      statusFilter === 'All' ||
      (statusFilter === 'Active' && leader.is_active) ||
      (statusFilter === 'Suspended' && !leader.is_active);

    return matchesSearch && matchesStatus;
  });

  const activeLeaderCount = profiles.filter(leader => leader.is_active).length;
  const suspendedLeaderCount = profiles.length - activeLeaderCount;
  const unassignedCellCount = cells.filter(cell => !profiles.some(leader =>
    cell.tutorUid === leader.id || cell.leader_id === leader.id ||
    (leader.cell_id && [cell.id, cell.firebase_id].includes(leader.cell_id))
  )).length;
  const leadersWithReportsCount = profiles.filter(leader =>
    meetingReports.some(report => report.tutorUid === leader.id || report.cellName === leader.cell_name) ||
    evangReports.some(report => report.tutorUid === leader.id || report.cellName === leader.cell_name)
  ).length;

  return (
    <div className="fni-cell-leaders-stitch fni-cell-leaders-reference min-w-0">
      <header className="fni-cl-page-heading">
        <div>
          <h1>Cell leaders</h1>
          <p>Assigned tutors, reporting cadence, and regional coverage.</p>
        </div>
        {onNavigateToTab && (
          <button type="button" className="fni-cl-assign-action" onClick={() => onNavigateToTab('cell-management')}>
            <MaterialSymbol name="person_add" className="text-[18px]" />
            <span>Assign leader</span>
          </button>
        )}
      </header>

      {loadError && (
        <div role="alert" className="fni-cl-load-error">
          <span>{loadError}</span>
          <button type="button" onClick={() => void loadData()} disabled={isLoading}>{isLoading ? 'Retrying…' : 'Retry'}</button>
        </div>
      )}

      <section className="fni-cl-mobile-summary" aria-label="Leader summary">
        <article><span>Active leaders</span><strong>{isLoading ? '—' : activeLeaderCount}</strong></article>
        <article><span>Unassigned cells</span><strong>{isLoading ? '—' : unassignedCellCount}</strong></article>
      </section>

      <section className="fni-cl-directory" aria-label="Cell leader directory">
        <div className="fni-cl-directory-tools">
          <label className="fni-cl-search">
            <MaterialSymbol name="search" className="text-[18px]" />
            <input
              type="search"
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              placeholder="Search leaders, email or cell…"
              aria-label="Search leaders, email or cell"
            />
          </label>
          <div className="fni-cl-status-filters" role="group" aria-label="Filter leaders by account status">
            {(['All', 'Active', 'Suspended'] as const).map(status => (
              <button
                key={status}
                type="button"
                aria-pressed={statusFilter === status}
                className={statusFilter === status ? 'is-active' : ''}
                onClick={() => setStatusFilter(status)}
              >{status}</button>
            ))}
          </div>
        </div>

        <div className="fni-cl-list-heading">
          <div><h2>Cell leaders</h2><span>{filteredLeaders.length} {filteredLeaders.length === 1 ? 'leader' : 'leaders'}</span></div>
          <p>Select a leader to view account details and report history</p>
        </div>

        {isLoading ? (
          <div className="fni-cl-empty-state" aria-live="polite">
            <MaterialSymbol name="progress_activity" className="animate-spin text-2xl" />
            <strong>Loading cell leaders</strong>
            <span>Retrieving the live directory from Supabase.</span>
          </div>
        ) : filteredLeaders.length === 0 ? (
          <div className="fni-cl-empty-state">
            <MaterialSymbol name="group" className="text-3xl" />
            <strong>{searchQuery || statusFilter !== 'All' ? 'No leaders match these filters' : 'No cell leaders registered'}</strong>
            <span>{searchQuery || statusFilter !== 'All' ? 'Try another search or clear the selected filters.' : 'Registered cell tutors will appear here.'}</span>
            {(searchQuery || statusFilter !== 'All') && (
              <button type="button" onClick={() => { setSearchQuery(''); setStatusFilter('All'); }}>Clear filters</button>
            )}
          </div>
        ) : (
          <ul className="fni-cl-leader-list">
            {filteredLeaders.map(leader => {
              const leaderReports = meetingReports.filter(report => report.tutorUid === leader.id || report.cellName === leader.cell_name);
              const onTimeCount = leaderReports.filter(report => !report.late).length;
              const consistency = leaderReports.length ? Math.round((onTimeCount / leaderReports.length) * 100) : null;
              const initials = (leader.full_name || 'TL').split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase();
              return (
                <li key={leader.id}>
                  <button type="button" className="fni-cl-leader-row" onClick={() => openLeaderProfile(leader)} aria-label={'View ' + leader.full_name + ' profile and submissions'}>
                    <span className="fni-cl-avatar">
                      {leader.avatar_url ? <img src={leader.avatar_url} alt="" /> : initials}
                    </span>
                    <span className="fni-cl-leader-copy">
                      <strong>{leader.full_name}</strong>
                      <small>{leader.cell_name || 'Unassigned cell'} · {consistency === null ? 'No reports yet' : consistency + '% on-time reports'}</small>
                    </span>
                    <span className={'fni-cl-status ' + (leader.is_active ? 'is-active' : 'is-suspended')}>
                      <span aria-hidden="true" />{leader.is_active ? 'Active' : 'Suspended'}
                    </span>
                    <MaterialSymbol name="chevron_right" className="fni-cl-row-arrow text-[20px]" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* TUTOR PROFILE MODAL */}
      {selectedLeader && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-stretch bg-[#142B4A]/50 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] sm:items-center sm:justify-center sm:p-4 sm:pt-4 sm:pb-4">
          <div className="flex h-full w-full max-w-2xl flex-col space-y-5 overflow-y-auto overscroll-contain border border-[#E3E8EF] bg-white p-5 shadow-xl sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:rounded-3xl sm:p-6">
            <div className="flex items-start justify-between pb-3 border-b border-[#E3E8EF]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#142B4A] text-[#C6A45A] font-bold text-sm flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                  {selectedLeader.avatar_url ? (
                    <img
                      src={selectedLeader.avatar_url}
                      alt={selectedLeader.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : selectedLeader.full_name ? (
                    selectedLeader.full_name
                      .split(' ')
                      .map(n => n[0])
                      .slice(0, 2)
                      .join('')
                  ) : (
                    'TL'
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-[#142B4A]">{selectedLeader.full_name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      selectedLeader.is_active ? 'bg-emerald-50 text-[#23845B]' : 'bg-rose-50 text-[#C74646]'
                    }`}>
                      {selectedLeader.is_active ? 'Active Account' : 'Suspended Account'}
                    </span>
                  </div>
                  <p className="text-xs text-[#667085] mt-0.5">
                    Email: {selectedLeader.email} &bull; Phone: {selectedLeader.phone_number || 'N/A'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLeader(null)}
                className="p-1 rounded-lg text-[#667085] hover:text-[#182230] hover:bg-[#F5F7FA]"
              >
                <MaterialSymbol name="close" className="text-[20px]" />
              </button>
            </div>

            {/* Quick Actions: Suspend or Reactivate */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#667085]">Account Status:</span>
              <button
                onClick={() => handleToggleStatus(selectedLeader)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  selectedLeader.is_active
                    ? 'bg-rose-50 text-[#C74646] hover:bg-rose-100'
                    : 'bg-emerald-50 text-[#23845B] hover:bg-emerald-100'
                }`}
              >
                {selectedLeader.is_active ? 'Suspend Account' : 'Reactivate Account'}
              </button>
            </div>

            {/* Performance Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
              <div className="p-3 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF]">
                <div className="text-[10px] font-semibold text-[#667085]">Cell Name</div>
                <div className="text-xs font-bold text-[#142B4A] mt-0.5 truncate">
                  {selectedLeader.cell_name || 'Unassigned'}
                </div>
              </div>
              <div className="p-3 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF]">
                <div className="text-[10px] font-semibold text-[#667085]">Meeting Returns</div>
                <div className="text-sm font-bold text-[#142B4A] mt-0.5">
                  {leaderMeetings.length} submitted
                </div>
              </div>
              <div className="p-3 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF]">
                <div className="text-[10px] font-semibold text-[#667085]">Evangelism Returns</div>
                <div className="text-sm font-bold text-[#23845B] mt-0.5">
                  {leaderEvang.length} outreaches
                </div>
              </div>
            </div>

            {/* Submissions List */}
            <div>
              <h4 className="text-xs font-bold text-[#142B4A] uppercase tracking-wider mb-2">
                Recent Submissions History
              </h4>
              {leaderMeetings.length === 0 && leaderEvang.length === 0 ? (
                <p className="text-xs text-[#667085] italic p-3 bg-[#F5F7FA] rounded-xl">
                  No weekly returns submitted yet by this leader.
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                  {leaderMeetings.map(m => (
                    <div
                      key={m.id}
                      className="p-3 rounded-xl border border-[#E3E8EF] flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-[#182230]">Meeting Return - {m.meetingDate}</div>
                        <div className="text-[11px] text-[#667085]">
                          Attendance: {m.attendance} &bull; Members: {m.members}
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        m.status === 'Approved' ? 'bg-emerald-50 text-[#23845B]' : 'bg-amber-50 text-[#D99A32]'
                      }`}>
                        {m.status}
                      </span>
                    </div>
                  ))}
                  {leaderEvang.map(e => (
                    <div
                      key={e.id}
                      className="p-3 rounded-xl border border-[#E3E8EF] flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-[#182230]">Evangelism Return - {e.date}</div>
                        <div className="text-[11px] text-[#667085]">
                          Souls Won: <span className="font-bold text-[#23845B]">+{e.conversions}</span> &bull; {e.location}
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        e.status === 'Approved' ? 'bg-emerald-50 text-[#23845B]' : 'bg-amber-50 text-[#D99A32]'
                      }`}>
                        {e.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
