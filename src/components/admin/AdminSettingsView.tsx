import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { SettingsService, DEFAULT_SETTINGS } from '../../services/settingsService';
import { ReportService } from '../../services/reportService';
import { SystemSettings, AuditLog } from '../../types';
import {
  Settings,
  Shield,
  KeyRound,
  Lock,
  Save,
  CheckCircle2,
  AlertCircle,
  Clock,
  Compass,
  Target,
  Bell,
  History,
  ArrowLeft,
} from 'lucide-react';

interface AdminSettingsViewProps {
  onBack?: () => void;
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({ onBack }) => {
  const { currentUser, changePassword } = useAuth();
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<'system' | 'security' | 'audit'>('system');

  // System Settings state
  const [vision, setVision] = useState('');
  const [mission, setMission] = useState('');
  const [target, setTarget] = useState(5000);
  const [deadline, setDeadline] = useState('Sunday at 6:00 PM Ghana Time (Africa/Accra)');

  // Password Change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passMessage, setPassMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Status
  const [isSavingSystem, setIsSavingSystem] = useState(false);
  const [systemSaveNotice, setSystemSaveNotice] = useState('');

  useEffect(() => {
    async function load() {
      const [s, logs] = await Promise.all([
        SettingsService.getSettings(),
        ReportService.getAuditLogs(),
      ]);
      setSettings(s);
      setVision(s.vision);
      setMission(s.mission);
      setTarget(s.annualSoulWinningTarget);
      setDeadline(s.weeklyDeadline);
      setAuditLogs(logs);
    }
    load();
  }, []);

  const handleSaveSystemSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSystem(true);
    setSystemSaveNotice('');
    try {
      await SettingsService.updateSettings({
        vision,
        mission,
        annualSoulWinningTarget: target,
        weeklyDeadline: deadline,
      });
      setSystemSaveNotice('System settings successfully updated across FNI.');
      setTimeout(() => setSystemSaveNotice(''), 3500);
    } finally {
      setIsSavingSystem(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMessage(null);

    if (newPassword.length < 6) {
      setPassMessage({ text: 'Password must be at least 6 characters.', isError: true });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassMessage({ text: 'Passwords do not match.', isError: true });
      return;
    }

    if (newPassword === 'admin123') {
      setPassMessage({ text: 'Cannot reuse the temporary password admin123.', isError: true });
      return;
    }

    setIsChangingPass(true);
    try {
      const res = await changePassword(newPassword);
      if (res.success) {
        setPassMessage({
          text: 'Administrator password successfully updated. Temporary password is permanently disabled.',
          isError: false,
        });
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPassMessage({ text: res.error || 'Password update failed.', isError: true });
      }
    } finally {
      setIsChangingPass(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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
          System Administration & Settings
        </h1>
        <p className="text-xs text-[#667085] mt-0.5">
          Configure ministry vision, soul targets, Sunday deadline parameters, security, and audit logs.
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-[#E3E8EF] p-1 rounded-2xl flex items-center text-xs font-bold text-[#667085] max-w-md">
        <button
          onClick={() => setActiveTab('system')}
          className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'system' ? 'bg-white text-[#182230] shadow-sm' : 'hover:text-[#182230]'
          }`}
        >
          <Settings className="w-3.5 h-3.5 text-[#142B4A]" />
          Ministry Settings
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'security' ? 'bg-white text-[#182230] shadow-sm' : 'hover:text-[#182230]'
          }`}
        >
          <Shield className="w-3.5 h-3.5 text-[#C6A45A]" />
          Admin Security
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'audit' ? 'bg-white text-[#182230] shadow-sm' : 'hover:text-[#182230]'
          }`}
        >
          <History className="w-3.5 h-3.5 text-[#23845B]" />
          Audit Trail
        </button>
      </div>

      {/* TAB 1: MINISTRY SETTINGS */}
      {activeTab === 'system' && (
        <div className="bg-white rounded-2xl border border-[#E3E8EF] p-6 shadow-sm max-w-2xl">
          <form onSubmit={handleSaveSystemSettings} className="space-y-4 text-xs">
            {systemSaveNotice && (
              <div className="p-3 bg-emerald-50 border-l-4 border-[#23845B] text-[#23845B] rounded-xl font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{systemSaveNotice}</span>
              </div>
            )}

            <div>
              <label className="block font-bold text-[#182230] mb-1">
                FNI Kingdom Vision
              </label>
              <textarea
                rows={3}
                value={vision}
                onChange={e => setVision(e.target.value)}
                required
                className="w-full p-2.5 rounded-xl border border-[#E3E8EF] focus:ring-2 focus:ring-[#142B4A]/20 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-[#182230] mb-1">
                FNI Mission Statement
              </label>
              <textarea
                rows={3}
                value={mission}
                onChange={e => setMission(e.target.value)}
                required
                className="w-full p-2.5 rounded-xl border border-[#E3E8EF] focus:ring-2 focus:ring-[#142B4A]/20 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-[#182230] mb-1">
                  Annual Soul-Winning Target
                </label>
                <input
                  type="number"
                  value={target}
                  onChange={e => setTarget(Number(e.target.value))}
                  min={1}
                  required
                  className="w-full p-2.5 rounded-xl border border-[#E3E8EF] focus:ring-2 focus:ring-[#142B4A]/20 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[#182230] mb-1">
                  Reporting Cutoff Deadline
                </label>
                <input
                  type="text"
                  value={deadline}
                  onChange={e => setDeadline(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl border border-[#E3E8EF] focus:ring-2 focus:ring-[#142B4A]/20 focus:outline-none"
                />
                <span className="text-[10px] text-[#667085] mt-0.5 block">
                  Default: Sunday 6:00 PM Ghana Time (Africa/Accra)
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSavingSystem}
                className="px-5 py-2.5 rounded-xl bg-[#142B4A] text-white text-xs font-bold hover:bg-[#203D63] transition-colors shadow-sm flex items-center gap-2"
              >
                <Save className="w-3.5 h-3.5 text-[#C6A45A]" />
                <span>{isSavingSystem ? 'Saving...' : 'Save System Settings'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: ADMINISTRATOR SECURITY */}
      {activeTab === 'security' && (
        <div className="bg-white rounded-2xl border border-[#E3E8EF] p-6 shadow-sm max-w-md">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-[#182230]">Change Administrator Password</h3>
            <p className="text-xs text-[#667085] mt-0.5">
              Secure your leadership account. Passwords persist across deployments.
            </p>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-3.5 text-xs">
            {passMessage && (
              <div
                className={`p-3 rounded-xl border-l-4 font-semibold text-xs flex items-center gap-2 ${
                  passMessage.isError
                    ? 'bg-[#FFF5F5] border-[#C74646] text-[#C74646]'
                    : 'bg-emerald-50 border-[#23845B] text-[#23845B]'
                }`}
              >
                {passMessage.isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                <span>{passMessage.text}</span>
              </div>
            )}

            <div>
              <label className="block font-bold text-[#182230] mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                placeholder="At least 6 characters"
                className="w-full p-2.5 rounded-xl border border-[#E3E8EF] focus:ring-2 focus:ring-[#142B4A]/20 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-[#182230] mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                placeholder="Repeat new password"
                className="w-full p-2.5 rounded-xl border border-[#E3E8EF] focus:ring-2 focus:ring-[#142B4A]/20 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isChangingPass}
              className="w-full py-2.5 rounded-xl bg-[#142B4A] text-white font-bold text-xs hover:bg-[#203D63] transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <KeyRound className="w-3.5 h-3.5 text-[#C6A45A]" />
              <span>{isChangingPass ? 'Updating Password...' : 'Update Administrator Password'}</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-[#E3E8EF] shadow-sm overflow-hidden">
          <div className="py-4 px-6 border-b border-[#E3E8EF]">
            <h3 className="text-sm font-bold text-[#182230]">System Security & Activity Audit Trail</h3>
            <p className="text-xs text-[#667085] mt-0.5">
              Immutable log of administrative decisions, report reviews, and user registrations.
            </p>
          </div>

          <div className="divide-y divide-[#E3E8EF] max-h-96 overflow-y-auto custom-scrollbar">
            {auditLogs.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#667085]">No audit logs recorded yet.</div>
            ) : (
              auditLogs.map(log => (
                <div key={log.id} className="p-4 hover:bg-[#F5F7FA] transition-colors text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#142B4A]">{log.action}</span>
                    <span className="text-[11px] text-[#667085]">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-[#667085] mt-1">
                    {log.user_name ? `By: ${log.user_name} ` : ''} &bull; Entity: {log.entity_type} {log.entity_id ? `(${log.entity_id})` : ''}
                  </div>
                  {log.details && (
                    <div className="text-[11px] text-[#182230] mt-1 font-mono bg-[#F5F7FA] p-1.5 rounded border border-[#E3E8EF]">
                      {JSON.stringify(log.details)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
