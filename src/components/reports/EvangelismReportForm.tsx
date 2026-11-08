import React, { useState, useEffect } from 'react';
import { Cell, EvangelismReport } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { ReportService } from '../../services/reportService';
import { CellService } from '../../services/cellService';
import { FollowUpService } from '../../services/followUpService';
import {
  Flame,
  Users,
  MapPin,
  Calendar,
  MessageSquare,
  FileText,
  UserPlus,
  Send,
  AlertCircle,
  CheckCircle2,
  Plus,
  Trash2,
  ArrowLeft,
  Building,
  Lock,
} from 'lucide-react';
import { Button } from '../common/Button';

interface EvangelismReportFormProps {
  onSuccess: (report: EvangelismReport) => void;
  onCancel?: () => void;
}

export const EvangelismReportForm: React.FC<EvangelismReportFormProps> = ({
  onSuccess,
  onCancel,
}) => {
  const { currentUser, isAdmin } = useAuth();
  const { dispatchNotification } = useNotifications();

  const [cells, setCells] = useState<Cell[]>([]);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [cellId, setCellId] = useState(currentUser.cell_id || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState(currentUser.cell_name ? `${currentUser.cell_name} Campus / Territory` : '');
  const [teamMembersInput, setTeamMembersInput] = useState('');
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [preSetTarget, setPreSetTarget] = useState<number>(5);
  const [peopleSpokenTo, setPeopleSpokenTo] = useState<number>(0);
  const [contactsCaptured, setContactsCaptured] = useState<number>(0);
  const [conversions, setConversions] = useState<number>(0);
  const [interestedInMinistry, setInterestedInMinistry] = useState<number>(0);
  const [potentialFollowUps, setPotentialFollowUps] = useState<number>(0);
  const [messageUsed, setMessageUsed] = useState('');
  const [notes, setNotes] = useState('');
  const [testimonies, setTestimonies] = useState('');

  // Quick contact capture row state (open by default to automatically populate Evangelism Contacts)
  const [showAddContact, setShowAddContact] = useState(true);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactWhatsApp, setNewContactWhatsApp] = useState('');
  const [capturedContactsList, setCapturedContactsList] = useState<{ name: string; phone: string; whatsapp: string }[]>([]);

  useEffect(() => {
    async function loadCells() {
      try {
        const cList = await ReportService.getCells();
        setCells(cList);
        const myCell = await CellService.getCellForTutor(currentUser);
        if (!cellId || !isAdmin) {
          setCellId(myCell.id);
          if (!location) {
            setLocation(myCell.meeting_location || myCell.venue_address || myCell.location || `${currentUser.cell_name || myCell.name} Territory`);
          }
        } else if (cellId && cList.length > 0) {
          const matching = cList.find(c => c.id === cellId);
          if (matching && !location) {
            setLocation(`${matching.name} Territory`);
          }
        }
      } finally {
        setIsLoadingMetadata(false);
      }
    }
    loadCells();
  }, [currentUser, cellId, isAdmin]);

  const handleAddTeamMember = () => {
    if (!teamMembersInput.trim()) return;
    setTeamMembers(prev => [...prev, teamMembersInput.trim()]);
    setTeamMembersInput('');
  };

  const handleRemoveTeamMember = (index: number) => {
    setTeamMembers(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddQuickContact = () => {
    if (!newContactName.trim()) return;
    const whatsapp = newContactWhatsApp.trim() || newContactPhone.trim();
    const updatedList = [...capturedContactsList, { 
      name: newContactName.trim(), 
      phone: newContactPhone.trim(), 
      whatsapp 
    }];
    setCapturedContactsList(updatedList);
    setNewContactName('');
    setNewContactPhone('');
    setNewContactWhatsApp('');
    // Automatically keep contacts captured count in sync
    setContactsCaptured(updatedList.length);
  };

  const handleRemoveContact = (index: number) => {
    const updated = capturedContactsList.filter((_, i) => i !== index);
    setCapturedContactsList(updated);
    setContactsCaptured(updated.length);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!cellId) {
      setErrorMsg('Please select your cell fellowship.');
      return;
    }
    if (!location.trim()) {
      setErrorMsg('Please state the evangelism location or campus.');
      return;
    }
    if (preSetTarget <= 0) {
      setErrorMsg('Please set a pre-set evangelism faith target before submitting.');
      return;
    }
    if (peopleSpokenTo < 0 || conversions < 0 || contactsCaptured < 0) {
      setErrorMsg('Numerical counts cannot be negative.');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedCell = cells.find(c => c.id === cellId);
      const cellName = selectedCell?.name || currentUser.cell_name || 'Fellowship Cell';

      const finalTeam = teamMembers.length > 0 
        ? teamMembers 
        : (teamMembersInput.trim() ? [teamMembersInput.trim()] : [currentUser.full_name]);

      const effectiveContacts = Math.max(contactsCaptured, capturedContactsList.length);

      const rep = await ReportService.submitEvangelismReport({
        cellId,
        cellName,
        tutorUid: currentUser.id,
        tutorName: currentUser.full_name,
        date,
        location: location.trim(),
        teamMembers: finalTeam,
        preSetTarget: Number(preSetTarget) || 0,
        peopleSpokenTo: Number(peopleSpokenTo) || 0,
        contactsCaptured: effectiveContacts,
        conversions: Number(conversions) || 0,
        verifiedSoulsWon: Number(conversions) || 0,
        interestedInMinistry: Number(interestedInMinistry) || 0,
        potentialFollowUps: Number(potentialFollowUps) || 0,
        messageUsed: messageUsed.trim(),
        notes: notes.trim(),
        testimonies: testimonies.trim(),
      });

      // Save any captured contacts directly to follow-up system with report linkage and WhatsApp
      if (capturedContactsList.length > 0) {
        for (const item of capturedContactsList) {
          await FollowUpService.addContact({
            name: item.name,
            contactName: item.name,
            phone: item.phone || item.whatsapp || '',
            contactDetails: item.phone || item.whatsapp || 'Captured during outreach',
            whatsappNumber: item.whatsapp || item.phone || '',
            dateCaptured: date,
            location: location.trim(),
            evangelismLocation: location.trim(),
            cellId: cellId || currentUser.cell_id || 'cell-general',
            cellName,
            tutorUid: currentUser.id,
            tutorName: currentUser.full_name,
            assignedToName: currentUser.full_name,
            followUpStatus: 'Contacted',
            notes: `Captured during evangelism outreach at ${location.trim()}. Faith target: ${preSetTarget}.`,
            followUpNotes: `Captured during evangelism outreach at ${location.trim()}. Faith target: ${preSetTarget}.`,
            evangelismReportId: rep.id,
          });
        }
      } else if (effectiveContacts > 0) {
        // Tutor reported contacts captured count but didn't itemize individual names:
        // Automatically create pipeline contacts so they immediately appear in Evangelism Contacts
        for (let i = 1; i <= effectiveContacts; i++) {
          await FollowUpService.addContact({
            name: `Outreach Contact #${i} (${date})`,
            contactName: `Outreach Contact #${i} (${date})`,
            phone: '',
            contactDetails: 'Captured during outreach',
            whatsappNumber: '',
            dateCaptured: date,
            location: location.trim(),
            evangelismLocation: location.trim(),
            cellId: cellId || currentUser.cell_id || 'cell-general',
            cellName,
            tutorUid: currentUser.id,
            tutorName: currentUser.full_name,
            assignedToName: currentUser.full_name,
            followUpStatus: 'Not contacted',
            notes: `Logged via Evangelism Report on ${date} at ${location.trim()}. Tap to update with contact phone and notes.`,
            followUpNotes: `Logged via Evangelism Report on ${date} at ${location.trim()}.`,
            evangelismReportId: rep.id,
          });
        }
      }

      dispatchNotification(
        'Evangelism Report Submitted',
        `Evangelism return for ${cellName} on ${date} recorded successfully (${conversions} conversions, ${peopleSpokenTo} reached).`,
        'report_submitted',
        'in_app'
      );

      onSuccess(rep);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit evangelism report. Please check your inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingMetadata) {
    return (
      <div className="p-8 text-center text-xs text-slate-500">
        Loading evangelism reporting schema...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#667085] hover:text-[#142B4A] cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 text-[#C6A45A] group-hover:-translate-x-1 transition-transform" />
          <span>Back to Previous</span>
        </button>
      )}

      <div className="bg-white rounded-3xl border border-slate-100 shadow-card overflow-hidden">
        {/* Header Banner */}
      <div className="bg-navy-950 text-white p-6 sm:p-7 border-b border-navy-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-gold-500/20 text-gold-400 border border-gold-500/30 uppercase tracking-wide">
              FNI CELLS CONNECT • Harvest Return
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white mt-1">
              Evangelism & Soul-Winning Report
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Record territory outreach, people spoken to, salvation harvest, and follow-up contacts
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-navy-900 border border-navy-800 px-3 py-1.5 rounded-lg text-slate-300">
              Tutor: <strong className="text-white">{currentUser.full_name}</strong>
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Section 1: Outreach Metadata */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-navy-950 mb-3 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-gold-500" />
            1. Outreach Details & Location
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cell Fellowship (Automatically Registered)
              </label>
              {!isAdmin ? (
                <div className="w-full text-xs rounded-xl border border-slate-200 bg-slate-100 p-2.5 text-[#142B4A] font-bold flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-2 truncate">
                    <Building className="w-4 h-4 text-[#C6A45A] shrink-0" />
                    <span className="truncate">{currentUser.cell_name || cells.find(c => c.id === cellId)?.name || 'Fellowship Cell'}</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#142B4A] text-[#C6A45A] shrink-0 ml-1.5 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" />
                    Your Cell
                  </span>
                </div>
              ) : (
                <select
                  value={cellId}
                  onChange={e => setCellId(e.target.value)}
                  required
                  className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-800 focus:bg-white focus:ring-1 focus:ring-navy-600 font-semibold"
                >
                  {cells.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.location ? `(${c.location})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Evangelism Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-800 focus:bg-white focus:ring-1 focus:ring-navy-600 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Outreach Location / Campus <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. Unilag Main Gate, Ikeja Mall"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="w-full pl-9 text-xs rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-800 focus:bg-white focus:ring-1 focus:ring-navy-600"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Team Members Involved */}
        <div className="pt-2 border-t border-slate-100">
          <h3 className="text-xs font-bold uppercase tracking-wider text-navy-950 mb-3 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-gold-500" />
            2. Evangelism Team Members
          </h3>
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter team member name..."
                value={teamMembersInput}
                onChange={e => setTeamMembersInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTeamMember();
                  }
                }}
                className="flex-1 text-xs rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-800 focus:bg-white focus:ring-1 focus:ring-navy-600"
              />
              <button
                type="button"
                onClick={handleAddTeamMember}
                className="px-4 py-2 bg-navy-900 text-white rounded-xl text-xs font-semibold hover:bg-navy-950 transition-colors"
              >
                + Add Member
              </button>
            </div>

            {teamMembers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {teamMembers.map((m, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-navy-50 text-navy-900 border border-navy-200"
                  >
                    <span>{m}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTeamMember(i)}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Harvest Metrics & Statistics */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-navy-950 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-gold-500" />
              3. Harvest & Soul-Winning Metrics
            </h3>
            <span className="text-[11px] font-medium text-slate-500">
              Pre-set faith target is mandatory before harvest return
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            <div className="p-3 bg-navy-50/80 rounded-2xl border border-navy-200 col-span-2 sm:col-span-1">
              <label className="block text-[11px] font-bold text-navy-950 mb-1">
                Pre-Set Target <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={preSetTarget}
                onChange={e => setPreSetTarget(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full text-base font-extrabold text-navy-950 bg-white border border-navy-300 rounded-xl p-2 focus:ring-1 focus:ring-navy-600"
              />
              <span className="text-[10px] text-navy-600 block mt-1 font-medium">Faith goal</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                People Spoken To
              </label>
              <input
                type="number"
                min="0"
                value={peopleSpokenTo}
                onChange={e => setPeopleSpokenTo(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full text-base font-bold text-navy-950 bg-white border border-slate-200 rounded-xl p-2 focus:ring-1 focus:ring-navy-600"
              />
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Contacts Captured
              </label>
              <input
                type="number"
                min="0"
                value={contactsCaptured}
                onChange={e => setContactsCaptured(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full text-base font-bold text-navy-950 bg-white border border-slate-200 rounded-xl p-2 focus:ring-1 focus:ring-navy-600"
              />
            </div>

            <div className="p-3 bg-gold-50/70 rounded-2xl border border-gold-200">
              <label className="block text-[11px] font-bold text-gold-950 mb-1">
                Conversions / Souls
              </label>
              <input
                type="number"
                min="0"
                value={conversions}
                onChange={e => setConversions(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full text-base font-extrabold text-gold-700 bg-white border border-gold-300 rounded-xl p-2 focus:ring-1 focus:ring-gold-500"
              />
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Interested
              </label>
              <input
                type="number"
                min="0"
                value={interestedInMinistry}
                onChange={e => setInterestedInMinistry(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full text-base font-bold text-navy-950 bg-white border border-slate-200 rounded-xl p-2 focus:ring-1 focus:ring-navy-600"
              />
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Follow-ups
              </label>
              <input
                type="number"
                min="0"
                value={potentialFollowUps}
                onChange={e => setPotentialFollowUps(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full text-base font-bold text-navy-950 bg-white border border-slate-200 rounded-xl p-2 focus:ring-1 focus:ring-navy-600"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Message Used & Field Notes */}
        <div className="pt-2 border-t border-slate-100 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-navy-950 mb-1 flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-gold-500" />
            4. Message & Outreach Summary
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Message / Scriptural Theme Used
            </label>
            <input
              type="text"
              placeholder="e.g. Reconciliation through Christ (2 Cor 5:17-20), Hope in the Gospel"
              value={messageUsed}
              onChange={e => setMessageUsed(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-800 focus:bg-white focus:ring-1 focus:ring-navy-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Field Notes from Evangelism (General atmosphere, logistics & observations)
            </label>
            <textarea
              rows={2}
              placeholder="Provide a brief summary of how the outreach went..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-800 focus:bg-white focus:ring-1 focus:ring-navy-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#C6A45A]" />
              <span>Testimonies & Experiences Encountered (Optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Record any testimonies, miraculous healings, confessions of faith, answered prayers, or spiritual encounters during this outreach..."
              value={testimonies}
              onChange={e => setTestimonies(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-800 focus:bg-white focus:ring-1 focus:ring-navy-600"
            />
          </div>
        </div>

        {/* Section 5: Instant Evangelism Follow-up Contact Capture */}
        <div className="pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-navy-950 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-[#C6A45A]" />
                5. Captured Contacts for Immediate Follow-Up
              </span>
              <span className="text-xs text-[#667085] block mt-0.5">
                Contacts logged here automatically appear in your <strong className="text-[#142B4A]">Evangelism Contacts</strong> directory for direct WhatsApp & calling
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowAddContact(prev => !prev)}
              className="text-xs font-bold text-[#142B4A] hover:text-[#203D63] flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#C6A45A]" />
              <span>{showAddContact ? 'Hide Form' : '+ Add Contact'}</span>
            </button>
          </div>

          {showAddContact && (
            <div className="p-3.5 bg-[#F5F7FA] rounded-2xl border border-[#E3E8EF] space-y-2.5 mb-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <input
                  type="text"
                  placeholder="Full Name *"
                  value={newContactName}
                  onChange={e => setNewContactName(e.target.value)}
                  className="text-xs rounded-xl border border-[#E3E8EF] bg-white p-2.5 text-[#182230] focus:outline-none focus:ring-2 focus:ring-[#142B4A]/20"
                />
                <input
                  type="tel"
                  placeholder="Phone Number (e.g. 0244123456)"
                  value={newContactPhone}
                  onChange={e => setNewContactPhone(e.target.value)}
                  className="text-xs rounded-xl border border-[#E3E8EF] bg-white p-2.5 text-[#182230] focus:outline-none focus:ring-2 focus:ring-[#142B4A]/20"
                />
                <input
                  type="tel"
                  placeholder="WhatsApp Number (optional)"
                  value={newContactWhatsApp}
                  onChange={e => setNewContactWhatsApp(e.target.value)}
                  className="text-xs rounded-xl border border-[#E3E8EF] bg-white p-2.5 text-[#182230] focus:outline-none focus:ring-2 focus:ring-[#142B4A]/20"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleAddQuickContact}
                  className="px-4 py-2 bg-[#142B4A] text-white text-xs font-bold rounded-xl hover:bg-[#203D63] transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5 text-[#C6A45A]" />
                  <span>Add to Evangelism Contacts Pipeline</span>
                </button>
              </div>
            </div>
          )}

          {capturedContactsList.length > 0 && (
            <div className="space-y-2">
              {capturedContactsList.map((c, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#E3E8EF] text-xs">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-bold text-[#182230]">{c.name}</span>
                    <span className="text-[#667085]">Phone: {c.phone || 'N/A'}</span>
                    {c.whatsapp && (
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-xs font-semibold border border-emerald-200">
                        WhatsApp: {c.whatsapp}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full font-bold border border-emerald-200">
                      Auto-linking to Contacts
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveContact(i)}
                      className="p-1 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Remove contact"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-2.5">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer text-center"
            >
              Cancel
            </button>
          )}

          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSubmitting}
            leftIcon={<Send className="w-4 h-4" />}
            className="w-full sm:w-auto rounded-xl px-6 py-2.5"
          >
            Submit Evangelism Report
          </Button>
        </div>
      </form>
    </div>
    </div>
  );
};
