import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FollowUpService } from '../../services/followUpService';
import { EvangelismContact, FollowUpStatus } from '../../types';
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
  MessageSquare,
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
  const [summary, setSummary] = useState({
    totalContacts: 0,
    requiringFollowUp: 0,
    completed: 0,
    outstanding: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<EvangelismContact | null>(null);

  // Form state
  const [formData, setFormData] = useState<{
    name: string;
    phone: string;
    email: string;
    location: string;
    cellName: string;
    followUpStatus: FollowUpStatus;
    notes: string;
    nextFollowUpDate: string;
  }>({
    name: '',
    phone: '',
    email: '',
    location: '',
    cellName: currentUser.cell_name || '',
    followUpStatus: 'New Contact',
    notes: '',
    nextFollowUpDate: '',
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const cellFilter = isAdmin ? undefined : currentUser.cell_id;
      const [contactsList, sum] = await Promise.all([
        FollowUpService.getContacts(cellFilter),
        FollowUpService.getSummary(cellFilter),
      ]);
      setContacts(contactsList);
      setSummary(sum);
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
      location: '',
      cellName: currentUser.cell_name || '',
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
      cellName: contact.cellName || '',
      followUpStatus: contact.followUpStatus,
      notes: contact.notes || contact.followUpNotes || '',
      nextFollowUpDate: contact.nextFollowUpDate || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingContact) {
      await FollowUpService.updateContact(editingContact.id, {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        location: formData.location,
        followUpStatus: formData.followUpStatus,
        notes: formData.notes,
        nextFollowUpDate: formData.nextFollowUpDate || undefined,
        lastFollowUpDate: new Date().toISOString().split('T')[0],
      });
    } else {
      await FollowUpService.addContact({
        cellId: currentUser.cell_id || 'unassigned',
        cellName: formData.cellName || currentUser.cell_name || 'Central Cell',
        tutorName: currentUser.full_name || 'Tutor',
        name: formData.name,
        phone: formData.phone,
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

  const getStatusBadge = (status: FollowUpStatus) => {
    switch (status) {
      case 'Joined Ministry':
      case 'Completed':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Interested':
      case 'Contacted':
        return 'bg-sky-50 text-sky-800 border-sky-200';
      case 'Follow-up Pending':
      case 'New Contact':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Unreachable':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
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

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-navy-950">
            Evangelism Contacts & Follow-Up
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAdmin
              ? 'Organisation-wide pastoral follow-up tracking and soul preservation'
              : `Discipleship and contact pipeline for ${currentUser.cell_name || 'your cell'}`}
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-navy-900 text-white hover:bg-navy-950 transition-all text-xs font-bold shadow-card self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-gold-400" />
          <span>Add New Contact</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Contacts
            </span>
            <div className="w-8 h-8 rounded-xl bg-navy-50 flex items-center justify-center text-navy-900">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-navy-950">{summary.totalContacts}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Logged across outreaches</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Requiring Follow-up
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-amber-600">{summary.requiringFollowUp}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Active pastoral attention</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Completed / Joined
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-600">{summary.completed}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Integrated into ministry</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Outstanding / New
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-rose-600">{summary.outstanding}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Uncontacted initial leads</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-card flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search contact, phone, location..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full text-xs font-medium rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-navy-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-navy-600"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 custom-scrollbar">
          <button
            onClick={() => setSelectedStatus('All')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              selectedStatus === 'All'
                ? 'bg-navy-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            All ({contacts.length})
          </button>
          {STATUS_LIST.map(st => {
            const count = contacts.filter(c => c.followUpStatus === st).length;
            return (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  selectedStatus === st
                    ? 'bg-navy-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                {st} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Contacts Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-card overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400 font-medium">
            Loading contact records...
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-navy-950">No Contacts Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {contacts.length === 0
                ? 'No souls or outreach contacts recorded yet. Add contacts here or during evangelism report submission.'
                : 'No contacts match your current search and filter criteria.'}
            </p>
            {contacts.length === 0 && (
              <button
                onClick={handleOpenAdd}
                className="mt-4 px-4 py-2 rounded-xl bg-gold-500 text-navy-950 font-bold text-xs hover:bg-gold-400 transition-colors"
              >
                + Add First Contact
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Contact Name</th>
                  <th className="px-6 py-3.5">Details</th>
                  <th className="px-6 py-3.5">Assigned Cell / Tutor</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Follow-Up Schedule</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredContacts.map(c => {
                  const displayName = c.name || c.contactName || 'Outreach Contact';
                  const displayLoc = c.location || c.evangelismLocation;
                  const displayPhone = c.phone || c.contactDetails;
                  const displayTutor = c.tutorName || c.assignedToName || 'Tutor';

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 font-bold text-navy-950">
                        <div>{displayName}</div>
                        {displayLoc && (
                          <div className="text-[11px] font-normal text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{displayLoc}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        <div className="space-y-0.5">
                          {displayPhone && (
                            <div className="flex items-center gap-1.5 text-slate-700">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{displayPhone}</span>
                            </div>
                          )}
                          {c.email && (
                            <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span>{c.email}</span>
                            </div>
                          )}
                          {!displayPhone && !c.email && (
                            <span className="text-slate-400 italic">No contact details</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-navy-950">{c.cellName || 'Central'}</div>
                        <div className="text-[11px] text-slate-400">{displayTutor}</div>
                      </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusBadge(
                          c.followUpStatus
                        )}`}
                      >
                        {c.followUpStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <div className="space-y-0.5">
                        {c.nextFollowUpDate && (
                          <div className="flex items-center gap-1.5 text-navy-900 font-semibold">
                            <Calendar className="w-3 h-3 text-gold-500" />
                            <span>Next: {c.nextFollowUpDate}</span>
                          </div>
                        )}
                        {c.lastFollowUpDate && (
                          <div className="text-[11px] text-slate-400">
                            Last: {c.lastFollowUpDate}
                          </div>
                        )}
                        {!c.nextFollowUpDate && !c.lastFollowUpDate && (
                          <span className="text-slate-400 italic">No scheduled follow-up</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleOpenEdit(c)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-navy-900 hover:text-white text-navy-950 transition-all font-bold text-xs"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Update</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Contact Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-navy-950">
                  {editingContact ? 'Update Contact & Follow-Up Status' : 'Add New Outreach Contact'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {editingContact
                    ? 'Log discipleship interactions and progress notes'
                    : 'Register an individual encountered during outreach'}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-200/70 text-slate-600 flex items-center justify-center hover:bg-slate-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-navy-950 mb-1">
                  Full Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Samuel Mensah"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-200 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-navy-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-navy-950 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. +233 24 000 0000"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-200 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-navy-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-navy-950 mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    placeholder="e.g. samuel@example.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-200 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-navy-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-navy-950 mb-1">Location / Campus</label>
                  <input
                    type="text"
                    placeholder="e.g. Legon Hall / East Legon"
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-200 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-navy-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-navy-950 mb-1">Follow-Up Status</label>
                  <select
                    value={formData.followUpStatus}
                    onChange={e =>
                      setFormData({ ...formData, followUpStatus: e.target.value as FollowUpStatus })
                    }
                    className="w-full text-xs rounded-xl border border-slate-200 px-3.5 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-navy-600"
                  >
                    {STATUS_LIST.map(st => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-navy-950 mb-1">Next Follow-Up Date</label>
                <input
                  type="date"
                  value={formData.nextFollowUpDate}
                  onChange={e => setFormData({ ...formData, nextFollowUpDate: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-200 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-navy-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-navy-950 mb-1">
                  Follow-Up Notes & Discipleship History
                </label>
                <textarea
                  rows={3}
                  placeholder="Record conversation outcome, spiritual commitments, questions raised, prayer needs..."
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-200 p-3.5 focus:outline-none focus:ring-2 focus:ring-navy-600 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-navy-900 text-white text-xs font-bold hover:bg-navy-950 transition-colors shadow-sm"
                >
                  {editingContact ? 'Save Updates' : 'Add Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
