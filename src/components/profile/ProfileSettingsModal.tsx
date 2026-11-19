import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { useTheme, ThemePreference } from '../../context/ThemeContext';
import { NotificationService, DEFAULT_NOTIFICATION_PREFERENCES } from '../../services/notificationService';
import { PushNotificationService } from '../../services/pushNotificationService';
import { UserSettingsService } from '../../services/userSettingsService';
import {
  UserNotificationPreferences,
  UserGeneralPreferences,
  AccountDeactivationRequest,
} from '../../types';
import { ProfilePhotoUploader } from '../common/ProfilePhotoUploader';
import { NotificationAudio } from '../../utils/notificationAudio';
import { triggerIosInstallGuide, isIosDevice, isStandaloneMode } from '../pwa/IosInstallGuide';
import { Capacitor } from '@capacitor/core';
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
  BellRing,
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
  ChevronDown,
  Smartphone,
  Upload,
  RefreshCw,
  X,
  XCircle,
  AlertTriangle,
  Send,
  MessageSquare,
  Volume2,
  VolumeX,
  Vibrate,
  Layers,
  Check,
  Settings,
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
  language: 'en-GH',
  timeFormat: '12h',
  dateFormat: 'DD/MM/YYYY',
  defaultDashboard: 'default',
  timezone: 'Africa/Accra',
};

