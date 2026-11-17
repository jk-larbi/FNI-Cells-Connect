import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme, ThemePreference } from '../../context/ThemeContext';
import { NotificationService, DEFAULT_NOTIFICATION_PREFERENCES } from '../../services/notificationService';
import { UserNotificationPreferences, UserGeneralPreferences } from '../../types';
import { ProfilePhotoUploader } from '../common/ProfilePhotoUploader';
import {
  User,
  Mail,
  Phone,
  Building,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Save,
  ArrowLeft,
  Trash2,
  Palette,
  Bell,
  Sun,
  Moon,
  Laptop,
  Globe,
  Clock,
  Calendar,
  Shield,
  ShieldCheck,
  HelpCircle,
  FileText,
  ChevronRight,
  Smartphone,
  Upload,
  RefreshCw,
  X,
  AlertTriangle,
  Send,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

export interface ProfileSettingsProps {
  isOpen?: boolean;
  onClose?: () => void;
  initialSection?: ProfileSection;
  inline?: boolean;
  onBack?: () => void;
}

export type ProfileSection =
  | 'menu'
  | 'manage_profile'
  | 'password_security'
  | 'notifications'
  | 'chat_wallpaper'
  | 'appearance'
  | 'general'
  | 'help_support'
  | 'privacy_policy'
  | 'terms_of_service'
  | 'deactivate_account';

const BUILT_IN_WALLPAPERS = [
  { id: 'default', name: 'Classic Default', color: '#F5F7FA', previewStyle: { backgroundColor: '#F5F7FA' }, image: 'none' },
  { id: 'navy_mesh', name: 'Royal Navy Mesh', color: '#142B4A', previewStyle: { background: 'linear-gradient(135deg, #142B4A 0%, #1A365D 50%, #203D63 100%)' }, image: 'linear-gradient(135deg, #142B4A 0%, #1A365D 50%, #203D63 100%)' },
  { id: 'golden_dawn', name: 'Golden Dawn', color: '#FAF6ED', previewStyle: { background: 'radial-gradient(circle at 18% 18%, rgba(198,164,90,.3), transparent 45%), radial-gradient(circle at 82% 82%, rgba(198,164,90,.2), transparent 40%), #FAF6ED' }, image: 'radial-gradient(circle at 18% 18%, rgba(198,164,90,.25), transparent 45%), radial-gradient(circle at 82% 82%, rgba(198,164,90,.18), transparent 40%), #FAF6ED' },
  { id: 'ocean_breeze', name: 'Ocean Breeze', color: '#EAF2FB', previewStyle: { background: 'radial-gradient(circle at 15% 20%, rgba(91,145,205,.25) 0 2px, transparent 3px), radial-gradient(circle at 80% 70%, rgba(91,145,205,.2) 0 2px, transparent 3px), #EAF2FB' }, image: 'radial-gradient(circle at 15% 20%, rgba(91,145,205,.2) 0 2px, transparent 3px), radial-gradient(circle at 80% 70%, rgba(91,145,205,.15) 0 2px, transparent 3px), #EAF2FB' },
  { id: 'lavender_peace', name: 'Lavender Peace', color: '#F1EEFA', previewStyle: { background: 'radial-gradient(circle at 20% 25%, rgba(137,112,190,.25), transparent 40%), #F1EEFA' }, image: 'radial-gradient(circle at 20% 25%, rgba(137,112,190,.2), transparent 40%), #F1EEFA' },
  { id: 'sage_harmony', name: 'Sage Harmony', color: '#EDF4EF', previewStyle: { background: 'radial-gradient(circle at 80% 20%, rgba(91,145,108,.25), transparent 35%), #EDF4EF' }, image: 'radial-gradient(circle at 80% 20%, rgba(91,145,108,.2), transparent 35%), #EDF4EF' },
  { id: 'midnight_depth', name: 'Midnight Depth', color: '#0B132B', previewStyle: { background: 'linear-gradient(180deg, #0B132B 0%, #1C2541 100%)' }, image: 'linear-gradient(180deg, #0B132B 0%, #1C2541 100%)' },
];

const SOLID_COLORS = [
  { id: 'solid_classic', name: 'Classic Grey', color: '#F5F7FA' },
  { id: 'solid_warm', name: 'Warm Paper', color: '#FAF6ED' },
  { id: 'solid_ice', name: 'Ice Blue', color: '#EAF2FB' },
  { id: 'solid_mint', name: 'Soft Mint', color: '#F0FDF4' },
  { id: 'solid_navy', name: 'Deep Royal Navy', color: '#142B4A' },
  { id: 'solid_night', name: 'Dark Slate', color: '#0F172A' },
];

const DEFAULT_GENERAL_PREFS: UserGeneralPreferences = {
  language: 'en-UK',
  timeFormat: '12h',
  dateFormat: 'DD/MM/YYYY',
  defaultDashboard: 'default',
  timezone: 'Africa/Accra',
};

export const ProfileSettingsModal: React.FC<ProfileSettingsProps> = ({
  isOpen = false,
  onClose,
  initialSection = 'menu',
  inline = false,
  onBack,
}) => {
  const {
    currentUser,
    isAdmin,
    isTutor,
    changePassword,
    updateAvatar,
    updateUserProfile,
    signOutOtherDevices,
    requestAccountDeactivation,
    logout,
  } = useAuth();

  const { theme, themePreference, setThemePreference } = useTheme();

  // Navigation state
  const [currentSection, setCurrentSection] = useState<ProfileSection>(initialSection);

  // 1. Personal Information State
  const [fullName, setFullName] = useState(currentUser?.full_name || '');
  const [phoneNumber, setPhoneNumber] = useState(currentUser?.phone_number || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileNotice, setProfileNotice] = useState<{ isError: boolean; text: string } | null>(null);

  // 2. Password & Security State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passNotice, setPassNotice] = useState<{ isError: boolean; text: string } | null>(null);
  const [isSigningOutOthers, setIsSigningOutOthers] = useState(false);
  const [deviceNotice, setDeviceNotice] = useState<string | null>(null);

  // 3. Notification Preferences State
  const [notifPrefs, setNotifPrefs] = useState<UserNotificationPreferences>(() =>
    currentUser?.id ? NotificationService.getUserNotificationPreferences(currentUser.id) : DEFAULT_NOTIFICATION_PREFERENCES
  );
  const [notifSaveNotice, setNotifSaveNotice] = useState<string | null>(null);

  // 4. Chat Wallpaper State
  const wallpaperStorageKey = `fni-chat-wallpapers:${currentUser?.id || 'guest'}`;
  const [chatWallpapers, setChatWallpapers] = useState<Record<string, string>>({});
  const [chatWallpaperImages, setChatWallpaperImages] = useState<Record<string, string>>({});
  const [wallpaperScope, setWallpaperScope] = useState<'all' | 'community' | 'private'>('all');
  const [selectedIndividualChat, setSelectedIndividualChat] = useState<string>('community');
  const [activeWallpaperChoice, setActiveWallpaperChoice] = useState<string>('default');
  const [wallpaperNotice, setWallpaperNotice] = useState<string | null>(null);

  // 5. General Preferences State
  const generalPrefsKey = `fni_general_prefs:${currentUser?.id || 'guest'}`;
  const [generalPrefs, setGeneralPrefs] = useState<UserGeneralPreferences>(() => {
    try {
      const raw = localStorage.getItem(generalPrefsKey);
      return raw ? { ...DEFAULT_GENERAL_PREFS, ...JSON.parse(raw) } : DEFAULT_GENERAL_PREFS;
    } catch {
      return DEFAULT_GENERAL_PREFS;
    }
  });

  // 6. Deactivation Request State
  const [deactReason, setDeactReason] = useState('');
  const [deactConfirmation, setDeactConfirmation] = useState(false);
  const [isSubmittingDeact, setIsSubmittingDeact] = useState(false);
  const [deactNotice, setDeactNotice] = useState<{ isError: boolean; text: string } | null>(null);

  // Synchronize inputs when modal opens or user changes
  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.full_name || '');
      setPhoneNumber(currentUser.phone_number || '');
      setEmail(currentUser.email || '');
      setNotifPrefs(NotificationService.getUserNotificationPreferences(currentUser.id));
    }
  }, [currentUser, isOpen]);

  // Load chat wallpapers
  useEffect(() => {
    try {
      const saved = localStorage.getItem(wallpaperStorageKey);
      const images = localStorage.getItem(`${wallpaperStorageKey}:images`);
      const parsedWallpapers = saved ? JSON.parse(saved) : {};
      setChatWallpapers(parsedWallpapers);
      setChatWallpaperImages(images ? JSON.parse(images) : {});
      setActiveWallpaperChoice(parsedWallpapers['community'] || 'default');
    } catch {
      setChatWallpapers({});
      setChatWallpaperImages({});
    }
  }, [wallpaperStorageKey, isOpen]);

  if (!isOpen) return null;

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  // Save Personal Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileNotice(null);
    if (!fullName.trim() || fullName.trim().length < 2) {
      setProfileNotice({ isError: true, text: 'Please enter a valid full name.' });
      return;
    }

    setIsSavingProfile(true);
    try {
      const res = await updateUserProfile({
        full_name: fullName.trim(),
        phone_number: phoneNumber.trim(),
        email: email.trim(),
      });
      if (res.success) {
        setProfileNotice({ isError: false, text: 'Profile information saved successfully.' });
      } else {
        setProfileNotice({ isError: true, text: res.error || 'Failed to update profile.' });
      }
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Change Password
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassNotice(null);
    if (newPassword.length < 6) {
      setPassNotice({ isError: true, text: 'Password must be at least 6 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassNotice({ isError: true, text: 'Passwords do not match.' });
      return;
    }

    setIsChangingPass(true);
    try {
      const res = await changePassword(newPassword);
      if (res.success) {
        setPassNotice({ isError: false, text: 'Password updated successfully.' });
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPassNotice({ isError: true, text: res.error || 'Password update failed.' });
      }
    } finally {
      setIsChangingPass(false);
    }
  };

  // Sign out other devices
  const handleSignOutOtherDevices = async () => {
    setIsSigningOutOthers(true);
    setDeviceNotice(null);
    try {
      const res = await signOutOtherDevices();
      if (res.success) {
        setDeviceNotice('All other active device sessions have been securely signed out.');
      } else {
        setDeviceNotice(res.error || 'Failed to sign out other devices.');
      }
    } finally {
      setIsSigningOutOthers(false);
    }
  };

  // Notification toggle handler
  const handleToggleNotif = (key: keyof UserNotificationPreferences) => {
    if (!currentUser?.id) return;
    const next = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(next);
    NotificationService.saveUserNotificationPreferences(currentUser.id, next);
    setNotifSaveNotice('Notification preferences saved.');
    setTimeout(() => setNotifSaveNotice(null), 3000);
  };

  // Chat Wallpaper Handlers
  const handleSelectWallpaper = (id: string) => {
    setActiveWallpaperChoice(id);
    const targetKey = wallpaperScope === 'all' ? 'community' : selectedIndividualChat;
    const nextWallpapers = { ...chatWallpapers, [targetKey]: id };
    if (wallpaperScope === 'all') {
      nextWallpapers['default_general'] = id;
    }
    setChatWallpapers(nextWallpapers);

    try {
      localStorage.setItem(wallpaperStorageKey, JSON.stringify(nextWallpapers));
    } catch {}

    window.dispatchEvent(new CustomEvent('fni-chat-wallpaper-updated'));
    setWallpaperNotice(`Wallpaper applied to ${wallpaperScope === 'all' ? 'all conversations' : 'selected conversation'}.`);
    setTimeout(() => setWallpaperNotice(null), 3500);
  };

  const handleUploadWallpaperFile = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setWallpaperNotice('Please choose an image file (PNG, JPG, WebP).');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setWallpaperNotice('Please choose an image smaller than 3 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      const dataUrl = reader.result;
      const targetKey = wallpaperScope === 'all' ? 'community' : selectedIndividualChat;
      const nextImages = { ...chatWallpaperImages, [targetKey]: dataUrl };
      setChatWallpaperImages(nextImages);

      try {
        localStorage.setItem(`${wallpaperStorageKey}:images`, JSON.stringify(nextImages));
      } catch {
        setWallpaperNotice('Image too large for device storage. Please use a smaller photo.');
        return;
      }

      handleSelectWallpaper('custom');
      setWallpaperNotice('Custom photo wallpaper saved and applied.');
    };
    reader.readAsDataURL(file);
  };

  const handleResetWallpaper = () => {
    const targetKey = wallpaperScope === 'all' ? 'community' : selectedIndividualChat;
    const nextWallpapers = { ...chatWallpapers };
    const nextImages = { ...chatWallpaperImages };
    delete nextWallpapers[targetKey];
    delete nextImages[targetKey];
    setChatWallpapers(nextWallpapers);
    setChatWallpaperImages(nextImages);

    try {
      localStorage.setItem(wallpaperStorageKey, JSON.stringify(nextWallpapers));
      localStorage.setItem(`${wallpaperStorageKey}:images`, JSON.stringify(nextImages));
    } catch {}

    setActiveWallpaperChoice('default');
    window.dispatchEvent(new CustomEvent('fni-chat-wallpaper-updated'));
    setWallpaperNotice('Restored default chat wallpaper.');
    setTimeout(() => setWallpaperNotice(null), 3000);
  };

  // General Preferences Handlers
  const handleUpdateGeneralPrefs = (patch: Partial<UserGeneralPreferences>) => {
    const next = { ...generalPrefs, ...patch };
    setGeneralPrefs(next);
    try {
      localStorage.setItem(generalPrefsKey, JSON.stringify(next));
    } catch {}
  };

  // Submit Deactivation Request
  const handleSubmitDeactivation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deactConfirmation) {
      setDeactNotice({ isError: true, text: 'Please confirm that you understand this will route a request to Admin.' });
      return;
    }

    setIsSubmittingDeact(true);
    setDeactNotice(null);
    try {
      const res = await requestAccountDeactivation(deactReason);
      if (res.success) {
        setDeactNotice({
          isError: false,
          text: 'Your deactivation request has been submitted to FNI Administration for review. Your records remain preserved.',
        });
        setDeactReason('');
        setDeactConfirmation(false);
      } else {
        setDeactNotice({ isError: true, text: res.error || 'Failed to submit request.' });
      }
    } finally {
      setIsSubmittingDeact(false);
    }
  };

  // Compute live wallpaper preview style
  const getPreviewBackgroundStyle = () => {
    const targetKey = wallpaperScope === 'all' ? 'community' : selectedIndividualChat;
    if (activeWallpaperChoice === 'custom' && chatWallpaperImages[targetKey]) {
      return {
        backgroundImage: `url(${chatWallpaperImages[targetKey]})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }
    const solid = SOLID_COLORS.find(s => s.id === activeWallpaperChoice);
    if (solid) {
      return { backgroundColor: solid.color };
    }
    const builtIn = BUILT_IN_WALLPAPERS.find(b => b.id === activeWallpaperChoice);
    if (builtIn) {
      return {
        backgroundColor: builtIn.color,
        backgroundImage: builtIn.image !== 'none' ? builtIn.image : undefined,
        backgroundSize: 'cover',
      };
    }
    return { backgroundColor: '#F5F7FA' };
  };

  const content = (
    <div className={`relative w-full ${inline ? 'max-w-2xl mx-auto' : 'max-w-xl my-auto max-h-[92vh] shadow-2xl'} bg-white dark:bg-[#111c2d] rounded-3xl border border-slate-100 dark:border-[#26384d] overflow-hidden flex flex-col transition-all`}>
      {/* HEADER BAR */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-[#26384d] bg-white dark:bg-[#111c2d] sticky top-0 z-20">
        <div className="flex items-center gap-2">
          {currentSection !== 'menu' ? (
            <button
              type="button"
              onClick={() => setCurrentSection('menu')}
              className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer transition-colors"
              title="Back to Settings Menu"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : inline && onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer transition-colors"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : null}
          <h2 className="text-base sm:text-lg font-black text-[#142B4A] dark:text-white tracking-tight">
            {currentSection === 'menu' && 'Profile Settings'}
            {currentSection === 'manage_profile' && 'Manage Profile'}
            {currentSection === 'password_security' && 'Password & Security'}
            {currentSection === 'notifications' && 'Notification Preferences'}
            {currentSection === 'chat_wallpaper' && 'Chat Wallpaper'}
            {currentSection === 'appearance' && 'Theme & Appearance'}
            {currentSection === 'general' && 'General Preferences'}
            {currentSection === 'help_support' && 'Help & Support'}
            {currentSection === 'privacy_policy' && 'Privacy Policy'}
            {currentSection === 'terms_of_service' && 'Terms of Service'}
            {currentSection === 'deactivate_account' && 'Request Deactivation'}
          </h2>
        </div>

        {!inline && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors"
            title="Close Settings"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

        {/* MODAL BODY (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* =========================================================================
              SECTION 0: ROOT PROFILE OVERVIEW (Matching "After" side of reference)
          ========================================================================== */}
          {currentSection === 'menu' && (
            <div className="space-y-6">
              
              {/* TOP USER PROFILE CARD (Prominent User Banner) */}
              <div className="p-4 sm:p-5 rounded-3xl bg-slate-50/70 dark:bg-[#152338] border border-slate-200/80 dark:border-[#26384d] flex items-center gap-4 shadow-xs">
                {/* Avatar with photo uploader badge */}
                <div className="relative shrink-0">
                  <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-[#142B4A] text-[#C6A45A] font-black text-xl flex items-center justify-center overflow-hidden shadow-md border-2 border-white dark:border-[#26384d]">
                    {currentUser?.avatar_url ? (
                      <img
                        src={currentUser.avatar_url}
                        alt={currentUser.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      currentUser?.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('') || 'FN'
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-black text-[#142B4A] dark:text-white truncate">
                    {currentUser?.full_name || 'FNI Leader'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {currentUser?.email || 'Registered Cell Leader'}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#142B4A]/10 dark:bg-amber-400/10 text-[#142B4A] dark:text-amber-300 text-[10px] font-bold">
                      {isAdmin ? 'Administrator' : currentUser?.cell_name || 'Tutor / Cell Leader'}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Active
                    </span>
                  </div>
                </div>
              </div>

              {/* GROUP 1: ACCOUNT (Matching reference structure) */}
              <div className="space-y-2">
                <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2">
                  Account
                </div>
                <div className="rounded-2xl border border-slate-200/80 dark:border-[#26384d] bg-white dark:bg-[#152338] divide-y divide-slate-100 dark:divide-[#26384d] overflow-hidden shadow-xs">
                  
                  {/* Manage Profile */}
                  <button
                    type="button"
                    onClick={() => setCurrentSection('manage_profile')}
                    className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-[#142B4A] dark:text-[#C6A45A]" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#182230] dark:text-white">Manage Profile</div>
                        <div className="text-[11px] text-slate-400">Name, phone, email & cell information</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* Password & Security */}
                  <button
                    type="button"
                    onClick={() => setCurrentSection('password_security')}
                    className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
                        <Lock className="w-4 h-4 text-[#142B4A] dark:text-[#C6A45A]" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#182230] dark:text-white">Password & Security</div>
                        <div className="text-[11px] text-slate-400">Credentials, active sessions & device logout</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* Notifications */}
                  <button
                    type="button"
                    onClick={() => setCurrentSection('notifications')}
                    className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
                        <Bell className="w-4 h-4 text-[#142B4A] dark:text-[#C6A45A]" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#182230] dark:text-white">Notifications</div>
                        <div className="text-[11px] text-slate-400">Deadlines, assignments, quizzes & announcements</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-emerald-600">Active</span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </button>

                  {/* Chat Wallpaper & Appearance */}
                  <button
                    type="button"
                    onClick={() => setCurrentSection('chat_wallpaper')}
                    className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
                        <Palette className="w-4 h-4 text-[#142B4A] dark:text-[#C6A45A]" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#182230] dark:text-white">Chat Appearance</div>
                        <div className="text-[11px] text-slate-400">Custom wallpapers, solid colors & previews</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>

              {/* GROUP 2: PREFERENCES */}
              <div className="space-y-2">
                <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2">
                  Preferences
                </div>
                <div className="rounded-2xl border border-slate-200/80 dark:border-[#26384d] bg-white dark:bg-[#152338] divide-y divide-slate-100 dark:divide-[#26384d] overflow-hidden shadow-xs">
                  
                  {/* Theme / Appearance */}
                  <button
                    type="button"
                    onClick={() => setCurrentSection('appearance')}
                    className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
                        {theme === 'dark' ? <Moon className="w-4 h-4 text-[#C6A45A]" /> : <Sun className="w-4 h-4 text-[#C6A45A]" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#182230] dark:text-white">Theme</div>
                        <div className="text-[11px] text-slate-400">Light, Dark, System Default</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-500 capitalize">{themePreference}</span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </button>

                  {/* General Preferences */}
                  <button
                    type="button"
                    onClick={() => setCurrentSection('general')}
                    className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
                        <Globe className="w-4 h-4 text-[#142B4A] dark:text-[#C6A45A]" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#182230] dark:text-white">Language & Time</div>
                        <div className="text-[11px] text-slate-400">English &bull; Ghana Time (Africa/Accra)</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-500">English</span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </button>
                </div>
              </div>

              {/* GROUP 3: SUPPORT */}
              <div className="space-y-2">
                <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2">
                  Support & Policies
                </div>
                <div className="rounded-2xl border border-slate-200/80 dark:border-[#26384d] bg-white dark:bg-[#152338] divide-y divide-slate-100 dark:divide-[#26384d] overflow-hidden shadow-xs">
                  
                  {/* Help Center */}
                  <button
                    type="button"
                    onClick={() => setCurrentSection('help_support')}
                    className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
                        <HelpCircle className="w-4 h-4 text-[#142B4A] dark:text-[#C6A45A]" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#182230] dark:text-white">Help & Support</div>
                        <div className="text-[11px] text-slate-400">Contact FNI administration and guides</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* Privacy Policy */}
                  <button
                    type="button"
                    onClick={() => setCurrentSection('privacy_policy')}
                    className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
                        <Shield className="w-4 h-4 text-[#142B4A] dark:text-[#C6A45A]" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#182230] dark:text-white">Privacy Policy</div>
                        <div className="text-[11px] text-slate-400">Data retention & cell record isolation</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  {/* Terms of Service */}
                  <button
                    type="button"
                    onClick={() => setCurrentSection('terms_of_service')}
                    className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-[#142B4A] dark:text-[#C6A45A]" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#182230] dark:text-white">Terms of Service</div>
                        <div className="text-[11px] text-slate-400">Reporting guidelines & code of conduct</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>

              {/* GROUP 4: ACCOUNT ACTIONS */}
              <div className="space-y-2 pt-2">
                <div className="rounded-2xl border border-slate-200/80 dark:border-[#26384d] bg-white dark:bg-[#152338] divide-y divide-slate-100 dark:divide-[#26384d] overflow-hidden shadow-xs">
                  
                  {/* Request Account Deactivation */}
                  <button
                    type="button"
                    onClick={() => setCurrentSection('deactivate_account')}
                    className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-rose-50/50 dark:hover:bg-rose-950/20 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-rose-600 dark:text-rose-400">Request Account Deactivation</div>
                        <div className="text-[10px] text-slate-400">Submit request for Admin review</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>

                  {/* Secure Log Out */}
                  <button
                    type="button"
                    onClick={() => {
                      onClose?.();
                      logout();
                    }}
                    className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer text-slate-700 dark:text-slate-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0">
                        <LogOut className="w-4 h-4" />
                      </div>
                      <div className="text-xs font-bold">Secure Log Out</div>
                    </div>
                  </button>
                </div>

                <div className="text-center text-[10px] text-slate-400 pt-2">
                  FNI Cells Connect &bull; Version 1.0.0 (Build 2026.11)
                </div>
              </div>

            </div>
          )}

          {/* =========================================================================
              SECTION 1: MANAGE PROFILE
          ========================================================================== */}
          {currentSection === 'manage_profile' && (
            <div className="space-y-5">
              {/* Profile Photo Uploader */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#152338] border border-slate-200/80 dark:border-[#26384d] flex items-center gap-4">
                <ProfilePhotoUploader
                  currentAvatarUrl={currentUser?.avatar_url}
                  userName={currentUser?.full_name || 'User'}
                  userRole={currentUser?.role}
                  onPhotoUploaded={async (url: string) => {
                    await updateAvatar(url);
                  }}
                  onPhotoRemoved={async () => {
                    await updateAvatar('');
                  }}
                />
                <div>
                  <h4 className="text-xs font-bold text-[#142B4A] dark:text-white">Profile Picture</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Click the camera icon to upload and crop a personal profile photo.
                  </p>
                </div>
              </div>

              {profileNotice && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    profileNotice.isError
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {profileNotice.isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                  <span>{profileNotice.text}</span>
                </div>
              )}

              {/* Editable Fields Form */}
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#142B4A] dark:text-slate-200 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#26384d] bg-white dark:bg-slate-800 text-xs text-[#182230] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#142B4A]"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#142B4A] dark:text-slate-200 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#26384d] bg-white dark:bg-slate-800 text-xs text-[#182230] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#142B4A]"
                    placeholder="e.g. +233 24 123 4567"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#142B4A] dark:text-slate-200 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#26384d] bg-white dark:bg-slate-800 text-xs text-[#182230] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#142B4A]"
                    placeholder="name@example.com"
                  />
                </div>

                {/* Read-only Cell Association */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-[#26384d]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Assigned Fellowship Cell</span>
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <div className="text-xs font-black text-[#142B4A] dark:text-white">
                    {isAdmin ? 'System Administrator (All Fellowship Cells)' : currentUser?.cell_name || 'Unassigned Cell'}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Cell assignments and tutor roles are managed strictly by FNI Administration.
                  </p>
                </div>

                {/* Read-only Account Role */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-[#26384d]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Account Role & Status</span>
                    <Shield className="w-3.5 h-3.5 text-[#C6A45A]" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-[#142B4A] dark:text-white capitalize">
                      {currentUser?.role === 'admin' ? 'Executive Administrator' : 'Tutor / Cell Leader'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                      Verified Active
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#142B4A] hover:bg-[#203D63] text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingProfile ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-[#C6A45A]" />
                        <span>Saving Profile...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 text-[#C6A45A]" />
                        <span>Save Profile Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* =========================================================================
              SECTION 2: PASSWORD & SECURITY
          ========================================================================== */}
          {currentSection === 'password_security' && (
            <div className="space-y-6">
              {passNotice && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    passNotice.isError
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {passNotice.isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                  <span>{passNotice.text}</span>
                </div>
              )}

              {/* Password Change Form */}
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="text-xs font-black text-[#142B4A] dark:text-white uppercase tracking-wider">
                  Update Account Password
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#142B4A] dark:text-slate-200 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      required
                      placeholder="Minimum 6 characters"
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-[#26384d] bg-white dark:bg-slate-800 text-xs text-[#182230] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#142B4A]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#142B4A] dark:text-slate-200 mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                      placeholder="Re-enter new password"
                      className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-[#26384d] bg-white dark:bg-slate-800 text-xs text-[#182230] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#142B4A]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isChangingPass}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#142B4A] hover:bg-[#203D63] text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isChangingPass ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-[#C6A45A]" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4 text-[#C6A45A]" />
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </form>

              {/* Active Sessions & Device Management */}
              <div className="pt-4 border-t border-slate-200 dark:border-[#26384d] space-y-3">
                <div className="text-xs font-black text-[#142B4A] dark:text-white uppercase tracking-wider">
                  Active Sessions & Registered Devices
                </div>

                {deviceNotice && (
                  <div className="p-3 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{deviceNotice}</span>
                  </div>
                )}

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-[#26384d] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-5 h-5 text-[#142B4A] dark:text-[#C6A45A]" />
                    <div>
                      <div className="text-xs font-bold text-[#182230] dark:text-white">Current Device</div>
                      <div className="text-[11px] text-slate-400">Active Now &bull; Africa/Accra Timezone</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                    This Device
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleSignOutOtherDevices}
                  disabled={isSigningOutOthers}
                  className="w-full py-2.5 px-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-[#26384d] hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSigningOutOthers ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-[#C6A45A]" />
                  ) : (
                    <LogOut className="w-4 h-4 text-slate-400" />
                  )}
                  <span>Sign Out of Other Devices</span>
                </button>
              </div>
            </div>
          )}

          {/* =========================================================================
              SECTION 3: NOTIFICATION PREFERENCES
          ========================================================================== */}
          {currentSection === 'notifications' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose which notifications you would like to receive. All preferences are saved persistently.
              </p>

              {notifSaveNotice && (
                <div className="p-3 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{notifSaveNotice}</span>
                </div>
              )}

              <div className="rounded-2xl border border-slate-200/80 dark:border-[#26384d] bg-white dark:bg-[#152338] divide-y divide-slate-100 dark:divide-[#26384d] overflow-hidden shadow-xs">
                
                {/* 1. In-App Notifications */}
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-[#182230] dark:text-white">In-App Notifications</div>
                    <div className="text-[11px] text-slate-400">Receive in-app alert badges, banners and toast notices</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleNotif('inAppNotifications')}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      notifPrefs.inAppNotifications !== false ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${
                        notifPrefs.inAppNotifications !== false ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                {/* 2. Device Push Notifications */}
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-[#182230] dark:text-white">Device Push Notifications</div>
                    <div className="text-[11px] text-slate-400">Receive alerts when the app is in background or closed</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleNotif('devicePushNotifications')}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      notifPrefs.devicePushNotifications !== false ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${
                        notifPrefs.devicePushNotifications !== false ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                {/* 3. Reports Notifications */}
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-[#182230] dark:text-white">Reports & Deadlines</div>
                    <div className="text-[11px] text-slate-400">Submissions, reviews, approvals, corrections and Sunday 6:00 PM cutoff notices</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleToggleNotif('reports');
                      handleToggleNotif('reportDeadlineReminders');
                    }}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      notifPrefs.reports !== false && notifPrefs.reportDeadlineReminders !== false ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${
                        notifPrefs.reports !== false && notifPrefs.reportDeadlineReminders !== false ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                {/* 4. Assignments Notifications */}
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-[#182230] dark:text-white">Assignments</div>
                    <div className="text-[11px] text-slate-400">New assignments, upcoming deadlines, grading completions and pastoral feedback</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleToggleNotif('assignments');
                      handleToggleNotif('assignmentNotifications');
                    }}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      notifPrefs.assignments !== false && notifPrefs.assignmentNotifications !== false ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${
                        notifPrefs.assignments !== false && notifPrefs.assignmentNotifications !== false ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                {/* 5. Quizzes Notifications */}
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-[#182230] dark:text-white">Quizzes</div>
                    <div className="text-[11px] text-slate-400">Quiz publishing, availability windows, deadlines and score releases</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleToggleNotif('quizzes');
                      handleToggleNotif('quizNotifications');
                    }}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      notifPrefs.quizzes !== false && notifPrefs.quizNotifications !== false ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${
                        notifPrefs.quizzes !== false && notifPrefs.quizNotifications !== false ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                {/* 6. Learning Materials */}
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-[#182230] dark:text-white">Learning Materials & Events</div>
                    <div className="text-[11px] text-slate-400">Weekly teaching notes, ministerial outlines and upcoming learning events</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleNotif('learningMaterials')}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      notifPrefs.learningMaterials !== false ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${
                        notifPrefs.learningMaterials !== false ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                {/* 7. Cell Meetings */}
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-[#182230] dark:text-white">Cell Meetings & Reminders</div>
                    <div className="text-[11px] text-slate-400">Upcoming cell meeting schedules, reminders, start notices and cancellations</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleToggleNotif('meetings');
                      handleToggleNotif('cellMeetingReminders');
                    }}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      notifPrefs.meetings !== false && notifPrefs.cellMeetingReminders !== false ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${
                        notifPrefs.meetings !== false && notifPrefs.cellMeetingReminders !== false ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                {/* 8. Cell Announcements */}
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-[#182230] dark:text-white">Cell Announcements & Updates</div>
                    <div className="text-[11px] text-slate-400">New member additions, leadership updates and cell information changes</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleNotif('cellAnnouncements')}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      notifPrefs.cellAnnouncements !== false ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${
                        notifPrefs.cellAnnouncements !== false ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                {/* 9. Messages & Communications */}
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-[#182230] dark:text-white">Messages & Communications</div>
                    <div className="text-[11px] text-slate-400">Direct 1-on-1 messages, community chat replies and mentions</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleToggleNotif('messages');
                      handleToggleNotif('privateMessages');
                    }}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      notifPrefs.messages !== false && notifPrefs.privateMessages !== false ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${
                        notifPrefs.messages !== false && notifPrefs.privateMessages !== false ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                {/* 10. Administrative Broadcasts */}
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-[#182230] dark:text-white">Administrative Broadcasts</div>
                    <div className="text-[11px] text-slate-400">Official pastoral bulletins and high-importance leadership notices</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleNotif('adminBroadcasts')}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      notifPrefs.adminBroadcasts !== false ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${
                        notifPrefs.adminBroadcasts !== false ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                {/* 11. Critical Security Alerts (Enforced - Cannot be disabled) */}
                <div className="p-4 flex items-center justify-between bg-amber-500/5 dark:bg-amber-500/10">
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-[#182230] dark:text-white flex items-center gap-1.5">
                        <span>Critical Security & System Alerts</span>
                        <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700/60">
                          Always On
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">Password updates, new device logins and vital security protections cannot be silenced</div>
                    </div>
                  </div>
                  <div className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                    Protected
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              SECTION 4: CHAT WALLPAPER & APPEARANCE (Section 12)
          ========================================================================== */}
          {currentSection === 'chat_wallpaper' && (
            <div className="space-y-5">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Personalise the background appearance of your fellowship conversations.
              </p>

              {wallpaperNotice && (
                <div className="p-3 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{wallpaperNotice}</span>
                </div>
              )}

              {/* LIVE CHAT PREVIEW BOX */}
              <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-[#26384d]">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">
                  Live Wallpaper Preview
                </div>
                {/* Simulated Chat Stream with currently selected wallpaper */}
                <div
                  className="relative h-44 rounded-xl p-3 flex flex-col justify-between overflow-hidden shadow-inner border border-white/20 transition-all duration-300"
                  style={getPreviewBackgroundStyle()}
                >
                  {/* Subtle dark overlay for contrast */}
                  <div className="absolute inset-0 bg-black/10 dark:bg-black/35 pointer-events-none" />

                  {/* Sample Admin Message */}
                  <div className="relative z-10 flex items-start gap-2 max-w-[80%]">
                    <div className="w-7 h-7 rounded-full bg-[#142B4A] text-[#C6A45A] text-[10px] font-bold flex items-center justify-center shrink-0 shadow-xs">
                      AD
                    </div>
                    <div className="bg-white/95 dark:bg-slate-900/95 text-[#182230] dark:text-white p-2 rounded-xl text-[11px] shadow-sm border border-slate-200/50">
                      Welcome to the fellowship chat. God bless your labor!
                      <span className="block text-[9px] text-slate-400 mt-0.5 text-right">6:00 PM</span>
                    </div>
                  </div>

                  {/* Sample Tutor Message (Self) */}
                  <div className="relative z-10 flex items-start justify-end gap-2 max-w-[80%] self-end">
                    <div className="bg-[#142B4A] text-white p-2 rounded-xl text-[11px] shadow-sm border border-[#C6A45A]/30">
                      Amen! We had a blessed fellowship session today.
                      <span className="block text-[9px] text-slate-300 mt-0.5 text-right">6:02 PM</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* APPLICATION SCOPE (All vs Individual) */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-[#26384d] space-y-2">
                <div className="text-xs font-bold text-[#142B4A] dark:text-white">Wallpaper Application Scope</div>
                <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setWallpaperScope('all')}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      wallpaperScope === 'all'
                        ? 'border-[#C6A45A] bg-[#C6A45A]/15 text-[#142B4A] dark:text-[#C6A45A] font-bold'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    All Conversations
                  </button>
                  <button
                    type="button"
                    onClick={() => setWallpaperScope('community')}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      wallpaperScope !== 'all'
                        ? 'border-[#C6A45A] bg-[#C6A45A]/15 text-[#142B4A] dark:text-[#C6A45A] font-bold'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Community Chat Only
                  </button>
                </div>
              </div>

              {/* BUILT-IN WALLPAPERS COLLECTION */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-[#142B4A] dark:text-white">Built-in Wallpapers</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {BUILT_IN_WALLPAPERS.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectWallpaper(item.id)}
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                        activeWallpaperChoice === item.id
                          ? 'border-[#C6A45A] ring-2 ring-[#C6A45A]/40 bg-[#C6A45A]/5'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800'
                      }`}
                    >
                      <div className="h-10 rounded-lg mb-1.5 shadow-xs border border-black/5" style={item.previewStyle} />
                      <div className="text-[10px] font-bold text-[#182230] dark:text-white truncate">{item.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* SOLID COLORS */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-[#142B4A] dark:text-white">Solid Background Colors</div>
                <div className="flex flex-wrap gap-2">
                  {SOLID_COLORS.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectWallpaper(item.id)}
                      className={`w-9 h-9 rounded-xl border-2 transition-transform hover:scale-110 cursor-pointer shadow-xs ${
                        activeWallpaperChoice === item.id ? 'border-[#C6A45A] ring-2 ring-[#C6A45A]/50' : 'border-slate-200'
                      }`}
                      style={{ backgroundColor: item.color }}
                      title={item.name}
                    />
                  ))}
                </div>
              </div>

              {/* UPLOAD CUSTOM PHOTO & RESET ACTIONS */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <label className="flex-1 py-2.5 px-3 rounded-xl border border-dashed border-[#C6A45A] bg-[#C6A45A]/5 hover:bg-[#C6A45A]/10 text-xs font-bold text-[#142B4A] dark:text-[#C6A45A] flex items-center justify-center gap-2 cursor-pointer transition-colors">
                  <Upload className="w-4 h-4 text-[#C6A45A]" />
                  <span>Upload Personal Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadWallpaperFile(file);
                      e.currentTarget.value = '';
                    }}
                  />
                </label>

                <button
                  type="button"
                  onClick={handleResetWallpaper}
                  className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                  <span>Reset to Default</span>
                </button>
              </div>
            </div>
          )}

          {/* =========================================================================
              SECTION 5: THEME & APPEARANCE
          ========================================================================== */}
          {currentSection === 'appearance' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose how FNI Cells Connect looks to you. Select a specific theme or sync with your system settings.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Light Mode Card */}
                <button
                  type="button"
                  onClick={() => setThemePreference('light')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    themePreference === 'light'
                      ? 'border-[#C6A45A] ring-2 ring-[#C6A45A]/40 bg-[#C6A45A]/5'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                    <Sun className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-black text-[#142B4A] dark:text-white">Light Mode</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Crisp, clean light surfaces with royal navy contrast
                  </div>
                  {themePreference === 'light' && (
                    <div className="mt-3 flex items-center gap-1 text-[10px] font-bold text-[#C6A45A]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Active</span>
                    </div>
                  )}
                </button>

                {/* Dark Mode Card */}
                <button
                  type="button"
                  onClick={() => setThemePreference('dark')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    themePreference === 'dark'
                      ? 'border-[#C6A45A] ring-2 ring-[#C6A45A]/40 bg-[#C6A45A]/5'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-[#C6A45A] flex items-center justify-center mb-3">
                    <Moon className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-black text-[#142B4A] dark:text-white">Dark Mode</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Deep navy-slate surfaces with gold glowing accents
                  </div>
                  {themePreference === 'dark' && (
                    <div className="mt-3 flex items-center gap-1 text-[10px] font-bold text-[#C6A45A]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Active</span>
                    </div>
                  )}
                </button>

                {/* System Default Card */}
                <button
                  type="button"
                  onClick={() => setThemePreference('system')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    themePreference === 'system'
                      ? 'border-[#C6A45A] ring-2 ring-[#C6A45A]/40 bg-[#C6A45A]/5'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center mb-3">
                    <Laptop className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-black text-[#142B4A] dark:text-white">System Default</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Automatically matches your device operating system
                  </div>
                  {themePreference === 'system' && (
                    <div className="mt-3 flex items-center gap-1 text-[10px] font-bold text-[#C6A45A]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Active ({theme})</span>
                    </div>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* =========================================================================
              SECTION 6: GENERAL PREFERENCES
          ========================================================================== */}
          {currentSection === 'general' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#142B4A] dark:text-slate-200 mb-1">
                  Application Language
                </label>
                <select
                  value={generalPrefs.language}
                  onChange={e => handleUpdateGeneralPrefs({ language: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#26384d] bg-white dark:bg-slate-800 text-xs text-[#182230] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#142B4A]"
                >
                  <option value="en-UK">English (International / UK)</option>
                  <option value="en-GH">English (Ghana)</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Only languages natively supported by the application are provided.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#142B4A] dark:text-slate-200 mb-1">
                  Time Display Format
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateGeneralPrefs({ timeFormat: '12h' })}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      generalPrefs.timeFormat === '12h'
                        ? 'border-[#C6A45A] bg-[#C6A45A]/15 text-[#142B4A] dark:text-[#C6A45A]'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    12-Hour (e.g. 6:00 PM)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateGeneralPrefs({ timeFormat: '24h' })}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      generalPrefs.timeFormat === '24h'
                        ? 'border-[#C6A45A] bg-[#C6A45A]/15 text-[#142B4A] dark:text-[#C6A45A]'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    24-Hour (e.g. 18:00)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#142B4A] dark:text-slate-200 mb-1">
                  Date Format
                </label>
                <select
                  value={generalPrefs.dateFormat}
                  onChange={e => handleUpdateGeneralPrefs({ dateFormat: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#26384d] bg-white dark:bg-slate-800 text-xs text-[#182230] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#142B4A]"
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 17/11/2026)</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-11-17)</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 11/17/2026)</option>
                </select>
              </div>

              {/* Timezone Note */}
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs">
                <div className="flex items-center gap-2 font-bold mb-1">
                  <Clock className="w-4 h-4 text-[#C6A45A]" />
                  <span>Standard Application Timezone</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Ghana Time (<span className="font-bold">Africa/Accra / UTC+0</span>) is maintained as the ministry's default timezone. All weekly report deadlines (Sunday 6:00 PM) are calculated strictly according to Ghana Time.
                </p>
              </div>
            </div>
          )}

          {/* =========================================================================
              SECTION 7: HELP & SUPPORT
          ========================================================================== */}
          {currentSection === 'help_support' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#152338] border border-slate-200/80 dark:border-[#26384d] space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#142B4A] dark:text-white">
                  <Building className="w-4 h-4 text-[#C6A45A]" />
                  <span>Forerunners Network International</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  FNI Cells Connect is the official fellowship reporting, evangelism tracking, and learning management platform for Forerunners Network International.
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="font-bold text-[#142B4A] dark:text-white">Ministry Support & Contacts</div>
                <div className="p-3 rounded-xl border border-slate-200 dark:border-[#26384d] space-y-2 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Directorate:</span>
                    <span className="font-bold text-[#142B4A] dark:text-white">Cell Reporting & Discipleship</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Email Contact:</span>
                    <span className="font-bold text-[#142B4A] dark:text-[#C6A45A]">support@forerunnersnetwork.org</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Operating Hours:</span>
                    <span className="text-slate-700 dark:text-slate-300">Mon &ndash; Sat &bull; 8:00 AM &ndash; 6:00 PM GMT</span>
                  </div>
                </div>
              </div>

              <div className="text-center pt-2">
                <div className="text-xs font-bold text-[#142B4A] dark:text-white">FNI Cells Connect</div>
                <div className="text-[11px] text-slate-400">Version 1.0.0 (Build 2026.11)</div>
              </div>
            </div>
          )}

          {/* =========================================================================
              SECTION 8: PRIVACY POLICY
          ========================================================================== */}
          {currentSection === 'privacy_policy' && (
            <div className="space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              <h3 className="font-black text-sm text-[#142B4A] dark:text-white">
                FNI Cells Connect Privacy Policy
              </h3>
              <p>
                Forerunners Network International is dedicated to protecting the privacy and integrity of all fellowship records, convert details, and leadership communications.
              </p>
              <h4 className="font-bold text-[#142B4A] dark:text-white pt-1">Cell Record Isolation</h4>
              <p>
                Each tutor has access exclusively to their registered cell's records, attendees, and evangelism contacts. No tutor can view, edit, or access another cell's reports or attendance returns.
              </p>
              <h4 className="font-bold text-[#142B4A] dark:text-white pt-1">Permanent Location History</h4>
              <p>
                Physical meeting venues are maintained as permanent historical records for administrative continuity and safety. Historical records are preserved even upon leadership transitions.
              </p>
            </div>
          )}

          {/* =========================================================================
              SECTION 9: TERMS OF SERVICE
          ========================================================================== */}
          {currentSection === 'terms_of_service' && (
            <div className="space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              <h3 className="font-black text-sm text-[#142B4A] dark:text-white">
                FNI Cells Connect Terms of Service
              </h3>
              <p>
                By accessing FNI Cells Connect, all cell leaders, tutors, and administrators agree to abide by the reporting guidelines set forth by ministry leadership.
              </p>
              <h4 className="font-bold text-[#142B4A] dark:text-white pt-1">Reporting Integrity & Weekly Deadline</h4>
              <p>
                Cell meeting and evangelism reports must be submitted accurately by the weekly Sunday 6:00 PM Ghana cutoff (Africa/Accra / UTC+0). Falsification of attendance or convert figures violates ministry guidelines.
              </p>
              <h4 className="font-bold text-[#142B4A] dark:text-white pt-1">Account & Security Guidelines</h4>
              <p>
                Tutors must maintain the confidentiality of their credentials and promptly notify leadership if any unauthorized activity is suspected.
              </p>
            </div>
          )}

          {/* =========================================================================
              SECTION 10: ACCOUNT DEACTIVATION REQUEST
          ========================================================================== */}
          {currentSection === 'deactivate_account' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200 text-xs">
                <div className="flex items-center gap-2 font-bold mb-1 text-rose-700 dark:text-rose-300">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Administrative Review Required</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  In accordance with FNI administrative policies, accounts cannot be deleted immediately. Submitting this form routes an official deactivation request to FNI Administration. Your past reports, attendance returns, and cell history will be securely retained.
                </p>
              </div>

              {deactNotice && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    deactNotice.isError
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {deactNotice.isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                  <span>{deactNotice.text}</span>
                </div>
              )}

              <form onSubmit={handleSubmitDeactivation} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#142B4A] dark:text-slate-200 mb-1">
                    Reason for Deactivation Request <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    value={deactReason}
                    onChange={e => setDeactReason(e.target.value)}
                    required
                    rows={3}
                    placeholder="Please specify why you are requesting account deactivation (e.g. relocation, stepping down from leadership, handover)..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#26384d] bg-white dark:bg-slate-800 text-xs text-[#182230] dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <label className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deactConfirmation}
                    onChange={e => setDeactConfirmation(e.target.checked)}
                    className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span>
                    I confirm that I want to request account deactivation and understand this will be reviewed by FNI Administration.
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={isSubmittingDeact || !deactConfirmation}
                  className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingDeact ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Send className="w-4 h-4 text-white" />
                  )}
                  <span>Submit Request for Admin Review</span>
                </button>
              </form>
            </div>
          )}

        </div>
      </div>
  );

  if (inline) {
    return <div className="w-full py-2">{content}</div>;
  }

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-navy-950/70 backdrop-blur-xs overflow-y-auto"
    >
      {content}
    </div>
  );
};

export const ProfileSettingsView: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  return <ProfileSettingsModal inline={true} onBack={onBack} />;
};
