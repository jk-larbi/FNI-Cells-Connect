import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ProfilePhotoUploader } from '../common/ProfilePhotoUploader';
import { SettingsService, DEFAULT_SETTINGS } from '../../services/settingsService';
import { ReportService } from '../../services/reportService';
import { SystemSettings, AuditLog } from '../../types';
import { supabase } from '../../lib/supabase';
import {
  Settings,
  Shield,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Save,
  CheckCircle2,
  AlertCircle,
  Clock,
  Compass,
  Target,
  Bell,
  History,
  ArrowLeft,
  User,
} from 'lucide-react';

interface AdminSettingsViewProps {
  onBack?: () => void;
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({ onBack }) => {
  const { currentUser, changePassword, updateAvatar, updateProfileDetails } = useAuth();
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
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passMessage, setPassMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Status
  const [isSavingSystem, setIsSavingSystem] = useState(false);
  const [systemSaveNotice, setSystemSaveNotice] = useState('');
  const [notificationEmail, setNotificationEmail] = useState('');
  const [emailSaveNotice, setEmailSaveNotice] = useState<{ text: string; isError: boolean } | null>(null);
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [profileFullName, setProfileFullName] = useState(currentUser?.full_name || '');
  const [profileUsername, setProfileUsername] = useState(currentUser?.username || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveNotice, setProfileSaveNotice] = useState<{ text: string; isError: boolean } | null>(null);

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
      const { data: emailSettings } = await supabase.from('admin_notification_settings').select('notification_email').eq('id', 1).maybeSingle();
      setNotificationEmail(emailSettings?.notification_email || '');
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
      }, currentUser?.full_name || 'Administrator');
      setSystemSaveNotice('Vision, Mission, and annual soul-winning target saved across FNI.');
      setTimeout(() => setSystemSaveNotice(''), 4500);
    } catch (error: any) {
      setSystemSaveNotice(error?.message || 'Could not save ministry settings. Please try again.');
    } finally {
      setIsSavingSystem(false);
    }
  };

  useEffect(() => {
    setProfileFullName(currentUser?.full_name || '');
    setProfileUsername(currentUser?.username || '');
  }, [currentUser?.id, currentUser?.full_name, currentUser?.username]);

  const handleSaveAdministratorProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileSaveNotice(null);
    const result = await updateProfileDetails(profileFullName, profileUsername);
    setProfileSaveNotice(result.success
      ? { text: 'Administrator name and username updated across FNI.', isError: false }
      : { text: result.error || 'Could not update administrator profile.', isError: true });
    setIsSavingProfile(false);
  };

  const handleSaveNotificationEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = notificationEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setEmailSaveNotice({ text: 'Enter a valid notification email address.', isError: true });
      return;
    }
    setIsSavingEmail(true);
    setEmailSaveNotice(null);
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error('Please sign in again.');
      const { error } = await supabase.from('admin_notification_settings').upsert({
        id: 1, notification_email: cleanEmail, updated_by: authData.user.id, updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
      if (error) throw error;
      setEmailSaveNotice({ text: 'Notification email saved successfully.', isError: false });
    } catch (error: any) {
      setEmailSaveNotice({ text: error?.message || 'Could not save the notification email.', isError: true });
    } finally { setIsSavingEmail(false); }
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

    setIsChangingPass(true);
    try {
      const res = await changePassword(newPassword);
      if (res.success) {
        setPassMessage({
          text: 'Administrator password successfully updated in Supabase Auth.',
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
        <div className="space-y-5 max-w-2xl">
          <div className="bg-white rounded-2xl border border-[#E3E8EF] p-6 shadow-sm space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#142B4A]/5 flex items-center justify-center shrink-0"><User className="w-5 h-5 text-[#142B4A]" /></div>
              <div><h2 className="text-sm font-bold text-[#142B4A]">Your Administrator Profile</h2><p className="text-xs text-[#667085] mt-1">Set the administrator's full name and unique username. The username is also used for future administrator sign-ins.</p></div>
            </div>
            <form onSubmit={handleSaveAdministratorProfile} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div><label className="block font-bold text-[#182230] mb-1">Full name</label><input type="text" required minLength={2} maxLength={80} value={profileFullName} onChange={e => setProfileFullName(e.target.value)} placeholder="Your real full name" className="w-full p-3 rounded-xl border border-[#D0D5DD] bg-white text-[#182230] placeholder:text-[#98A2B3] focus:ring-2 focus:ring-[#142B4A]/20 focus:border-[#142B4A] focus:outline-none" /></div>
              <div><label className="block font-bold text-[#182230] mb-1">Username</label><div className="flex items-center rounded-xl border border-[#D0D5DD] bg-white focus-within:ring-2 focus-within:ring-[#142B4A]/20"><span className="pl-3 text-[#667085] font-bold">@</span><input type="text" required minLength={3} maxLength={20} pattern="[A-Za-z0-9_]{3,20}" value={profileUsername} onChange={e => setProfileUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} placeholder="your_username" className="w-full p-3 rounded-xl text-[#182230] placeholder:text-[#98A2B3] focus:outline-none" /></div><span className="text-[10px] text-[#667085] mt-1 block">3–20 letters, numbers or underscores.</span></div>
              <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
                <button type="submit" disabled={isSavingProfile} className="px-5 py-2.5 rounded-xl bg-[#142B4A] text-white text-xs font-bold hover:bg-[#203D63] disabled:opacity-60">{isSavingProfile ? 'Saving profile...' : 'Save Name & Username'}</button>
                {profileSaveNotice && <span className={`text-xs font-semibold ${profileSaveNotice.isError ? 'text-rose-700' : 'text-emerald-700'}`}>{profileSaveNotice.text}</span>}
              </div>
            </form>
          </div>
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
        </div>
      )}

      {/* TAB 2: ADMINISTRATOR PROFILE & SECURITY */}
      {activeTab === 'security' && (
        <div className="space-y-6 max-w-md">
          <div className="bg-white rounded-2xl border border-[#E3E8EF] p-6 shadow-sm space-y-3">
            <div><h3 className="text-sm font-bold text-[#182230]">Administrator Profile</h3><p className="text-xs text-[#667085] mt-0.5">Set the name and unique username shown across FNI. The username can be used with the existing password to sign in.</p></div>
            <form onSubmit={handleSaveAdministratorProfile} className="space-y-3 text-xs">
              {profileSaveNotice && <div className={`p-3 rounded-xl border-l-4 font-semibold ${profileSaveNotice.isError ? 'bg-[#FFF5F5] border-[#C74646] text-[#C74646]' : 'bg-emerald-50 border-[#23845B] text-[#23845B]'}`}>{profileSaveNotice.text}</div>}
              <div><label className="block font-bold text-[#182230] mb-1">Full name</label><input type="text" required minLength={2} maxLength={80} value={profileFullName} onChange={e => setProfileFullName(e.target.value)} placeholder="Enter your full name" className="w-full p-2.5 rounded-xl border border-[#E3E8EF] focus:ring-2 focus:ring-[#142B4A]/20 focus:outline-none" /></div>
              <div><label className="block font-bold text-[#182230] mb-1">Username</label><div className="flex items-center rounded-xl border border-[#E3E8EF] focus-within:ring-2 focus-within:ring-[#142B4A]/20"><span className="pl-3 text-[#667085] font-bold">@</span><input type="text" required minLength={3} maxLength={20} pattern="[A-Za-z0-9_]{3,20}" value={profileUsername} onChange={e => setProfileUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} placeholder="your_username" className="w-full p-2.5 rounded-xl focus:outline-none" /></div><span className="text-[10px] text-[#667085] mt-1 block">3–20 characters. Letters, numbers, and underscores only.</span></div>
              <button type="submit" disabled={isSavingProfile} className="px-5 py-2.5 rounded-xl bg-[#142B4A] text-white text-xs font-bold disabled:opacity-60">{isSavingProfile ? 'Saving profile...' : 'Save Profile Details'}</button>
            </form>
          </div>

          <div className="bg-white rounded-2xl border border-[#E3E8EF] p-6 shadow-sm space-y-3">
            <div>
              <h3 className="text-sm font-bold text-[#182230]">Email Notifications</h3>
              <p className="text-xs text-[#667085] mt-0.5">Choose where new report alerts should be sent. You can change this address anytime.</p>
            </div>
            <form onSubmit={handleSaveNotificationEmail} className="space-y-3 text-xs">
              {emailSaveNotice && <div className={`p-3 rounded-xl border-l-4 font-semibold ${emailSaveNotice.isError ? 'bg-[#FFF5F5] border-[#C74646] text-[#C74646]' : 'bg-emerald-50 border-[#23845B] text-[#23845B]'}`}>{emailSaveNotice.text}</div>}
              <div>
                <label className="block font-bold text-[#182230] mb-1">Administrator notification email</label>
                <input type="email" required value={notificationEmail} onChange={e => setNotificationEmail(e.target.value)} placeholder="Email for report alerts" className="w-full p-2.5 rounded-xl border border-[#E3E8EF] focus:ring-2 focus:ring-[#142B4A]/20 focus:outline-none" />
              </div>
              <button type="submit" disabled={isSavingEmail} className="px-5 py-2.5 rounded-xl bg-[#142B4A] text-white text-xs font-bold disabled:opacity-60">{isSavingEmail ? 'Saving...' : 'Save Notification Email'}</button>
            </form>
          </div>

          {/* Administrator Profile Photo */}
          <div className="bg-white rounded-2xl border border-[#E3E8EF] p-6 shadow-sm space-y-3">
            <div>
              <h3 className="text-sm font-bold text-[#182230]">Administrator Profile Photo</h3>
              <p className="text-xs text-[#667085] mt-0.5">
                Official portrait displayed in the navigation header, leadership oversight cards, and communications.
              </p>
            </div>

            <ProfilePhotoUploader
              currentAvatarUrl={currentUser?.avatar_url}
              userName={currentUser?.full_name}
              userRole="Administrator"
              size="md"
              onPhotoUploaded={async (url) => {
                await updateAvatar(url);
              }}
              onPhotoRemoved={async () => {
                await updateAvatar('');
              }}
            />
          </div>

          <div className="bg-white rounded-2xl border border-[#E3E8EF] p-6 shadow-sm">
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
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  placeholder="At least 6 characters"
                  className="w-full p-2.5 pr-10 rounded-xl border border-[#E3E8EF] focus:ring-2 focus:ring-[#142B4A]/20 focus:outline-none"
                />
                <button
                  type="button"
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-2.5 text-[#667085] hover:text-[#142B4A] focus:outline-none cursor-pointer"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4 text-[#C6A45A]" /> : <Eye className="w-4 h-4 text-[#667085]" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block font-bold text-[#182230] mb-1">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Repeat new password"
                  className="w-full p-2.5 pr-10 rounded-xl border border-[#E3E8EF] focus:ring-2 focus:ring-[#142B4A]/20 focus:outline-none"
                />
                <button
                  type="button"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2.5 text-[#667085] hover:text-[#142B4A] focus:outline-none cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4 text-[#C6A45A]" /> : <Eye className="w-4 h-4 text-[#667085]" />}
                </button>
              </div>
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
