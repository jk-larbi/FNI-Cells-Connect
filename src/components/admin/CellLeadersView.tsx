import React, { useState, useEffect } from 'react';
import { Profile, Cell, CellMeetingReport, EvangelismReport } from '../../types';
import { AuthService } from '../../services/authService';
import { CellService } from '../../services/cellService';
import { ReportService } from '../../services/reportService';
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
  ArrowLeft,
} from 'lucide-react';

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

  // Tutor Profile Inspection Modal
  const [selectedLeader, setSelectedLeader] = useState<Profile | null>(null);
  const [leaderCell, setLeaderCell] = useState<Cell | null>(null);
  const [leaderMeetings, setLeaderMeetings] = useState<CellMeetingReport[]>([]);
  const [leaderEvang, setLeaderEvang] = useState<EvangelismReport[]>([]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [pList, cList, mList, eList] = await Promise.all([
        Promise.resolve(AuthService.getAllProfiles()),
        CellService.getCells(),
        ReportService.getCellMeetingReports(),
        ReportService.getEvangelismReports(),
      ]);
      setProfiles(pList.filter(p => p.role === 'tutor' || p.role === 'cell_leader'));
      setCells(cList);
      setMeetingReports(mList);
      setEvangReports(eList);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openLeaderProfile = (leader: Profile) => {
    setSelectedLeader(leader);
    const matchedCell = cells.find(c => c.id === leader.cell_id || c.tutorUid === leader.id) || null;
    setLeaderCell(matchedCell);
    setLeaderMeetings(meetingReports.filter(m => m.tutorUid === leader.id || (matchedCell && m.cellId === matchedCell.id)));
    setLeaderEvang(evangReports.filter(e => e.tutorUid === leader.id || (matchedCell && e.cellId === matchedCell.id)));
  };

  const handleToggleStatus = async (leader: Profile) => {
    if (leader.is_active) {
      const reason = window.prompt(
        `Enter suspension reason for ${leader.full_name}:`,
        'Administrative review pending'
      );
      if (reason === null) return;
      await AuthService.suspendTutor(leader.id, reason || 'Administrative review', 'FNI Administrator');
    } else {
      const confirmReactivate = window.confirm(`Reactivate tutor account for ${leader.full_name}?`);
      if (!confirmReactivate) return;
      await AuthService.reactivateTutor(leader.id, 'FNI Administrator');
    }
    await loadData();
    if (selectedLeader?.id === leader.id) {
      const updated = AuthService.getAllProfiles().find(p => p.id === leader.id);
      if (updated) setSelectedLeader(updated);
    }
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#667085] hover:text-[#142B4A] mb-2 cursor-pointer group"
            >
              <ArrowLeft className="w-4 h-4 text-[#C6A45A] group-hover:-translate-x-1 transition-transform" />
              <span>Back to Previous</span>
            </button>
          )}
          <h1 className="text-xl font-black text-[#142B4A] tracking-tight">
            Cell Leaders Directory
          </h1>
          <p className="text-xs text-[#667085] mt-0.5">
            Manage authenticated cell leaders/tutors, track weekly reporting compliance, and inspect cell returns.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E3E8EF] shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-[#667085] absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search leader by name, email, or cell..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-[#E3E8EF] focus:outline-none focus:ring-2 focus:ring-[#142B4A]/20 focus:border-[#142B4A] text-[#182230]"
          />
        </div>

        <div className="flex items-center gap-2">
          {(['All', 'Active', 'Suspended'] as const).map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
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
        <div className="py-4 px-6 border-b border-[#E3E8EF] flex items-center justify-between">
          <h2 className="text-base font-bold text-[#182230]">
            Cell Leaders ({filteredLeaders.length})
          </h2>
          <span className="text-xs text-[#667085]">
            Passwords securely encrypted and hidden from administrative views
          </span>
        </div>

        <div className="table-scroll-container">
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
                    <Users className="w-8 h-8 text-[#CBD5E1] mx-auto mb-2" />
                    <p className="text-xs font-semibold">No tutors registered yet.</p>
                    <p className="text-[11px] text-[#667085] mt-0.5">
                      When tutors register via the sign-up page, they will immediately appear in this directory.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLeaders.map(leader => {
                  const leaderM = meetingReports.filter(m => m.tutorUid === leader.id || m.cellName === leader.cell_name);
                  const onTimeCount = leaderM.filter(m => !m.late).length;
                  const consistency = leaderM.length > 0 ? Math.round((onTimeCount / leaderM.length) * 100) : 100;
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
                          <div className="w-9 h-9 rounded-full bg-[#142B4A] text-[#C6A45A] font-bold text-xs flex items-center justify-center shrink-0">
                            {leader.full_name
                              ? leader.full_name
                                  .split(' ')
                                  .map(n => n[0])
                                  .slice(0, 2)
                                  .join('')
                              : 'TL'}
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
                        {consistency >= 80 ? (
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
                          <Eye className="w-3.5 h-3.5" />
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
        <div className="fixed inset-0 z-50 bg-[#142B4A]/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-xl border border-[#E3E8EF] max-h-[90vh] overflow-y-auto custom-scrollbar space-y-5">
            <div className="flex items-start justify-between pb-3 border-b border-[#E3E8EF]">
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
              <button
                onClick={() => setSelectedLeader(null)}
                className="p-1 rounded-lg text-[#667085] hover:text-[#182230] hover:bg-[#F5F7FA]"
              >
                <X className="w-4 h-4" />
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
            <div className="grid grid-cols-3 gap-3">
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
