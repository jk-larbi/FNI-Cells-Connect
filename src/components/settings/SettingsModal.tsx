import React, { useState, useEffect } from 'react';
import { SettingsService, DEFAULT_SETTINGS } from '../../services/settingsService';
import { SystemSettings } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { X, Target, BookOpen, Compass, Clock, Save, CheckCircle2 } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsUpdated?: (settings: SystemSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSettingsUpdated,
}) => {
  const { currentUser, isAdmin } = useAuth();
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [vision, setVision] = useState('');
  const [mission, setMission] = useState('');
  const [target, setTarget] = useState<number>(5000);
  const [weeklyDeadline, setWeeklyDeadline] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      SettingsService.getSettings().then(s => {
        setSettings(s);
        setVision(s.vision);
        setMission(s.mission);
        setTarget(s.annualSoulWinningTarget);
        setWeeklyDeadline(s.weeklyDeadline);
        setSavedSuccess(false);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    try {
      setIsSaving(true);
      const updated = await SettingsService.updateSettings(
        {
          vision,
          mission,
          annualSoulWinningTarget: Number(target) || 5000,
          weeklyDeadline,
        },
        currentUser.full_name || 'Administrator'
      );
      setSettings(updated);
      setSavedSuccess(true);
      if (onSettingsUpdated) {
        onSettingsUpdated(updated);
      }
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1200);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-navy-900 text-gold-400 flex items-center justify-center font-bold">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-navy-950">
                Organisational Vision & Ministry Settings
              </h2>
              <p className="text-xs text-slate-500">
                Configure central FNI CELLS CONNECT targets, vision, and deadlines
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/70 text-slate-600 flex items-center justify-center hover:bg-slate-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          {savedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Organisational settings updated successfully!</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-navy-950 mb-1.5 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-gold-500" />
              <span>Vision Statement</span>
            </label>
            <textarea
              rows={3}
              required
              disabled={!isAdmin}
              value={vision}
              onChange={e => setVision(e.target.value)}
              className="w-full text-xs rounded-2xl border border-slate-200 p-3.5 focus:outline-none focus:ring-2 focus:ring-navy-600 resize-none disabled:bg-slate-50"
              placeholder="Enter church vision statement..."
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-navy-950 mb-1.5 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-gold-500" />
              <span>Mission Statement</span>
            </label>
            <textarea
              rows={3}
              required
              disabled={!isAdmin}
              value={mission}
              onChange={e => setMission(e.target.value)}
              className="w-full text-xs rounded-2xl border border-slate-200 p-3.5 focus:outline-none focus:ring-2 focus:ring-navy-600 resize-none disabled:bg-slate-50"
              placeholder="Enter church mission statement..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-navy-950 mb-1.5 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-gold-500" />
                <span>Annual Soul-Winning Target</span>
              </label>
              <input
                type="number"
                min="1"
                required
                disabled={!isAdmin}
                value={target}
                onChange={e => setTarget(Number(e.target.value))}
                className="w-full text-xs rounded-xl border border-slate-200 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-navy-600 disabled:bg-slate-50 font-bold text-navy-950"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Target measured across all evangelism reports
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-navy-950 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-gold-500" />
                <span>Mandatory Weekly Deadline Rule</span>
              </label>
              <input
                type="text"
                disabled
                value="Sunday at 6:00 PM Ghana Time (Africa/Accra, UTC+0)"
                className="w-full text-xs rounded-xl border border-slate-200 px-3.5 py-2.5 bg-slate-50 text-slate-500 font-semibold"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Enforced system-wide via trusted server time
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <span className="text-[11px] text-slate-400">
              {settings.updatedBy ? `Last updated by ${settings.updatedBy}` : 'System Default Configuration'}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Close
              </button>
              {isAdmin && (
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-navy-900 text-white text-xs font-bold hover:bg-navy-950 transition-colors shadow-sm disabled:opacity-50"
                >
                  <Save className="w-4 h-4 text-gold-400" />
                  <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
