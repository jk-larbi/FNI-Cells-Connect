import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CellService } from '../../services/cellService';
import { ActivityScheduleService } from '../../services/activityScheduleService';
import { ActivityReminderService } from '../../services/activityReminderService';
import { Cell } from '../../types';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  Bell,
  Sparkles,
  HeartHandshake,
  Check,
  Target,
} from 'lucide-react';

interface ScheduleEvangelismModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultCellId?: string;
  defaultCellName?: string;
}

export const ScheduleEvangelismModal: React.FC<ScheduleEvangelismModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultCellId,
  defaultCellName,
}) => {
  const { currentUser, isAdmin } = useAuth();

  const [title, setTitle] = useState('Soul Winning & Evangelism Outreach');
  const [targetLocation, setTargetLocation] = useState('');
  const [description, setDescription] = useState('');
  const [targetSouls, setTargetSouls] = useState<string>('10');
  const [cells, setCells] = useState<Cell[]>([]);
  const [selectedCellId, setSelectedCellId] = useState<string>(defaultCellId || '');
  const [selectedCellName, setSelectedCellName] = useState<string>(defaultCellName || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Scheduled Date & Time (Africa/Accra UTC+0)
  const [scheduledDate, setScheduledDate] = useState(() => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return tomorrow.toISOString().slice(0, 10);
  });
  const [scheduledTime, setScheduledTime] = useState('16:00');

  const platformCapability = ActivityReminderService.getPlatformCapability();

  useEffect(() => {
    if (isOpen) {
      CellService.getCells().then((loadedCells: Cell[]) => {
        setCells(loadedCells);
        if (!selectedCellId && currentUser?.cell_id) {
          setSelectedCellId(currentUser.cell_id);
          const found = loadedCells.find(c => c.id === currentUser.cell_id);
          if (found) setSelectedCellName(found.name);
        } else if (!selectedCellId && loadedCells.length > 0) {
          setSelectedCellId(loadedCells[0].id);
          setSelectedCellName(loadedCells[0].name);
        }
      });
    }
  }, [isOpen, currentUser, selectedCellId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !scheduledDate || !scheduledTime) return;

    setIsSubmitting(true);
    setStatusNotice(null);

    try {
      // Africa/Accra UTC+0 calculation
      const combinedIso = `${scheduledDate}T${scheduledTime}:00.000Z`;
      const startMs = new Date(combinedIso).getTime();

      if (isNaN(startMs) || startMs <= Date.now()) {
        alert('Please choose a date and start time in the future.');
        setIsSubmitting(false);
        return;
      }

      const activeCell = cells.find(c => c.id === selectedCellId);
      const chosenCellName = activeCell?.name || selectedCellName || defaultCellName || currentUser?.cell_name;

      const descWithTarget = [
        targetSouls ? `Target: ${targetSouls} Souls` : '',
        description.trim(),
      ]
        .filter(Boolean)
        .join(' — ');

      await ActivityScheduleService.createScheduledActivity(
        {
          activityType: 'evangelism',
          title: title.trim(),
          description: descWithTarget,
          scheduledStartTime: combinedIso,
          cellId: selectedCellId || currentUser?.cell_id,
          cellName: chosenCellName,
          location: targetLocation.trim() || 'Designated Community Area',
          scope: 'cell',
        },
        currentUser
      );

      setStatusNotice('Outreach scheduled! Reminders set for 30m before & start time.');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 700);
    } catch (err: any) {
      console.error('Failed to schedule evangelism activity:', err);
      alert(`Could not schedule evangelism: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-white/10">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-gradient-to-r from-emerald-900 to-[#142B4A] text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm text-emerald-400">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>Schedule Evangelism Outreach</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-normal">
                  Offline Alarms
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Plan outreach activities with automatic 30-minute & start-time reminders
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {statusNotice && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{statusNotice}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Outreach Title / Focus
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Weekend Street Evangelism & Tract Distribution"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Date & Time (Africa/Accra) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span>Date</span>
              </label>
              <input
                type="date"
                value={scheduledDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={e => setScheduledDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Start Time (Ghana / GMT)</span>
              </label>
              <input
                type="time"
                value={scheduledTime}
                onChange={e => setScheduledTime(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Location / Meeting Point */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>Meeting Point & Target Area</span>
            </label>
            <input
              type="text"
              value={targetLocation}
              onChange={e => setTargetLocation(e.target.value)}
              placeholder="e.g. Central Market Gate & Surrounding Neighborhood"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Target Souls & Cell */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-emerald-600" />
                <span>Target Souls / Goal</span>
              </label>
              <input
                type="number"
                min="1"
                value={targetSouls}
                onChange={e => setTargetSouls(e.target.value)}
                placeholder="10"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span>Cell / Fellowship</span>
              </label>
              <select
                value={selectedCellId}
                onChange={e => {
                  setSelectedCellId(e.target.value);
                  const found = cells.find(c => c.id === e.target.value);
                  if (found) setSelectedCellName(found.name);
                }}
                disabled={!isAdmin && cells.length <= 1}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {cells.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description / Instructions */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Outreach Instructions & Prayer Focus (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Please bring tracts and Bibles. We assemble for 10 minutes of prayer before pairing up."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Offline Reminders Notice */}
          <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-xs text-slate-700 dark:text-slate-300 space-y-1">
            <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-400">
              <Bell className="w-4 h-4" />
              <span>Two Automatic Reminders:</span>
            </div>
            <ul className="text-[11px] list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-400">
              <li><strong>30 minutes before:</strong> Reminds members to prepare and begin heading out.</li>
              <li><strong>At scheduled time:</strong> Notifies that the outreach has started now.</li>
            </ul>
            <div className="text-[10px] text-blue-600 dark:text-blue-400 pt-1 font-semibold">
              {platformCapability.description}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-[#142B4A] text-white text-xs font-bold hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-60"
            >
              <Calendar className="w-4 h-4 text-emerald-300" />
              <span>{isSubmitting ? 'Scheduling...' : 'Schedule Outreach & Reminders'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
