import React, { useState, useEffect } from 'react';
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
}

export const CellLeadersView: React.FC<CellLeadersViewProps> = ({ onBack }) => {
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
    <div className="fni-cell-leaders-stitch space-y-4 sm:space-y-6 min-w-0">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="fni-leaders-eyebrow">ADMIN WORKSPACE</div>
          <h1 className="text-xl font-black text-[#142842] tracking-tight">
            Cell leaders
          </h1>
          <p className="text-xs text-[#667085] mt-0.5">
            Assigned tutors, reporting cadence, and regional coverage.
          </p>
        </div>
      </div>

      {loadError && (
        <div role="alert" className="flex flex-col gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 sm:flex-row sm:items-center sm:justify-between">
          <span>{loadError}</span>
          <button type="button" onClick={() => void loadData()} disabled={isLoading} className="min-h-9 shrink-0 rounded-lg border border-rose-300 px-3 font-bold hover:bg-rose-100 disabled:opacity-50">{isLoading ? 'Retrying…' : 'Retry'}</button>
        </div>
      )}

      <section aria-label="Cell leader summary" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="min-w-0 rounded-2xl border border-[#E3E8EF] bg-white p-3.5 shadow-sm sm:p-4">
          <p className="text-[11px] font-semibold text-[#667085]">Active leaders</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-[#142B4A] tabular-nums">{isLoading ? '—' : activeLeaderCount}</p>
          <p className="mt-0.5 text-[10px] text-[#667085]">Currently enabled</p>
        </div>
        <div className="min-w-0 rounded-2xl border border-[#E3E8EF] bg-white p-3.5 shadow-sm sm:p-4">
          <p className="text-[11px] font-semibold text-[#667085]">Unassigned cells</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-[#142B4A] tabular-nums">{isLoading ? '—' : unassignedCellCount}</p>
          <p className="mt-0.5 text-[10px] text-[#667085]">Cells without a leader</p>
        </div>
        <div className="min-w-0 rounded-2xl border border-[#E3E8EF] bg-white p-3.5 shadow-sm sm:p-4">
          <p className="text-[11px] font-semibold text-[#667085]">Suspended</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-[#142B4A] tabular-nums">{isLoading ? '—' : suspendedLeaderCount}</p>
          <p className="mt-0.5 text-[10px] text-[#667085]">Accounts needing review</p>
        </div>
        <div className="min-w-0 rounded-2xl border border-[#E3E8EF] bg-white p-3.5 shadow-sm sm:p-4">
          <p className="text-[11px] font-semibold text-[#667085]">Leaders with reports</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-[#142B4A] tabular-nums">{isLoading ? '—' : leadersWithReportsCount}</p>
          <p className="mt-0.5 text-[10px] text-[#667085]">At least one submission</p>
        </div>
      </section>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-[#E3E8EF] shadow-sm flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 min-w-0">
        <div className="relative w-full min-w-0 flex-1">
          <MaterialSymbol name="search" className="absolute left-3.5 top-3 text-[18px] text-[#5A6B7C]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search leaders, email or cell..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-[#E3E8EF] focus:outline-none focus:ring-2 focus:ring-[#142B4A]/20 focus:border-[#142B4A] text-[#182230]"
          />
        </div>

        <div className="flex w-full items-center gap-2 overflow-x-auto sm:w-auto sm:shrink-0">
          {(['All', 'Active', 'Suspended'] as const).map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`min-h-10 shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === st
                  ? 'bg-[#142B4A] text-white'
                  : 'bg-[#F5F7FA] text-[#667085] hover:text-[#182230]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Reference Image Styled Table */}
      <div className="bg-white rounded-2xl border border-[#E3E8EF] shadow-sm overflow-hidden">
        <div className="py-3 px-4 sm:py-4 sm:px-6 border-b border-[#E3E8EF] flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-[#182230]">
            Cell Leaders ({filteredLeaders.length})
          </h2>
          <span className="text-xs text-[#667085]">
            Select a leader to view details and submissions
          </span>
        </div>

        <div className="md:hidden divide-y divide-[#E3E8EF]">
          {filteredLeaders.length === 0 ? (
            <div className="p-6 text-center">
              <MaterialSymbol name="group" className="mx-auto mb-2 text-2xl text-[#8A98A8]" />
              <p className="text-xs font-semibold text-[#182230]">{searchQuery || statusFilter !== 'All' ? 'No leaders match these filters' : 'No tutors registered yet'}</p>
              <p className="text-[11px] text-[#667085] mt-1">{searchQuery || statusFilter !== 'All' ? 'Try another name, email, cell or account status.' : 'Registered tutors will appear here.'}</p>
              {(searchQuery || statusFilter !== 'All') && <button type="button" onClick={() => { setSearchQuery(''); setStatusFilter('All'); }} className="mt-3 min-h-10 px-3 rounded-xl bg-[#F5F7FA] text-xs font-semibold text-[#142B4A]">Clear filters</button>}
            </div>
          ) : filteredLeaders.map(leader => {
            const leaderM = meetingReports.filter(m => m.tutorUid === leader.id || m.cellName === leader.cell_name);
            const onTimeCount = leaderM.filter(m => !m.late).length;
            const consistency = leaderM.length > 0 ? Math.round((onTimeCount / leaderM.length) * 100) : null;
            return (
              <button
                key={leader.id}
                type="button"
                onClick={() => openLeaderProfile(leader)}
                className="w-full text-left p-4 active:bg-[#F5F7FA] hover:bg-[#F5F7FA] transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full bg-[#142B4A] text-[#C6A45A] font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden">
                    {leader.avatar_url ? <img src={leader.avatar_url} alt={leader.full_name || 'Leader'} className="w-full h-full object-cover" /> : (leader.full_name || 'TL').split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm text-[#182230] break-words">{leader.full_name}</div>
                    <div className="text-xs text-[#667085] break-all mt-0.5">{leader.email}</div>
                    <div className="text-xs font-semibold text-[#142B4A] mt-2">{leader.cell_name || 'Assigned Fellowship Cell'}</div>
                    <div className="text-[11px] text-[#667085] mt-0.5">{leader.phone_number || 'No phone recorded'}</div>
                  </div>
                  <MaterialSymbol name="visibility" className="mt-1 shrink-0 text-[18px] text-[#354863]" />
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${leader.is_active ? 'bg-emerald-50 text-[#23845B]' : 'bg-rose-50 text-[#C74646]'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${leader.is_active ? 'bg-[#23845B]' : 'bg-[#C74646]'}`} />
                    {leader.is_active ? 'Active' : 'Suspended'}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${consistency !== null && consistency >= 80 ? 'bg-emerald-50 text-[#23845B]' : 'bg-amber-50 text-[#D99A32]'}`}>
                    {consistency === null ? 'No reports yet' : `${consistency}% on-time`}
                  </span>
                </div>
                <div className="text-[11px] font-semibold text-sky-700 mt-3">View leader profile and submissions</div>
              </button>
            );
          })}
        </div>
        <div className="hidden md:block table-scroll-container">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E3E8EF] text-[11px] font-semibold uppercase tracking-wider text-[#667085] bg-[#F5F7FA]">
                <th className="py-3 px-5 w-12 text-center">
                  <div className="w-4 h-4 rounded-full border border-[#CBD5E1] mx-auto" />
                </th>
                <th className="py-3 px-4">TUTOR NAME & EMAIL</th>
                <th className="py-3 px-4">ASSIGNED CELL</th>
                <th className="py-3 px-4">PHONE NUMBER</th>
                <th className="py-3 px-4">ACCOUNT STATUS</th>
                <th className="py-3 px-4">CONSISTENCY</th>
                <th className="py-3 px-5 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E8EF]">
              {filteredLeaders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#667085]">
                    <MaterialSymbol name="group" className="mx-auto mb-2 text-3xl text-[#8A98A8]" />
                    <p className="text-xs font-semibold text-[#182230]">{searchQuery || statusFilter !== 'All' ? 'No leaders match these filters.' : 'No tutors registered yet.'}</p>
                    <p className="text-[11px] text-[#667085] mt-0.5">
                      {searchQuery || statusFilter !== 'All' ? 'Try a different search or clear the selected filters.' : 'When tutors register via the sign-up page, they will appear in this directory.'}
                    </p>
                    {(searchQuery || statusFilter !== 'All') && <button type="button" onClick={() => { setSearchQuery(''); setStatusFilter('All'); }} className="mt-2 min-h-10 px-3 rounded-xl bg-[#F5F7FA] text-xs font-semibold text-[#142B4A]">Clear filters</button>}
                  </td>
                </tr>
              ) : (
                filteredLeaders.map(leader => {
                  const leaderM = meetingReports.filter(m => m.tutorUid === leader.id || m.cellName === leader.cell_name);
                  const onTimeCount = leaderM.filter(m => !m.late).length;
                  const consistency = leaderM.length > 0 ? Math.round((onTimeCount / leaderM.length) * 100) : null;
                  const isSuspended = !leader.is_active;

                  return (
                    <tr
                      key={leader.id}
                      onClick={() => openLeaderProfile(leader)}
                      className={`cursor-pointer transition-colors ${
                        isSuspended
                          ? 'bg-[#FFF5F5] border-l-4 border-[#C74646]'
                          : 'hover:bg-[#F5F7FA]'
                      }`}
                    >
                      <td className="py-4 px-5 text-center">
                        <div className="w-4 h-4 rounded-full border border-[#CBD5E1] mx-auto" />
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#142B4A] text-[#C6A45A] font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                            {leader.avatar_url ? (
                              <img
                                src={leader.avatar_url}
                                alt={leader.full_name || 'Leader'}
                                className="w-full h-full object-cover"
                              />
                            ) : leader.full_name ? (
                              leader.full_name
                                .split(' ')
                                .map(n => n[0])
                                .slice(0, 2)
                                .join('')
                            ) : (
                              'TL'
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-[#182230] leading-tight">
                              {leader.full_name}
                            </div>
                            <div className="text-[11px] text-[#667085] mt-0.5">
                              {leader.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="font-bold text-[#182230]">
                          {leader.cell_name || 'Assigned Fellowship Cell'}
                        </div>
                        <div className="text-[11px] text-[#667085]">
                          {leader.role === 'tutor' || leader.role === 'cell_leader' ? 'Fellowship Cell Tutor' : 'Leadership'}
                        </div>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap text-[#182230]">
                        {leader.phone_number || 'No phone recorded'}
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        {leader.is_active ? (
                          <span className="inline-flex items-center gap-1.5 font-medium text-[#23845B]">
                            <span className="w-2 h-2 rounded-full bg-[#23845B]" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 font-medium text-[#C74646]">
                            <span className="w-2 h-2 rounded-full bg-[#C74646]" />
                            Suspended
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        {consistency === null ? (
                          <span className="font-medium text-[#667085]">No reports yet</span>
                        ) : consistency >= 80 ? (
                          <span className="inline-flex items-center gap-1.5 font-medium text-[#23845B]">
                            <span className="w-2 h-2 rounded-full bg-[#23845B]" />
                            {consistency}% On-Time
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 font-medium text-[#D99A32]">
                            <span className="w-2 h-2 rounded-full bg-[#D99A32]" />
                            {consistency}% On-Time
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-5 whitespace-nowrap text-right">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            openLeaderProfile(leader);
                          }}
                          className="w-8 h-8 rounded-full bg-sky-50 text-sky-600 hover:bg-sky-100 inline-flex items-center justify-center transition-colors shadow-2xs"
                          title="View Profile & Submissions"
                        >
                          <MaterialSymbol name="visibility" className="text-[18px]" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

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