const FAQ_ITEMS = [
  {
    question: 'When are cell meeting and evangelism reports due?',
    answer:
      'All weekly reports must be submitted before Sunday 6:00 PM Ghana Time (Africa/Accra / UTC+0). Reports submitted after this cutoff are automatically marked as Late in accordance with ministry guidelines.',
  },
  {
    question: 'How do I add FNI Cells Connect to my iPhone or iPad Home Screen?',
    answer:
      'Open Safari on your iPhone, navigate to the portal, tap the Share icon (square with arrow) at the bottom, scroll down, and select "Add to Home Screen". This installs the full-screen PWA experience with native notifications.',
  },
  {
    question: 'Can I change my assigned cell fellowship myself?',
    answer:
      'No. Cell assignments and tutor designations are strictly administered by FNI National Administration to ensure accurate reporting hierarchies. Please contact your administrator or regional director for cell reassignment.',
  },
  {
    question: 'What happens if I submit a report while offline or with weak reception?',
    answer:
      'FNI Cells Connect automatically saves your report drafts locally on your device. Once your network connection is restored, the system synchronizes your records with the Supabase backend.',
  },
  {
    question: 'How do voice and video calls work on FNI Cells Connect?',
    answer:
      'Calls use secure WebRTC peer connections facilitated by the LiveKit cloud signaling gateway. Calls require microphone and camera permissions granted in your phone or browser settings.',
  },
];

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
    changePassword,
    updateAvatar,
    updateUserProfile,
    signOutOtherDevices,
    logout,
  } = useAuth();

  const { theme, themePreference, setThemePreference } = useTheme();

  // Navigation state
  const [currentSection, setCurrentSection] = useState<ProfileSection>(initialSection);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(null);

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

  // 3. Notification Preferences & Push State
  const {
    pushPermission,
    isPushSupported,
    isPushEnabled,
    requestPushPermission,
    disablePushNotifications,
  } = useNotifications();
  const [isPushLoading, setIsPushLoading] = useState(false);
  const [pushStatusNotice, setPushStatusNotice] = useState<string | null>(null);

  const [notifPrefs, setNotifPrefs] = useState<UserNotificationPreferences>(() =>
    currentUser?.id ? NotificationService.getUserNotificationPreferences(currentUser.id) : DEFAULT_NOTIFICATION_PREFERENCES
  );
  const [notifSaveNotice, setNotifSaveNotice] = useState<string | null>(null);

  // 4. Chat Wallpaper State
  const wallpaperStorageKey = `fni-chat-wallpapers:${currentUser?.id || 'guest'}`;
  const [chatWallpapers, setChatWallpapers] = useState<Record<string, string>>({});
  const [chatWallpaperImages, setChatWallpaperImages] = useState<Record<string, string>>({});
  const [wallpaperScope, setWallpaperScope] = useState<'all' | 'community' | 'private'>('all');
  const [selectedIndividualChat] = useState<string>('community');
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

  // Real-time Ghana clock
  const [ghanaTimeStr, setGhanaTimeStr] = useState('');
  useEffect(() => {
    const updateTime = () => {
      try {
        const now = new Date();
        const formatted = now.toLocaleTimeString('en-GH', {
          timeZone: 'Africa/Accra',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        });
        setGhanaTimeStr(formatted);
      } catch {
        setGhanaTimeStr(new Date().toUTCString().slice(17, 25) + ' GMT');
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // 6. Deactivation Request State
  const [existingDeactRequest, setExistingDeactRequest] = useState<AccountDeactivationRequest | null>(null);
  const [deactReason, setDeactReason] = useState('');
  const [deactConfirmation, setDeactConfirmation] = useState(false);
  const [isSubmittingDeact, setIsSubmittingDeact] = useState(false);
  const [isCancellingDeact, setIsCancellingDeact] = useState(false);
  const [deactNotice, setDeactNotice] = useState<{ isError: boolean; text: string } | null>(null);

  // Synchronize inputs & load Supabase settings when modal opens
  useEffect(() => {
    if (currentUser?.id) {
      setFullName(currentUser.full_name || '');
      setPhoneNumber(currentUser.phone_number || '');
      setEmail(currentUser.email || '');
      setNotifPrefs(NotificationService.getUserNotificationPreferences(currentUser.id));

      // Fetch persistent Supabase user settings
      UserSettingsService.getUserSettings(currentUser.id).then(settings => {
        if (settings) {
          if (settings.notificationPreferences) {
            setNotifPrefs(settings.notificationPreferences);
          }
          if (settings.chatWallpapers) {
            setChatWallpapers(settings.chatWallpapers);
            setActiveWallpaperChoice(settings.chatWallpapers['community'] || 'default');
          }
          if (settings.generalPreferences) {
            setGeneralPrefs(settings.generalPreferences);
          }
        }
      });

      // Fetch existing deactivation request
      UserSettingsService.getDeactivationRequest(currentUser.id).then(req => {
        setExistingDeactRequest(req);
      });
    }
  }, [currentUser?.id, isOpen]);

  // Load chat wallpapers from local cache
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

  if (!isOpen && !inline) return null;

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------

  // Save Personal Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileNotice(null);
    if (!fullName.trim() || fullName.trim().length < 2) {
      setProfileNotice({ isError: true, text: 'Please enter a valid full name (minimum 2 characters).' });
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
        const isEmailChanged = email.trim().toLowerCase() !== (currentUser?.email || '').toLowerCase();
        setProfileNotice({
          isError: false,
          text: isEmailChanged
            ? 'Profile updated. A verification link has been sent to your new email address.'
            : 'Profile information saved successfully.',
        });
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
        setPassNotice({ isError: false, text: 'Account password updated successfully.' });
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
    if (!currentUser?.id) return;
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

    // Persist to Supabase
    UserSettingsService.saveUserSettings(currentUser.id, { chatWallpapers: nextWallpapers });

    window.dispatchEvent(new CustomEvent('fni-chat-wallpaper-updated'));
    setWallpaperNotice(`Wallpaper applied to ${wallpaperScope === 'all' ? 'all conversations' : 'selected conversation'}.`);
    setTimeout(() => setWallpaperNotice(null), 3500);
  };

  const handleUploadWallpaperFile = (file?: File) => {
    if (!file || !currentUser?.id) return;
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
    if (!currentUser?.id) return;
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

    UserSettingsService.saveUserSettings(currentUser.id, { chatWallpapers: nextWallpapers });
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

    if (currentUser?.id) {
      UserSettingsService.saveUserSettings(currentUser.id, { generalPreferences: next });
    }
  };

  // Theme Update
  const handleThemeChange = (pref: ThemePreference) => {
    setThemePreference(pref);
    if (currentUser?.id) {
      UserSettingsService.saveUserSettings(currentUser.id, { themePreference: pref });
    }
  };

  // Submit Deactivation Request
  const handleSubmitDeactivation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.id) return;
    if (!deactConfirmation) {
      setDeactNotice({ isError: true, text: 'Please confirm that you understand this will route a request to Admin.' });
      return;
    }

    setIsSubmittingDeact(true);
    setDeactNotice(null);
    try {
      const res = await UserSettingsService.submitDeactivationRequest(currentUser.id, {
        userName: currentUser.full_name || 'Leader',
        cellName: currentUser.cell_name,
        role: currentUser.role,
        reason: deactReason,
      });

      if (res.success) {
        setExistingDeactRequest(res.request || null);
        setDeactNotice({
          isError: false,
          text: 'Your deactivation request has been submitted to FNI Administration. Your cell reports remain archived.',
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

  // Cancel Deactivation Request
  const handleCancelDeactivation = async () => {
    if (!currentUser?.id) return;
    setIsCancellingDeact(true);
    try {
      await UserSettingsService.cancelDeactivationRequest(currentUser.id, existingDeactRequest?.id);
      setExistingDeactRequest(null);
      setDeactNotice({
        isError: false,
        text: 'Your deactivation request has been successfully cancelled.',
      });
    } catch {
      setDeactNotice({ isError: true, text: 'Could not cancel request. Please try again.' });
    } finally {
      setIsCancellingDeact(false);
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

  // Account Status computation
  const accountStatus = currentUser?.is_active === false ? 'Suspended' : (!currentUser?.is_onboarded ? 'Pending' : 'Active');

  // Role display title
  const roleDisplayTitle = currentUser?.role === 'super_admin'
    ? 'Super Administrator'
    : currentUser?.role === 'admin' || currentUser?.role === 'national_admin'
    ? 'Administrator'
    : currentUser?.role === 'regional_leader'
    ? 'Regional Leader'
    : 'Registered Cell Leader';

  const assignedCellTitle = isAdmin ? 'National Administration' : currentUser?.cell_name || 'Unassigned Cell';

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
      <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">

        {/* =========================================================================
            MENU VIEW: TOP HEADER & NAVIGATION GROUPS
        ========================================================================== */}
        {currentSection === 'menu' && (
          <div className="space-y-6">
            
            {/* 1. PROFILE SETTINGS HEADER (Requirement 1) */}
            <div className="p-4 sm:p-5 rounded-3xl bg-slate-50/80 dark:bg-[#152338] border border-slate-200/80 dark:border-[#26384d] flex items-center gap-4 shadow-xs">
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
                <button
                  type="button"
                  onClick={() => setCurrentSection('manage_profile')}
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#C6A45A] text-[#142B4A] flex items-center justify-center shadow-xs border border-white hover:scale-105 transition-transform cursor-pointer"
                  title="Update profile photo"
                >
                  <Upload className="w-3 h-3" />
                </button>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-black text-[#142B4A] dark:text-white truncate">
                  {currentUser?.full_name || 'FNI Leader'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {roleDisplayTitle}
                </p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {/* Assigned Cell Badge */}
                  <span className="px-2.5 py-0.5 rounded-full bg-[#142B4A]/10 dark:bg-amber-400/10 text-[#142B4A] dark:text-amber-300 text-[10px] font-bold border border-[#142B4A]/20 dark:border-amber-400/20">
                    {assignedCellTitle}
                  </span>

                  {/* Account Status Badge */}
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      accountStatus === 'Active'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                        : accountStatus === 'Pending'
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                        : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        accountStatus === 'Active'
                          ? 'bg-emerald-500'
                          : accountStatus === 'Pending'
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                    />
                    {accountStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* GROUP 1: ACCOUNT */}
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
                      <div className="text-[11px] text-slate-400">Change password, active sessions & sign out other devices</div>
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
                      <div className="text-[11px] text-slate-400">Deadlines, assignments, quizzes, announcements & chimes</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>

            {/* GROUP 2: CHAT & PREFERENCES */}
            <div className="space-y-2">
              <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2">
                Chat & Appearance
              </div>
              <div className="rounded-2xl border border-slate-200/80 dark:border-[#26384d] bg-white dark:bg-[#152338] divide-y divide-slate-100 dark:divide-[#26384d] overflow-hidden shadow-xs">
                
                {/* Chat Wallpaper */}
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
                      <div className="text-xs font-bold text-[#182230] dark:text-white">Chat Wallpaper</div>
                      <div className="text-[11px] text-slate-400">Custom wallpapers, solid colors & bubble contrast preview</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* Theme & Appearance */}
                <button
                  type="button"
                  onClick={() => setCurrentSection('appearance')}
                  className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
                      <Sun className="w-4 h-4 text-[#142B4A] dark:text-[#C6A45A]" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#182230] dark:text-white">Theme & Appearance</div>
                      <div className="text-[11px] text-slate-400">Light mode, dark mode, or system default</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* General Preferences */}
                <button
                  type="button"
                  onClick={() => setCurrentSection('general')}
                  className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4 text-[#142B4A] dark:text-[#C6A45A]" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#182230] dark:text-white">Language & Time</div>
                      <div className="text-[11px] text-slate-400">Ghana Time (Africa/Accra / UTC+0), formats & language</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>

            {/* GROUP 3: SUPPORT & POLICIES */}
            <div className="space-y-2">
              <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2">
                Support & Policies
              </div>
              <div className="rounded-2xl border border-slate-200/80 dark:border-[#26384d] bg-white dark:bg-[#152338] divide-y divide-slate-100 dark:divide-[#26384d] overflow-hidden shadow-xs">
                
                {/* Help & Support */}
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
                      <div className="text-[11px] text-slate-400">FAQ guides, contacts & reporting assistance</div>
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
                      <ShieldCheck className="w-4 h-4 text-[#142B4A] dark:text-[#C6A45A]" />
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
                      <div className="text-[10px] text-slate-400">
                        {existingDeactRequest?.status === 'pending'
                          ? 'Request pending administrator review'
                          : 'Submit deactivation request for Admin review'}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                {/* Secure Log Out (Requirement 7) */}
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(true)}
                  className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer text-slate-700 dark:text-slate-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center shrink-0">
                      <LogOut className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-rose-600 dark:text-rose-400">Secure Log Out</div>
                      <div className="text-[10px] text-slate-400">End session safely on this device</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              <div className="text-center text-[10px] text-slate-400 pt-2">
                FNI Cells Connect &bull; Version 1.0.0 (Build 2026.11)
              </div>
            </div>

          </div>
        )}

        {/* =========================================================================
            SECTION 1: MANAGE PROFILE (Requirement 2)
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
                <h4 className="text-xs font-bold text-[#142B4A] dark:text-white">Profile Photo</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Upload a crisp portrait photo. Images are securely stored in Supabase storage and displayed across fellowship spaces.
                </p>
              </div>
            </div>

            {profileNotice && (
              <div
                className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  profileNotice.isError
                    ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900'
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
                <div className="relative">
                  <User className="w-4 h-4 text-[#C6A45A] absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    required
                    maxLength={120}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#26384d] bg-white dark:bg-slate-800 text-xs text-[#182230] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#142B4A]"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#142B4A] dark:text-slate-200 mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#C6A45A] absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#26384d] bg-white dark:bg-slate-800 text-xs text-[#182230] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#142B4A]"
                    placeholder="e.g. +233 24 123 4567"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#142B4A] dark:text-slate-200 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#C6A45A] absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#26384d] bg-white dark:bg-slate-800 text-xs text-[#182230] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#142B4A]"
                    placeholder="leader@example.com"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Updating your email will send a verification link via Supabase Auth.
                </p>
              </div>

              {/* Read-only Cell Association */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-[#26384d]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Assigned Fellowship Cell</span>
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="text-xs font-black text-[#142B4A] dark:text-white">
                  {assignedCellTitle}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Cell assignments are locked. Contact FNI Administration if your cell fellowship changes.
                </p>
              </div>

              {/* Read-only Account Role */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-[#26384d]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Account Designation & Status</span>
                  <Shield className="w-3.5 h-3.5 text-[#C6A45A]" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-[#142B4A] dark:text-white">
                    {roleDisplayTitle}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold">
                    {accountStatus}
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
                      <span>Saving Profile to Supabase...</span>
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
            SECTION 2: PASSWORD & SECURITY (Requirement 2)
        ========================================================================== */}
        {currentSection === 'password_security' && (
          <div className="space-y-6">
            {passNotice && (
              <div
                className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  passNotice.isError
                    ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900'
                }`}
              >
                {passNotice.isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                <span>{passNotice.text}</span>
              </div>
            )}

            {/* Password Change Form */}
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="text-xs font-black text-[#142B4A] dark:text-white uppercase tracking-wider">
                Change Account Password
              </div>

              <div>
                <label className="block text-xs font-bold text-[#142B4A] dark:text-slate-200 mb-1">
                  New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    maxLength={128}
                    placeholder="Create new password (min. 6 characters)"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-[#26384d] bg-white dark:bg-slate-800 text-xs text-[#182230] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#142B4A]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4 text-[#C6A45A]" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {/* Strength Meter */}
                {newPassword && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[10px]">
                    <span className="text-slate-400 font-medium">Strength:</span>
                    <span
                      className={`font-bold ${
                        newPassword.length >= 8 && /[0-9!@#$%^&*]/.test(newPassword)
                          ? 'text-emerald-600'
                          : newPassword.length >= 6
                          ? 'text-amber-600'
                          : 'text-rose-600'
                      }`}
                    >
                      {newPassword.length >= 8 && /[0-9!@#$%^&*]/.test(newPassword)
                        ? 'Strong'
                        : newPassword.length >= 6
                        ? 'Good'
                        : 'Weak (min. 6 chars required)'}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-[#142B4A] dark:text-slate-200">
                    Confirm New Password <span className="text-rose-500">*</span>
                  </label>
                  {newPassword && confirmPassword && (
                    <span
                      className={`text-[10px] font-bold ${
                        newPassword === confirmPassword ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {newPassword === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    maxLength={128}
                    placeholder="Re-enter new password"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-[#26384d] bg-white dark:bg-slate-800 text-xs text-[#182230] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#142B4A]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4 text-[#C6A45A]" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isChangingPass || !newPassword || newPassword !== confirmPassword}
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

            {/* Active Sessions & Device Information */}
            <div className="pt-4 border-t border-slate-200 dark:border-[#26384d] space-y-3">
              <div className="text-xs font-black text-[#142B4A] dark:text-white uppercase tracking-wider">
                Active Session & Device Information
              </div>

              {deviceNotice && (
                <div className="p-3 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{deviceNotice}</span>
                </div>
              )}

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-[#26384d] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-[#142B4A] dark:text-[#C6A45A]" />
                  <div>
                    <div className="text-xs font-bold text-[#182230] dark:text-white flex items-center gap-1.5">
                      {Capacitor.isNativePlatform()
                        ? 'Android APK Client'
                        : isIosDevice()
                        ? isStandaloneMode()
                          ? 'Apple iOS Home Screen PWA'
                          : 'Apple iOS Safari'
                        : 'Web Browser'}
                      <span className="text-[10px] text-emerald-600 font-bold">&bull; Active Now</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Standard Timezone: Africa/Accra (UTC+0)
                    </div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold">
                  Current Session
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
                <span>Sign Out Other Devices via Supabase</span>
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            SECTION 3: NOTIFICATION PREFERENCES (Requirement 3)
        ========================================================================== */}
        {currentSection === 'notifications' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Configure which ministry alerts you receive across in-app channels and mobile push notifications. Preferences synchronize across all your devices via Supabase.
            </p>

            {notifSaveNotice && (
              <div className="p-3 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{notifSaveNotice}</span>
              </div>
            )}

            {/* Sound & Vibration Interactive Test Controls */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#152338] border border-slate-200/80 dark:border-[#26384d] space-y-3">
              <h4 className="text-xs font-bold text-[#142B4A] dark:text-white flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-[#C6A45A]" />
                <span>Sound & Vibration Preview</span>
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => NotificationAudio.playChime('general')}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5 text-[#C6A45A]" />
                  <span>Play Sample Chime</span>
                </button>
                <button
                  type="button"
                  onClick={() => NotificationAudio.triggerVibration([200, 100, 200])}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Vibrate className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Test Vibration Pulse</span>
                </button>
              </div>
            </div>

            {/* Notification Toggles List */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-[#26384d] bg-white dark:bg-[#152338] divide-y divide-slate-100 dark:divide-[#26384d] overflow-hidden shadow-xs">
              
              {/* In-App Notifications */}
              <div className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#182230] dark:text-white">In-App Notifications</div>
                  <div className="text-[11px] text-slate-400">Alert badges, banners and toast notices while app is open</div>
                </div>
                <input
                  type="checkbox"
                  checked={notifPrefs.inAppNotifications !== false}
                  onChange={() => handleToggleNotif('inAppNotifications')}
                  className="w-4 h-4 rounded text-[#142B4A] focus:ring-[#C6A45A] cursor-pointer"
                />
              </div>

              {/* Device Push Notifications Interactive Section */}
              <div className="p-4 space-y-3 bg-slate-50/60 dark:bg-[#0f1a2a]/60">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <div className="text-xs font-bold text-[#182230] dark:text-white flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-[#C6A45A]" />
                      <span>Device Push Notifications</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Receive alerts when FNI Cells Connect is closed, in the background, or screen is locked
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {Capacitor.isNativePlatform() && (
                      <button
                        type="button"
                        onClick={() => PushNotificationService.openDeviceNotificationSettings()}
                        className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
                      >
                        <Settings className="w-3 h-3 text-[#C6A45A]" />
                        <span>Settings</span>
                      </button>
                    )}

                    {isPushEnabled && (
                      <button
                        type="button"
                        disabled={isPushLoading}
                        onClick={async () => {
                          setIsPushLoading(true);
                          try {
                            const res = await PushNotificationService.sendTestPush();
                            if (res.success) {
                              setPushStatusNotice('Test push notification dispatched.');
                            } else {
                              setPushStatusNotice(res.error || 'Failed to dispatch test push.');
                            }
                            setTimeout(() => setPushStatusNotice(null), 5000);
                          } catch (err: any) {
                            setPushStatusNotice(err.message || 'Failed to send test push.');
                          } finally {
                            setIsPushLoading(false);
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#142B4A] text-white text-[10px] font-bold hover:bg-[#1a3860] flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <BellRing className="w-3 h-3 text-[#C6A45A]" />
                        <span>Test Push</span>
                      </button>
                    )}
                  </div>
                </div>

                {pushStatusNotice && (
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-200 text-[11px] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>{pushStatusNotice}</span>
                  </div>
                )}

                {/* iOS Browser Tab Warning */}
                {isIosDevice() && !isStandaloneMode() && !Capacitor.isNativePlatform() && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed">
                        <span className="font-bold">Home Screen Required on iOS: </span>
                        Apple requires FNI Cells Connect to be installed on your Home Screen (iOS 16.4+) to receive push notifications.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => triggerIosInstallGuide()}
                      className="w-full py-1.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>How to Add to Home Screen</span>
                    </button>
                  </div>
                )}

                {/* Permission Denied Callout */}
                {pushPermission === 'denied' && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-[11px] text-rose-900 dark:text-rose-200 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>Notifications Blocked in Settings</span>
                    </div>
                    <p className="text-[10px] text-rose-700 dark:text-rose-300">
                      Please go to your device Settings &gt; Notifications &gt; FNI Cells and toggle "Allow Notifications" on.
                    </p>
                  </div>
                )}

                {/* Badges row */}
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-0.5">
                    <div className="text-[10px] text-slate-400 font-medium">Environment</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                      {Capacitor.isNativePlatform() ? (
                        <>
                          <ShieldCheck className="w-3 h-3 text-emerald-500" />
                          <span>Android APK</span>
                        </>
                      ) : isIosDevice() ? (
                        <>
                          <Smartphone className="w-3 h-3 text-blue-400" />
                          <span>iOS {isStandaloneMode() ? 'Home Screen' : 'Browser'}</span>
                        </>
                      ) : (
                        <>
                          <Layers className="w-3 h-3 text-indigo-400" />
                          <span>Desktop / Web</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-0.5">
                    <div className="text-[10px] text-slate-400 font-medium">Subscription State</div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                      {pushPermission === 'granted' && isPushEnabled ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span className="text-emerald-700 dark:text-emerald-400">Subscribed</span>
                        </>
                      ) : pushPermission === 'denied' ? (
                        <>
                          <XCircle className="w-3 h-3 text-rose-500" />
                          <span className="text-rose-600 dark:text-rose-400">Blocked</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3 h-3 text-amber-500" />
                          <span className="text-amber-600 dark:text-amber-400">Not Enabled</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action button */}
                <div className="pt-1">
                  {!isPushEnabled ? (
                    <button
                      type="button"
                      disabled={isPushLoading}
                      onClick={async () => {
                        if (isIosDevice() && !isStandaloneMode() && !Capacitor.isNativePlatform()) {
                          triggerIosInstallGuide();
                          return;
                        }
                        setIsPushLoading(true);
                        try {
                          const res = await requestPushPermission();
                          if (res?.success) {
                            setPushStatusNotice('Push notifications enabled and registered with Supabase.');
                          } else if (res?.error) {
                            setPushStatusNotice(res.error);
                          }
                          setTimeout(() => setPushStatusNotice(null), 6000);
                        } catch (err: any) {
                          setPushStatusNotice(err.message || 'Could not enable push.');
                        } finally {
                          setIsPushLoading(false);
                        }
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-[#142B4A] hover:bg-[#1a3860] text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isPushLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#C6A45A]" />
                          <span>Registering Token...</span>
                        </>
                      ) : (
                        <>
                          <Bell className="w-3.5 h-3.5 text-[#C6A45A]" />
                          <span>Enable Push Notifications</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isPushLoading}
                      onClick={async () => {
                        setIsPushLoading(true);
                        try {
                          await disablePushNotifications();
                          setPushStatusNotice('Push notifications disabled.');
                          setTimeout(() => setPushStatusNotice(null), 4000);
                        } catch (err: any) {
                          setPushStatusNotice(err.message || 'Could not disable notifications.');
                        } finally {
                          setIsPushLoading(false);
                        }
                      }}
                      className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                      <span>Disable Push Notifications</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Reports */}
              <div className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#182230] dark:text-white">Reports & Deadlines</div>
                  <div className="text-[11px] text-slate-400">Submissions, reviews, approvals, and Sunday 6:00 PM cutoff reminders</div>
                </div>
                <input
                  type="checkbox"
                  checked={notifPrefs.reports !== false}
                  onChange={() => handleToggleNotif('reports')}
                  className="w-4 h-4 rounded text-[#142B4A] focus:ring-[#C6A45A] cursor-pointer"
                />
              </div>

              {/* Assignments */}
              <div className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#182230] dark:text-white">Assignments</div>
                  <div className="text-[11px] text-slate-400">New assignments, upcoming deadlines and grading completions</div>
                </div>
                <input
                  type="checkbox"
                  checked={notifPrefs.assignments !== false}
                  onChange={() => handleToggleNotif('assignments')}
                  className="w-4 h-4 rounded text-[#142B4A] focus:ring-[#C6A45A] cursor-pointer"
                />
              </div>

              {/* Quizzes */}
              <div className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#182230] dark:text-white">Quizzes</div>
                  <div className="text-[11px] text-slate-400">Quiz publishing, availability windows and score releases</div>
                </div>
                <input
                  type="checkbox"
                  checked={notifPrefs.quizzes !== false}
                  onChange={() => handleToggleNotif('quizzes')}
                  className="w-4 h-4 rounded text-[#142B4A] focus:ring-[#C6A45A] cursor-pointer"
                />
              </div>

              {/* Learning Materials */}
              <div className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#182230] dark:text-white">Learning Materials & Notes</div>
                  <div className="text-[11px] text-slate-400">Weekly teaching notes and ministerial outlines</div>
                </div>
                <input
                  type="checkbox"
                  checked={notifPrefs.learningMaterials !== false}
                  onChange={() => handleToggleNotif('learningMaterials')}
                  className="w-4 h-4 rounded text-[#142B4A] focus:ring-[#C6A45A] cursor-pointer"
                />
              </div>

              {/* Cell Meetings */}
              <div className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#182230] dark:text-white">Cell Meetings & Reminders</div>
                  <div className="text-[11px] text-slate-400">Weekly meeting reminders, start notices and room joins</div>
                </div>
                <input
                  type="checkbox"
                  checked={notifPrefs.meetings !== false}
                  onChange={() => handleToggleNotif('meetings')}
                  className="w-4 h-4 rounded text-[#142B4A] focus:ring-[#C6A45A] cursor-pointer"
                />
              </div>

              {/* Cell Announcements */}
              <div className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#182230] dark:text-white">Cell Announcements</div>
                  <div className="text-[11px] text-slate-400">New member notices and fellowship updates</div>
                </div>
                <input
                  type="checkbox"
                  checked={notifPrefs.cellAnnouncements !== false}
                  onChange={() => handleToggleNotif('cellAnnouncements')}
                  className="w-4 h-4 rounded text-[#142B4A] focus:ring-[#C6A45A] cursor-pointer"
                />
              </div>

              {/* 1-on-1 Messages */}
              <div className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#182230] dark:text-white">Direct 1-on-1 Messages</div>
                  <div className="text-[11px] text-slate-400">Private messages in the Communication Hub</div>
                </div>
                <input
                  type="checkbox"
                  checked={notifPrefs.messages !== false}
                  onChange={() => handleToggleNotif('messages')}
                  className="w-4 h-4 rounded text-[#142B4A] focus:ring-[#C6A45A] cursor-pointer"
                />
              </div>

              {/* Group Messages */}
              <div className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#182230] dark:text-white">Group Chats & Cell Channels</div>
                  <div className="text-[11px] text-slate-400">Messages sent in fellowship cells and group spaces</div>
                </div>
                <input
                  type="checkbox"
                  checked={notifPrefs.groupMessages !== false}
                  onChange={() => handleToggleNotif('groupMessages')}
                  className="w-4 h-4 rounded text-[#142B4A] focus:ring-[#C6A45A] cursor-pointer"
                />
              </div>

              {/* Voice & Video Calls */}
              <div className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#182230] dark:text-white">Voice & Video Calls</div>
                  <div className="text-[11px] text-slate-400">Incoming calls, group meetings, and missed calls (Channel: FNI Calls)</div>
                </div>
                <input
                  type="checkbox"
                  checked={notifPrefs.calls !== false}
                  onChange={() => handleToggleNotif('calls')}
                  className="w-4 h-4 rounded text-[#142B4A] focus:ring-[#C6A45A] cursor-pointer"
                />
              </div>

              {/* Sound & Chimes */}
              <div className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#182230] dark:text-white">Notification Sound & Chimes</div>
                  <div className="text-[11px] text-slate-400">Audible synthesizer tone when alerts arrive</div>
                </div>
                <input
                  type="checkbox"
                  checked={notifPrefs.soundEnabled !== false}
                  onChange={() => handleToggleNotif('soundEnabled')}
                  className="w-4 h-4 rounded text-[#142B4A] focus:ring-[#C6A45A] cursor-pointer"
                />
              </div>

              {/* Haptic Vibration */}
              <div className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#182230] dark:text-white">Device Vibration</div>
                  <div className="text-[11px] text-slate-400">Vibrate mobile phone when permitted by system profile</div>
                </div>
                <input
                  type="checkbox"
                  checked={notifPrefs.vibrationEnabled !== false}
                  onChange={() => handleToggleNotif('vibrationEnabled')}
                  className="w-4 h-4 rounded text-[#142B4A] focus:ring-[#C6A45A] cursor-pointer"
                />
              </div>

              {/* Administrative Broadcasts */}
              <div className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#182230] dark:text-white">Administrative Broadcasts</div>
                  <div className="text-[11px] text-slate-400">Official pastoral bulletins and high-importance leadership notices</div>
                </div>
                <input
                  type="checkbox"
                  checked={notifPrefs.adminBroadcasts !== false}
                  onChange={() => handleToggleNotif('adminBroadcasts')}
                  className="w-4 h-4 rounded text-[#142B4A] focus:ring-[#C6A45A] cursor-pointer"
                />
              </div>

              {/* Critical Security Alerts (Enforced) */}
              <div className="p-4 flex items-center justify-between bg-amber-500/5 dark:bg-amber-500/10">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-[#182230] dark:text-white flex items-center gap-1.5">
                      <span>Security & Authentication Alerts</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[9px] font-bold">
                        Enforced
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">Password changes, deactivation updates and unrecognized device logins</div>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-slate-400">Always On</span>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            SECTION 4: CHAT WALLPAPER & APPEARANCE (Requirement 4)
        ========================================================================== */}
        {currentSection === 'chat_wallpaper' && (
          <div className="space-y-5">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Personalise the background appearance of your fellowship conversations. Wallpapers sync across your devices and apply exclusively to your view.
            </p>

            {wallpaperNotice && (
              <div className="p-3 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{wallpaperNotice}</span>
              </div>
            )}

            {/* LIVE CHAT PREVIEW BOX WITH OUTGOING & INCOMING BUBBLES */}
            <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-[#26384d]">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">
                Live Contrast & Bubble Preview
              </div>
              <div
                className="relative h-48 rounded-xl p-3 flex flex-col justify-between overflow-hidden shadow-inner border border-white/20 transition-all duration-300"
                style={getPreviewBackgroundStyle()}
              >
                <div className="absolute inset-0 bg-black/10 dark:bg-black/35 pointer-events-none" />

                {/* Sample Incoming Message Bubble */}
                <div className="relative z-10 flex items-start gap-2 max-w-[80%]">
                  <div className="w-7 h-7 rounded-full bg-[#142B4A] text-[#C6A45A] text-[10px] font-bold flex items-center justify-center shrink-0 shadow-xs">
                    FA
                  </div>
                  <div className="bg-white/95 dark:bg-slate-900/95 text-[#182230] dark:text-white p-2.5 rounded-2xl rounded-tl-xs text-[11px] shadow-sm border border-slate-200/50">
                    <span className="font-bold text-[#142B4A] dark:text-[#C6A45A] block text-[10px]">
                      FNI Administration
                    </span>
                    Grace and peace! Remember our weekly reporting deadline this Sunday.
                    <span className="block text-[9px] text-slate-400 mt-0.5 text-right">5:45 PM</span>
                  </div>
                </div>

                {/* Sample Outgoing Message Bubble (Self) */}
                <div className="relative z-10 flex items-start justify-end gap-2 max-w-[80%] self-end">
                  <div className="bg-[#142B4A] text-white p-2.5 rounded-2xl rounded-tr-xs text-[11px] shadow-sm border border-[#C6A45A]/30">
                    Amen! The cell meeting report has just been compiled and submitted.
                    <div className="flex items-center justify-end gap-1 text-[9px] text-slate-300 mt-0.5">
                      <span>5:47 PM</span>
                      <Check className="w-3 h-3 text-[#C6A45A]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* APPLICATION SCOPE (All vs Community) */}
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
              <div className="text-xs font-bold text-[#142B4A] dark:text-white">FNI Built-in Wallpapers</div>
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
                      activeWallpaperChoice === item.id ? 'border-[#C6A45A] ring-2 ring-[#C6A45A]/50' : 'border-slate-200 dark:border-slate-700'
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
                className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                <span>Reset to Default</span>
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            SECTION 5: THEME & APPEARANCE (Requirement 5)
        ========================================================================== */}
        {currentSection === 'appearance' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select your preferred appearance for FNI Cells Connect. The theme applies across all screens and synchronizes across your devices.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Light Mode Card */}
              <button
                type="button"
                onClick={() => handleThemeChange('light')}
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
                    <span>Active Theme</span>
                  </div>
                )}
              </button>

              {/* Dark Mode Card */}
              <button
                type="button"
                onClick={() => handleThemeChange('dark')}
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
                    <span>Active Theme</span>
                  </div>
                )}
              </button>

              {/* System Default Card */}
              <button
                type="button"
                onClick={() => handleThemeChange('system')}
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
                  Matches your operating system light or dark profile
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
            SECTION 6: GENERAL PREFERENCES & GHANA TIME (Requirement 5)
        ========================================================================== */}
        {currentSection === 'general' && (
          <div className="space-y-4">
            {/* Live Ghana Time Clock Card */}
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <Clock className="w-4 h-4 text-[#C6A45A]" />
                  <span>Standard Ministry Timezone</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-amber-200/60 dark:bg-amber-900/60 text-[10px] font-bold">
                  Africa/Accra (UTC+0)
                </span>
              </div>
              <div className="text-xl font-black text-[#142B4A] dark:text-amber-300">
                {ghanaTimeStr || 'Loading Ghana Time...'}
              </div>
              <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                All weekly reporting deadlines (Sunday 6:00 PM), fellowship meetings, and quiz availability windows operate strictly on Ghana Time across all global assemblies.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#142B4A] dark:text-slate-200 mb-1">
                Official Language
              </label>
              <select
                value={generalPrefs.language}
                onChange={e => handleUpdateGeneralPrefs({ language: e.target.value as any })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#26384d] bg-white dark:bg-slate-800 text-xs text-[#182230] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#142B4A]"
              >
                <option value="en-GH">English (Ghana / International)</option>
                <option value="en-UK">English (United Kingdom)</option>
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                English is the official working language of Forerunners Network International.
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
                <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 19/11/2026)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-11-19)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 11/19/2026)</option>
              </select>
            </div>
          </div>
        )}

        {/* =========================================================================
            SECTION 7: HELP & SUPPORT (Requirement 6)
        ========================================================================== */}
        {currentSection === 'help_support' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#152338] border border-slate-200/80 dark:border-[#26384d] space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#142B4A] dark:text-white">
                <Building className="w-4 h-4 text-[#C6A45A]" />
                <span>Forerunners Network International</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                FNI Cells Connect is the official fellowship reporting, discipleship, and evangelism coordination platform for Forerunners Network International.
              </p>
            </div>

            {/* Official Contact Details */}
            <div className="space-y-2 text-xs">
              <div className="font-bold text-[#142B4A] dark:text-white">Administrative Support Directory</div>
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#26384d] space-y-2 text-[11px] bg-white dark:bg-[#152338]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Directorate:</span>
                  <span className="font-bold text-[#142B4A] dark:text-white">Cell Discipleship & Administration</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Support Email:</span>
                  <span className="font-bold text-[#142B4A] dark:text-[#C6A45A]">support@forerunnersnetwork.org</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Headquarters:</span>
                  <span className="text-slate-700 dark:text-slate-300">Accra, Ghana &bull; Africa/Accra Time</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Operating Hours:</span>
                  <span className="text-slate-700 dark:text-slate-300">Mon &ndash; Sat &bull; 8:00 AM &ndash; 6:00 PM GMT</span>
                </div>
              </div>
            </div>

            {/* Frequently Asked Questions (Interactive Accordion) */}
            <div className="space-y-2 text-xs">
              <div className="font-bold text-[#142B4A] dark:text-white">Frequently Asked Questions</div>
              <div className="rounded-xl border border-slate-200 dark:border-[#26384d] divide-y divide-slate-100 dark:divide-[#26384d] overflow-hidden bg-white dark:bg-[#152338]">
                {FAQ_ITEMS.map((item, index) => {
                  const isExpanded = expandedFaqIndex === index;
                  return (
                    <div key={index} className="p-3">
                      <button
                        type="button"
                        onClick={() => setExpandedFaqIndex(isExpanded ? null : index)}
                        className="w-full flex items-center justify-between text-left font-bold text-slate-800 dark:text-slate-200 text-xs hover:text-[#142B4A] cursor-pointer gap-2"
                      >
                        <span>{item.question}</span>
                        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isExpanded ? 'rotate-180 text-[#C6A45A]' : ''}`} />
                      </button>
                      {isExpanded && (
                        <p className="mt-2 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed pl-1 border-l-2 border-[#C6A45A]">
                          {item.answer}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="text-center pt-2">
              <div className="text-xs font-bold text-[#142B4A] dark:text-white">FNI Cells Connect</div>
              <div className="text-[11px] text-slate-400">Version 1.0.0 (Build 2026.11)</div>
            </div>
          </div>
        )}

        {/* =========================================================================
            SECTION 8: PRIVACY POLICY (Requirement 6)
        ========================================================================== */}
        {currentSection === 'privacy_policy' && (
          <div className="space-y-4 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
              <h3 className="font-black text-sm text-[#142B4A] dark:text-white">
                FNI Cells Connect Privacy Policy
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Effective Date: November 2026 &bull; Forerunners Network International
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="font-bold text-[#142B4A] dark:text-white">1. Personal Information Collected</h4>
                <p className="text-[11px] mt-0.5">
                  FNI Cells Connect collects leader profile information (full name, email address, phone number, avatar), cell fellowship affiliations, and device push notification registration tokens solely to facilitate ministerial coordination and accountability.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#142B4A] dark:text-white">2. Cell Record Isolation</h4>
                <p className="text-[11px] mt-0.5">
                  In accordance with strict ministry privacy standards, each cell leader and tutor has access exclusively to their own registered fellowship cell. Tutors cannot view, edit, or access returns, attendees, or offerings from other cells.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#142B4A] dark:text-white">3. Historical Records & Data Retention</h4>
                <p className="text-[11px] mt-0.5">
                  Submitted cell reports, soul-winning returns, and meeting venues are retained permanently as historical church records for auditing, spiritual tracking, and administrative continuity, even upon leadership transition or account deactivation.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#142B4A] dark:text-white">4. Push Notifications & Device Tokens</h4>
                <p className="text-[11px] mt-0.5">
                  Device tokens registered via Firebase Cloud Messaging (Android) and Apple Web Push (iOS PWA) are used exclusively for ministerial reminders, announcements, and incoming calls. They are never shared with commercial third parties.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#142B4A] dark:text-white">5. Security Safeguards</h4>
                <p className="text-[11px] mt-0.5">
                  All communications and database queries are encrypted in transit via SSL/TLS and secured at rest through PostgreSQL Row-Level Security (RLS) policies enforcing identity authentication.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#142B4A] dark:text-white">6. Inquiries</h4>
                <p className="text-[11px] mt-0.5">
                  For questions regarding your account or cell data, contact FNI Administration at <span className="font-bold text-[#142B4A] dark:text-[#C6A45A]">support@forerunnersnetwork.org</span>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            SECTION 9: TERMS OF SERVICE (Requirement 6)
        ========================================================================== */}
        {currentSection === 'terms_of_service' && (
          <div className="space-y-4 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
              <h3 className="font-black text-sm text-[#142B4A] dark:text-white">
                FNI Cells Connect Terms of Service
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Ministerial Code of Conduct & Reporting Governance &bull; FNI National Administration
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="font-bold text-[#142B4A] dark:text-white">1. Acceptable Use & Ministerial Honor</h4>
                <p className="text-[11px] mt-0.5">
                  FNI Cells Connect is dedicated to advancing the apostolic mandate and kingdom harvest of Forerunners Network International. Users must conduct themselves with godly integrity, reverence, and mutual respect in all communication channels.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#142B4A] dark:text-white">2. Integrity of Ministry Reports</h4>
                <p className="text-[11px] mt-0.5">
                  All weekly cell meeting reports, attendance numbers, financial offerings, and evangelism harvest returns must be reported with strict truthfulness. Falsification or inflation of figures violates ministerial trust and core foundation tenets.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#142B4A] dark:text-white">3. Reporting Deadlines</h4>
                <p className="text-[11px] mt-0.5">
                  All cell leaders agree to submit weekly returns before Sunday 6:00 PM Ghana Time (Africa/Accra / UTC+0). Consistently late submissions are flagged for pastoral review and administrative follow-up.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#142B4A] dark:text-white">4. Account Responsibility</h4>
                <p className="text-[11px] mt-0.5">
                  Leaders are responsible for safeguarding their login credentials. Any suspected unauthorized access must be reported immediately to FNI Administration.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#142B4A] dark:text-white">5. Administrative Oversight</h4>
                <p className="text-[11px] mt-0.5">
                  FNI National Administration reserves the right to review reports, reassign cell jurisdictions, and manage leader account status in alignment with ministry policies and spiritual governance.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            SECTION 10: ACCOUNT DEACTIVATION REQUEST (Requirement 6)
        ========================================================================== */}
        {currentSection === 'deactivate_account' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200 text-xs">
              <div className="flex items-center gap-2 font-bold mb-1 text-rose-700 dark:text-rose-300">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Administrative Review Required</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                In accordance with FNI governance, accounts are not deleted immediately. Submitting this form routes an official deactivation request to FNI Administration. Your past cell meeting reports, attendance figures, and evangelism records will be securely preserved.
              </p>
            </div>

            {/* Existing Request Status Banner */}
            {existingDeactRequest && existingDeactRequest.status === 'pending' && (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-2.5">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-bold text-xs">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Request Status: Pending Administrator Review</span>
                </div>
                <div className="text-[11px] text-amber-900 dark:text-amber-300">
                  <p>
                    <span className="font-bold">Submitted Reason:</span> {existingDeactRequest.reason || 'No reason specified'}
                  </p>
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1">
                    Submitted on {new Date(existingDeactRequest.createdAt).toLocaleDateString('en-GH', { dateStyle: 'medium' })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCancelDeactivation}
                  disabled={isCancellingDeact}
                  className="px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-amber-800 dark:text-amber-200 text-xs font-bold hover:bg-amber-100 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isCancellingDeact ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                  <span>Cancel Deactivation Request</span>
                </button>
              </div>
            )}

            {deactNotice && (
              <div
                className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  deactNotice.isError
                    ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900'
                }`}
              >
                {deactNotice.isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                <span>{deactNotice.text}</span>
              </div>
            )}

            {/* Submission Form (Shown when no pending request) */}
            {(!existingDeactRequest || existingDeactRequest.status !== 'pending') && (
              <form onSubmit={handleSubmitDeactivation} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#142B4A] dark:text-slate-200 mb-1">
                    Reason for Deactivation Request <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    value={deactReason}
                    onChange={e => setDeactReason(e.target.value)}
                    rows={3}
                    placeholder="Please specify why you are requesting account deactivation (e.g. relocation, stepping down from cell leadership, pastoral transition)..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#26384d] bg-white dark:bg-slate-800 text-xs text-[#182230] dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <label className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deactConfirmation}
                    onChange={e => setDeactConfirmation(e.target.checked)}
                    className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                  <span>
                    I confirm that I want to request account deactivation and understand this will be reviewed by FNI Administration before any action is taken.
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
                  <span>Submit Request for Administrator Review</span>
                </button>
              </form>
            )}
          </div>
        )}

      </div>

      {/* SECURE LOGOUT CONFIRMATION MODAL (Requirement 7) */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#142238] rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-200 dark:border-[#26384d]">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center shrink-0">
                <LogOut className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h4 className="text-sm font-black text-[#142B4A] dark:text-white">
                  Confirm Secure Log Out
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  FNI Cells Connect Session
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to log out? Your session will be safely ended on this device. Your submitted reports, offline drafts, and cell records remain securely archived.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a2c42] text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onClose?.();
                  logout();
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      )}
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
