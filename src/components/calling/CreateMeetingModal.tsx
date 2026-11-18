import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCall } from '../../context/CallContext';
import { MessagingService } from '../../services/messagingService';
import { CellService } from '../../services/cellService';
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
} from 'lucide-react';

interface CreateMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCellId?: string;
  defaultCellName?: string;
}

export const CreateMeetingModal: React.FC<CreateMeetingModalProps> = ({
  isOpen,
  onClose,
  defaultCellId,
  defaultCellName,
}) => {
  const { currentUser, isAdmin } = useAuth();
  const { startCellMeeting, startGroupMeeting } = useCall();

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

  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsLaunching(true);
    try {
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
    } catch (e: any) {
      alert(e.message || 'Could not launch meeting');
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
      <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 shadow-2xl p-6 text-slate-800 dark:text-slate-100 animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#142B4A] to-[#203D63] text-[#C6A45A] flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Launch FNI Meeting
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Create a high-quality encrypted group room
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

        <form onSubmit={handleLaunch} className="pt-4 space-y-4 text-xs">
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
            <div className="max-h-36 overflow-y-auto custom-scrollbar border border-slate-200 dark:border-white/10 rounded-xl divide-y divide-slate-100 dark:divide-white/5 p-1">
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
                        {tutor.full_name.slice(0, 2).toUpperCase()}
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

          {/* Launch Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLaunching}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#142B4A] to-[#203D63] text-white font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shadow-md"
            >
              <span>{isLaunching ? 'Connecting Room...' : 'Start Meeting Now'}</span>
              <ArrowRight className="w-4 h-4 text-[#C6A45A]" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
