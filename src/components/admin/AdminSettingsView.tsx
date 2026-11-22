import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { PushNotificationService } from '../../services/pushNotificationService';
import { triggerIosInstallGuide, isIosDevice, isStandaloneMode } from '../pwa/IosInstallGuide';
import { Capacitor } from '@capacitor/core';
import { AppUpdateSettingsSection } from '../settings/AppUpdateSettingsSection';
import { ProfilePhotoUploader } from '../common/ProfilePhotoUploader';
import { SettingsService, DEFAULT_SETTINGS } from '../../services/settingsService';
import { ReportService } from '../../services/reportService';
import { DeadlineService, DAYS_OF_WEEK } from '../../services/deadlineService';
import { SystemSettings, AuditLog } from '../../types';
import { supabase } from '../../lib/supabase';
import { useBackHandler } from '../../hooks/useBackHandler';
import { SoulTargetSettingsModal } from './SoulTargetSettingsModal';
import { ICON_STYLES } from '../../utils/iconColors';
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
  BellRing,
  History,
  User,
  Wheat,
  Award,
  Sliders,
  FileCheck,
  Flame,
  Smartphone,
  Layers,
  VolumeX,
  RefreshCw,
  XCircle,
  AlertTriangle,
} from 'lucide-react';

interface AdminSettingsViewProps {
  onBack?: () => void;
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({ onBack }) => {
  const { currentUser, changePassword, updateAvatar, updateProfileDetails } = useAuth();
  const {
    pushPermission,
    isPushSupported,
    isPushEnabled,
    requestPushPermission,
    disablePushNotifications,
  } = useNotifications();
  const [isAdminPushLoading, setIsAdminPushLoading] = useState(false);
  const [adminPushNotice, setAdminPushNotice] = useState<string | null>(null);

  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<'system' | 'security' | 'audit'>('system');

  // System Settings state
  const [vision, setVision] = useState('');
  const [mission, setMission] = useState('');
  const [target, setTarget] = useState(5000);
  const [deadline, setDeadline] = useState('Sunday at 6:00 PM Ghana Time (Africa/Accra)');

  // Deadline Cutoff Day & Time States for Both Report Types
  const [meetingDay, setMeetingDay] = useState(0); // Sunday
  const [meetingTime, setMeetingTime] = useState('18:00');
  const [meetingReminders, setMeetingReminders] = useState(true);

  const [evangDay, setEvangDay] = useState(6); // Saturday
  const [evangTime, setEvangTime] = useState('17:00');
  const [evangReminders, setEvangReminders] = useState(true);

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
  const [showTargetConfigModal, setShowTargetConfigModal] = useState(false);

  // Intercept Back only for settings sub-tabs and nested dialogs.
  // Once on the main settings tab, let AppLayout handle page navigation.
  // Calling onBack here would re-enter AppLayout's interceptor and trap Back.
  useBackHandler(() => {
    if (showTargetConfigModal) {
      setShowTargetConfigModal(false);
      return true;
    }
    if (activeTab !== 'system') {
      setActiveTab('system');
      return true;
    }
    return false;
  }, Boolean(showTargetConfigModal || activeTab !== 'system'));

  useEffect(() => {
    async function load() {
      const [s, logs, dl] = await Promise.all([
        SettingsService.getSettings(),
        ReportService.getAuditLogs(),
        DeadlineService.getDeadlineSettings(),
      ]);
      setSettings(s);
      setVision(s.vision);
      setMission(s.mission);
      setTarget(s.annualSoulWinningTarget);
      setDeadline(s.weeklyDeadline);
      setAuditLogs(logs);

      setMeetingDay(dl.meeting.dayOfWeek);
      setMeetingTime(dl.meeting.deadlineTime);
      setMeetingReminders(dl.meeting.remindersEnabled);
      setEvangDay(dl.evangelism.dayOfWeek);
      setEvangTime(dl.evangelism.deadlineTime);
      setEvangReminders(dl.evangelism.remindersEnabled);

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
      const meetingDayName = DAYS_OF_WEEK.find(d => d.value === Number(meetingDay))?.label || 'Sunday';
      const evangDayName = DAYS_OF_WEEK.find(d => d.value === Number(evangDay))?.label || 'Saturday';
      const summaryDeadline = `Cell Meetings: ${meetingDayName} at ${meetingTime} | Evangelism: ${evangDayName} at ${evangTime} Ghana Time`;

      // 1. Update deadlines in DeadlineService (Supabase & localStorage)
      await DeadlineService.updateDeadlineSettings(
        {
          meeting: {
            reportType: 'meeting',
            dayOfWeek: Number(meetingDay),
            dayName: meetingDayName,
            deadlineTime: meetingTime,
            remindersEnabled: meetingReminders,
          },
          evangelism: {
            reportType: 'evangelism',
            dayOfWeek: Number(evangDay),
            dayName: evangDayName,
            deadlineTime: evangTime,
            remindersEnabled: evangReminders,
          },
        },
        currentUser?.full_name || 'Administrator'
      );

      // 2. Update core foundation in SettingsService
      await SettingsService.updateSettings({
        vision,
        mission,
        annualSoulWinningTarget: target,
        weeklyDeadline: summaryDeadline,
      }, currentUser?.full_name || 'Administrator');

      setDeadline(summaryDeadline);
      setSystemSaveNotice('Vision, Mission, annual target, and cutoff times for both Cell Meetings and Evangelism saved across FNI.');
      setTimeout(() => setSystemSaveNotice(''), 5000);
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
        <h1 className="text-xl font-black text-[#142B4A] tracking-tight">
          System Administration & Settings
        </h1>
        <p className="text-xs text-[#667085] mt-0.5">
          Configure ministry vision, soul targets, Sunday deadline parameters, security, and audit logs.
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-[#E3E8EF] dark:bg-slate-800 p-1 rounded-2xl flex items-center text-xs font-bold text-[#667085] dark:text-slate-400 max-w-md">
        <button
          onClick={() => setActiveTab('system')}
          className={`flex-1 py-2 px-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'system' ? 'bg-white dark:bg-[#142B4A] text-[#182230] dark:text-white shadow-sm' : 'hover:text-[#182230] dark:hover:text-white'
          }`}
        >
          <span className="w-5 h-5 rounded-md flex items-center justify-center bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0">
            <Settings className="w-3.5 h-3.5" />
          </span>
          <span>Ministry Settings</span>
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`flex-1 py-2 px-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'security' ? 'bg-white dark:bg-[#142B4A] text-[#182230] dark:text-white shadow-sm' : 'hover:text-[#182230] dark:hover:text-white'
          }`}
        >
          <span className="w-5 h-5 rounded-md flex items-center justify-center bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 shrink-0">
            <Shield className="w-3.5 h-3.5" />
          </span>
          <span>Admin Security</span>
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex-1 py-2 px-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'audit' ? 'bg-white dark:bg-[#142B4A] text-[#182230] dark:text-white shadow-sm' : 'hover:text-[#182230] dark:hover:text-white'
          }`}
        >
          <span className="w-5 h-5 rounded-md flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 shrink-0">
            <History className="w-3.5 h-3.5" />
          </span>
          <span>Audit Trail</span>
        </button>
      </div>

      {/* TAB 1: MINISTRY SETTINGS */}
      {activeTab === 'system' && (
        <div className="space-y-5 w-full min-w-0">
          <div className="bg-white rounded-2xl border border-[#E3E8EF] p-6 shadow-sm space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              </div>
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
          <div className="bg-[#0c1626] rounded-2xl border border-slate-800 shadow-sm overflow-hidden">
            {/* Header Banner - Clean dark FNI Core Foundation styling */}
            <div className="p-6 bg-[#0f1d32] border-b border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-[#0b1424] border border-[#1e3455] text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Compass className="w-6 h-6 text-[#C6A45A]" strokeWidth={2} />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">FNI Vision & Mission</h2>
                    <div className="mt-1 flex items-center">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#e0b865] bg-[#2a2215] px-2.5 py-0.5 rounded-full border border-[#5c451b]">
                        <Award className="w-3.5 h-3.5 text-[#e0b865]" /> Core Foundation
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-300 mt-2 font-normal leading-relaxed max-w-xl">
                      Apostolic mandate, spiritual vision, mission statement, and ministry harvest targets
                    </p>
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#16233a] border border-slate-700/70 shadow-xs self-start sm:self-auto shrink-0">
                  <span className="text-[#C6A45A] font-bold text-xs">Habakkuk 2:2</span>
                  <span className="text-slate-400 text-xs">•</span>
                  <span className="text-white text-xs font-medium">Write the vision plainly</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveSystemSettings} className="p-6 space-y-6 text-xs bg-[#0c1626]">
              {systemSaveNotice && (
                <div className="p-3.5 bg-emerald-950/40 border-l-4 border-[#23845B] text-emerald-300 rounded-xl font-semibold flex items-center gap-2.5 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{systemSaveNotice}</span>
                </div>
              )}

              {/* FNI Vision */}
              <div className="rounded-xl border border-slate-800 p-4 bg-[#0f1d32]/70 space-y-2 focus-within:border-[#C6A45A] focus-within:ring-2 focus-within:ring-[#C6A45A]/15 transition-all">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <div className="w-6 h-6 rounded-lg bg-[#C6A45A]/20 flex items-center justify-center text-[#C6A45A]">
                      <Compass className="w-3.5 h-3.5" />
                    </div>
                    <span>FNI Vision</span>
                  </div>
                  <span className="text-[10px] font-medium text-slate-400 tabular-nums">
                    {vision.length} characters
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">
                  The spiritual directive and long-term kingdom mandate revealed for Forerunners Network International.
                </p>
                <textarea
                  rows={3}
                  value={vision}
                  onChange={e => setVision(e.target.value)}
                  placeholder="Enter the FNI Vision..."
                  required
                  className="w-full p-3 rounded-lg border border-slate-700 bg-[#16233a] text-white text-xs leading-relaxed placeholder:text-slate-400 focus:border-[#C6A45A] focus:ring-1 focus:ring-[#C6A45A] focus:outline-none transition-all shadow-sm"
                />
              </div>

              {/* FNI Mission Statement */}
              <div className="rounded-xl border border-slate-800 p-4 bg-[#0f1d32]/70 space-y-2 focus-within:border-[#C6A45A] focus-within:ring-2 focus-within:ring-[#C6A45A]/15 transition-all">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <div className="w-6 h-6 rounded-lg bg-[#23845B]/20 flex items-center justify-center text-emerald-400">
                      <Target className="w-3.5 h-3.5" />
                    </div>
                    <span>FNI Mission Statement</span>
                  </div>
                  <span className="text-[10px] font-medium text-slate-400 tabular-nums">
                    {mission.length} characters
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">
                  How the vision is practically deployed across cells, discipleship, evangelism, and leadership nurture.
                </p>
                <textarea
                  rows={3}
                  value={mission}
                  onChange={e => setMission(e.target.value)}
                  placeholder="Enter the FNI Mission Statement..."
                  required
                  className="w-full p-3 rounded-lg border border-slate-700 bg-[#16233a] text-white text-xs leading-relaxed placeholder:text-slate-400 focus:border-[#C6A45A] focus:ring-1 focus:ring-[#C6A45A] focus:outline-none transition-all shadow-sm"
                />
              </div>

              {/* Target & Deadline Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Annual Soul-Winning Target */}
                <div className="rounded-xl border border-slate-800 p-4 bg-[#0f1d32]/70 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-bold text-white">
                      <div className="w-6 h-6 rounded-lg bg-[#C6A45A]/20 flex items-center justify-center text-[#C6A45A]">
                        <Wheat className="w-3.5 h-3.5" />
                      </div>
                      <span>Annual Soul-Winning Target</span>
                    </div>
                    <span className="text-[10px] font-bold text-[#C6A45A] bg-[#C6A45A]/20 px-2.5 py-0.5 rounded-full border border-[#C6A45A]/30 tabular-nums">
                      {Number(target || 0).toLocaleString()} Souls
                    </span>
                  </div>
                  <input
                    type="number"
                    value={target}
                    onChange={e => setTarget(Number(e.target.value))}
                    min={1}
                    required
                    className="w-full p-2.5 rounded-lg border border-slate-700 bg-[#16233a] text-white text-xs font-semibold tabular-nums focus:border-[#C6A45A] focus:ring-1 focus:ring-[#C6A45A] focus:outline-none shadow-sm"
                  />
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setShowTargetConfigModal(true)}
                      className="w-full py-2 px-3 rounded-lg border border-[#C6A45A]/40 bg-[#16233a] hover:bg-[#C6A45A]/15 text-[#C6A45A] text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                    >
                      <Sliders className="w-3 h-3 text-[#C6A45A]" />
                      <span>Configure 16 Cells Target Breakdown</span>
                    </button>
                  </div>
                </div>

                {/* Reporting Cutoff Deadlines for Both Report Types */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-bold text-white text-xs sm:text-sm">
                      <div className="w-6 h-6 rounded-lg bg-indigo-950/40 flex items-center justify-center text-indigo-400">
                        <Clock className="w-3.5 h-3.5" />
                      </div>
                      <span>Reporting Cutoff Deadlines</span>
                    </div>
                    <span className="text-[10px] font-bold text-[#C6A45A] bg-[#C6A45A]/15 px-2 py-0.5 rounded-full border border-[#C6A45A]/30">
                      GMT (Africa/Accra)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* 1. Cell Meeting Reports Cutoff */}
                    <div className="rounded-xl border border-slate-800 p-3.5 bg-[#0f1d32]/80 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-blue-950/50 border border-blue-800/50 flex items-center justify-center text-blue-400">
                            <FileCheck className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-white leading-tight">Cell Meeting Reports</h4>
                            <span className="text-[10px] text-slate-400">Weekly fellowship returns</span>
                          </div>
                        </div>
                        <span className="text-[9px] font-bold text-blue-300 bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-800/60">
                          {DAYS_OF_WEEK.find(d => d.value === Number(meetingDay))?.label} {meetingTime}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                            Cutoff Day
                          </label>
                          <select
                            value={meetingDay}
                            onChange={e => setMeetingDay(Number(e.target.value))}
                            className="w-full p-2 rounded-lg border border-slate-700 bg-[#16233a] text-white text-xs font-semibold focus:border-[#C6A45A] focus:outline-none"
                          >
                            {DAYS_OF_WEEK.map(d => (
                              <option key={d.value} value={d.value}>
                                {d.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                            Cutoff Time
                          </label>
                          <input
                            type="time"
                            value={meetingTime}
                            onChange={e => setMeetingTime(e.target.value)}
                            className="w-full p-2 rounded-lg border border-slate-700 bg-[#16233a] text-white text-xs font-semibold focus:border-[#C6A45A] focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 text-[11px] text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <BellRing className="w-3.5 h-3.5 text-[#C6A45A]" />
                          <span>Deadline reminders</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setMeetingReminders(!meetingReminders)}
                          className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                            meetingReminders ? 'bg-emerald-500' : 'bg-slate-700'
                          }`}
                        >
                          <span
                            className={`block w-4 h-4 rounded-full bg-white transition-transform transform ${
                              meetingReminders ? 'translate-x-4' : 'translate-x-0.5'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* 2. Evangelism Reports Cutoff */}
                    <div className="rounded-xl border border-slate-800 p-3.5 bg-[#0f1d32]/80 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-amber-950/50 border border-amber-800/50 flex items-center justify-center text-amber-400">
                            <Flame className="w-4 h-4 text-[#C6A45A]" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-white leading-tight">Evangelism Reports</h4>
                            <span className="text-[10px] text-slate-400">Souls & outreach returns</span>
                          </div>
                        </div>
                        <span className="text-[9px] font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-800/60">
                          {DAYS_OF_WEEK.find(d => d.value === Number(evangDay))?.label} {evangTime}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                            Cutoff Day
                          </label>
                          <select
                            value={evangDay}
                            onChange={e => setEvangDay(Number(e.target.value))}
                            className="w-full p-2 rounded-lg border border-slate-700 bg-[#16233a] text-white text-xs font-semibold focus:border-[#C6A45A] focus:outline-none"
                          >
                            {DAYS_OF_WEEK.map(d => (
                              <option key={d.value} value={d.value}>
                                {d.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                            Cutoff Time
                          </label>
                          <input
                            type="time"
                            value={evangTime}
                            onChange={e => setEvangTime(e.target.value)}
                            className="w-full p-2 rounded-lg border border-slate-700 bg-[#16233a] text-white text-xs font-semibold focus:border-[#C6A45A] focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 text-[11px] text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <BellRing className="w-3.5 h-3.5 text-[#C6A45A]" />
                          <span>Deadline reminders</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEvangReminders(!evangReminders)}
                          className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                            evangReminders ? 'bg-emerald-500' : 'bg-slate-700'
                          }`}
                        >
                          <span
                            className={`block w-4 h-4 rounded-full bg-white transition-transform transform ${
                              evangReminders ? 'translate-x-4' : 'translate-x-0.5'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Cutoffs are computed strictly in Ghana Time (Africa/Accra, GMT). Submissions after these times are automatically tagged as <em>Submitted Late</em>.
                  </p>
                </div>
              </div>

              {/* Form Action */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-800">
                <span className="text-[11px] text-slate-400">
                  Updates take effect across all tutor dashboards, landing screens, and reports immediately.
                </span>
                <button
                  type="submit"
                  disabled={isSavingSystem}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#142B4A] to-[#203D63] hover:from-[#1b365d] hover:to-[#284b7a] text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer border border-[#C6A45A]/40 shrink-0"
                >
                  <Save className="w-3.5 h-3.5 text-[#C6A45A]" />
                  <span>{isSavingSystem ? 'Saving Core Foundation...' : 'Save Core Foundation'}</span>
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
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#182230]">Administrator Profile</h3>
                <p className="text-xs text-[#667085] mt-0.5">Set the name and unique username shown across FNI. The username can be used with the existing password to sign in.</p>
              </div>
            </div>
            <form onSubmit={handleSaveAdministratorProfile} className="space-y-3 text-xs">
              {profileSaveNotice && <div className={`p-3 rounded-xl border-l-4 font-semibold ${profileSaveNotice.isError ? 'bg-[#FFF5F5] border-[#C74646] text-[#C74646]' : 'bg-emerald-50 border-[#23845B] text-[#23845B]'}`}>{profileSaveNotice.text}</div>}
              <div><label className="block font-bold text-[#182230] mb-1">Full name</label><input type="text" required minLength={2} maxLength={80} value={profileFullName} onChange={e => setProfileFullName(e.target.value)} placeholder="Enter your full name" className="w-full p-2.5 rounded-xl border border-[#E3E8EF] focus:ring-2 focus:ring-[#142B4A]/20 focus:outline-none" /></div>
              <div><label className="block font-bold text-[#182230] mb-1">Username</label><div className="flex items-center rounded-xl border border-[#E3E8EF] focus-within:ring-2 focus-within:ring-[#142B4A]/20"><span className="pl-3 text-[#667085] font-bold">@</span><input type="text" required minLength={3} maxLength={20} pattern="[A-Za-z0-9_]{3,20}" value={profileUsername} onChange={e => setProfileUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} placeholder="your_username" className="w-full p-2.5 rounded-xl focus:outline-none" /></div><span className="text-[10px] text-[#667085] mt-1 block">3–20 characters. Letters, numbers, and underscores only.</span></div>
              <button type="submit" disabled={isSavingProfile} className="px-5 py-2.5 rounded-xl bg-[#142B4A] text-white text-xs font-bold disabled:opacity-60">{isSavingProfile ? 'Saving profile...' : 'Save Profile Details'}</button>
            </form>
          </div>

          {/* Email Notifications */}
          <div className="bg-white rounded-2xl border border-[#E3E8EF] p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#182230]">Email Notifications</h3>
                <p className="text-xs text-[#667085] mt-0.5">Choose where new report alerts should be sent. You can change this address anytime.</p>
              </div>
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

          {/* Device Push Notifications Delivery & Testing (All Devices) */}
          <div className="bg-white rounded-2xl border border-[#E3E8EF] p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#182230] flex items-center gap-1.5">
                    <span>Operating System Push Notifications</span>
                  </h3>
                  <p className="text-xs text-[#667085] mt-0.5">
                    Real operating system notifications on Android phones, iPhones, iPads, and desktop computers.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {Capacitor.isNativePlatform() && (
                  <button
                    type="button"
                    onClick={() => PushNotificationService.openDeviceNotificationSettings()}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs font-bold hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5 text-[#C6A45A]" />
                    <span>Device Settings</span>
                  </button>
                )}

                {isPushEnabled && (
                  <button
                    type="button"
                    disabled={isAdminPushLoading}
                    onClick={async () => {
                      setIsAdminPushLoading(true);
                      try {
                        const res = await PushNotificationService.sendTestPush();
                        if (res.success) {
                          setAdminPushNotice('Test push notification dispatched.');
                        } else {
                          setAdminPushNotice(res.error || 'Failed to dispatch test push.');
                        }
                        setTimeout(() => setAdminPushNotice(null), 5000);
                      } catch (err: any) {
                        setAdminPushNotice(err.message || 'Failed to dispatch notification.');
                      } finally {
                        setIsAdminPushLoading(false);
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#142B4A] text-white text-xs font-bold hover:bg-[#1a3860] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <BellRing className="w-3.5 h-3.5 text-[#C6A45A]" />
                    <span>Test Push</span>
                  </button>
                )}
              </div>
            </div>

            {adminPushNotice && (
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{adminPushNotice}</span>
              </div>
            )}

            {/* iOS Browser Tab Warning */}
            {isIosDevice() && !isStandaloneMode() && !Capacitor.isNativePlatform() && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 space-y-2 text-xs text-amber-900">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Home Screen Required on iPhone &amp; iPad</div>
                    <p className="text-[11px] leading-relaxed mt-0.5">
                      Apple requires adding FNI Cells Connect to your Home Screen on iOS 16.4+ to deliver notifications.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => triggerIosInstallGuide()}
                  className="w-full py-1.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>How to Add to Home Screen</span>
                </button>
              </div>
            )}

            {/* Current Device Detection Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="text-[11px] text-slate-500 font-medium">Current Platform Detection</div>
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  {Capacitor.isNativePlatform() ? (
                    <>
                      <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Android Native APK (FCM HTTP v1)</span>
                    </>
                  ) : isIosDevice() ? (
                    <>
                      <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                      <span>iOS / iPadOS {isStandaloneMode() ? 'Home Screen PWA' : 'Safari Browser'}</span>
                    </>
                  ) : (
                    <>
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Desktop / Web Browser</span>
                    </>
                  )}
                </div>
                <div className="text-[10px] text-slate-400">
                  {Capacitor.isNativePlatform()
                    ? 'Dual high-importance channels (Updates + Calls)'
                    : isIosDevice()
                    ? isStandaloneMode()
                      ? 'Apple Web Push enabled with APNs lock-screen audio'
                      : 'Requires Home Screen installation on iOS'
                    : 'Web Push (VAPID) with browser system alerts'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="text-[11px] text-slate-500 font-medium">OS Permission &amp; Subscription</div>
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  {pushPermission === 'granted' && isPushEnabled ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-700">Active &amp; Subscribed</span>
                    </>
                  ) : pushPermission === 'denied' ? (
                    <>
                      <XCircle className="w-3.5 h-3.5 text-rose-500" />
                      <span className="text-rose-600">Blocked in Device Settings</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-amber-600">Permission Pending</span>
                    </>
                  )}
                </div>
                <div className="text-[10px] text-slate-400">
                  {pushPermission === 'granted' && isPushEnabled
                    ? 'Device token synchronized with Supabase'
                    : pushPermission === 'denied'
                    ? 'Enable notifications in device settings'
                    : 'Tap below to enable push notifications on this device'}
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div>
              {!isPushEnabled ? (
                <button
                  type="button"
                  disabled={isAdminPushLoading}
                  onClick={async () => {
                    if (isIosDevice() && !isStandaloneMode() && !Capacitor.isNativePlatform()) {
                      triggerIosInstallGuide();
                      return;
                    }
                    setIsAdminPushLoading(true);
                    try {
                      const res = await requestPushPermission();
                      if (res?.success) {
                        setAdminPushNotice('Push notifications enabled and registered with Supabase.');
                      } else if (res?.error) {
                        setAdminPushNotice(res.error);
                      }
                      setTimeout(() => setAdminPushNotice(null), 6000);
                    } catch (err: any) {
                      setAdminPushNotice(err.message || 'Could not enable push.');
                    } finally {
                      setIsAdminPushLoading(false);
                    }
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#142B4A] hover:bg-[#1a3860] text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isAdminPushLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#C6A45A]" />
                      <span>Registering Token...</span>
                    </>
                  ) : (
                    <>
                      <Bell className="w-3.5 h-3.5 text-[#C6A45A]" />
                      <span>Enable Push Notifications on this Device</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isAdminPushLoading}
                  onClick={async () => {
                    setIsAdminPushLoading(true);
                    try {
                      await disablePushNotifications();
                      setAdminPushNotice('Push notifications disabled.');
                      setTimeout(() => setAdminPushNotice(null), 4000);
                    } catch (err: any) {
                      setAdminPushNotice(err.message || 'Could not disable notifications.');
                    } finally {
                      setIsAdminPushLoading(false);
                    }
                  }}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                  <span>Disable Push Notifications</span>
                </button>
              )}
            </div>

            {/* Multi-Device Ecosystem Architecture Breakdown */}
            <div className="pt-3 border-t border-slate-200 space-y-2">
              <div className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                <span>Multi-Device Architecture: Active Across All Platforms</span>
                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active Everywhere
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                {/* Android APK */}
                <div className={`p-2.5 rounded-xl border ${
                  Capacitor.isNativePlatform()
                    ? 'border-emerald-300 bg-emerald-50/60'
                    : 'border-slate-200 bg-slate-50'
                } space-y-1`}>
                  <div className="flex items-center justify-between">
                    <div className="font-bold flex items-center gap-1 text-slate-800">
                      <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Android Mobile (APK)</span>
                    </div>
                    {Capacitor.isNativePlatform() && (
                      <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[9px] font-bold">This Device</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    Capacitor Native APK + FCM HTTP v1. Dual high-importance channels with system vibration and audio.
                  </p>
                </div>

                {/* iPhone & iPad */}
                <div className={`p-2.5 rounded-xl border ${
                  isIosDevice()
                    ? 'border-blue-300 bg-blue-50/60'
                    : 'border-slate-200 bg-slate-50'
                } space-y-1`}>
                  <div className="flex items-center justify-between">
                    <div className="font-bold flex items-center gap-1 text-slate-800">
                      <Smartphone className="w-3.5 h-3.5 text-blue-500" />
                      <span>iPhone &amp; iPad (PWA)</span>
                    </div>
                    {isIosDevice() && (
                      <span className="px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700 text-[9px] font-bold">This Device</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    iOS 16.4+ Home Screen PWA via Apple Push (APNs). Standalone full-screen with lock-screen alerts &amp; badge count.
                  </p>
                </div>

                {/* Desktop & Web */}
                <div className={`p-2.5 rounded-xl border ${
                  !Capacitor.isNativePlatform() && !isIosDevice()
                    ? 'border-indigo-300 bg-indigo-50/60'
                    : 'border-slate-200 bg-slate-50'
                } space-y-1`}>
                  <div className="flex items-center justify-between">
                    <div className="font-bold flex items-center gap-1 text-slate-800">
                      <Layers className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Desktop &amp; Laptop</span>
                    </div>
                    {!Capacitor.isNativePlatform() && !isIosDevice() && (
                      <span className="px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-[9px] font-bold">This Device</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    W3C Web Push with VAPID authentication. Real-time background service worker alerts and audio synthesizers.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Android Application Updates & Version Distribution */}
          <AppUpdateSettingsSection />

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
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#182230]">Change Administrator Password</h3>
                <p className="text-xs text-[#667085] mt-0.5">
                  Secure your leadership account. Passwords persist across deployments.
                </p>
              </div>
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
          <div className="py-4 px-6 border-b border-[#E3E8EF] flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0">
              <History className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#182230]">System Security & Activity Audit Trail</h3>
              <p className="text-xs text-[#667085] mt-0.5">
                Immutable log of administrative decisions, report reviews, and user registrations.
              </p>
            </div>
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

      {/* Soul Target Configuration Modal */}
      <SoulTargetSettingsModal
        isOpen={showTargetConfigModal}
        onClose={() => setShowTargetConfigModal(false)}
        onUpdated={async () => {
          const s = await SettingsService.getSettings();
          setTarget(s.annualSoulWinningTarget);
        }}
      />
    </div>
  );
};
