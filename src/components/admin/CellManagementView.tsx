import React, { useState, useEffect } from 'react';
import { Cell, CellMeetingReport, EvangelismReport, EvangelismContact } from '../../types';
import { CellService } from '../../services/cellService';
import { ReportService } from '../../services/reportService';
import { FollowUpService } from '../../services/followUpService';
import {
  Building,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Phone,
  MapPin,
  Calendar,
  Users,
  Edit2,
  Trash2,
  Eye,
  X,
  FileText,
  Flame,
  UserCheck,
  ArrowLeft,
} from 'lucide-react';

interface CellManagementViewProps {
  onBack?: () => void;
}

export const CellManagementView: React.FC<CellManagementViewProps> = ({ onBack }) => {
  const [cells, setCells] = useState<Cell[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Suspended' | 'Deactivated'>('All');
  const [isLoading, setIsLoading] = useState(true);

  // Profile Drawer / Modal state
  const [selectedCell, setSelectedCell] = useState<Cell | null>(null);
  const [cellMeetings, setCellMeetings] = useState<CellMeetingReport[]>([]);
  const [cellEvang, setCellEvang] = useState<EvangelismReport[]>([]);
  const [cellContacts, setCellContacts] = useState<EvangelismContact[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Edit / Add Cell modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCell, setEditingCell] = useState<Partial<Cell>>({});

  const loadCells = async () => {
    try {
      setIsLoading(true);
      const list = await CellService.getCells();
      setCells(list);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCells();
  }, []);

  const openCellProfile = async (cell: Cell) => {
    setSelectedCell(cell);
    setIsLoadingDetails(true);
    try {
      const [mList, eList, cList] = await Promise.all([
        ReportService.getCellMeetingReports({ cellId: cell.id }),
        ReportService.getEvangelismReports({ cellId: cell.id }),
        FollowUpService.getContacts(cell.id),
      ]);
      setCellMeetings(mList);
      setCellEvang(eList);
      setCellContacts(cList);
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
    if (!editingCell.name || !editingCell.location) return;

    if (editingCell.id) {
      // Update
      const full = cells.find(c => c.id === editingCell.id);
      if (full) {
        const merged: Cell = {
          ...full,
          ...editingCell,
          name: editingCell.name!,
          location: editingCell.location!,
        };
        await CellService.updateCell(merged);
        setCells(prev => prev.map(c => (c.id === merged.id ? merged : c)));
        if (selectedCell?.id === merged.id) setSelectedCell(merged);
      }
    } else {
      // Create new cell
      const { cell } = await CellService.registerCell({
        name: editingCell.name!,
        location: editingCell.location!,
        tutorUid: editingCell.tutorUid || 'admin-created',
        leaderName: editingCell.leader_name || 'Assigned Leader',
        leaderPhone: editingCell.leader_phone || '',
        meetingDay: editingCell.meeting_day || 'Wednesday',
        meetingTime: editingCell.meeting_time || '18:30',
        venueAddress: editingCell.venue_address || editingCell.location,
        targetAttendance: editingCell.target_attendance || 20,
      });
      setCells(prev => [cell, ...prev]);
    }

    setIsEditModalOpen(false);
    setEditingCell({});
  };

  // Filter cells
  const filteredCells = cells.filter(cell => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      cell.name.toLowerCase().includes(q) ||
      (cell.location && cell.location.toLowerCase().includes(q)) ||
      (cell.leader_name && cell.leader_name.toLowerCase().includes(q));

    const currentStatus = cell.status || (cell.is_active ? 'Active' : 'Suspended');
    const matchesStatus = statusFilter === 'All' || currentStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
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
            Cell Management
          </h1>
          <p className="text-xs text-[#667085] mt-0.5">
            Directory of all registered FNI fellowship cells, leader assignments, and meeting schedules.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditingCell({
                meeting_day: 'Wednesday',
                meeting_time: '18:30',
                target_attendance: 25,
              });
              setIsEditModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-[#142B4A] text-white text-xs font-bold hover:bg-[#203D63] transition-colors shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-[#C6A45A]" />
            <span>Register New Cell</span>
          </button>
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
            placeholder="Search by cell name, leader, location..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-[#E3E8EF] focus:outline-none focus:ring-2 focus:ring-[#142B4A]/20 focus:border-[#142B4A] text-[#182230]"
          />
        </div>

        <div className="flex items-center gap-2">
          {(['All', 'Active', 'Suspended', 'Deactivated'] as const).map(st => (
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

      {/* Cells Table (Reference Image Design) */}
      <div className="bg-white rounded-2xl border border-[#E3E8EF] shadow-sm overflow-hidden">
        <div className="py-4 px-6 border-b border-[#E3E8EF] flex items-center justify-between">
          <h2 className="text-base font-bold text-[#182230]">
            Registered Cells ({filteredCells.length})
          </h2>
          <span className="text-xs text-[#667085]">
            Auto-populated from tutor registrations & admin additions
          </span>
        </div>

        <div className="table-scroll-container">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E3E8EF] text-[11px] font-semibold uppercase tracking-wider text-[#667085] bg-[#F5F7FA]">
                <th className="py-3 px-5 w-12 text-center">
                  <div className="w-4 h-4 rounded-full border border-[#CBD5E1] mx-auto" />
                </th>
                <th className="py-3 px-4">CELL NAME & LOCATION</th>
                <th className="py-3 px-4">ASSIGNED LEADER</th>
                <th className="py-3 px-4">TARGET ATTENDANCE</th>
                <th className="py-3 px-4">STATUS</th>
                <th className="py-3 px-4">MEETING TIME</th>
                <th className="py-3 px-5 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E8EF]">
              {filteredCells.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#667085]">
                    <Building className="w-8 h-8 text-[#CBD5E1] mx-auto mb-2" />
                    <p className="text-xs font-semibold">No cells found matching your criteria.</p>
                    <p className="text-[11px] text-[#667085] mt-0.5">
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
                            {cell.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-[#182230] leading-tight">
                              {cell.name}
                            </div>
                            <div className="text-[11px] text-[#667085] mt-0.5 flex items-center gap-1">
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
                        <div className="text-[11px] text-[#667085] flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" />
                          <span>{cell.leader_phone || 'No phone'}</span>
                        </div>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="font-bold text-[#182230] text-sm">
                          {cell.target_attendance || 20}
                        </span>
                        <div className="text-[10px] text-[#667085]">Members Target</div>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        {status === 'Active' && (
                          <span className="inline-flex items-center gap-1.5 font-medium text-[#23845B]">
                            <span className="w-2 h-2 rounded-full bg-[#23845B]" />
                            Active
                          </span>
                        )}
                        {status === 'Suspended' && (
                          <span className="inline-flex items-center gap-1.5 font-medium text-[#D99A32]">
                            <span className="w-2 h-2 rounded-full bg-[#D99A32]" />
                            Suspended
                          </span>
                        )}
                        {status === 'Deactivated' && (
                          <span className="inline-flex items-center gap-1.5 font-medium text-[#C74646]">
                            <span className="w-2 h-2 rounded-full bg-[#C74646]" />
                            Deactivated
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap text-[#667085]">
                        <div className="font-medium text-[#182230]">
                          {cell.meeting_day || 'Wednesday'}
                        </div>
                        <div className="text-[11px]">{cell.meeting_time || '18:30'} GMT</div>
                      </td>

                      <td className="py-4 px-5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
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
                            className="w-8 h-8 rounded-full text-[#667085] hover:text-[#142B4A] hover:bg-[#F5F7FA] inline-flex items-center justify-center transition-colors"
                            title="View History"
                          >
                            <Eye className="w-3.5 h-3.5" />
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
        <div className="fixed inset-0 z-50 bg-[#142B4A]/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-xl border border-[#E3E8EF] max-h-[90vh] overflow-y-auto custom-scrollbar space-y-5">
            <div className="flex items-start justify-between pb-3 border-b border-[#E3E8EF]">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-[#142B4A]">{selectedCell.name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    selectedCell.is_active ? 'bg-emerald-50 text-[#23845B]' : 'bg-rose-50 text-[#C74646]'
                  }`}>
                    {selectedCell.status || (selectedCell.is_active ? 'Active' : 'Suspended')}
                  </span>
                </div>
                <p className="text-xs text-[#667085] mt-0.5">
                  Location: {selectedCell.location} &bull; Leader: {selectedCell.leader_name} ({selectedCell.leader_phone || 'No phone'})
                </p>
              </div>
              <button
                onClick={() => setSelectedCell(null)}
                className="p-1 rounded-lg text-[#667085] hover:text-[#182230] hover:bg-[#F5F7FA]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cell Quick Actions: Activate / Suspend */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs font-semibold text-[#667085]">Status Action:</span>
              <button
                onClick={() => handleToggleStatus(selectedCell, 'Active')}
                className="px-2.5 py-1 rounded-lg bg-emerald-50 text-[#23845B] hover:bg-emerald-100 text-xs font-bold"
              >
                Set Active
              </button>
              <button
                onClick={() => handleToggleStatus(selectedCell, 'Suspended')}
                className="px-2.5 py-1 rounded-lg bg-amber-50 text-[#D99A32] hover:bg-amber-100 text-xs font-bold"
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

            {/* Performance Stats Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF]">
                <div className="text-[10px] font-semibold text-[#667085]">Meeting Returns</div>
                <div className="text-lg font-bold text-[#142B4A] mt-0.5">{cellMeetings.length}</div>
              </div>
              <div className="p-3 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF]">
                <div className="text-[10px] font-semibold text-[#667085]">Evangelism Outreaches</div>
                <div className="text-lg font-bold text-[#23845B] mt-0.5">{cellEvang.length}</div>
              </div>
              <div className="p-3 bg-[#F5F7FA] rounded-xl border border-[#E3E8EF]">
                <div className="text-[10px] font-semibold text-[#667085]">Outreach Contacts</div>
                <div className="text-lg font-bold text-[#C6A45A] mt-0.5">{cellContacts.length}</div>
              </div>
            </div>

            {/* Cell Membership Roster & Pastoral Breakdown */}
            <div className="p-3.5 bg-[#F5F7FA] rounded-2xl border border-[#E3E8EF] space-y-2">
              <span className="font-bold text-[#142B4A] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#C6A45A]" />
                Cell Roster & Membership Details
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 bg-white rounded-xl border border-[#E3E8EF]">
                  <div className="text-[10px] text-[#667085] font-semibold">Total Members</div>
                  <div className="text-base font-black text-[#142B4A] mt-0.5">{selectedCell.total_members ?? 10}</div>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-[#E3E8EF]">
                  <div className="text-[10px] text-[#667085] font-semibold">Active Members</div>
                  <div className="text-base font-black text-[#23845B] mt-0.5">{selectedCell.active_members ?? 8}</div>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-[#E3E8EF]">
                  <div className="text-[10px] text-[#667085] font-semibold">New Members</div>
                  <div className="text-base font-black text-[#C6A45A] mt-0.5">{selectedCell.new_members ?? 2}</div>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-[#E3E8EF]">
                  <div className="text-[10px] text-[#667085] font-semibold">Requiring Follow-up</div>
                  <div className="text-base font-black text-[#C74646] mt-0.5">
                    {selectedCell.requiring_follow_up ?? cellContacts.filter(c => c.followUpStatus !== 'Completed' && c.followUpStatus !== 'Joined Ministry').length}
                  </div>
                </div>
              </div>
            </div>

            {/* Meeting Reports History */}
            <div>
              <h4 className="text-xs font-bold text-[#142B4A] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Cell Meeting Reports ({cellMeetings.length})
              </h4>
              {cellMeetings.length === 0 ? (
                <p className="text-xs text-[#667085] italic p-3 bg-[#F5F7FA] rounded-xl">
                  No meeting reports filed yet by this cell.
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                  {cellMeetings.map(m => (
                    <div
                      key={m.id}
                      className="p-3 rounded-xl border border-[#E3E8EF] flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-[#182230]">Meeting on {m.meetingDate}</div>
                        <div className="text-[11px] text-[#667085]">
                          Attendance: {m.attendance} &bull; Members: {m.members} &bull; Absentees: {m.absentees}
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        m.status === 'Approved' ? 'bg-emerald-50 text-[#23845B]' : 'bg-amber-50 text-[#D99A32]'
                      }`}>
                        {m.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Evangelism History */}
            <div>
              <h4 className="text-xs font-bold text-[#142B4A] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-[#C6A45A]" />
                Evangelism Outreaches ({cellEvang.length})
              </h4>
              {cellEvang.length === 0 ? (
                <p className="text-xs text-[#667085] italic p-3 bg-[#F5F7FA] rounded-xl">
                  No evangelism reports filed yet by this cell.
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                  {cellEvang.map(e => (
                    <div
                      key={e.id}
                      className="p-3 rounded-xl border border-[#E3E8EF] flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-[#182230]">Outreach on {e.date}</div>
                        <div className="text-[11px] text-[#667085]">
                          Souls Won: <span className="font-bold text-[#23845B]">+{e.conversions}</span> &bull; People Reached: {e.peopleSpokenTo}
                        </div>
                      </div>
                      <span className="text-[10px] text-[#667085]">{e.location}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT CELL MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#142B4A]/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-[#E3E8EF] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3E8EF]">
              <h3 className="text-base font-bold text-[#142B4A]">
                {editingCell.id ? 'Edit Cell Details' : 'Register New Cell'}
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-xs text-[#667085] hover:text-[#182230]"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleSaveCell} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#182230] mb-1">Cell Name</label>
                <input
                  type="text"
                  value={editingCell.name || ''}
                  onChange={e => setEditingCell({ ...editingCell, name: e.target.value })}
                  required
                  placeholder="e.g. Dominion Cell"
                  className="w-full p-2.5 rounded-xl border border-[#E3E8EF] focus:ring-2 focus:ring-[#142B4A]/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[#182230] mb-1">Location or Campus</label>
                <input
                  type="text"
                  value={editingCell.location || ''}
                  onChange={e => setEditingCell({ ...editingCell, location: e.target.value })}
                  required
                  placeholder="e.g. Legon Campus, Hostels"
                  className="w-full p-2.5 rounded-xl border border-[#E3E8EF] focus:ring-2 focus:ring-[#142B4A]/20 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#182230] mb-1">Leader Name</label>
                  <input
                    type="text"
                    value={editingCell.leader_name || ''}
                    onChange={e => setEditingCell({ ...editingCell, leader_name: e.target.value })}
                    placeholder="Leader Full Name"
                    className="w-full p-2.5 rounded-xl border border-[#E3E8EF] focus:ring-2 focus:ring-[#142B4A]/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#182230] mb-1">Leader Phone</label>
                  <input
                    type="text"
                    value={editingCell.leader_phone || ''}
                    onChange={e => setEditingCell({ ...editingCell, leader_phone: e.target.value })}
                    placeholder="+233 24 123 4567"
                    className="w-full p-2.5 rounded-xl border border-[#E3E8EF] focus:ring-2 focus:ring-[#142B4A]/20 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#182230] mb-1">Meeting Day</label>
                  <select
                    value={editingCell.meeting_day || 'Wednesday'}
                    onChange={e => setEditingCell({ ...editingCell, meeting_day: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E3E8EF] bg-white"
                  >
                    {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#182230] mb-1">Meeting Time</label>
                  <input
                    type="text"
                    value={editingCell.meeting_time || '18:30'}
                    onChange={e => setEditingCell({ ...editingCell, meeting_time: e.target.value })}
                    placeholder="18:30"
                    className="w-full p-2.5 rounded-xl border border-[#E3E8EF] focus:ring-2 focus:ring-[#142B4A]/20 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#182230] mb-1">Target Attendance</label>
                <input
                  type="number"
                  value={editingCell.target_attendance || 20}
                  onChange={e => setEditingCell({ ...editingCell, target_attendance: Number(e.target.value) })}
                  min={1}
                  className="w-full p-2.5 rounded-xl border border-[#E3E8EF] focus:ring-2 focus:ring-[#142B4A]/20 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-[#667085] hover:bg-[#F5F7FA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#142B4A] text-white font-bold hover:bg-[#203D63]"
                >
                  Save Cell
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
