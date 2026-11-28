import React, { useState, useEffect, useMemo } from 'react';
import { useBackHandler } from '../../hooks/useBackHandler';
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
  MessageSquare,
  Flame,
  BookmarkCheck,
  PhoneCall,
  UserCheck,
  History,
  Tag,
  Share2,
} from 'lucide-react';

const STATUS_LIST: FollowUpStatus[] = [
  'Uncontacted',
  'Contacted',
  'Requiring Follow-up',
  'Active Discipleship',
  'Completed / Joined',
  'Established in Church',
];

const LEAD_SOURCES = [
  'Evangelism Outing',
  'Personal Invitation',
  'Sunday Service Walk-in',
  'Campus Outreach',
  'Community Outreach',
  'Social Media / Online',
  'Member Referral',
  'Special Ministry Program',
];

const DISCIPLESHIP_STAGES = [
  'Stage 1: New Convert / Welcome',
  'Stage 2: Foundation & Assurance Class',
  'Stage 3: Water Baptism',
  'Stage 4: Holy Ghost Baptism',
  'Stage 5: Cell Membership & Integration',
  'Stage 6: Ministry Worker Training',
  'Established in Church',
];

interface FollowUpManagementViewProps {
  onBack?: () => void;
}

export const FollowUpManagementView: React.FC<FollowUpManagementViewProps> = ({ onBack }) => {
  const { currentUser, isAdmin } = useAuth();
  const [contacts, setContacts] = useState<EvangelismContact[]>([]);
  const [cells, setCells] = useState<Cell[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedCellFilter, setSelectedCellFilter] = useState<string>('All');
  const [selectedTutorFilter, setSelectedTutorFilter] = useState<string>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<EvangelismContact | null>(null);

  // Back navigation interceptor: closes edit modal before leaving view
  useBackHandler(() => {
    if (isModalOpen) {
      setIsModalOpen(false);
      setEditingContact(null);
      return true;
    }
    return false;
  }, isModalOpen);

  const handleBackNavigation = () => {
    if (isModalOpen) {
      setIsModalOpen(false);
      setEditingContact(null);
    } else if (onBack) {
      onBack();
    }
  };

  // Form state
  const [formData, setFormData] = useState<{
    name: string;
    phone: string;
    whatsappNumber: string;
    email: string;
    location: string;
    cellId: string;
    cellName: string;
    leadSource: string;
    followUpStatus: FollowUpStatus;
    contactAttempts: number;
    discipleshipProgress: string;
    establishedDate: string;
    completionDate: string;
    notes: string;
    nextFollowUpDate: string;
  }>({
    name: '',
    phone: '',
    whatsappNumber: '',
    email: '',
    location: '',
    cellId: currentUser.cell_id || '',
    cellName: currentUser.cell_name || '',
    leadSource: 'Evangelism Outing',
    followUpStatus: 'Uncontacted',
    contactAttempts: 0,
    discipleshipProgress: 'Stage 1: New Convert / Welcome',
    establishedDate: '',
    completionDate: '',
    notes: '',
    nextFollowUpDate: '',
  });

  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const cellFilter = isAdmin
        ? undefined
        : { cellId: currentUser.cell_id || undefined, tutorUid: currentUser.id };
      const [contactsList, cellList] = await Promise.all([
        FollowUpService.getContacts(cellFilter),
        CellService.getActiveCells(),
      ]);
      const activeIds = new Set(cellList.map(cell => cell.id));
      const visibleContacts = contactsList.filter(contact => activeIds.has(contact.cellId) || !contact.cellId);
      setContacts(visibleContacts);
      setCells(cellList);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser, isAdmin]);

  useEffect(() => {
    const handleCloudChange = (event: Event) => {
      const table = (event as CustomEvent).detail?.table;
      if (table === '*' || ['evangelism_contacts', 'follow_ups', 'cells'].includes(table)) void loadData();
    };
    window.addEventListener('fni:cloud-data-changed', handleCloudChange);
    return () => window.removeEventListener('fni:cloud-data-changed', handleCloudChange);
  }, [currentUser, isAdmin]);

  // Distinct tutors for admin filter
  const distinctTutors = useMemo(() => {
    const map = new Map<string, string>();
    contacts.forEach(c => {
      if (c.tutorName && c.tutorName !== 'Tutor') {
        map.set(c.tutorName, c.tutorName);
      }
    });
    return Array.from(map.values()).sort();
  }, [contacts]);

  // The 5 Exact Required Dashboard Metrics:
  const metrics = useMemo(() => {
    const totalContacts = contacts.length;

    const underPastoralCare = contacts.filter(c =>
      c.followUpStatus === 'Requiring Follow-up' ||
      c.followUpStatus === 'Follow-up required' ||
      c.followUpStatus === 'Follow-up Pending' ||
      c.followUpStatus === 'Contacted' ||
      c.followUpStatus === 'Interested'
    ).length;

    const activeDiscipleship = contacts.filter(c =>
      c.followUpStatus === 'Active Discipleship' ||
      c.followUpStatus === 'Completed / Joined' ||
      c.followUpStatus === 'Joined a cell' ||
      c.followUpStatus === 'Joined Ministry' ||
      c.followUpStatus === 'Completed'
    ).length;

    const establishedInChurch = contacts.filter(c =>
      c.followUpStatus === 'Established in Church' ||
      Boolean(c.establishedDate)
    ).length;

    const uncontactedLeads = contacts.filter(c =>
      c.followUpStatus === 'Uncontacted' ||
      c.followUpStatus === 'Not contacted' ||
      c.followUpStatus === 'New Contact'
    ).length;

    return {
      totalContacts,
      underPastoralCare,
      activeDiscipleship,
      establishedInChurch,
      uncontactedLeads,
    };
  }, [contacts]);

  const handleOpenAdd = () => {
    setEditingContact(null);
    setDuplicateWarning(null);
    setFormData({
      name: '',
      phone: '',
      whatsappNumber: '',
      email: '',
      location: currentUser.cell_name ? `${currentUser.cell_name} Territory` : '',
      cellId: currentUser.cell_id || (cells[0]?.id || ''),
      cellName: currentUser.cell_name || (cells[0]?.name || ''),
      leadSource: 'Evangelism Outing',
      followUpStatus: 'Uncontacted',
      contactAttempts: 0,
      discipleshipProgress: 'Stage 1: New Convert / Welcome',
      establishedDate: '',
      completionDate: '',
      notes: '',
      nextFollowUpDate: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (contact: EvangelismContact) => {
    setEditingContact(contact);
    setDuplicateWarning(null);
    setFormData({
      name: contact.name || contact.contactName || '',
      phone: contact.phone || contact.contactDetails || '',
      whatsappNumber: contact.whatsappNumber || contact.phone || contact.contactDetails || '',
      email: contact.email || '',
      location: contact.location || contact.evangelismLocation || '',
      cellId: contact.cellId || currentUser.cell_id || '',
      cellName: contact.cellName || '',
      leadSource: contact.leadSource || 'Evangelism Outing',
      followUpStatus: (STATUS_LIST.includes(contact.followUpStatus)
        ? contact.followUpStatus
        : contact.followUpStatus === 'Not contacted'
          ? 'Uncontacted'
          : contact.followUpStatus === 'Follow-up required'
            ? 'Requiring Follow-up'
            : contact.followUpStatus === 'Joined a cell' || contact.followUpStatus === 'Completed'
              ? 'Completed / Joined'
              : 'Contacted') as FollowUpStatus,
      contactAttempts: contact.contactAttempts || 0,
      discipleshipProgress: String(contact.discipleshipProgress || 'Stage 1: New Convert / Welcome'),
      establishedDate: contact.establishedDate || '',
      completionDate: contact.completionDate || '',
      notes: contact.notes || contact.followUpNotes || '',
      nextFollowUpDate: contact.nextFollowUpDate || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving || !formData.name.trim() || !formData.phone.trim()) return;
    if (!editingContact && !cells.some(cell => cell.id === formData.cellId)) {
      setSaveError('Select an active cell before saving this contact.');
      return;
    }
    setSaveError(null);

    if (!editingContact) {
      const dup = await FollowUpService.findDuplicateContact(
        formData.phone,
        formData.whatsappNumber
      );
      if (dup && !duplicateWarning) {
        setDuplicateWarning(
          `Notice: An existing record for "${dup.name || dup.contactName}" was found with matching phone or WhatsApp in ${dup.cellName || 'a cell'}. Press Save again to proceed anyway.`
        );
        return;
      }
    }

    const effectiveWhatsApp = formData.whatsappNumber.trim() || formData.phone.trim();
    const effectiveCompletionDate =
      formData.followUpStatus === 'Completed / Joined' && !formData.completionDate
        ? new Date().toISOString().split('T')[0]
        : formData.completionDate;
    const effectiveEstablishedDate =
      formData.followUpStatus === 'Established in Church' && !formData.establishedDate
        ? new Date().toISOString().split('T')[0]
        : formData.establishedDate;

    setIsSaving(true);
    try {
      if (editingContact) {
        await FollowUpService.updateContact(editingContact.id, {
          name: formData.name.trim(),
          contactName: formData.name.trim(),
          phone: formData.phone.trim(),
          contactDetails: formData.phone.trim(),
          whatsappNumber: effectiveWhatsApp,
          email: formData.email.trim(),
          location: formData.location.trim(),
          evangelismLocation: formData.location.trim(),
          leadSource: formData.leadSource,
          followUpStatus: formData.followUpStatus,
          contactAttempts: formData.contactAttempts,
          discipleshipProgress: formData.discipleshipProgress,
          establishedDate: effectiveEstablishedDate || undefined,
          completionDate: effectiveCompletionDate || undefined,
          notes: formData.notes.trim(),
          followUpNotes: formData.notes.trim(),
          nextFollowUpDate: formData.nextFollowUpDate || undefined,
          lastFollowUpDate: new Date().toISOString().split('T')[0],
        }, currentUser.full_name);
      } else {
        const targetCell = cells.find(c => c.id === formData.cellId);
        await FollowUpService.addContact({
          cellId: targetCell!.id,
          cellName: targetCell!.name,
          tutorName: currentUser.full_name || 'Tutor',
          tutorUid: currentUser.id,
          name: formData.name.trim(),
          contactName: formData.name.trim(),
          phone: formData.phone.trim(),
          contactDetails: formData.phone.trim(),
          whatsappNumber: effectiveWhatsApp,
          email: formData.email.trim(),
          location: formData.location.trim(),
          evangelismLocation: formData.location.trim(),
          leadSource: formData.leadSource,
          followUpStatus: formData.followUpStatus,
          contactAttempts: formData.contactAttempts,
          discipleshipProgress: formData.discipleshipProgress,
          establishedDate: effectiveEstablishedDate || undefined,
          completionDate: effectiveCompletionDate || undefined,
          dateCaptured: new Date().toISOString().split('T')[0],
          notes: formData.notes.trim(),
          followUpNotes: formData.notes.trim(),
          nextFollowUpDate: formData.nextFollowUpDate || undefined,
        });
      }

      setIsModalOpen(false);
      setDuplicateWarning(null);
      await loadData();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'The contact could not be saved. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredContacts = useMemo(() => {
    return contacts.filter(contact => {
      const contactName = (contact.name || contact.contactName || '').toLowerCase();
      const contactLoc = (contact.location || contact.evangelismLocation || '').toLowerCase();
      const contactPhone = contact.phone || contact.contactDetails || '';
      const contactCell = (contact.cellName || '').toLowerCase();
      const contactNotes = (contact.notes || '').toLowerCase();
      const q = searchQuery.toLowerCase();

      const matchesSearch =
        contactName.includes(q) ||
        contactPhone.includes(q) ||
        contactLoc.includes(q) ||
        contactCell.includes(q) ||
        contactNotes.includes(q);

      let matchesStatus = true;
      if (selectedStatus !== 'All') {
        if (selectedStatus === 'Uncontacted') {
          matchesStatus =
            contact.followUpStatus === 'Uncontacted' ||
            contact.followUpStatus === 'Not contacted' ||
            contact.followUpStatus === 'New Contact';
        } else if (selectedStatus === 'Requiring Follow-up') {
          matchesStatus =
            contact.followUpStatus === 'Requiring Follow-up' ||
            contact.followUpStatus === 'Follow-up required' ||
            contact.followUpStatus === 'Follow-up Pending';
        } else if (selectedStatus === 'Completed / Joined') {
          matchesStatus =
            contact.followUpStatus === 'Completed / Joined' ||
            contact.followUpStatus === 'Joined a cell' ||
            contact.followUpStatus === 'Joined Ministry' ||
            contact.followUpStatus === 'Completed';
        } else if (selectedStatus === 'Established in Church') {
          matchesStatus =
            contact.followUpStatus === 'Established in Church' ||
            Boolean(contact.establishedDate);
        } else {
          matchesStatus = contact.followUpStatus === selectedStatus;
        }
      }

      const matchesCell =
        selectedCellFilter === 'All' || contact.cellId === selectedCellFilter;

      const matchesTutor =
        selectedTutorFilter === 'All' || contact.tutorName === selectedTutorFilter;

      return matchesSearch && matchesStatus && matchesCell && matchesTutor;
    });
  }, [contacts, searchQuery, selectedStatus, selectedCellFilter, selectedTutorFilter]);

  return (
    <div className="fni-evangelism-followups space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-black text-navy-950 dark:text-white tracking-tight">
              Follow-Up & Discipleship Management
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-navy-900 text-gold-400">
              {isAdmin ? '16 Cells Synced' : currentUser.cell_name || 'Cell Portal'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isAdmin
              ? 'Real-time pastoral care, soul retention, and discipleship tracking across all 16 cells in the ministry'
              : `Discipleship pipeline and personal follow-up records for ${currentUser.cell_name || 'your cell'}`}
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-xl bg-navy-900 text-white text-xs font-bold hover:bg-navy-800 transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4 text-gold-400" />
          <span>Add New Contact</span>
        </button>
      </div>

      {/* 5 Required Dashboard Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Metric 1 */}
        <div className="p-4 bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Contacts</span>
            <Users className="w-4 h-4 text-navy-600 dark:text-gold-400" />
          </div>
          <div className="text-2xl font-black text-navy-950 dark:text-white mt-1.5">
            {metrics.totalContacts}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            Under Pastoral Care
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-4 bg-white dark:bg-navy-900 rounded-2xl border border-amber-200 dark:border-amber-900/40 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">Under Pastoral Care</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1.5">
            {metrics.underPastoralCare}
          </div>
          <div className="text-[10px] text-amber-700 dark:text-amber-300 mt-0.5 font-medium">
            Requiring Follow-up
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-4 bg-white dark:bg-navy-900 rounded-2xl border border-sky-200 dark:border-sky-900/40 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-sky-700 dark:text-sky-300">Active Discipleship</span>
            <BookmarkCheck className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-1.5">
            {metrics.activeDiscipleship}
          </div>
          <div className="text-[10px] text-sky-700 dark:text-sky-300 mt-0.5 font-medium">
            Completed / Joined
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-4 bg-white dark:bg-navy-900 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">Established in Church</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1.5">
            {metrics.establishedInChurch}
          </div>
          <div className="text-[10px] text-emerald-700 dark:text-emerald-300 mt-0.5 font-medium">
            Rooted & Baptized
          </div>
        </div>

        {/* Metric 5 */}
        <div className="p-4 bg-white dark:bg-navy-900 rounded-2xl border border-rose-200 dark:border-rose-900/40 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300">Uncontacted Leads</span>
            <PhoneCall className="w-4 h-4 text-rose-600 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1.5">
            {metrics.uncontactedLeads}
          </div>
          <div className="text-[10px] text-rose-700 dark:text-rose-300 mt-0.5 font-medium">
            Requires Immediate Call
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-navy-900 p-4 rounded-2xl border border-slate-200 dark:border-navy-700 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search contact name, phone, notes, location..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-navy-700 dark:bg-navy-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-navy-900/20 text-slate-800"
            />
          </div>

          {isAdmin && cells.length > 0 && (
            <select
              value={selectedCellFilter}
              onChange={e => setSelectedCellFilter(e.target.value)}
              className="p-2 text-xs rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-950 text-slate-800 dark:text-white"
            >
              <option value="All">All 16 Cells</option>
              {cells.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}

          {isAdmin && distinctTutors.length > 0 && (
            <select
              value={selectedTutorFilter}
              onChange={e => setSelectedTutorFilter(e.target.value)}
              className="p-2 text-xs rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-950 text-slate-800 dark:text-white"
            >
              <option value="All">All Tutors / Leaders</option>
              {distinctTutors.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          )}
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          {['All', ...STATUS_LIST].map(st => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedStatus === st
                  ? 'bg-navy-900 text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-navy-950 text-slate-600 dark:text-slate-400 hover:text-navy-900 dark:hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Contacts Table */}
      <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-navy-700 shadow-2xs overflow-hidden">
        <div className="py-3.5 px-6 border-b border-slate-200 dark:border-navy-700 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-navy-950 dark:text-white">
              Pastoral Follow-Up Records ({filteredContacts.length})
            </h2>
            <span className="text-[11px] text-slate-500">
              Showing active discipleship & follow-up pipeline
            </span>
          </div>
          <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
            Highlighted rows denote overdue follow-ups
          </span>
        </div>

        <div className="md:hidden divide-y divide-slate-200 dark:divide-navy-700">
          {filteredContacts.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">No contacts found in this filter.</div>
          ) : filteredContacts.map(c => {
            const displayName = c.name || c.contactName || 'New Contact';
            const isOverdue = c.nextFollowUpDate && new Date(c.nextFollowUpDate).getTime() < Date.now() && c.followUpStatus !== 'Completed / Joined' && c.followUpStatus !== 'Established in Church';
            return (
              <article key={c.id} onClick={() => handleOpenEdit(c)} className={`p-4 cursor-pointer ${isOverdue ? 'bg-rose-50/70 dark:bg-rose-950/20 border-l-4 border-rose-500' : 'bg-white dark:bg-navy-900'}`}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-navy-900 text-gold-400 font-bold text-xs flex items-center justify-center shrink-0">{displayName.slice(0,2).toUpperCase()}</div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm text-navy-950 dark:text-white break-words">{displayName}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">{c.phone || c.contactDetails || 'No phone recorded'}</div>
                    <div className="text-[11px] text-slate-500 mt-1">{c.location || 'Territory'} · {c.leadSource || 'Evangelism'}</div>
                  </div>
                  <button type="button" onClick={e => {e.stopPropagation(); handleOpenEdit(c);}} className="p-2 rounded-lg bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-200" aria-label={`Edit ${displayName}`}><Edit2 className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                  <div className="rounded-lg bg-slate-50 dark:bg-navy-950 p-2"><div className="text-[10px] text-slate-500">Cell / Tutor</div><div className="font-semibold text-slate-800 dark:text-slate-200 break-words">{c.cellName || 'Central'} · {c.tutorName || 'Tutor'}</div></div>
                  <div className="rounded-lg bg-slate-50 dark:bg-navy-950 p-2"><div className="text-[10px] text-slate-500">Progress</div><div className="font-semibold text-slate-800 dark:text-slate-200 break-words">{c.discipleshipProgress || 'Stage 1: New Convert'}</div></div>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${isOverdue ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 dark:bg-navy-800 text-slate-700 dark:text-slate-200'}`}>{isOverdue ? 'Overdue' : c.followUpStatus || 'Uncontacted'}</span>
                  <span className="text-[11px] text-slate-500">Next: {c.nextFollowUpDate || 'Not scheduled'}</span>
                </div>
                <div className="flex gap-2 mt-3" onClick={e => e.stopPropagation()}>
                  {(c.whatsappNumber || c.phone) && <a href={`https://wa.me/${(c.whatsappNumber || c.phone || '').replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="flex-1 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 py-2 text-xs font-semibold text-center inline-flex items-center justify-center gap-1.5"><MessageSquare className="w-3.5 h-3.5" /> WhatsApp</a>}
                  {c.phone && <a href={`tel:${c.phone}`} className="flex-1 rounded-lg border border-navy-200 bg-navy-50 text-navy-900 py-2 text-xs font-semibold text-center inline-flex items-center justify-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Call</a>}
                </div>
              </article>
            );
          })}
        </div>
        <div className="hidden md:block table-scroll-container">
          <table className="w-full text-left text-xs border-collapse min-w-[950px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-navy-700 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-navy-950">
                <th className="py-3 px-5">Contact Profile</th>
                <th className="py-3 px-4">Contact Details</th>
                <th className="py-3 px-4">Lead Source</th>
                <th className="py-3 px-4">Assigned Cell</th>
                <th className="py-3 px-4">Stage / Status</th>
                <th className="py-3 px-4">Discipleship Progress</th>
                <th className="py-3 px-4">Next Schedule</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-navy-800">
              {filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Users className="w-8 h-8 text-slate-300 dark:text-navy-700 mx-auto mb-2" />
                    <p className="text-xs font-semibold">No contacts found in this filter.</p>
                  </td>
                </tr>
              ) : (
                filteredContacts.map(c => {
                  const displayName = c.name || c.contactName || 'New Contact';
                  const isOverdue =
                    c.nextFollowUpDate &&
                    new Date(c.nextFollowUpDate).getTime() < Date.now() &&
                    c.followUpStatus !== 'Completed / Joined' &&
                    c.followUpStatus !== 'Established in Church';

                  return (
                    <tr
                      key={c.id}
                      onClick={() => handleOpenEdit(c)}
                      className={`cursor-pointer transition-colors ${
                        isOverdue
                          ? 'bg-rose-50/70 dark:bg-rose-950/20 border-l-4 border-rose-500'
                          : 'hover:bg-slate-50/80 dark:hover:bg-navy-950/50'
                      }`}
                    >
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-navy-900 text-gold-400 font-bold text-xs flex items-center justify-center shrink-0">
                            {displayName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-navy-950 dark:text-white leading-tight text-xs sm:text-sm">
                              {displayName}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span>{c.location || 'Territory'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-navy-900 dark:text-slate-200 text-xs">
                          {c.phone || c.contactDetails || 'No phone'}
                        </div>
                        {c.whatsappNumber && (
                          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                            WA: {c.whatsappNumber}
                          </div>
                        )}
                        {c.email && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{c.email}</div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-navy-950 px-2.5 py-1 rounded-lg">
                          <Tag className="w-3 h-3 text-gold-500" />
                          <span>{c.leadSource || 'Evangelism'}</span>
                        </span>
                        {c.contactAttempts ? (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {c.contactAttempts} contact attempt{c.contactAttempts > 1 ? 's' : ''}
                          </div>
                        ) : null}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-navy-950 dark:text-white text-xs">
                          {c.cellName || 'Central'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {c.tutorName || 'Tutor'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {c.followUpStatus === 'Established in Church' && (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 px-2.5 py-1 rounded-full text-xs">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Established
                          </span>
                        )}
                        {(c.followUpStatus === 'Completed / Joined' || c.followUpStatus === 'Joined a cell' || c.followUpStatus === 'Completed') && (
                          <span className="inline-flex items-center gap-1 font-bold text-sky-800 bg-sky-100 dark:bg-sky-950 dark:text-sky-300 px-2.5 py-1 rounded-full text-xs">
                            <UserCheck className="w-3 h-3 text-sky-600" />
                            Completed / Joined
                          </span>
                        )}
                        {c.followUpStatus === 'Active Discipleship' && (
                          <span className="inline-flex items-center gap-1 font-bold text-indigo-800 bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300 px-2.5 py-1 rounded-full text-xs">
                            <BookmarkCheck className="w-3 h-3 text-indigo-600" />
                            Active Discipleship
                          </span>
                        )}
                        {(c.followUpStatus === 'Requiring Follow-up' || c.followUpStatus === 'Follow-up required') && (
                          <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-100 dark:bg-amber-950 dark:text-amber-300 px-2.5 py-1 rounded-full text-xs">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Requiring Follow-up
                          </span>
                        )}
                        {c.followUpStatus === 'Contacted' && (
                          <span className="inline-flex items-center gap-1 font-bold text-blue-800 bg-blue-100 dark:bg-blue-950 dark:text-blue-300 px-2.5 py-1 rounded-full text-xs">
                            <Phone className="w-3 h-3 text-blue-600" />
                            Contacted
                          </span>
                        )}
                        {(c.followUpStatus === 'Uncontacted' || c.followUpStatus === 'Not contacted' || c.followUpStatus === 'New Contact') && (
                          <span className="inline-flex items-center gap-1 font-bold text-rose-800 bg-rose-100 dark:bg-rose-950 dark:text-rose-300 px-2.5 py-1 rounded-full text-xs">
                            <PhoneCall className="w-3 h-3 text-rose-600" />
                            Uncontacted Lead
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                          {c.discipleshipProgress || 'Stage 1: New Convert'}
                        </div>
                        {c.establishedDate && (
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
                            Est: {c.establishedDate}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isOverdue ? (
                          <span className="inline-flex items-center gap-1 font-bold text-rose-600 text-xs">
                            <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                            Overdue ({c.nextFollowUpDate})
                          </span>
                        ) : c.nextFollowUpDate ? (
                          <span className="text-navy-950 dark:text-slate-200 font-medium text-xs">
                            {c.nextFollowUpDate}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-xs">Not scheduled</span>
                        )}
                      </td>

                      <td className="py-3.5 px-5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                          {(c.whatsappNumber || c.phone) && (
                            <a
                              href={`https://wa.me/${(c.whatsappNumber || c.phone || '').replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              title="WhatsApp Follow-up"
                              className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 inline-flex items-center justify-center transition-colors border border-emerald-200"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {c.phone && (
                            <a
                              href={`tel:${c.phone}`}
                              title="Direct Phone Call"
                              className="w-8 h-8 rounded-xl bg-navy-50 text-navy-900 hover:bg-navy-100 inline-flex items-center justify-center transition-colors border border-navy-200"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              handleOpenEdit(c);
                            }}
                            className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 inline-flex items-center justify-center transition-colors border border-slate-200 cursor-pointer"
                            title="Edit Contact & Pastoral Notes"
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

      {/* ADD / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-navy-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-navy-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-navy-700 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-navy-700">
              <h3 className="text-base font-bold text-navy-950 dark:text-white">
                {editingContact ? 'Update Follow-Up Record' : 'Add New Outreach Lead'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-navy-800 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {duplicateWarning && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{duplicateWarning}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-navy-950 dark:text-slate-200 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => {
                    setDuplicateWarning(null);
                    setFormData({ ...formData, name: e.target.value });
                  }}
                  required
                  placeholder="e.g. Isaac Boateng"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-navy-700 dark:bg-navy-950 dark:text-white focus:ring-2 focus:ring-navy-900/20 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-navy-950 dark:text-slate-200 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => {
                      setDuplicateWarning(null);
                      setFormData({ ...formData, phone: e.target.value });
                    }}
                    required
                    placeholder="+233 24 123 4567"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-navy-700 dark:bg-navy-950 dark:text-white focus:ring-2 focus:ring-navy-900/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-navy-950 dark:text-slate-200 mb-1">WhatsApp Number</label>
                  <input
                    type="tel"
                    value={formData.whatsappNumber}
                    onChange={e => setFormData({ ...formData, whatsappNumber: e.target.value })}
                    placeholder="Defaults to phone"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-navy-700 dark:bg-navy-950 dark:text-white focus:ring-2 focus:ring-navy-900/20 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-navy-950 dark:text-slate-200 mb-1">Lead Origin / Source</label>
                  <select
                    value={formData.leadSource}
                    onChange={e => setFormData({ ...formData, leadSource: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-navy-700 dark:bg-navy-950 dark:text-white"
                  >
                    {LEAD_SOURCES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-navy-950 dark:text-slate-200 mb-1">Outreach Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Campus or Area"
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-navy-700 dark:bg-navy-950 dark:text-white focus:ring-2 focus:ring-navy-900/20 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-navy-950 dark:text-slate-200 mb-1">Assigned Cell</label>
                  <select
                    value={formData.cellId}
                    onChange={e => {
                      const c = cells.find(item => item.id === e.target.value);
                      setFormData({ ...formData, cellId: e.target.value, cellName: c ? c.name : '' });
                    }}
                    disabled={!isAdmin && Boolean(currentUser.cell_id)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-navy-700 dark:bg-navy-950 dark:text-white"
                  >
                    {cells.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-navy-950 dark:text-slate-200 mb-1">Contact Attempts</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, contactAttempts: Math.max(0, formData.contactAttempts - 1) })}
                      className="w-9 h-9 rounded-xl border border-slate-200 dark:border-navy-700 font-bold text-sm hover:bg-slate-100 dark:hover:bg-navy-800"
                    >
                      -
                    </button>
                    <span className="flex-1 text-center font-bold text-sm text-navy-950 dark:text-white">
                      {formData.contactAttempts}
                    </span>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, contactAttempts: formData.contactAttempts + 1 })}
                      className="w-9 h-9 rounded-xl border border-slate-200 dark:border-navy-700 font-bold text-sm hover:bg-slate-100 dark:hover:bg-navy-800"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-navy-950 dark:text-slate-200 mb-1">Stage / Follow-Up Status</label>
                  <select
                    value={formData.followUpStatus}
                    onChange={e => setFormData({ ...formData, followUpStatus: e.target.value as FollowUpStatus })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-navy-700 dark:bg-navy-950 dark:text-white"
                  >
                    {STATUS_LIST.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-navy-950 dark:text-slate-200 mb-1">Next Follow-Up Date</label>
                  <input
                    type="date"
                    value={formData.nextFollowUpDate}
                    onChange={e => setFormData({ ...formData, nextFollowUpDate: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-navy-700 dark:bg-navy-950 dark:text-white focus:ring-2 focus:ring-navy-900/20 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-navy-950 dark:text-slate-200 mb-1">Discipleship Milestone</label>
                <select
                  value={formData.discipleshipProgress}
                  onChange={e => setFormData({ ...formData, discipleshipProgress: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-navy-700 dark:bg-navy-950 dark:text-white"
                >
                  {DISCIPLESHIP_STAGES.map(ds => (
                    <option key={ds} value={ds}>{ds}</option>
                  ))}
                </select>
              </div>

              {(formData.followUpStatus === 'Established in Church' || formData.followUpStatus === 'Completed / Joined') && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-navy-950 dark:text-slate-200 mb-1">Established Date</label>
                    <input
                      type="date"
                      value={formData.establishedDate}
                      onChange={e => setFormData({ ...formData, establishedDate: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-navy-700 dark:bg-navy-950 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-navy-950 dark:text-slate-200 mb-1">Joined Date</label>
                    <input
                      type="date"
                      value={formData.completionDate}
                      onChange={e => setFormData({ ...formData, completionDate: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-navy-700 dark:bg-navy-950 dark:text-white"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-navy-950 dark:text-slate-200 mb-1">Pastoral Notes & Spiritual Log</label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Record spiritual counsel, discussion summary, prayer points, baptism status..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-navy-700 dark:bg-navy-950 dark:text-white focus:ring-2 focus:ring-navy-900/20 focus:outline-none"
                />
              </div>

              {/* Timestamped Audit Timeline */}
              {editingContact && editingContact.history && editingContact.history.length > 0 && (
                <div className="p-3 bg-slate-50 dark:bg-navy-950 rounded-xl border border-slate-200 dark:border-navy-700">
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-gold-500" />
                    <span>Timestamped Follow-Up History</span>
                  </div>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
                    {editingContact.history.map((h, idx) => (
                      <div key={idx} className="text-[11px] text-slate-600 dark:text-slate-400 border-l-2 border-gold-500 pl-2.5 py-0.5">
                        <span className="font-semibold text-navy-950 dark:text-white">{h.status}</span>
                        <span className="text-slate-400 mx-1">•</span>
                        <span>{new Date(h.changedAt).toLocaleDateString()} {new Date(h.changedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {h.changedBy && <span className="text-slate-400"> by {h.changedBy}</span>}
                        {h.note && <p className="text-slate-500 italic mt-0.5">{h.note}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {saveError && (
                <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
                  {saveError}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-navy-700">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); setSaveError(null); }}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-navy-800 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-navy-900 text-white font-bold hover:bg-navy-800 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                >
                  {isSaving ? 'Saving…' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
