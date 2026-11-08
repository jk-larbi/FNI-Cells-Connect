import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FollowUpService } from '../../services/followUpService';
import { EvangelismContact, FollowUpStatus } from '../../types';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Edit2,
  X,
  Save,
  MessageSquare,
  ArrowLeft,
} from 'lucide-react';

const STATUS_LIST: FollowUpStatus[] = [
  'Not contacted',
  'Follow-up required',
  'Contacted',
  'Interested',
  'Joined a cell',
  'Completed',
  'Unreachable',
];

interface EvangelismContactsViewProps {
  onBack?: () => void;
}

export const EvangelismContactsView: React.FC<EvangelismContactsViewProps> = ({ onBack }) => {
  const { currentUser } = useAuth();
  const [contacts, setContacts] = useState<EvangelismContact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(true);

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Partial<EvangelismContact>>({});
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const list = await FollowUpService.getContacts(currentUser.cell_id || undefined);
      setContacts(list);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const handleOpenAdd = () => {
    setDuplicateWarning(null);
    setEditingContact({
      name: '',
      phone: '',
      whatsappNumber: '',
      email: '',
      location: currentUser.cell_name ? `${currentUser.cell_name} Territory` : '',
      cellName: currentUser.cell_name || 'Fellowship Cell',
      cellId: currentUser.cell_id || '',
      tutorUid: currentUser.id,
      tutorName: currentUser.full_name,
      followUpStatus: 'Not contacted',
      notes: '',
      dateCaptured: new Date().toISOString().split('T')[0],
      nextFollowUpDate: '',
    });
    setIsModalOpen(true);
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContact.name || !editingContact.phone) {
      alert('Please provide contact name and phone number.');
      return;
    }

    if (!editingContact.id && editingContact.phone) {
      const dup = await FollowUpService.findDuplicateContact(
        editingContact.phone,
        editingContact.whatsappNumber
      );
      if (dup && !duplicateWarning) {
        setDuplicateWarning(
          `Notice: An existing contact "${dup.name || dup.contactName}" is already recorded with this phone or WhatsApp. Click Save again to confirm.`
        );
        return;
      }
    }

    setIsSaving(true);
    try {
      const effectiveWA = editingContact.whatsappNumber?.trim() || editingContact.phone?.trim();
      if (editingContact.id) {
        await FollowUpService.updateContact(
          editingContact.id, 
          { ...editingContact, whatsappNumber: effectiveWA },
          currentUser.full_name
        );
      } else {
        await FollowUpService.addContact({
          contactName: editingContact.name,
          name: editingContact.name,
          phone: editingContact.phone,
          contactDetails: editingContact.phone,
          whatsappNumber: effectiveWA,
          email: editingContact.email || '',
          dateCaptured: editingContact.dateCaptured || new Date().toISOString().split('T')[0],
          location: editingContact.location || '',
          cellId: currentUser.cell_id || 'cell-general',
          cellName: currentUser.cell_name || 'General Cell',
          tutorUid: currentUser.id,
          tutorName: currentUser.full_name,
          followUpStatus: editingContact.followUpStatus || 'Not contacted',
          notes: editingContact.notes || '',
          nextFollowUpDate: editingContact.nextFollowUpDate || '',
        });
      }
      setIsModalOpen(false);
      setDuplicateWarning(null);
      setEditingContact({});
      await loadData();
    } finally {
      setIsSaving(false);
    }
  };

  const filtered = contacts.filter(c => {
    const q = searchQuery.toLowerCase();
    const contactName = c.name || c.contactName || '';
    const matchesSearch =
      !q ||
      contactName.toLowerCase().includes(q) ||
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      (c.location && c.location.toLowerCase().includes(q));

    const matchesStatus = statusFilter === 'All' || c.followUpStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
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
            Evangelism Outreach Contacts
          </h1>
          <p className="text-xs text-[#667085] mt-0.5">
            Personal contacts captured during evangelism outreaches for discipleship and follow-up.
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

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-[#E3E8EF] shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-[#667085] absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search contact by name, phone, campus..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-[#E3E8EF] focus:outline-none focus:ring-2 focus:ring-[#142B4A]/20 focus:border-[#142B4A] text-[#182230]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
          {['All', ...STATUS_LIST].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === st
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
            Captured Contacts ({filtered.length})
          </h2>
          <span className="text-xs text-[#667085]">
            Protected contact information with cell-level privacy
          </span>
        </div>

        <div className="table-scroll-container">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E3E8EF] text-[11px] font-semibold uppercase tracking-wider text-[#667085] bg-[#F5F7FA]">
                <th className="py-3 px-5 w-12 text-center">
                  <div className="w-4 h-4 rounded-full border border-[#CBD5E1] mx-auto" />
                </th>
                <th className="py-3 px-4">CONTACT NAME & DETAILS</th>
                <th className="py-3 px-4">OUTREACH LOCATION</th>
                <th className="py-3 px-4">CAPTURED ON</th>
                <th className="py-3 px-4">FOLLOW-UP STATUS</th>
                <th className="py-3 px-4">NEXT FOLLOW-UP</th>
                <th className="py-3 px-5 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E8EF]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#667085]">
                    <Users className="w-8 h-8 text-[#CBD5E1] mx-auto mb-2" />
                    <p className="text-xs font-semibold">No contacts registered yet.</p>
                    <p className="text-[11px] text-[#667085] mt-0.5">
                      Contacts saved during evangelism or added manually will appear in this pipeline.
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map(contact => {
                  const name = contact.name || contact.contactName || 'New Contact';
                  const isOverdue =
                    contact.nextFollowUpDate &&
                    new Date(contact.nextFollowUpDate).getTime() < Date.now() &&
                    contact.followUpStatus !== 'Joined Ministry' &&
                    contact.followUpStatus !== 'Completed';

                  return (
                    <tr
                      key={contact.id}
                      onClick={() => {
                        setEditingContact(contact);
                        setIsModalOpen(true);
                      }}
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
                            {name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-[#182230] leading-tight">{name}</div>
                            <div className="text-[11px] text-[#667085] mt-0.5 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              <span>{contact.phone || contact.contactDetails || 'No phone'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap text-[#182230]">
                        <div className="flex items-center gap-1 font-medium">
                          <MapPin className="w-3 h-3 text-[#667085]" />
                          <span>{contact.location || contact.evangelismLocation || 'Territory'}</span>
                        </div>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap text-[#667085]">
                        {contact.dateCaptured}
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        {contact.followUpStatus === 'Joined a cell' && (
                          <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            Joined a cell
                          </span>
                        )}
                        {contact.followUpStatus === 'Completed' && (
                          <span className="inline-flex items-center gap-1.5 font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-700" />
                            Completed
                          </span>
                        )}
                        {contact.followUpStatus === 'Not contacted' && (
                          <span className="inline-flex items-center gap-1.5 font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                            Not contacted
                          </span>
                        )}
                        {contact.followUpStatus === 'Follow-up required' && (
                          <span className="inline-flex items-center gap-1.5 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                            Follow-up required
                          </span>
                        )}
                        {contact.followUpStatus === 'Contacted' && (
                          <span className="inline-flex items-center gap-1.5 font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-600" />
                            Contacted
                          </span>
                        )}
                        {contact.followUpStatus === 'Interested' && (
                          <span className="inline-flex items-center gap-1.5 font-bold text-navy-800 bg-navy-100 px-2 py-0.5 rounded-full text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-navy-700" />
                            Interested
                          </span>
                        )}
                        {contact.followUpStatus === 'Unreachable' && (
                          <span className="inline-flex items-center gap-1.5 font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                            Unreachable
                          </span>
                        )}
                        {contact.followUpStatus === 'New Contact' && (
                          <span className="inline-flex items-center gap-1.5 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                            New Contact
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        {isOverdue ? (
                          <span className="inline-flex items-center gap-1.5 font-medium text-[#C74646]">
                            <span className="w-2 h-2 rounded-full bg-[#C74646]" />
                            Overdue ({contact.nextFollowUpDate})
                          </span>
                        ) : contact.nextFollowUpDate ? (
                          <span className="text-[#182230] font-medium">
                            {contact.nextFollowUpDate}
                          </span>
                        ) : (
                          <span className="text-[#667085] italic">Not scheduled</span>
                        )}
                      </td>

                      <td className="py-4 px-5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                          {(contact.whatsappNumber || contact.phone) && (
                            <a
                              href={`https://wa.me/${(contact.whatsappNumber || contact.phone || '').replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              title="Chat on WhatsApp"
                              className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 inline-flex items-center justify-center transition-colors border border-emerald-200"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {contact.phone && (
                            <a
                              href={`tel:${contact.phone}`}
                              title="Call"
                              className="w-7 h-7 rounded-lg bg-navy-50 text-navy-800 hover:bg-navy-100 inline-flex items-center justify-center transition-colors border border-navy-200"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setEditingContact(contact);
                              setIsModalOpen(true);
                            }}
                            className="w-7 h-7 rounded-lg bg-slate-50 text-slate-700 hover:bg-slate-100 inline-flex items-center justify-center transition-colors border border-slate-200"
                            title="Edit Contact & Follow-up"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
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

      {/* ADD / EDIT CONTACT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#142B4A]/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-[#E3E8EF] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3E8EF]">
              <h3 className="text-base font-bold text-[#142B4A]">
                {editingContact.id ? 'Update Contact & Follow-Up' : 'Record New Outreach Contact'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-xs text-[#667085] hover:text-[#182230]"
              >
                Cancel
              </button>
            </div>

            {duplicateWarning && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{duplicateWarning}</span>
              </div>
            )}

            <form onSubmit={handleSaveContact} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#182230] mb-1">Full Name *</label>
                <input
                  type="text"
                  value={editingContact.name || editingContact.contactName || ''}
                  onChange={e => {
                    setDuplicateWarning(null);
                    setEditingContact({ ...editingContact, name: e.target.value });
                  }}
                  required
                  placeholder="e.g. Kwesi Boateng"
                  className="w-full p-2.5 rounded-xl border border-[#E3E8EF] focus:ring-2 focus:ring-[#142B4A]/20 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#182230] mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    value={editingContact.phone || editingContact.contactDetails || ''}
                    onChange={e => {
                      setDuplicateWarning(null);
                      setEditingContact({ ...editingContact, phone: e.target.value });
                    }}
                    required
                    placeholder="+233 24 123 4567"
                    className="w-full p-2.5 rounded-xl border border-[#E3E8EF] focus:ring-2 focus:ring-[#142B4A]/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#182230] mb-1">WhatsApp Number</label>
                  <input
                    type="tel"
                    value={editingContact.whatsappNumber || ''}
                    onChange={e => setEditingContact({ ...editingContact, whatsappNumber: e.target.value })}
                    placeholder="Defaults to phone"
                    className="w-full p-2.5 rounded-xl border border-[#E3E8EF] focus:ring-2 focus:ring-[#142B4A]/20 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#182230] mb-1">Outreach Location</label>
                  <input
                    type="text"
                    value={editingContact.location || ''}
                    onChange={e => setEditingContact({ ...editingContact, location: e.target.value })}
                    placeholder="e.g. Pentagon Hostels"
                    className="w-full p-2.5 rounded-xl border border-[#E3E8EF] focus:ring-2 focus:ring-[#142B4A]/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#182230] mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    value={editingContact.email || ''}
                    onChange={e => setEditingContact({ ...editingContact, email: e.target.value })}
                    placeholder="kwesi@example.com"
                    className="w-full p-2.5 rounded-xl border border-[#E3E8EF] focus:ring-2 focus:ring-[#142B4A]/20 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#182230] mb-1">Follow-Up Status</label>
                  <select
                    value={editingContact.followUpStatus || 'New Contact'}
                    onChange={e => setEditingContact({ ...editingContact, followUpStatus: e.target.value as FollowUpStatus })}
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
                    value={editingContact.nextFollowUpDate || ''}
                    onChange={e => setEditingContact({ ...editingContact, nextFollowUpDate: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#E3E8EF] focus:ring-2 focus:ring-[#142B4A]/20 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#182230] mb-1">Notes & Follow-up History</label>
                <textarea
                  rows={2}
                  value={editingContact.notes || ''}
                  onChange={e => setEditingContact({ ...editingContact, notes: e.target.value })}
                  placeholder="Prayer requests, spiritual interests, follow-up conversation notes..."
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
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-[#142B4A] text-white font-bold hover:bg-[#203D63]"
                >
                  {isSaving ? 'Saving...' : 'Save Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
