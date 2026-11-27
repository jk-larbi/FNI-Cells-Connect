import React, { useState, useEffect } from 'react';
import { Region, Cell, ReportingPeriod, Profile, UserRole, CellReport, AccountDeactivationRequest } from '../../types';
import { ReportService } from '../../services/reportService';
import { AuthService } from '../../services/authService';
import { SupabaseService } from '../../services/supabaseService';
import { UserSettingsService } from '../../services/userSettingsService';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { StatCard, ActionStatCard } from '../dashboard/StatCard';
import {
  Users,
  Shield,
  Building,
  Calendar,
  ExternalLink,
  Copy,
  Check,
  MessageSquare,
  MoreVertical,
  AlertCircle,
  CheckCircle2,
  Search,
  FileSpreadsheet,
  Phone,
  Trash2,
  UserX,
  Clock,
  XCircle,
} from 'lucide-react';

export const AdminManagementView: React.FC = () => {
  const { currentUser, deleteUserAccount } = useAuth();
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'cells' | 'regions' | 'periods' | 'deactivations'>('users');
  const [deactivationRequests, setDeactivationRequests] = useState<AccountDeactivationRequest[]>([]);
  const [isLoadingDeactivations, setIsLoadingDeactivations] = useState(false);
  const [reviewingRequestId, setReviewingRequestId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [users, setUsers] = useState<Profile[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [cells, setCells] = useState<Cell[]>([]);
  const [periods, setPeriods] = useState<ReportingPeriod[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'cell' | 'region' | 'period' | 'user'>('user');

  const handleDeleteUser = async (user: Profile) => {
    if (!window.confirm(`Permanently delete ${user.full_name}'s account and personal profile? They can register again afterwards.`)) return;
    setDeletingUserId(user.id);
    const result = await deleteUserAccount(user.id);
    setDeletingUserId(null);
    if (!result.success) { window.alert(result.error || 'Account deletion failed.'); return; }
    setUsers(previous => previous.filter(item => item.id !== user.id));
    window.alert(`${user.full_name}'s account has been deleted.`);
  };

  // Filter states
  const [nameFilter, setNameFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [cellSearchQuery, setCellSearchQuery] = useState('');
  const [cellRegionFilter, setCellRegionFilter] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Cell reports preview modal state
  const [selectedCellForReports, setSelectedCellForReports] = useState<Cell | null>(null);
  const [cellReports, setCellReports] = useState<CellReport[]>([]);
  const [isLoadingCellReports, setIsLoadingCellReports] = useState(false);

  // Creation form states
  const [newUser, setNewUser] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    role: 'cell_leader' as UserRole,
  });

  const [newCell, setNewCell] = useState({
    name: '',
    region_id: '',
    leader_name: '',
    leader_phone: '',
    meeting_day: 'Wednesday',
    meeting_time: '18:30',
    venue_address: '',
    target_attendance: 20,
  });

  const [newRegion, setNewRegion] = useState({
    name: '',
    code: '',
    country: 'Nigeria',
    state_province: '',
    leader_name: '',
  });

  const [newPeriod, setNewPeriod] = useState({
    name: '2026 - Week 46',
    year: 2026,
    week_number: 46,
    start_date: '2026-11-09',
    end_date: '2026-11-15',
    submission_deadline: '2026-11-17T23:59:59Z',
    is_open: true,
  });

  useEffect(() => {
    async function loadData() {
      const [r, c, p, remoteUsers, deactList] = await Promise.all([
        ReportService.getRegions(),
        ReportService.getCells(),
        ReportService.getPeriods(),
        SupabaseService.getProfiles(),
        UserSettingsService.getPendingDeactivationRequests(),
      ]);
      setRegions(r);
      setCells(c.filter(cell => !cell.is_archived));
      setPeriods(p);
      setUsers(remoteUsers || AuthService.getAllProfiles());
      setDeactivationRequests(deactList);
      if (r.length > 0) {
        setNewCell(prev => ({ ...prev, region_id: r[0].id }));
      }
    }
    loadData();
  }, []);

  const loadDeactivations = async () => {
    setIsLoadingDeactivations(true);
    try {
      const list = await UserSettingsService.getPendingDeactivationRequests();
      setDeactivationRequests(list);
    } finally {
      setIsLoadingDeactivations(false);
    }
  };

  const handleReviewDeactivation = async (requestId: string, decision: 'approved' | 'declined') => {
    if (!currentUser?.id) return;
    const verb = decision === 'approved' ? 'approve' : 'decline';
    const confirmation = window.confirm(
      decision === 'approved'
        ? 'Are you sure you want to approve this account deactivation? The user profile will be deactivated, while all historical reports, offerings, and attendance records will remain preserved.'
        : 'Are you sure you want to decline this account deactivation request?'
    );
    if (!confirmation) return;

    setReviewingRequestId(requestId);
    try {
      const note = adminNotes[requestId];
      const res = await UserSettingsService.reviewDeactivationRequest(requestId, currentUser.id, decision, note);
      if (!res.success) {
        window.alert(res.error || 'Failed to review deactivation request.');
      } else {
        await loadDeactivations();
        const remoteUsers = await SupabaseService.getProfiles();
        if (remoteUsers) setUsers(remoteUsers);
        window.alert(`Deactivation request ${decision} successfully.`);
      }
    } finally {
      setReviewingRequestId(null);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    const result = await AuthService.updateProfileRole(userId, newRole);
    if (!result.success) {
      window.alert(result.error || 'Role update failed.');
      return;
    }
    setUsers(prev => prev.map(user => user.id === userId ? { ...user, role: newRole } : user));
  };

  const handleViewCellReports = async (cell: Cell) => {
    setSelectedCellForReports(cell);
    setIsLoadingCellReports(true);
    const repList = await ReportService.getReports({ cellId: cell.id });
    setCellReports(repList);
    setIsLoadingCellReports(false);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.full_name.trim() || !newUser.email.trim()) return;

    const created: Profile = {
      id: `usr-${Date.now()}`,
      full_name: newUser.full_name,
      email: newUser.email,
      phone_number: newUser.phone_number,
      role: newUser.role,
      is_active: true,
      is_onboarded: true,
      created_at: new Date().toISOString(),
    };

    const updated = [created, ...users];
    setUsers(updated);
    AuthService.saveProfiles(updated);
    setIsModalOpen(false);
    setNewUser({ full_name: '', email: '', phone_number: '', role: 'cell_leader' });
  };

  const handleCreateCell = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCell.name.trim()) return;
    const region = regions.find(r => r.id === newCell.region_id);
    const created: Cell = {
      id: `cell-${Date.now()}`,
      name: newCell.name,
      code: `FNI-CEL-${Date.now().toString().slice(-4)}`,
      region_id: newCell.region_id || (regions[0]?.id ?? ''),
      region_name: region?.name || regions[0]?.name || 'Lagos Central Region',
      leader_name: newCell.leader_name || 'Assigned Leader',
      leader_phone: newCell.leader_phone || '+234 800 000 0000',
      meeting_day: newCell.meeting_day,
      meeting_time: newCell.meeting_time,
      venue_address: newCell.venue_address || 'Fellowship Venue',
      target_attendance: Number(newCell.target_attendance) || 20,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    await ReportService.addCell(created);
    setCells(prev => [created, ...prev]);
    setIsModalOpen(false);
    setNewCell({ name: '', region_id: '', leader_name: '', leader_phone: '', meeting_day: 'Wednesday', meeting_time: '18:30', venue_address: '', target_attendance: 20 });
  };

  const handleCreateRegion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRegion.name.trim()) return;
    const created: Region = {
      id: `reg-${Date.now()}`,
      name: newRegion.name,
      code: newRegion.code || `FNI-REG-${newRegion.name.slice(0, 3).toUpperCase()}`,
      country: newRegion.country,
      state_province: newRegion.state_province,
      leader_name: newRegion.leader_name || 'Regional Overseer',
      total_cells: 0,
      active_cells: 0,
      created_at: new Date().toISOString(),
    };
    await ReportService.addRegion(created);
    setRegions(prev => [...prev, created]);
    setIsModalOpen(false);
    setNewRegion({ name: '', code: '', country: 'Nigeria', state_province: '', leader_name: '' });
  };

  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    const created: ReportingPeriod = {
      id: `prd-${Date.now()}`,
      ...newPeriod,
      created_at: new Date().toISOString(),
    };
    await ReportService.addPeriod(created);
    setPeriods(prev => [created, ...prev]);
    setIsModalOpen(false);
  };

  const filteredUsers = users.filter(u => {
    const q = nameFilter.toLowerCase();
    const matchesName = !nameFilter.trim() || 
      u.full_name.toLowerCase().includes(q) || 
      u.email.toLowerCase().includes(q) ||
      (u.cell_name && u.cell_name.toLowerCase().includes(q));
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesName && matchesRole;
  });

  const filteredCells = cells.filter(c => !c.is_archived).filter(c => {
    const q = cellSearchQuery.toLowerCase();
    const matchesQuery = !cellSearchQuery.trim() || 
      c.name.toLowerCase().includes(q) || 
      (c.code && c.code.toLowerCase().includes(q)) || 
      (c.leader_name && c.leader_name.toLowerCase().includes(q));
    const matchesRegion = cellRegionFilter === 'all' || c.region_id === cellRegionFilter;
    return matchesQuery && matchesRegion;
  });

  const totalUsersCount = users.length;
  const adminCount = users.filter(u => u.role === 'super_admin' || u.role === 'national_admin').length;
  const leaderCount = users.filter(u => u.role === 'regional_leader' || u.role === 'cell_leader').length;

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#B18A3D]">Administration</p>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#142B4A]">People &amp; structure</h1>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">Manage accounts, leadership, cell records, regions and reporting cycles from one workspace.</p>
        </div>
        <span className="hidden sm:inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold text-slate-500">Administrator workspace</span>
      </div>
      {/* Keep all management areas accessible in a compact desktop grid and swipeable mobile tab strip. */}
      <div className="flex items-center gap-1.5 border-b border-slate-200/70 pb-2 text-xs font-bold overflow-x-auto md:overflow-visible -mx-1 px-1 snap-x snap-mandatory md:grid md:grid-cols-5 md:gap-2 md:mx-0 md:px-0">
        <button
          onClick={() => setActiveTab('users')}
          className={`min-h-10 px-3 sm:px-4 py-2 rounded-xl transition-all whitespace-nowrap snap-start ${
            activeTab === 'users'
              ? 'bg-navy-900 text-white shadow-card'
              : 'text-slate-500 hover:text-navy-900 hover:bg-white'
          }`}
        >
          Users & Leaders ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('cells')}
          className={`min-h-10 px-3 sm:px-4 py-2 rounded-xl transition-all whitespace-nowrap snap-start ${
            activeTab === 'cells'
              ? 'bg-navy-900 text-white shadow-card'
              : 'text-slate-500 hover:text-navy-900 hover:bg-white'
          }`}
        >
          Cells ({cells.length})
        </button>
        <button
          onClick={() => setActiveTab('regions')}
          className={`min-h-10 px-3 sm:px-4 py-2 rounded-xl transition-all whitespace-nowrap snap-start ${
            activeTab === 'regions'
              ? 'bg-navy-900 text-white shadow-card'
              : 'text-slate-500 hover:text-navy-900 hover:bg-white'
          }`}
        >
          Regions ({regions.length})
        </button>
        <button
          onClick={() => setActiveTab('periods')}
          className={`min-h-10 px-3 sm:px-4 py-2 rounded-xl transition-all whitespace-nowrap snap-start ${
            activeTab === 'periods'
              ? 'bg-navy-900 text-white shadow-card'
              : 'text-slate-500 hover:text-navy-900 hover:bg-white'
          }`}
        >
          Cycles ({periods.length})
        </button>
        <button
          onClick={() => setActiveTab('deactivations')}
          className={`min-h-10 px-3 sm:px-4 py-2 rounded-xl transition-all whitespace-nowrap flex items-center gap-2 snap-start ${
            activeTab === 'deactivations'
              ? 'bg-navy-900 text-white shadow-card'
              : 'text-slate-500 hover:text-navy-900 hover:bg-white'
          }`}
        >
          <span>Deactivation Requests</span>
          {deactivationRequests.filter(r => r.status === 'pending').length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
              {deactivationRequests.filter(r => r.status === 'pending').length}
            </span>
          )}
        </button>
      </div>

      {/* Main Card (Matching Screenshot "Users" View) */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-6 border border-slate-100 shadow-card space-y-4 sm:space-y-6">
        {/* Top Section Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-2xl font-extrabold tracking-tight text-navy-950">
            {activeTab === 'users'
              ? 'Users'
              : activeTab === 'cells'
              ? 'Cell Fellowships'
              : activeTab === 'regions'
              ? 'Territories'
              : activeTab === 'periods'
              ? 'Reporting Cycles'
              : 'Account Deactivation Requests'}
          </h2>
        </div>

        {/* Top Horizontal Stat Squircles + Action Card */}
        {activeTab === 'users' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
            <StatCard
              title="Total Users"
              value={totalUsersCount}
              subtitle="Registered accounts"
              icon={<Users className="w-5 h-5 text-gold-400" />}
              isActive={true}
            />

            <StatCard
              title="Admins"
              value={adminCount}
              subtitle="National & super admins"
              icon={<Shield className="w-5 h-5 text-gold-400" />}
              isActive={false}
            />

            <StatCard
              title="Field Leaders"
              value={leaderCount}
              subtitle="Regional & cell leaders"
              icon={<Building className="w-5 h-5 text-gold-400" />}
              isActive={false}
            />

            <ActionStatCard
              label="Add User"
              sublabel="Create leader profile"
              onClick={() => {
                setModalType('user');
                setIsModalOpen(true);
              }}
            />
          </div>
        )}

        {/* Multi-Column Filter Strip (matching screenshot) */}
        {activeTab === 'users' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
            <div>
              <span className="block text-[11px] font-medium text-slate-400 mb-1">Name / Keyword</span>
              <input
                type="text"
                placeholder="Type to filter..."
                value={nameFilter}
                onChange={e => setNameFilter(e.target.value)}
                className="w-full text-xs font-medium rounded-xl border-0 bg-slate-50 px-3 py-2 text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-navy-600 focus:bg-white"
              />
            </div>

            <div>
              <span className="block text-[11px] font-medium text-slate-400 mb-1">Role</span>
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="w-full text-xs font-medium rounded-xl border-0 bg-slate-50 px-3 py-2 text-slate-700 focus:ring-1 focus:ring-navy-600 focus:bg-white"
              >
                <option value="all">All Roles</option>
                <option value="super_admin">Super Administrator</option>
                <option value="national_admin">National Administrator</option>
                <option value="regional_leader">Regional Leader</option>
                <option value="cell_leader">Cell Leader</option>
              </select>
            </div>

            <div>
              <span className="block text-[11px] font-medium text-slate-400 mb-1">Verification</span>
              <div className="text-xs font-semibold rounded-xl bg-slate-50 px-3 py-2 text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> All Verified
              </div>
            </div>

            <div>
              <span className="block text-[11px] font-medium text-slate-400 mb-1">Status</span>
              <div className="text-xs font-semibold rounded-xl bg-slate-50 px-3 py-2 text-slate-700">
                Active Directory
              </div>
            </div>
          </div>
        )}

        {/* Users Table */}
        {activeTab === 'users' && (
          <>
          <div className="md:hidden divide-y divide-slate-200">
            {filteredUsers.length === 0 ? <div className="p-6 text-center text-xs text-slate-500">No users or cell leaders registered yet.</div> : filteredUsers.map(user => {
              const linkedCell = cells.find(cell => cell.id === user.cell_id || (user.cell_name && cell.name.toLowerCase() === user.cell_name.toLowerCase()));
              return <article key={user.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-navy-900 text-gold-400 font-bold flex items-center justify-center text-xs shrink-0">{(user.full_name || 'U').slice(0,2).toUpperCase()}</div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm text-navy-950 break-words">{user.full_name}</div>
                    <div className="text-xs text-slate-500 break-all mt-1">{user.email}</div>
                    {user.phone_number && <div className="text-[11px] text-slate-500 mt-0.5">{user.phone_number}</div>}
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${user.is_onboarded ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{user.is_onboarded ? 'Verified' : 'Pending'}</span>
                </div>
                <div className="mt-3 rounded-lg bg-slate-50 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-slate-400">Registered cell</div>
                  <div className="text-xs font-semibold text-slate-800 mt-1">{linkedCell?.name || (user.role === 'admin' ? 'National Administration' : 'Pending Cell Association')}</div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <label className="text-[10px] text-slate-500">Role
                    <select value={user.role} onChange={e => handleRoleChange(user.id, e.target.value as UserRole)} className="block w-full mt-1 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-navy-950 py-2 px-2">
                      <option value="super_admin">Super Admin</option><option value="national_admin">National Admin</option><option value="regional_leader">Regional Leader</option><option value="cell_leader">Cell Leader</option>
                    </select>
                  </label>
                  <div className="text-[10px] text-slate-500">Sign-in provider<div className="text-xs font-semibold text-slate-800 mt-2 capitalize">{user.auth_provider || 'Email'}</div></div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {user.cell_id && <button onClick={() => { const cell = cells.find(c => c.id === user.cell_id); if (cell) handleViewCellReports(cell); }} className="flex-1 min-w-[110px] rounded-lg bg-slate-100 text-slate-700 py-2 text-xs font-semibold inline-flex items-center justify-center gap-1.5"><FileSpreadsheet className="w-3.5 h-3.5" /> Reports</button>}
                  <button onClick={() => handleCopy(user.email, user.id)} className="flex-1 min-w-[110px] rounded-lg bg-sky-50 text-sky-700 py-2 text-xs font-semibold inline-flex items-center justify-center gap-1.5"><MessageSquare className="w-3.5 h-3.5" /> Copy email</button>
                  {user.id !== currentUser.id && <button onClick={() => handleDeleteUser(user)} disabled={deletingUserId === user.id} className="rounded-lg bg-rose-50 text-rose-700 px-3 py-2 text-xs font-semibold disabled:opacity-50"><Trash2 className="w-3.5 h-3.5" /></button>}
                </div>
              </article>;
            })}
          </div>
          <div className="hidden md:block table-scroll-container custom-scrollbar">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 font-medium text-[11px] border-b border-slate-100">
                  <th className="py-3 px-3">Cell Leader</th>
                  <th className="py-3 px-3">Registered Cell</th>
                  <th className="py-3 px-3">E-mail & Phone</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3 text-center">Onboarding</th>
                  <th className="py-3 px-3">Provider</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <Users className="w-8 h-8 mx-auto mb-2 text-slate-300 opacity-60" />
                      <div className="font-semibold text-slate-600 text-xs">No users or cell leaders registered yet</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Cell leaders will appear here as they register via Google or Apple sign-in.</div>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-navy-900 text-gold-400 font-bold flex items-center justify-center text-xs shadow-xs">
                          {user.full_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-navy-950">{user.full_name}</div>
                          {user.phone_number && (
                            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                              <Phone className="w-2.5 h-2.5" />
                              {user.phone_number}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {user.cell_name && cells.some(cell =>
                        cell.id === user.cell_id ||
                        cell.name.toLowerCase() === user.cell_name!.toLowerCase()
                      ) ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gold-50 border border-gold-200/80 text-gold-800 font-bold text-xs">
                          <Building className="w-3 h-3 text-gold-600" />
                          <span>{cells.find(cell => cell.id === user.cell_id || cell.name.toLowerCase() === user.cell_name!.toLowerCase())?.name}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] font-medium text-slate-400 italic">
                          {user.role === 'admin' ? 'National Administration' : 'Pending Cell Association'}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                        <span>{user.email}</span>
                        <button
                          onClick={() => handleCopy(user.email, user.id)}
                          className="text-slate-400 hover:text-navy-900 p-0.5 rounded transition-colors"
                          title="Copy email"
                        >
                          {copiedId === user.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <select
                        value={user.role}
                        onChange={e => handleRoleChange(user.id, e.target.value as UserRole)}
                        className="text-xs font-semibold rounded-lg border-0 bg-slate-100/90 text-navy-950 py-1 px-2.5 focus:ring-1 focus:ring-navy-600 cursor-pointer"
                      >
                        <option value="super_admin">Super Admin</option>
                        <option value="national_admin">National Admin</option>
                                                <option value="regional_leader">Regional Leader</option>
                        <option value="cell_leader">Cell Leader</option>
                      </select>
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap text-center">
                      {user.is_onboarded ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold text-[10px] border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Complete
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold text-[10px] border border-amber-200">
                          <AlertCircle className="w-3 h-3" /> Pending
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap text-slate-500 font-medium text-[11px] capitalize">
                      {user.auth_provider || 'Email'}
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {user.cell_id && (
                          <button
                            onClick={() => {
                              const cell = cells.find(c => c.id === user.cell_id);
                              if (cell) handleViewCellReports(cell);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-navy-900 hover:bg-slate-100 transition-colors"
                            title="View submitted reports for this cell"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleCopy(user.email, user.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-navy-900 hover:bg-slate-100 transition-colors"
                          title="Contact leader"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                        {user.id !== currentUser.id && (
                          <button
                            onClick={() => handleDeleteUser(user)}
                            disabled={deletingUserId === user.id}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-white hover:bg-rose-600 disabled:opacity-50 transition-colors"
                            title="Permanently delete account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
          </>
        )}

        {/* Cells Tab */}
        {activeTab === 'cells' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Registered Cell Fellowships</span>
                <span className="text-[11px] text-slate-400">Total {cells.length} cells active across ecclesiastical regions</span>
              </div>
              <button
                onClick={() => {
                  setModalType('cell');
                  setIsModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-navy-900 text-white text-xs font-bold shadow-card hover:bg-navy-950 transition-all self-start sm:self-auto"
              >
                + Register New Cell
              </button>
            </div>

            {/* Cell Search & Region Filter Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-3.5 h-3.5" />
                </div>
                <input
                  type="text"
                  placeholder="Search cell name, code or leader..."
                  value={cellSearchQuery}
                  onChange={e => setCellSearchQuery(e.target.value)}
                  className="w-full pl-9 text-xs rounded-xl border-0 bg-slate-50 p-2 text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-navy-600"
                />
              </div>

              <div>
                <select
                  value={cellRegionFilter}
                  onChange={e => setCellRegionFilter(e.target.value)}
                  className="w-full text-xs rounded-xl border-0 bg-slate-50 p-2 text-slate-700 focus:bg-white focus:ring-1 focus:ring-navy-600"
                >
                  <option value="all">All Ecclesiastical Regions</option>
                  {regions.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="table-scroll-container custom-scrollbar">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 font-medium text-[11px] border-b border-slate-100">
                    <th className="py-3 px-3">Cell Name</th>
                    <th className="py-3 px-3">Code</th>
                    <th className="py-3 px-3">Region</th>
                    <th className="py-3 px-3">Assigned Leader</th>
                    <th className="py-3 px-3">Schedule</th>
                    <th className="py-3 px-3">Target</th>
                    <th className="py-3 px-3 text-right">Reports</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredCells.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <Building className="w-8 h-8 mx-auto mb-2 text-slate-300 opacity-60" />
                        <div className="font-semibold text-slate-600 text-xs">No registered cells yet</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">Cell fellowships will appear here as cell leaders register upon first sign-in, or you can click "+ Register New Cell" above.</div>
                      </td>
                    </tr>
                  ) : (
                    filteredCells.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-bold text-navy-950">
                          <div>{c.name}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{c.venue_address}</div>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-400 font-semibold">{c.code}</td>
                        <td className="py-3 px-3 text-slate-600 font-medium">{c.region_name}</td>
                        <td className="py-3 px-3 text-slate-800 font-medium">
                          <div className="font-semibold text-navy-950">{c.leader_name || 'Unassigned'}</div>
                          {c.leader_phone && <div className="text-[10px] text-slate-400 font-mono">{c.leader_phone}</div>}
                        </td>
                        <td className="py-3 px-3 text-slate-500 font-medium">{c.meeting_day} @ {c.meeting_time}</td>
                        <td className="py-3 px-3 font-bold text-navy-950">{c.target_attendance} pax</td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleViewCellReports(c)}
                            className="px-2.5 py-1 rounded-lg bg-navy-50 text-navy-900 font-bold hover:bg-navy-900 hover:text-white transition-all text-[11px] border border-navy-200"
                          >
                            View Reports
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Regions Tab */}
        {activeTab === 'regions' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ecclesiastical Regions</span>
              <button
                onClick={() => {
                  setModalType('region');
                  setIsModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-navy-900 text-white text-xs font-semibold"
              >
                + Register Territory
              </button>
            </div>
            <div className="table-scroll-container custom-scrollbar">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 font-medium text-[11px] border-b border-slate-100">
                    <th className="py-3 px-3">Region Name</th>
                    <th className="py-3 px-3">Code</th>
                    <th className="py-3 px-3">Country / State</th>
                    <th className="py-3 px-3">Overseer</th>
                    <th className="py-3 px-3">Cells</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {regions.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-bold text-navy-950">{r.name}</td>
                      <td className="py-3 px-3 font-mono text-slate-400">{r.code}</td>
                      <td className="py-3 px-3 text-slate-600">{r.country} {r.state_province ? `(${r.state_province})` : ''}</td>
                      <td className="py-3 px-3 text-slate-800 font-medium">{r.leader_name}</td>
                      <td className="py-3 px-3 font-bold text-navy-950">{r.total_cells || 1} units</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Periods Tab */}
        {activeTab === 'periods' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Weekly Reporting Cycles</span>
              <button
                onClick={() => {
                  setModalType('period');
                  setIsModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-navy-900 text-white text-xs font-semibold"
              >
                + Open Reporting Cycle
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 font-medium text-[11px] border-b border-slate-100">
                    <th className="py-3 px-3">Cycle Name</th>
                    <th className="py-3 px-3">Calendar Span</th>
                    <th className="py-3 px-3">Submission Deadline</th>
                    <th className="py-3 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {periods.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-bold text-navy-950">{p.name}</td>
                      <td className="py-3 px-3 text-slate-600">{p.start_date} to {p.end_date}</td>
                      <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">{new Date(p.submission_deadline).toLocaleString()}</td>
                      <td className="py-3 px-3">
                        {p.is_open ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">Open</span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">Closed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Deactivation Requests Tab */}
        {activeTab === 'deactivations' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Stat Cards for Deactivations */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
              <StatCard
                title="Pending Review"
                value={deactivationRequests.filter(r => r.status === 'pending').length}
                subtitle="Awaiting action"
                icon={<Clock className="w-5 h-5 text-amber-500" />}
                isActive={true}
              />
              <StatCard
                title="Approved"
                value={deactivationRequests.filter(r => r.status === 'approved').length}
                subtitle="Accounts deactivated"
                icon={<UserX className="w-5 h-5 text-rose-500" />}
                isActive={false}
              />
              <StatCard
                title="Declined"
                value={deactivationRequests.filter(r => r.status === 'declined').length}
                subtitle="Requests rejected"
                icon={<XCircle className="w-5 h-5 text-slate-400" />}
                isActive={false}
              />
              <StatCard
                title="Total Submissions"
                value={deactivationRequests.length}
                subtitle="Historical audit log"
                icon={<Shield className="w-5 h-5 text-navy-600" />}
                isActive={false}
              />
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/60 text-xs text-amber-900 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">FNI Ministerial Record Preservation Policy:</span>{' '}
                Approving an account deactivation safely sets the leader's account status to inactive. All historical cell reports, weekly attendance data, offering returns, and ministry records remain permanently archived and attributed.
              </div>
            </div>

            {/* Requests List */}
            {isLoadingDeactivations ? (
              <div className="py-12 text-center text-slate-400 text-xs">Loading deactivation requests...</div>
            ) : deactivationRequests.length === 0 ? (
              <div className="py-12 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <div className="font-bold text-slate-700 text-xs">No Deactivation Requests</div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  All cell leader and field accounts are in good standing.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {deactivationRequests.map(req => {
                  const isPending = req.status === 'pending';
                  const isApproved = req.status === 'approved';
                  const isDeclined = req.status === 'declined';

                  return (
                    <div
                      key={req.id}
                      className="p-4 rounded-2xl border border-slate-200/80 bg-white hover:border-slate-300 transition-all shadow-xs space-y-3 text-xs"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-navy-900 text-gold-400 font-bold flex items-center justify-center text-xs shadow-xs">
                            {req.userName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-navy-950 text-sm flex items-center gap-2">
                              <span>{req.userName}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-600 capitalize">
                                {req.role.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Assigned Cell: <span className="font-semibold text-slate-700">{req.cellName || 'None'}</span> • Submitted: {new Date(req.createdAt).toLocaleDateString()} at {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>

                        <div>
                          {isPending && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Pending Review
                            </span>
                          )}
                          {isApproved && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                              <UserX className="w-3 h-3" /> Deactivated
                            </span>
                          )}
                          {isDeclined && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> Declined
                            </span>
                          )}
                          {req.status === 'cancelled' && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-50 text-slate-400 border border-slate-200">
                              Cancelled by User
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Reason */}
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-700">
                        <span className="font-semibold text-slate-900 block mb-0.5">Stated Reason:</span>
                        <p className="italic">{req.reason || 'No specific reason provided.'}</p>
                      </div>

                      {/* Admin Notes / Review Information */}
                      {req.adminNotes && (
                        <div className="p-2.5 rounded-xl bg-slate-100/70 text-[11px] text-slate-600">
                          <span className="font-semibold text-slate-800">Admin Note: </span>
                          <span>{req.adminNotes}</span>
                          {req.reviewedAt && (
                            <span className="text-slate-400 ml-2">({new Date(req.reviewedAt).toLocaleDateString()})</span>
                          )}
                        </div>
                      )}

                      {/* Pending Action Controls */}
                      {isPending && (
                        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                          <input
                            type="text"
                            placeholder="Optional administrator note or guidance..."
                            value={adminNotes[req.id] || ''}
                            onChange={e => setAdminNotes({ ...adminNotes, [req.id]: e.target.value })}
                            className="flex-1 text-xs rounded-xl border border-slate-200 px-3 py-1.5 focus:ring-1 focus:ring-navy-600"
                          />
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={() => handleReviewDeactivation(req.id, 'declined')}
                              disabled={reviewingRequestId === req.id}
                              className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-100 transition-colors disabled:opacity-50"
                            >
                              Decline
                            </button>
                            <button
                              onClick={() => handleReviewDeactivation(req.id, 'approved')}
                              disabled={reviewingRequestId === req.id}
                              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors disabled:opacity-50 shadow-xs"
                            >
                              {reviewingRequestId === req.id ? 'Processing...' : 'Approve Deactivation'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab !== 'deactivations' && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-4 border-t border-slate-100 text-[11px] text-slate-500">
            <span>
              {activeTab === 'users'
                ? `${filteredUsers.length} ${filteredUsers.length === 1 ? 'user' : 'users'} shown`
                : activeTab === 'cells'
                ? `${filteredCells.length} ${filteredCells.length === 1 ? 'cell' : 'cells'} shown`
                : activeTab === 'regions'
                ? `${regions.length} ${regions.length === 1 ? 'region' : 'regions'} registered`
                : `${periods.length} ${periods.length === 1 ? 'reporting cycle' : 'reporting cycles'} configured`}
            </span>
            <span>All records are displayed.</span>
          </div>
        )}
      </div>

      {/* Creation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalType === 'user' ? 'Add New Field Leader' : modalType === 'cell' ? 'Register Cell Fellowship' : modalType === 'region' ? 'Register Territory' : 'Open Reporting Cycle'}
      >
        {modalType === 'user' && (
          <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Pastor David Adeleke"
                value={newUser.full_name}
                onChange={e => setNewUser({ ...newUser, full_name: e.target.value })}
                className="w-full rounded-xl border border-slate-200 p-2.5 focus:ring-1 focus:ring-navy-600"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Official Email</label>
              <input
                type="email"
                required
                placeholder="leader@forerunners.org"
                value={newUser.email}
                onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                className="w-full rounded-xl border border-slate-200 p-2.5 focus:ring-1 focus:ring-navy-600"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                placeholder="+234 800 000 0000"
                value={newUser.phone_number}
                onChange={e => setNewUser({ ...newUser, phone_number: e.target.value })}
                className="w-full rounded-xl border border-slate-200 p-2.5 focus:ring-1 focus:ring-navy-600"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Assigned Role</label>
              <select
                value={newUser.role}
                onChange={e => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                className="w-full rounded-xl border border-slate-200 p-2.5 focus:ring-1 focus:ring-navy-600"
              >
                <option value="regional_leader">Regional Leader</option>
                <option value="cell_leader">Cell Leader</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-navy-900 text-white font-semibold"
              >
                Create Account
              </button>
            </div>
          </form>
        )}

        {modalType === 'cell' && (
          <form onSubmit={handleCreateCell} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Cell Fellowship Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Victorious Light Cell Yaba"
                value={newCell.name}
                onChange={e => setNewCell({ ...newCell, name: e.target.value })}
                className="w-full rounded-xl border border-slate-200 p-2.5"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Parent Region</label>
              <select
                value={newCell.region_id}
                onChange={e => setNewCell({ ...newCell, region_id: e.target.value })}
                className="w-full rounded-xl border border-slate-200 p-2.5"
              >
                {regions.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assigned Leader</label>
                <input
                  type="text"
                  placeholder="Leader name"
                  value={newCell.leader_name}
                  onChange={e => setNewCell({ ...newCell, leader_name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Leader Phone</label>
                <input
                  type="text"
                  placeholder="+234 800 000 0000"
                  value={newCell.leader_phone}
                  onChange={e => setNewCell({ ...newCell, leader_phone: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Meeting Schedule</label>
                <select
                  value={newCell.meeting_day}
                  onChange={e => setNewCell({ ...newCell, meeting_day: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                >
                  <option>Wednesday</option>
                  <option>Thursday</option>
                  <option>Friday</option>
                  <option>Saturday</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Attendance</label>
                <input
                  type="number"
                  value={newCell.target_attendance}
                  onChange={e => setNewCell({ ...newCell, target_attendance: e.target.value === '' ? ('' as any) : Math.max(1, parseInt(e.target.value) || 1) })}
                  onBlur={() => { if (!newCell.target_attendance) setNewCell({ ...newCell, target_attendance: 20 }); }}
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Venue Address</label>
              <input
                type="text"
                placeholder="Physical location or online meeting link"
                value={newCell.venue_address}
                onChange={e => setNewCell({ ...newCell, venue_address: e.target.value })}
                className="w-full rounded-xl border border-slate-200 p-2.5"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-navy-900 text-white font-semibold"
              >
                Register Cell
              </button>
            </div>
          </form>
        )}

        {modalType === 'region' && (
          <form onSubmit={handleCreateRegion} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Region Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Ibadan Metro Region"
                value={newRegion.name}
                onChange={e => setNewRegion({ ...newRegion, name: e.target.value })}
                className="w-full rounded-xl border border-slate-200 p-2.5"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Code</label>
                <input
                  type="text"
                  placeholder="FNI-REG-IBD"
                  value={newRegion.code}
                  onChange={e => setNewRegion({ ...newRegion, code: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Country</label>
                <input
                  type="text"
                  value={newRegion.country}
                  onChange={e => setNewRegion({ ...newRegion, country: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Regional Overseer</label>
              <input
                type="text"
                placeholder="Overseer full name"
                value={newRegion.leader_name}
                onChange={e => setNewRegion({ ...newRegion, leader_name: e.target.value })}
                className="w-full rounded-xl border border-slate-200 p-2.5"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-navy-900 text-white font-semibold"
              >
                Register Region
              </button>
            </div>
          </form>
        )}

        {modalType === 'period' && (
          <form onSubmit={handleCreatePeriod} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Cycle Name</label>
              <input
                type="text"
                required
                value={newPeriod.name}
                onChange={e => setNewPeriod({ ...newPeriod, name: e.target.value })}
                className="w-full rounded-xl border border-slate-200 p-2.5"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={newPeriod.start_date}
                  onChange={e => setNewPeriod({ ...newPeriod, start_date: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={newPeriod.end_date}
                  onChange={e => setNewPeriod({ ...newPeriod, end_date: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 p-2.5"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-navy-900 text-white font-semibold"
              >
                Open Reporting Cycle
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Cell Reports Inspection Modal */}
      {selectedCellForReports && (
        <Modal
          isOpen={Boolean(selectedCellForReports)}
          onClose={() => setSelectedCellForReports(null)}
          title={`Reports for ${selectedCellForReports.name}`}
          size="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-bold text-navy-950 text-sm">{selectedCellForReports.name}</span>
                <div className="text-[11px] text-slate-500">
                  Region: {selectedCellForReports.region_name} • Leader: {selectedCellForReports.leader_name} ({selectedCellForReports.leader_phone || 'No phone'})
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-navy-900 text-gold-400 font-bold text-xs font-mono">
                {selectedCellForReports.code}
              </span>
            </div>

            {isLoadingCellReports ? (
              <div className="py-8 text-center text-slate-400">Loading cell returns...</div>
            ) : cellReports.length === 0 ? (
              <div className="py-8 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
                <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <div className="font-bold text-slate-700">No Weekly Reports Found</div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  This cell has not yet submitted any returns in the current database.
                </p>
              </div>
            ) : (
              <div className="table-scroll-container custom-scrollbar">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-semibold text-[11px]">
                      <th className="py-2.5 px-3">Period</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-center">Attendance</th>
                      <th className="py-2.5 px-3 text-center">Visitors</th>
                      <th className="py-2.5 px-3 text-center">Souls</th>
                      <th className="py-2.5 px-3">Topic</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cellReports.map(rep => (
                      <tr key={rep.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-3 font-bold text-navy-950">{rep.period_name || 'Week 45'}</td>
                        <td className="py-2.5 px-3">
                          <Badge status={rep.status} size="sm" />
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-navy-950">{rep.total_attendance}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-700">{rep.visitors_count}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-gold-600">+{rep.souls_won}</td>
                        <td className="py-2.5 px-3 text-slate-600 truncate max-w-[150px]">{rep.meeting_topic || 'Weekly Fellowship'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
