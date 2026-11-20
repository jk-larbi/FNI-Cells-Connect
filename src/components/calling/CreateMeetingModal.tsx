import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCall } from '../../context/CallContext';
import { MessagingService } from '../../services/messagingService';
import { CellService } from '../../services/cellService';
import { ActivityScheduleService } from '../../services/activityScheduleService';
import { ActivityReminderService } from '../../services/activityReminderService';
import { Cell } from '../../types';
import { CallType } from '../../types/calling';
import {
  X,
  Users,
  Video,
  Phone,
  Building,
  Check,
  ArrowRight,
  Calendar,
  Clock,
  MapPin,
  Bell,
  Sparkles,
} from 'lucide-react';

interface CreateMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCellId?: string;
  defaultCellName?: string;
  initialTimingMode?: 'instant' | 'scheduled';
}

export const CreateMeetingModal: React.FC<CreateMeetingModalProps> = ({
  isOpen,
  onClose,
  defaultCellId,
  defaultCellName,
  initialTimingMode = 'instant',
}) => {
  const { currentUser, isAdmin } = useAuth();
  const { startCellMeeting, startGroupMeeting } = useCall();

  const [timingMode, setTimingMode] = useState<'instant' | 'scheduled'>(initialTimingMode);
  const [title, setTitle] = useState(
    defaultCellName ? `${defaultCellName} Fellowship Meeting` : 'FNI Prayer & Leadership Meeting'
  );
  const [callType, setCallType] = useState<CallType>('video');
  const [meetingMode, setMeetingMode] = useState<'cell' | 'group'>(
    defaultCellId ? 'cell' : 'group'
  );
  const [cells, setCells] = useState<Cell[]>([]);
  const [selectedCellId, setSelectedCellId] = useState<string>(defaultCellId || '');
  const [tutors, setTutors] = useState<any[]>([]);
  const [selectedTutorIds, setSelectedTutorIds] = useState<string[]>([]);
  const [isLaunching, setIsLaunching] = useState(false);

  // Scheduled Meeting State (Ghana Time UTC+0)
  const [scheduledDate, setScheduledDate] = useState(() => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return tomorrow.toISOString().slice(0, 10);
  });
  const [scheduledTime, setScheduledTime] = useState('18:00');
  const [location, setLocation] = useState('Online LiveKit Room & Fellowship Center');
  const [description, setDescription] = useState('');
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const platformCapability = ActivityReminderService.getPlatformCapability();

  useEffect(() => {
    if (isOpen) {
      CellService.getCells().then((c: Cell[]) => {
        setCells(c);
        if (!selectedCellId && c.length > 0) {
          setSelectedCellId(c[0].id);
        }
      });

      MessagingService.getMemberDirectory().then(members => {
        if (members) {
          setTutors(members.filter(m => m.id !== currentUser?.id));
        }
      });
    }
  }, [isOpen, currentUser?.id]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsLaunching(true);
    setStatusNotice(null);

    try {
      if (timingMode === 'instant') {
        if (meetingMode === 'cell') {
          const targetCell = cells.find(c => c.id === selectedCellId);
          await startCellMeeting({
            cellId: selectedCellId || defaultCellId || 'general',
            cellName: targetCell?.name || defaultCellName || 'FNI Cell',
            callType,
            invitedMemberIds: selectedTutorIds,
          });
        } else {
          await startGroupMeeting({
            title: title.trim(),
            callType,
            invitedMemberIds: selectedTutorIds,
          });
        }
        onClose();
      } else {
        // Scheduled Future Meeting Mode
        // Anchor properly in Africa/Accra timezone (which is strictly UTC+0)
        const combinedIsoString = `${scheduledDate}T${scheduledTime}:00.000Z`;
        const startMs = new Date(combinedIsoString).getTime();

        if (isNaN(startMs) || startMs <= Date.now()) {
          alert('Please choose a date and start time in the future.');
          setIsLaunching(false);
          return;
        }

        const targetCell = cells.find(c => c.id === selectedCellId);
        await ActivityScheduleService.createScheduledActivity(
          {
            activityType: meetingMode === 'cell' ? 'cell_meeting' : 'group_meeting',
            title: title.trim(),
            description: description.trim() || undefined,
            scheduledStartTime: combinedIsoString,
            cellId: meetingMode === 'cell' ? selectedCellId || defaultCellId : undefined,
            cellName: meetingMode === 'cell' ? targetCell?.name || defaultCellName : undefined,
            location: location.trim() || undefined,
            invitedMemberIds: selectedTutorIds,
            scope: meetingMode === 'cell' ? 'cell' : 'group',
          },
          currentUser || { id: 'unknown_user', name: 'FNI Tutor' }
        );

        setStatusNotice('Meeting scheduled! Reminders queued for 30 minutes before and at start time.');
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (e: any) {
      alert(e.message || 'Could not process meeting request');
    } finally {
      setIsLaunching(false);
    }
  };

  const toggleTutorSelection = (id: string) => {
    setSelectedTutorIds(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 shadow-2xl p-6 text-slate-800 dark:text-slate-100 animate-scaleUp max-h-[92vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#142B4A] to-[#203D63] text-[#C6A45A] flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {timingMode === 'instant' ? 'Launch FNI Meeting' : 'Schedule Future Meeting'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {timingMode === 'instant'
                  ? 'Start an instant encrypted room right now'
                  : 'Schedule meeting with 30m & start-time reminders'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Segmented Control: Start Now vs Schedule for Later */}
        <div className="mt-4 p-1 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 grid grid-cols-2 gap-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => setTimingMode('instant')}
            className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              timingMode === 'instant'
                ? 'bg-white dark:bg-slate-800 text-[#142B4A] dark:text-[#C6A45A] shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Start Now</span>
          </button>
          <button
            type="button"
            onClick={() => setTimingMode('scheduled')}
            className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              timingMode === 'scheduled'
                ? 'bg-white dark:bg-slate-800 text-[#142B4A] dark:text-[#C6A45A] shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Schedule for Later</span>
          </button>
        </div>

        {statusNotice && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{statusNotice}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="pt-4 space-y-4 text-xs">
          {/* Meeting Title */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Meeting Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Adabraka Cell Weekly Fellowship"
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* If Scheduled Mode: Date & Time Picker */}
          {timingMode === 'scheduled' && (
            <div className="p-3.5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 space-y-3">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-bold">
                <Clock className="w-4 h-4 text-[#C6A45A]" />
                <span>Scheduled Time (Africa/Accra • GMT/UTC+0)</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().slice(0, 10)}
                    value={scheduledDate}
                    onChange={e => setScheduledDate(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    required
                    value={scheduledTime}
                    onChange={e => setScheduledTime(e.target.value)}
                    className="w-full p-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Location / Venue / Room
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="e.g. Fellowship Hall / Online LiveKit Room"
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Offline Reminders Notice */}
              <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-white/5 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                  <Bell className="w-3.5 h-3.5" />
                  <span>Automatic Reminders:</span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  • 30 minutes before start time
                  <br />
                  • Exactly when the meeting starts
                  <br />
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">{platformCapability.description}</span>
                </div>
              </div>
            </div>
          )}

          {/* Call Type: Video vs Voice */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Meeting Format
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCallType('video')}
                className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all cursor-pointer ${
                  callType === 'video'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 ring-2 ring-blue-600/20'
                    : 'border-slate-200 dark:border-white/10 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <Video className="w-4 h-4" />
                <span>Video Meeting</span>
              </button>

              <button
                type="button"
                onClick={() => setCallType('voice')}
                className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all cursor-pointer ${
                  callType === 'voice'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 ring-2 ring-blue-600/20'
                    : 'border-slate-200 dark:border-white/10 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <Phone className="w-4 h-4" />
                <span>Voice Only</span>
              </button>
            </div>
          </div>

          {/* Meeting Mode: Cell Fellowship or Custom Group */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Target Audience
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMeetingMode('cell')}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition-all ${
                  meetingMode === 'cell'
                    ? 'border-[#C6A45A] bg-[#C6A45A]/10 text-[#C6A45A]'
                    : 'border-slate-200 dark:border-white/10 text-slate-500'
                }`}
              >
                <Building className="w-3.5 h-3.5" />
                <span>Cell Fellowship</span>
              </button>

              <button
                type="button"
                onClick={() => setMeetingMode('group')}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition-all ${
                  meetingMode === 'group'
                    ? 'border-[#C6A45A] bg-[#C6A45A]/10 text-[#C6A45A]'
                    : 'border-slate-200 dark:border-white/10 text-slate-500'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>General Tutors</span>
              </button>
            </div>
          </div>

          {/* Cell Selector if Cell Mode */}
          {meetingMode === 'cell' && (
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Select Cell
              </label>
              <select
                value={selectedCellId}
                onChange={e => setSelectedCellId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-semibold focus:outline-none"
              >
                {cells.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.location ? `(${c.location})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Invite Tutors list */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Invite Leaders / Tutors (Optional)
            </label>
            <div className="max-h-32 overflow-y-auto custom-scrollbar border border-slate-200 dark:border-white/10 rounded-xl divide-y divide-slate-100 dark:divide-white/5 p-1">
              {tutors.map(tutor => {
                const isSelected = selectedTutorIds.includes(tutor.id);
                return (
                  <div
                    key={tutor.id}
                    onClick={() => toggleTutorSelection(tutor.id)}
                    className="p-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#142B4A] text-white flex items-center justify-center text-[10px] font-bold">
                        {tutor.full_name?.slice(0, 2).toUpperCase() || 'FN'}
                      </div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {tutor.full_name}
                      </span>
                    </div>

                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLaunching}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#142B4A] to-[#203D63] text-white font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shadow-md"
            >
              {timingMode === 'instant' ? (
                <>
                  <span>{isLaunching ? 'Connecting Room...' : 'Start Meeting Now'}</span>
                  <ArrowRight className="w-4 h-4 text-[#C6A45A]" />
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4 text-[#C6A45A]" />
                  <span>{isLaunching ? 'Scheduling...' : 'Schedule Meeting & Reminders'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

