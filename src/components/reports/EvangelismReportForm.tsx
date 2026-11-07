import React, { useState, useEffect } from 'react';
import { Cell, EvangelismReport } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { ReportService } from '../../services/reportService';
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
  const { currentUser } = useAuth();
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
  const [peopleSpokenTo, setPeopleSpokenTo] = useState<number>(0);
  const [contactsCaptured, setContactsCaptured] = useState<number>(0);
  const [conversions, setConversions] = useState<number>(0);
  const [interestedInMinistry, setInterestedInMinistry] = useState<number>(0);
  const [potentialFollowUps, setPotentialFollowUps] = useState<number>(0);
  const [messageUsed, setMessageUsed] = useState('');
  const [notes, setNotes] = useState('');
  const [testimonies, setTestimonies] = useState('');

  // Quick contact capture row state
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [capturedContactsList, setCapturedContactsList] = useState<{ name: string; phone: string }[]>([]);

  useEffect(() => {
    async function loadCells() {
      try {
        const cList = await ReportService.getCells();
        setCells(cList);
        if (!cellId && cList.length > 0) {
          const matching = cList.find(c => c.id === currentUser.cell_id) || cList[0];
          setCellId(matching.id);
          if (!location && matching.name) {
            setLocation(`${matching.name} Territory`);
          }
        }
      } finally {
        setIsLoadingMetadata(false);
      }
    }
    loadCells();
  }, [currentUser, cellId]);

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
    setCapturedContactsList(prev => [...prev, { name: newContactName.trim(), phone: newContactPhone.trim() }]);
    setNewContactName('');
    setNewContactPhone('');
    setContactsCaptured(prev => prev + 1);
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

      const rep = await ReportService.submitEvangelismReport({
        cellId,
        cellName,
        tutorUid: currentUser.id,
        tutorName: currentUser.full_name,
        date,
        location: location.trim(),
        teamMembers: finalTeam,
        peopleSpokenTo: Number(peopleSpokenTo) || 0,
        contactsCaptured: Number(contactsCaptured) || 0,
        conversions: Number(conversions) || 0,
        interestedInMinistry: Number(interestedInMinistry) || 0,
        potentialFollowUps: Number(potentialFollowUps) || 0,
        messageUsed: messageUsed.trim(),
        notes: notes.trim(),
        testimonies: testimonies.trim(),
      });

      // Save any captured contacts directly to follow-up system
      for (const item of capturedContactsList) {
        await FollowUpService.addContact({
          contactName: item.name,
          contactDetails: item.phone || 'Consent provided during outreach',
          dateCaptured: date,
          evangelismLocation: location.trim(),
          cellId,
          cellName,
          tutorUid: currentUser.id,
          assignedToName: currentUser.full_name,
          followUpStatus: 'New Contact',
          followUpNotes: `Met during evangelism outreach at ${location.trim()}.`,
        });
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
                Cell Fellowship <span className="text-rose-500">*</span>
              </label>
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
          <h3 className="text-xs font-bold uppercase tracking-wider text-navy-950 mb-3 flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-gold-500" />
            3. Harvest & Soul-Winning Metrics
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
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
                Interested in Ministry
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
                Potential Follow-ups
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

        {/* Section 5: Optional Instant Follow-up Contact Capture */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-navy-950 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-gold-500" />
                5. Captured Contacts for Immediate Follow-Up (Optional)
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Logged contacts will automatically link to your cell's Follow-Up Management directory
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowAddContact(prev => !prev)}
              className="text-xs font-bold text-navy-900 hover:text-navy-700 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAddContact ? 'Close Form' : '+ Add Contact'}</span>
            </button>
          </div>

          {showAddContact && (
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 mb-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Contact Name..."
                  value={newContactName}
                  onChange={e => setNewContactName(e.target.value)}
                  className="text-xs rounded-xl border border-slate-200 bg-white p-2 text-slate-800"
                />
                <input
                  type="text"
                  placeholder="Phone / WhatsApp / Email..."
                  value={newContactPhone}
                  onChange={e => setNewContactPhone(e.target.value)}
                  className="text-xs rounded-xl border border-slate-200 bg-white p-2 text-slate-800"
                />
              </div>
              <button
                type="button"
                onClick={handleAddQuickContact}
                className="px-3 py-1.5 bg-navy-900 text-white text-xs font-bold rounded-lg hover:bg-navy-950"
              >
                Save Contact to Follow-Up Queue
              </button>
            </div>
          )}

          {capturedContactsList.length > 0 && (
            <div className="space-y-1">
              {capturedContactsList.map((c, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 text-xs">
                  <div className="font-semibold text-navy-950">
                    {c.name} <span className="text-slate-400 font-normal">({c.phone})</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold">
                    Queued for Follow-Up
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
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
            className="rounded-xl px-6"
          >
            Submit Evangelism Report
          </Button>
        </div>
      </form>
    </div>
  );
};
