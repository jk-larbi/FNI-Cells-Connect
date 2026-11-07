import React, { useState } from 'react';
import { Cell, WeeklyReport } from '../../types';
import { formatDate } from '../../lib/storage';
import { 
  Building2, 
  PlusCircle, 
  UserCheck, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar, 
  CheckCircle2, 
  Edit3, 
  Search,
  Users,
  FileText,
  ChevronRight
} from 'lucide-react';

interface CellsManagementProps {
  cells: Cell[];
  reports: WeeklyReport[];
  onAddCell: (newCell: Omit<Cell, 'id' | 'createdAt'>) => void;
  onUpdateCell?: (id: string, updates: Partial<Cell>) => void;
  onSelectCellReports?: (cellId: string) => void;
}

export const CellsManagement: React.FC<CellsManagementProps> = ({
  cells,
  reports,
  onAddCell,
  onUpdateCell,
  onSelectCellReports
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'cells' | 'leaders'>('cells');
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states for registering new cell
  const [name, setName] = useState('');
  const [leader, setLeader] = useState('');
  const [area, setArea] = useState('');
  const [leaderEmail, setLeaderEmail] = useState('');
  const [leaderPhone, setLeaderPhone] = useState('+233 ');
  const [meetingDay, setMeetingDay] = useState('Wednesday');
  const [meetingTime, setMeetingTime] = useState('18:30');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const getLastReport = (cellId: string) => {
    const cellReports = reports
      .filter(r => r.cell === cellId && r.status !== 'Draft')
      .sort((a, b) => b.week.localeCompare(a.week));
    return cellReports[0];
  };

  const getCellReportCount = (cellId: string) => {
    return reports.filter(r => r.cell === cellId && r.status !== 'Draft').length;
  };

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Cell name is required.';
    if (!leader.trim()) errs.leader = 'Leader name is required.';
    if (!area.trim()) errs.area = 'Area/city is required.';
    if (leaderEmail && !leaderEmail.includes('@')) errs.leaderEmail = 'Invalid email address.';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    onAddCell({
      name: name.trim().endsWith('Cell') ? name.trim() : `${name.trim()} Cell`,
      leader: leader.trim(),
      area: area.trim(),
      leaderEmail: leaderEmail.trim() || `${leader.toLowerCase().replace(/\s+/g, '.')}@fni.org`,
      leaderPhone: leaderPhone.trim(),
      meetingDay,
      meetingTime,
      active: true
    });

    // Reset form
    setName('');
    setLeader('');
    setArea('');
    setLeaderEmail('');
    setLeaderPhone('+233 ');
    setShowAddForm(false);
  };

  const filteredCells = cells.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.leader.toLowerCase().includes(q) || c.area.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#0F2447] tracking-tight font-serif-title">
            Cells & Leaders Directory
          </h1>
          <p className="text-sm text-[#5B6472] mt-0.5">
            {cells.length} registered fellowships across Forerunners Network International
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#0F2447] hover:bg-[#18325C] rounded transition-colors self-start sm:self-auto shadow-xs"
        >
          <PlusCircle className="w-3.5 h-3.5 text-[#B8923A]" />
          <span>{showAddForm ? 'Close Form' : 'Register New Cell'}</span>
        </button>
      </div>

      {/* Subtabs for View Toggling */}
      <div className="flex items-center gap-2 border-b border-[#E3E6EB] text-xs">
        <button
          onClick={() => setActiveSubTab('cells')}
          className={`pb-2 px-2 font-medium border-b-2 transition-colors ${
            activeSubTab === 'cells'
              ? 'border-[#B8923A] text-[#0F2447]'
              : 'border-transparent text-[#5B6472] hover:text-[#0F2447]'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-[#B8923A]" />
            <span>Registered Fellowship Units ({cells.length})</span>
          </div>
        </button>

        <button
          onClick={() => setActiveSubTab('leaders')}
          className={`pb-2 px-2 font-medium border-b-2 transition-colors ${
            activeSubTab === 'leaders'
              ? 'border-[#B8923A] text-[#0F2447]'
              : 'border-transparent text-[#5B6472] hover:text-[#0F2447]'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-[#B8923A]" />
            <span>Registered Cell Leaders Roster</span>
          </div>
        </button>
      </div>

      {/* Registration Form (Collapsible/Prominent) */}
      {showAddForm && (
        <div className="bg-white border border-[#B8923A]/40 rounded-lg p-6 shadow-xs animate-in fade-in duration-200">
          <div className="border-b border-[#E3E6EB] pb-3 mb-4">
            <h2 className="text-sm font-semibold text-[#0F2447] font-serif-title">
              Register a New Cell Fellowship
            </h2>
            <p className="text-xs text-[#5B6472] mt-0.5">
              Enter official cell details, designated leader, and meeting schedule.
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#14213D] mb-1">
                  Cell Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Damascus"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full text-xs px-3 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-[#B8923A] bg-white ${
                    formErrors.name ? 'border-red-500' : 'border-[#E3E6EB]'
                  }`}
                />
                {formErrors.name && <p className="text-[11px] text-red-600 mt-1">{formErrors.name}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-[#14213D] mb-1">
                  Appointed Leader <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kwame Mensah"
                  value={leader}
                  onChange={(e) => setLeader(e.target.value)}
                  className={`w-full text-xs px-3 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-[#B8923A] bg-white ${
                    formErrors.leader ? 'border-red-500' : 'border-[#E3E6EB]'
                  }`}
                />
                {formErrors.leader && <p className="text-[11px] text-red-600 mt-1">{formErrors.leader}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-[#14213D] mb-1">
                  Area / City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cape Coast"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className={`w-full text-xs px-3 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-[#B8923A] bg-white ${
                    formErrors.area ? 'border-red-500' : 'border-[#E3E6EB]'
                  }`}
                />
                {formErrors.area && <p className="text-[11px] text-red-600 mt-1">{formErrors.area}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#14213D] mb-1">
                  Leader Email
                </label>
                <input
                  type="email"
                  placeholder="leader@fni.org"
                  value={leaderEmail}
                  onChange={(e) => setLeaderEmail(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-[#E3E6EB] rounded focus:outline-none focus:ring-1 focus:ring-[#B8923A] bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#14213D] mb-1">
                  WhatsApp / Phone
                </label>
                <input
                  type="text"
                  placeholder="+233 24 000 0000"
                  value={leaderPhone}
                  onChange={(e) => setLeaderPhone(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-[#E3E6EB] rounded focus:outline-none focus:ring-1 focus:ring-[#B8923A] bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#14213D] mb-1">
                  Meeting Day
                </label>
                <select
                  value={meetingDay}
                  onChange={(e) => setMeetingDay(e.target.value)}
                  className="w-full text-xs px-2.5 py-2 border border-[#E3E6EB] rounded focus:outline-none focus:ring-1 focus:ring-[#B8923A] bg-white"
                >
                  <option value="Monday">Monday</option>
                  <option value="Tuesday">Tuesday</option>
                  <option value="Wednesday">Wednesday</option>
                  <option value="Thursday">Thursday</option>
                  <option value="Friday">Friday</option>
                  <option value="Saturday">Saturday</option>
                  <option value="Sunday">Sunday</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#14213D] mb-1">
                  Meeting Time
                </label>
                <input
                  type="text"
                  placeholder="18:30"
                  value={meetingTime}
                  onChange={(e) => setMeetingTime(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-[#E3E6EB] rounded focus:outline-none focus:ring-1 focus:ring-[#B8923A] bg-white"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-1.5 text-xs font-medium text-[#5B6472] bg-white border border-[#E3E6EB] rounded hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold text-white bg-[#0F2447] hover:bg-[#18325C] rounded transition-colors shadow-xs"
              >
                Save & Register Cell
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Directory Search & Filter */}
      <div className="bg-white border border-[#E3E6EB] rounded-lg p-4 flex items-center justify-between shadow-xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C95A3]" />
          <input
            type="text"
            placeholder="Search by cell name, leader, area..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 border border-[#E3E6EB] rounded focus:outline-none focus:ring-1 focus:ring-[#B8923A] bg-white"
          />
        </div>
        <span className="text-xs text-[#5B6472] hidden sm:inline">
          Active fellowship register
        </span>
      </div>

      {/* View 1: Registered Cells */}
      {activeSubTab === 'cells' && (
        <div className="bg-white border border-[#E3E6EB] rounded-lg overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F9FA] text-[#5B6472] border-b border-[#E3E6EB] uppercase font-semibold text-[11px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Cell Name</th>
                  <th className="py-2.5 px-4">Appointed Leader</th>
                  <th className="py-2.5 px-4">Area / Location</th>
                  <th className="py-2.5 px-4">Schedule</th>
                  <th className="py-2.5 px-4">Leader Contact</th>
                  <th className="py-2.5 px-4">Last Reported</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                  <th className="py-2.5 px-4 text-right">Reports</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E6EB]">
                {filteredCells.map((c) => {
                  const lastRep = getLastReport(c.id);
                  const count = getCellReportCount(c.id);
                  return (
                    <tr key={c.id} className="hover:bg-[#F8F9FA] transition-colors">
                      <td className="py-3 px-4 font-semibold text-[#0F2447] whitespace-nowrap">
                        {c.name}
                      </td>
                      <td className="py-3 px-4 text-[#14213D] whitespace-nowrap">
                        {c.leader}
                      </td>
                      <td className="py-3 px-4 text-[#5B6472] whitespace-nowrap">
                        {c.area}
                      </td>
                      <td className="py-3 px-4 text-[#5B6472] whitespace-nowrap">
                        {c.meetingDay} @ {c.meetingTime}
                      </td>
                      <td className="py-3 px-4 text-[#5B6472] font-mono text-[11px] whitespace-nowrap">
                        {c.leaderPhone}
                      </td>
                      <td className="py-3 px-4 text-[#5B6472] whitespace-nowrap">
                        {lastRep ? formatDate(lastRep.week) : <span className="text-[#8C95A3]">None yet</span>}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded bg-[#E4F2E8] text-[#1E6B3A] border border-[#C4E1CC]">
                          Active
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {onSelectCellReports && (
                          <button
                            onClick={() => onSelectCellReports(c.id)}
                            className="text-[#1B3F7A] hover:underline font-medium inline-flex items-center gap-1"
                          >
                            <span>{count} returns</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View 2: Registered Cell Leaders Roster (Section 8.C) */}
      {activeSubTab === 'leaders' && (
        <div className="bg-white border border-[#E3E6EB] rounded-lg overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F9FA] text-[#5B6472] border-b border-[#E3E6EB] uppercase font-semibold text-[11px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Cell Leader Name</th>
                  <th className="py-2.5 px-4">Registered Cell Name</th>
                  <th className="py-2.5 px-4">Area / Station</th>
                  <th className="py-2.5 px-4">Email</th>
                  <th className="py-2.5 px-4">WhatsApp / Phone</th>
                  <th className="py-2.5 px-4 text-center">Auth Role</th>
                  <th className="py-2.5 px-4 text-center">Account Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E6EB]">
                {filteredCells.map((c) => (
                  <tr key={c.id} className="hover:bg-[#F8F9FA] transition-colors">
                    <td className="py-3 px-4 font-semibold text-[#0F2447] whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#0F2447] text-white flex items-center justify-center font-bold text-xs">
                          {c.leader.slice(0, 1)}
                        </div>
                        <span>{c.leader}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-[#14213D] whitespace-nowrap">
                      {c.name}
                    </td>
                    <td className="py-3 px-4 text-[#5B6472] whitespace-nowrap">
                      {c.area}
                    </td>
                    <td className="py-3 px-4 text-[#5B6472] font-mono text-[11px] whitespace-nowrap">
                      {c.leaderEmail || '—'}
                    </td>
                    <td className="py-3 px-4 text-[#5B6472] font-mono text-[11px] whitespace-nowrap">
                      {c.leaderPhone}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-[#F6F7F9] text-[#5B6472] border border-[#E3E6EB] font-medium text-[11px]">
                        Cell Leader
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#E4F2E8] text-[#1E6B3A] border border-[#C4E1CC]">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Verified</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
