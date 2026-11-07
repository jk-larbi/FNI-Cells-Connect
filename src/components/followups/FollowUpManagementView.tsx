import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FollowUpService } from '../../services/followUpService';
import { CellService } from '../../services/cellService';
import { EvangelismContact, FollowUpStatus, Cell } from '../../types';
import {
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Edit2,
  X,
  Filter,
} from 'lucide-react';

const STATUS_LIST: FollowUpStatus[] = [
  'New Contact',
  'Follow-up Pending',
  'Contacted',
  'Interested',
  'Joined Ministry',
  'Completed',
  'Unreachable',
];

export const FollowUpManagementView: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();
  const [contacts, setContacts] = useState<EvangelismContact[]>([]);
  const [cells, setCells] = useState<Cell[]>([]);
  const [summary, setSummary] = useState({
    totalContacts: 0,
    requiringFollowUp: 0,
    completed: 0,
    outstanding: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedCellFilter, setSelectedCellFilter] = useState<string>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<EvangelismContact | null>(null);

  // Form state
  const [formData, setFormData] = useState<{
    name: string;
    phone: string;
    email: string;
    location: string;
    cellId: string;
    cellName: string;
    followUpStatus: FollowUpStatus;
    notes: string;
    nextFollowUpDate: string;
  }>({
    name: '',
    phone: '',
    email: '',
    location: '',
    cellId: currentUser.cell_id || '',
    cellName: currentUser.cell_name || '',
    followUpStatus: 'New Contact',
    notes: '',
    nextFollowUpDate: '',
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const cellFilter = isAdmin ? undefined : currentUser.cell_id;
      const [contactsList, sum, cellList] = await Promise.all([
        FollowUpService.getContacts(cellFilter),
        FollowUpService.getSummary(cellFilter),
        CellService.getCells(),
      ]);
      setContacts(contactsList);
      setSummary(sum);
      setCells(cellList);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser, isAdmin]);

  const handleOpenAdd = () => {
    setEditingContact(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      location: currentUser.cell_name ? `${currentUser.cell_name} Territory` : '',
      cellId: currentUser.cell_id || (cells[0]?.id || ''),
      cellName: currentUser.cell_name || (cells[0]?.name || 'Central Cell'),
      followUpStatus: 'New Contact',
      notes: '',
      nextFollowUpDate: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (contact: EvangelismContact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name || contact.contactName || '',
      phone: contact.phone || contact.contactDetails || '',
      email: contact.email || '',
      location: contact.location || contact.evangelismLocation || '',
      cellId: contact.cellId || currentUser.cell_id || '',
      cellName: contact.cellName || '',
      followUpStatus: contact.followUpStatus,
      notes: contact.notes || contact.followUpNotes || '',
      nextFollowUpDate: contact.nextFollowUpDate || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) return;

    if (editingContact) {
      await FollowUpService.updateContact(editingContact.id, {
        name: formData.name,
        contactName: formData.name,
        phone: formData.phone,
        contactDetails: formData.phone,
        email: formData.email,
        location: formData.location,
        followUpStatus: formData.followUpStatus,
        notes: formData.notes,
        nextFollowUpDate: formData.nextFollowUpDate || undefined,
        lastFollowUpDate: new Date().toISOString().split('T')[0],
      });
    } else {
      const targetCell = cells.find(c => c.id === formData.cellId);
      await FollowUpService.addContact({
        cellId: formData.cellId || currentUser.cell_id || 'unassigned',
        cellName: targetCell ? targetCell.name : (formData.cellName || currentUser.cell_name || 'Central Cell'),
        tutorName: currentUser.full_name || 'Tutor',
        tutorUid: currentUser.id,
        name: formData.name,
        contactName: formData.name,
        phone: formData.phone,
        contactDetails: formData.phone,
        email: formData.email,
        location: formData.location,
        dateCaptured: new Date().toISOString().split('T')[0],
        followUpStatus: formData.followUpStatus,
        notes: formData.notes,
        nextFollowUpDate: formData.nextFollowUpDate || undefined,
      });
    }

    setIsModalOpen(false);
    loadData();
  };

  const filteredContacts = contacts.filter(contact => {
    const contactName = (contact.name || contact.contactName || '').toLowerCase();
    const contactLoc = (contact.location || contact.evangelismLocation || '').toLowerCase();
    const contactPhone = contact.phone || contact.contactDetails || '';
    const contactCell = (contact.cellName || '').toLowerCase();
    const q = searchQuery.toLowerCase();

    const matchesSearch =
      contactName.includes(q) ||
      contactPhone.includes(q) ||
      contactLoc.includes(q) ||
      contactCell.includes(q);

    const matchesStatus =
      selectedStatus === 'All' || contact.followUpStatus === selectedStatus;

    const matchesCell =
      selectedCellFilter === 'All' || contact.cellId === selectedCellFilter;

    return matchesSearch && matchesStatus && matchesCell;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-[#142B4A] tracking-tight">
            Follow-Up Pipeline & Discipleship
          </h1>
          <p className="text-xs text-[#667085] mt-0.5">
            {isAdmin
              ? 'Organisation-wide follow-up tracking, soul retention, and discipleship across all cells'
              : `Discipleship pipeline and personal contacts for ${currentUser.cell_name || 'your cell'}`}
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-3.5 py-2 rounded-xl bg-[#142B4A] text-white text-xs font-bold hover:bg-[#203D63] transition-colors shadow-sm flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4 text-[#C6A45A]" />
          <span>Add New Contact</span>
        </button>
      </div>

      {/* KPI Highlight Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm">
          <div className="text-[11px] font-semibold text-[#667085]">Total Contacts</div>
          <div className="text-2xl font-black text-[#182230] mt-1">{summary.totalContacts}</div>
          <div className="text-[10px] text-[#667085] mt-0.5">Under Pastoral Care</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm">
          <div className="text-[11px] font-semibold text-[#667085]">Requiring Follow-up</div>
          <div className="text-2xl font-black text-[#D99A32] mt-1">{summary.requiringFollowUp}</div>
          <div className="text-[10px] text-[#D99A32] mt-0.5">Active Discipleship</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm">
          <div className="text-[11px] font-semibold text-[#667085]">Completed / Joined</div>
          <div className="text-2xl font-black text-[#23845B] mt-1">{summary.completed}</div>
          <div className="text-[10px] text-[#23845B] mt-0.5">Established in Church</div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-sm">
          <div className="text-[11px] font-semibold text-[#667085]">Uncontacted Leads</div>
          <div className="text-2xl font-black text-[#C74646] mt-1">{summary.outstanding}</div>
          <div className="text-[10px] text-[#C74646] mt-0.5">Requires Immediate Call</div>
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
            placeholder="Search contact name, phone, cell..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-[#E3E8EF] focus:outline-none focus:ring-2 focus:ring-[#142B4A]/20 focus:border-[#142B4A] text-[#182230]"
          />
        </div>

        {isAdmin && cells.length > 0 && (
          <select
            value={selectedCellFilter}
            onChange={e => setSelectedCellFilter(e.target.value)}
            className="p-2 text-xs rounded-xl border border-[#E3E8EF] bg-white text-[#182230]"
          >
            <option value="All">All Cells</option>
            {cells.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}

        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
          {['All', ...STATUS_LIST].map(st => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedStatus === st
                  ? 'bg-[#142B4A] text-white shadow-2xs'
                  : 'bg-[#F5F7FA] text-[#667085] hover:text-[#182230]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Contacts Table (Reference Image Styled!) */}
      <div className="bg-white rounded-2xl border border-[#E3E8EF] shadow-sm overflow-hidden">
        <div className="py-4 px-6 border-b border-[#E3E8EF] flex items-center justify-between">
          <h2 className="text-base font-bold text-[#182230]">
            Outreach Contacts ({filteredContacts.length})
          </h2>
          <span className="text-xs text-[#667085]">
            Rows highlighted in red denote overdue follow-up dates
          </span>
        </div>

        <div className="table-scroll-container">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E3E8EF] text-[11px] font-semibold uppercase tracking-wider text-[#667085] bg-[#F5F7FA]">
                <th className="py-3 px-5 w-12 text-center">
                  <div className="w-4 h-4 rounded-full border border-[#CBD5E1] mx-auto" />
                </th>
                <th className="py-3 px-4">CONTACT NAME</th>
                <th className="py-3 px-4">PHONE & EMAIL</th>
                <th className="py-3 px-4">ASSIGNED CELL</th>
                <th className="py-3 px-4">FOLLOW-UP STATUS</th>
                <th className="py-3 px-4">NEXT SCHEDULE</th>
                <th className="py-3 px-5 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E8EF]">
              {filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#667085]">
                    <Users className="w-8 h-8 text-[#CBD5E1] mx-auto mb-2" />
                    <p className="text-xs font-semibold">No contacts found in this filter.</p>
                  </td>
                </tr>
              ) : (
                filteredContacts.map(c => {
                  const displayName = c.name || c.contactName || 'New Contact';
                  const isOverdue =
                    c.nextFollowUpDate &&
                    new Date(c.nextFollowUpDate).getTime() < Date.now() &&
                    c.followUpStatus !== 'Joined Ministry' &&
                    c.followUpStatus !== 'Completed';

                  return (
                    <tr
                      key={c.id}
                      onClick={() => handleOpenEdit(c)}
                      className={`cursor-pointer transition-colors ${
                        isOverdue
                          ? 'bg-[#FFF5F5] border-l-4 border-[#C74646]' // Exact reference image highlight row!
                          : 'hover:bg-[#F5F7FA]'
                      }`}
                    >
                      <td className="py-4 px-5 text-center">
                        <div className="w-4 h-4 rounded-full border border-[#CBD5E1] mx-auto" />
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#142B4A] text-[#C6A45A] font-bold text-xs flex items-center justify-center shrink-0">
                            {displayName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-[#182230] leading-tight">
                              {displayName}
                            </div>
                            <div className="text-[11px] text-[#667085] mt-0.5">
                              {c.location || 'Fellowship territory'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="font-semibold text-[#182230]">
                          {c.phone || c.contactDetails || 'No phone'}
                        </div>
                        {c.email && (
                          <div className="text-[11px] text-[#667085]">{c.email}</div>
                        )}
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="font-bold text-[#182230]">
                          {c.cellName || 'Central'}
                        </div>
                        <div className="text-[11px] text-[#667085]">
                          Leader: {c.tutorName || 'Tutor'}
                        </div>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        {c.followUpStatus === 'Joined Ministry' && (
                          <span className="inline-flex items-center gap-1.5 font-medium text-[#23845B]">
                            <span className="w-2 h-2 rounded-full bg-[#23845B]" />
                            Joined Ministry
                          </span>
                        )}
                        {c.followUpStatus === 'Completed' && (
                          <span className="inline-flex items-center gap-1.5 font-medium text-[#23845B]">
                            <span className="w-2 h-2 rounded-full bg-[#23845B]" />
                            Completed
                          </span>
                        )}
                        {(c.followUpStatus === 'New Contact' || c.followUpStatus === 'Follow-up Pending') && (
                          <span className="inline-flex items-center gap-1.5 font-medium text-[#D99A32]">
                            <span className="w-2 h-2 rounded-full bg-[#D99A32]" />
                            {c.followUpStatus}
                          </span>
                        )}
                        {(c.followUpStatus === 'Contacted' || c.followUpStatus === 'Interested') && (
                          <span className="inline-flex items-center gap-1.5 font-medium text-[#142B4A]">
                            <span className="w-2 h-2 rounded-full bg-[#142B4A]" />
                            {c.followUpStatus}
                          </span>
                        )}
                        {c.followUpStatus === 'Unreachable' && (
                          <span className="inline-flex items-center gap-1.5 font-medium text-[#C74646]">
                            <span className="w-2 h-2 rounded-full bg-[#C74646]" />
                            Unreachable
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        {isOverdue ? (
                          <span className="inline-flex items-center gap-1.5 font-medium text-[#C74646]">
                            <span className="w-2 h-2 rounded-full bg-[#C74646]" />
                            Overdue ({c.nextFollowUpDate})
                          </span>
                        ) : c.nextFollowUpDate ? (
                          <span className="text-[#182230] font-medium">
                            {c.nextFollowUpDate}
                          </span>
                        ) : (
                          <span className="text-[#667085] italic">Not scheduled</span>
                        )}
                      </td>

                      <td className="py-4 px-5 whitespace-nowrap text-right">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleOpenEdit(c);
                          }}
                          className="w-8 h-8 rounded-full bg-sky-50 text-sky-600 hover:bg-sky-100 inline-flex items-center justify-center transition-colors shadow-2xs"
                          title="Update Follow-up"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
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

      {/* ADD / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#142B4A]/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-[#E3E8EF] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3E8EF]">
              <h3 className="text-base font-bold text-[#142B4A]">
                {editingContact ? 'Update Contact & Follow-up' : 'Add Outreach Contact'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-xs text-[#667085] hover:text-[#182230]"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#182230] mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g. John K. Addo"
                  className="w-full p-2.5 rounded-xl border border-[#E3E8EF] focus:ring-2 focus:ring-[#142B4A]/20 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#182230] mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    required
                    placeholder="+233 24 123 4567"
                    className="w-full p-2.5 rounded-xl border border-[#E3E8EF] focus:ring-2 focus:ring-[#142B4A]/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#182230] mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@example.com"
                    className="w-full p-2.5 rounded-xl border border-[#E3E8EF] focus:ring-2 focus:ring-[#142B4A]/20 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#182230] mb-1">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Campus or Hostel"
                    className="w-full p-2.5 rounded-xl border border-[#E3E8EF] focus:ring-2 focus:ring-[#142B4A]/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#182230] mb-1">Assigned Cell</label>
                  <select
                    value={formData.cellId}
                    onChange={e => {
                      const c = cells.find(item => item.id === e.target.value);
                      setFormData({ ...formData, cellId: e.target.value, cellName: c ? c.name : '' });
                    }}
                    className="w-full p-2.5 rounded-xl border border-[#E3E8EF] bg-white text-[#182230]"
                  >
                    {cells.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#182230] mb-1">Follow-Up Status</label>
                  <select
                    value={formData.followUpStatus}
                    onChange={e => setFormData({ ...formData, followUpStatus: e.target.value as FollowUpStatus })}
                    className="w-full p-2.5 rounded-xl border border-[#E3E8EF] bg-white text-[#182230]"
                  >
                    {STATUS_LIST.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#182230] mb-1">Next Follow-Up Date</label>
                  <input
                    type="date"
                    value={formData.nextFollowUpDate}
                    onChange={e => setFormData({ ...formData, nextFollowUpDate: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E3E8EF] focus:ring-2 focus:ring-[#142B4A]/20 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#182230] mb-1">Pastoral Notes & History</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Record spiritual needs, discussions, prayer requests..."
                  className="w-full p-2.5 rounded-xl border border-[#E3E8EF] focus:ring-2 focus:ring-[#142B4A]/20 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-[#667085] hover:bg-[#F5F7FA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#142B4A] text-white font-bold hover:bg-[#203D63]"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
