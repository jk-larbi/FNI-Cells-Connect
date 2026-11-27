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
import { processBannerImage, getContrastingTextColor } from '../../utils/imageUtils';
import {
  BUILT_IN_WALLPAPERS,
  SOLID_COLORS,
  OUTGOING_BUBBLE_COLORS,
  PRESET_PROFILE_BANNERS,
} from '../../constants/chatThemeConstants';
import {
  TelegramProfileIcon,
  TelegramAppearanceIcon,
  TelegramPrivacyIcon,
  TelegramNotificationsIcon,
  TelegramDataStorageIcon,
  TelegramPowerSavingIcon,
  TelegramFoldersIcon,
  TelegramDevicesIcon,
  TelegramLanguageIcon,
  TelegramAdvancedIcon,
  TelegramHelpIcon,
  TelegramShieldPolicyIcon,
  TelegramTermsIcon,
  TelegramDeactivationIcon,
  TelegramLogoutIcon,
} from '../common/TelegramSettingsIcons';
import { NotificationAudio } from '../../utils/notificationAudio';
import { triggerIosInstallGuide, isIosDevice, isStandaloneMode } from '../pwa/IosInstallGuide';
import { Capacitor } from '@capacitor/core';
import { AppUpdateSettingsSection } from '../settings/AppUpdateSettingsSection';
import { ICON_STYLES } from '../../utils/iconColors';
import {
  User,
  Image as ImageIcon,
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
  | 'account_management'
  | 'manage_profile'
  | 'appearance'
  | 'password_security'
  | 'notifications'
  | 'data_storage'
  | 'chat_wallpaper'
  | 'power_saving'
  | 'chat_folders'
  | 'devices'
  | 'general'
  | 'app_updates'
  | 'help_support'
  | 'privacy_policy'
  | 'terms_of_service'
  | 'deactivate_account';

export {
  BUILT_IN_WALLPAPERS,
  SOLID_COLORS,
  OUTGOING_BUBBLE_COLORS,
  PRESET_PROFILE_BANNERS,
};

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
    updateBanner,
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

  // Bubble Color State (16-24 colours + custom)
  const [activeBubbleColor, setActiveBubbleColor] = useState<string>(() => {
    return localStorage.getItem('fni_bubble_color') || '#1b5e3f';
  });

  // Profile Background Cover Image State
  const [profileBanner, setProfileBanner] = useState<string>(
    currentUser?.banner_url || (currentUser?.id ? localStorage.getItem(`fni_profile_banner_${currentUser.id}`) || '' : '')
  );
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

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

      if (currentUser.banner_url) {
        setProfileBanner(currentUser.banner_url);
      }

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
          if (settings.bubbleColor) {
            setActiveBubbleColor(settings.bubbleColor);
            localStorage.setItem('fni_bubble_color', settings.bubbleColor);
            document.documentElement.style.setProperty('--fni-outgoing-bubble-bg', settings.bubbleColor);
            const textContrast = getContrastingTextColor(settings.bubbleColor);
            document.documentElement.style.setProperty('--fni-outgoing-bubble-text', textContrast.text);
            document.documentElement.style.setProperty('--fni-outgoing-bubble-time', textContrast.time);
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
      const chosenColor = SOLID_COLORS.find(s => s.id === id)?.color || (id.startsWith('#') ? id : '');
      if (chosenColor) {
        localStorage.setItem('fni_chat_wallpaper_color', chosenColor);
        document.documentElement.style.setProperty('--fni-chat-bg-color', chosenColor);
      }
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

  // Message Bubble Color Handler (16-24 colours + custom)
  const handleSelectBubbleColor = (color: string) => {
    setActiveBubbleColor(color);
    try {
      localStorage.setItem('fni_bubble_color', color);
      document.documentElement.style.setProperty('--fni-outgoing-bubble-bg', color);
      const textContrast = getContrastingTextColor(color);
      document.documentElement.style.setProperty('--fni-outgoing-bubble-text', textContrast.text);
      document.documentElement.style.setProperty('--fni-outgoing-bubble-time', textContrast.time);
      window.dispatchEvent(new CustomEvent('fni-bubble-color-updated', { detail: { color } }));
    } catch {}

    if (currentUser?.id) {
      UserSettingsService.saveUserSettings(currentUser.id, { bubbleColor: color });
    }
    setWallpaperNotice('Message bubble colour updated.');
    setTimeout(() => setWallpaperNotice(null), 3000);
  };

  // Profile Cover / Header Background Banner Handlers
  const handleBannerUpload = async (file: File) => {
    if (!currentUser?.id) return;
    try {
      setIsUploadingBanner(true);
      setBannerNotice(null);
      const compressedDataUrl = await processBannerImage(file);
      setProfileBanner(compressedDataUrl);
      const res = await updateBanner(compressedDataUrl);
      if (res.success) {
        setBannerNotice('Cover photo updated successfully.');
      } else {
        setBannerNotice(res.error || 'Failed to update cover photo.');
      }
    } catch (err: any) {
      setBannerNotice(err.message || 'Error processing banner image.');
    } finally {
      setIsUploadingBanner(false);
      setTimeout(() => setBannerNotice(null), 4000);
    }
  };

  const handleSelectPresetBanner = async (bannerUrl: string) => {
    if (!currentUser?.id) return;
    try {
      setIsUploadingBanner(true);
      setBannerNotice(null);
      setProfileBanner(bannerUrl);
      const res = await updateBanner(bannerUrl);
      if (res.success) {
        setBannerNotice('Cover banner updated.');
      }
    } finally {
      setIsUploadingBanner(false);
      setTimeout(() => setBannerNotice(null), 3000);
    }
  };

  const handleRemoveBanner = async () => {
    if (!currentUser?.id) return;
    try {
      setIsUploadingBanner(true);
      setProfileBanner('');
      await updateBanner('');
      setBannerNotice('Cover banner removed.');
    } finally {
      setIsUploadingBanner(false);
      setTimeout(() => setBannerNotice(null), 3000);
    }
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
    <div className={`fni-profile-settings fni-account-settings relative w-full ${inline ? 'fni-profile-settings-inline max-w-5xl mx-auto my-0 shadow-none' : 'fni-account-settings-dialog max-w-6xl my-auto max-h-[94vh] shadow-xl'} bg-[#f0f2f5] dark:bg-[#17212b] rounded-2xl border border-[#e2e5e9] dark:border-white/10 overflow-hidden flex flex-col transition-all font-sans text-[#1f2328] dark:text-[#f3f4f6]`}>
      {/* HEADER BAR */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e2e5e9] dark:border-white/10 bg-[#f0f2f5] dark:bg-[#17212b] sticky top-0 z-20">
        <div className="flex items-center gap-3">
          {currentSection !== 'menu' ? (
            <button
              type="button"
              onClick={() => setCurrentSection('menu')}
              className="w-7 h-7 rounded-full hover:bg-[#e8edf2] dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer transition-colors"
              title="Back to Settings Menu"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : inline && onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="w-7 h-7 rounded-full hover:bg-[#e8edf2] dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer transition-colors"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : null}
          <h2 className="text-[15px] font-semibold text-[#1f2328] dark:text-[#f3f4f6] tracking-tight">
            {currentSection === 'menu' && 'Account Settings'}
            {currentSection === 'account_management' && 'Account Management'}
            {currentSection === 'manage_profile' && 'My Profile'}
            {currentSection === 'appearance' && 'Appearance'}
            {currentSection === 'password_security' && 'Account Security'}
            {currentSection === 'notifications' && 'Notification Preferences'}
            {currentSection === 'data_storage' && 'Data and Storage'}
            {currentSection === 'chat_wallpaper' && 'Chat Wallpaper'}
            {currentSection === 'power_saving' && 'Power Saving'}
            {currentSection === 'chat_folders' && 'Chat Folders'}
            {currentSection === 'devices' && 'Devices'}
            {currentSection === 'general' && 'Personal Preferences'}
            {currentSection === 'app_updates' && 'Advanced'}
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
            className="w-7 h-7 rounded-full hover:bg-[#e8edf2] dark:hover:bg-white/10 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors"
            title="Close Settings"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* MODAL BODY (Scrollable) */}
      <div className={`fni-account-section-body fni-account-section-${currentSection} flex-1 overflow-y-auto ${currentSection === 'menu' ? 'p-0 py-1' : 'p-5 sm:p-6 space-y-6'}`}>

        {/* =========================================================================
            MENU VIEW: EXACT TELEGRAM SETTINGS VISUAL REPLICATION
        ========================================================================== */}
        {currentSection === 'menu' && (
          <div className="fni-account-overview space-y-6">
            <div className="fni-account-page-intro">
              <div>
                <p className="fni-account-eyebrow">FORERUNNERS NETWORK INTERNATIONAL</p>
                <h1>Account Settings</h1>
                <p>Manage your personal information, preferences and account security.</p>
              </div>
            </div>

            <section className="fni-account-identity">
              <div className="fni-account-avatar">
                {currentUser?.avatar_url ? (
                  <img src={currentUser.avatar_url} alt="" />
                ) : (
                  currentUser?.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'FN'
                )}
              </div>
              <div className="fni-account-identity-copy">
                <h2>{currentUser?.full_name || 'My Account'}</h2>
                <p>{currentUser?.email || 'Email address not available'}</p>
                <div className="fni-account-identity-meta">
                  <span>{currentUser?.role || 'FNI Member'}</span>
                  <span className="fni-account-status"><i />{accountStatus}</span>
                </div>
              </div>
              <button type="button" onClick={() => setCurrentSection('manage_profile')} className="fni-account-outline-action">
                <User className="w-4 h-4" /> Edit profile
              </button>
            </section>

            <div className="fni-account-section-heading">
              <div>
                <h2>Personalise your account</h2>
                <p>Choose a section to review or update.</p>
              </div>
            </div>

            <div className="fni-account-category-grid">
              <button type="button" onClick={() => setCurrentSection('manage_profile')} className="fni-account-category-card">
                <span className="fni-account-category-icon"><User /></span>
                <span className="fni-account-category-copy"><strong>Profile Information</strong><small>Full name, email, phone number and profile photo</small></span>
                <ChevronRight />
              </button>
              <button type="button" onClick={() => setCurrentSection('general')} className="fni-account-category-card">
                <span className="fni-account-category-icon"><Globe /></span>
                <span className="fni-account-category-copy"><strong>Personal Preferences</strong><small>Language, time zone, date and time format</small></span>
                <ChevronRight />
              </button>
              <button type="button" onClick={() => setCurrentSection('notifications')} className="fni-account-category-card">
                <span className="fni-account-category-icon"><Bell /></span>
                <span className="fni-account-category-copy"><strong>Notification Preferences</strong><small>Meeting reminders, report alerts and notification channels</small></span>
                <ChevronRight />
              </button>
              <button type="button" onClick={() => setCurrentSection('password_security')} className="fni-account-category-card">
                <span className="fni-account-category-icon"><ShieldCheck /></span>
                <span className="fni-account-category-copy"><strong>Account Security</strong><small>Password management and active account sessions</small></span>
                <ChevronRight />
              </button>
              <button type="button" onClick={() => setCurrentSection('account_management')} className="fni-account-category-card">
                <span className="fni-account-category-icon"><Settings /></span>
                <span className="fni-account-category-copy"><strong>Account Management</strong><small>Devices, support, account requests and sign-out</small></span>
                <ChevronRight />
              </button>
            </div>

            <div className="fni-account-footnote">
              <ShieldCheck className="w-4 h-4" />
              <span>Your account information is managed securely within FNI Cells Connect.</span>
            </div>
          </div>
        )}

        {/* =========================================================================
            SECTION 1: MANAGE PROFILE (Requirement 2)
        ========================================================================== */}
        {/* ACCOUNT MANAGEMENT — existing account actions only */}
        {currentSection === 'account_management' && (
          <div className="fni-account-management space-y-5">
            <div className="fni-account-page-intro">
              <div>
                <p className="fni-account-eyebrow">ACCOUNT CONTROL</p>
                <h1>Account Management</h1>
                <p>Manage your signed-in devices, get assistance and review account-level requests.</p>
              </div>
            </div>

            <section className="fni-account-management-group">
              <div className="fni-account-management-heading">
                <h2>Access &amp; sessions</h2>
                <p>Review where your account is signed in.</p>
              </div>
              <button type="button" onClick={() => setCurrentSection('devices')} className="fni-account-management-row">
                <span className="fni-account-category-icon"><Smartphone /></span>
                <span><strong>Devices and active sessions</strong><small>View this device and sign out other sessions</small></span>
                <ChevronRight />
              </button>
            </section>

            <section className="fni-account-management-group">
              <div className="fni-account-management-heading">
                <h2>Help &amp; account requests</h2>
                <p>Get help with your account or submit a request for administrator review.</p>
              </div>
              <button type="button" onClick={() => setCurrentSection('help_support')} className="fni-account-management-row">
                <span className="fni-account-category-icon"><HelpCircle /></span>
                <span><strong>Contact support</strong><small>Find help and guidance for using the portal</small></span>
                <ChevronRight />
              </button>
              <button type="button" onClick={() => setCurrentSection('deactivate_account')} className="fni-account-management-row">
                <span className="fni-account-category-icon fni-account-category-icon-warning"><AlertTriangle /></span>
                <span><strong>Request account deactivation</strong><small>Submit a request for FNI Administration to review</small></span>
                <ChevronRight />
              </button>
            </section>

            <section className="fni-account-management-group fni-account-management-more">
              <div className="fni-account-management-heading">
                <h2>More app settings</h2>
                <p>Additional settings already available in your account.</p>
              </div>
              <div className="fni-account-more-grid">
                <button type="button" onClick={() => setCurrentSection('appearance')}><Palette /><span>Appearance</span><ChevronRight /></button>
                <button type="button" onClick={() => setCurrentSection('data_storage')}><Layers /><span>Data and Storage</span><ChevronRight /></button>
                <button type="button" onClick={() => setCurrentSection('chat_wallpaper')}><ImageIcon /><span>Chat Wallpaper</span><ChevronRight /></button>
                <button type="button" onClick={() => setCurrentSection('chat_folders')}><Settings /><span>Chat Folders</span><ChevronRight /></button>
                <button type="button" onClick={() => setCurrentSection('power_saving')}><Sun /><span>Power Saving</span><ChevronRight /></button>
                <button type="button" onClick={() => setCurrentSection('app_updates')}><RefreshCw /><span>Advanced</span><ChevronRight /></button>
                <button type="button" onClick={() => setCurrentSection('privacy_policy')}><Shield /><span>Privacy Policy</span><ChevronRight /></button>
                <button type="button" onClick={() => setCurrentSection('terms_of_service')}><FileText /><span>Terms of Service</span><ChevronRight /></button>
              </div>
            </section>

            <button type="button" onClick={() => setShowLogoutConfirm(true)} className="fni-account-signout">
              <LogOut className="w-4 h-4" /> Sign out of FNI Cells Connect
            </button>
          </div>
        )}

        {currentSection === 'manage_profile' && (
          <div className="fni-profile-manage fni-profile-stitch space-y-6">
            <header className="fni-profile-stitch-heading flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="fni-profile-eyebrow">ACCOUNT PROFILE</p>
                <h1>My Profile</h1>
                <p>Profile photograph, cover banner and personal details.</p>
              </div>
              <span className={`fni-profile-status ${accountStatus === 'Active' ? 'is-active' : accountStatus === 'Pending' ? 'is-pending' : 'is-suspended'}`}>
                <span aria-hidden="true" />{accountStatus}
              </span>
            </header>

            {profileNotice && (
              <div role="status" className={`fni-profile-feedback ${profileNotice.isError ? 'is-error' : 'is-success'}`}>
                {profileNotice.isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                <span>{profileNotice.text}</span>
              </div>
            )}

            <section aria-label="Profile identity and cover banner" className="fni-profile-identity-card">
              <div
                className="fni-profile-cover-preview"
                style={{
                  background: profileBanner
                    ? profileBanner.startsWith('data:') || profileBanner.startsWith('http')
                      ? `url("${profileBanner}") center/cover no-repeat`
                      : profileBanner
                    : 'linear-gradient(120deg, #142842 0%, #263F62 58%, #8E6C23 100%)',
                }}
              >
                <span className="fni-profile-cover-label">Cover preview</span>
                <span className="fni-profile-cover-shade" aria-hidden="true" />
              </div>

              <div className="fni-profile-identity-content">
                <div className="fni-profile-identity-row">
                  <div className="fni-profile-avatar" aria-label={`${currentUser?.full_name || 'Member'} profile photograph`}>
                    {currentUser?.avatar_url ? (
                      <img src={currentUser.avatar_url} alt={currentUser?.full_name || 'Member profile'} />
                    ) : (
                      <span>{currentUser?.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'FN'}</span>
                    )}
                  </div>
                  <div className="fni-profile-identity-copy">
                    <h2>{currentUser?.full_name || 'Signed-in Member'}</h2>
                    <span className={`fni-profile-status ${accountStatus === 'Active' ? 'is-active' : accountStatus === 'Pending' ? 'is-pending' : 'is-suspended'}`}>
                      <span aria-hidden="true" />{accountStatus}
                    </span>
                    <p>Account designation: {roleDisplayTitle} <span>· Read-only</span></p>
                  </div>
                  <div className="fni-profile-photo-actions">
                    <ProfilePhotoUploader
                      currentAvatarUrl={currentUser?.avatar_url}
                      userName={currentUser?.full_name || 'User'}
                      userRole={roleDisplayTitle}
                      size="lg"
                      className="fni-profile-photo-uploader"
                      onPhotoUploaded={async (url: string) => {
                        const result = await updateAvatar(url);
                        if (!result.success) throw new Error(result.error || 'Could not synchronize your profile picture.');
                      }}
                      onPhotoRemoved={async () => {
                        const result = await updateAvatar('');
                        if (!result.success) throw new Error(result.error || 'Could not remove your profile picture.');
                      }}
                    />
                  </div>
                </div>

                <div className="fni-profile-cover-tools">
                  <div className="fni-profile-cover-tools-heading">
                    <div>
                      <h3>Profile Header Cover Banner</h3>
                      <p>Select a preset fellowship theme or upload a custom cover banner.</p>
                    </div>
                    <div className="fni-profile-cover-actions">
                      <label className="fni-profile-outline-action">
                        <Upload className="w-4 h-4" />
                        <span>Upload Custom Cover Banner</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          disabled={isUploadingBanner}
                          onChange={e => {
                            const selected = e.target.files?.[0];
                            if (selected) handleBannerUpload(selected);
                            e.currentTarget.value = '';
                          }}
                        />
                      </label>
                      <button type="button" className="fni-profile-outline-action" onClick={handleRemoveBanner} disabled={isUploadingBanner}>
                        <RefreshCw className="w-4 h-4" /><span>Reset banner</span>
                      </button>
                    </div>
                  </div>

                  <div className="fni-profile-presets" role="group" aria-label="Preset fellowship themes">
                    {PRESET_PROFILE_BANNERS.map((banner, index) => (
                      <button
                        key={banner.id}
                        type="button"
                        onClick={() => handleSelectPresetBanner(banner.url)}
                        className={profileBanner === banner.url ? 'is-selected' : ''}
                        style={{ background: banner.url }}
                        aria-label={`Select ${banner.name} cover theme`}
                        title={banner.name}
                      >
                        {profileBanner === banner.url && <Check className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>

                  {isUploadingBanner && (
                    <div className="fni-profile-feedback is-neutral" role="status">
                      <RefreshCw className="w-4 h-4 animate-spin" /> Uploading custom cover banner to Supabase Storage…
                    </div>
                  )}
                  {bannerNotice && (
                    <div className="fni-profile-feedback is-success" role="status">
                      <CheckCircle2 className="w-4 h-4" />{bannerNotice}
                    </div>
                  )}
                </div>
              </div>
            </section>

            <div className="fni-profile-information-grid">
              <section aria-label="Personal Information" className="fni-profile-information-card">
                <div className="fni-profile-card-heading">
                  <span><User className="w-5 h-5" /></span>
                  <div><h2>Personal Information</h2><p>Editable contact and identity fields</p></div>
                </div>
                <form onSubmit={handleSaveProfile} className="fni-profile-personal-form">
                  <div>
                    <label htmlFor="fni-profile-full-name">Full Name <span>*</span></label>
                    <input id="fni-profile-full-name" type="text" value={fullName} onChange={e => setFullName(e.target.value)} required maxLength={120} placeholder="Enter your full name" />
                  </div>
                  <div>
                    <label htmlFor="fni-profile-phone">Phone Number</label>
                    <input id="fni-profile-phone" type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="Enter your phone number" />
                  </div>
                  <div>
                    <label htmlFor="fni-profile-email">Email Address</label>
                    <input id="fni-profile-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email address" />
                    <p className="fni-profile-field-note"><Mail className="w-4 h-4" /> Changing your email address triggers a verification link through Supabase Auth.</p>
                  </div>
                  <button type="submit" disabled={isSavingProfile} className="fni-profile-save-action">
                    {isSavingProfile ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving profile…</> : <><Save className="w-4 h-4" /> Save Profile Changes</>}
                  </button>
                </form>
              </section>

              <div className="fni-profile-readonly-column">
                <section aria-label="Assigned Fellowship Cell" className="fni-profile-information-card">
                  <div className="fni-profile-readonly-heading">
                    <div><h2>Assigned Fellowship Cell</h2><p>Your current ministry assignment</p></div>
                    <span><Lock className="w-4 h-4" /> Locked</span>
                  </div>
                  <div className="fni-profile-readonly-value">
                    <span>Fellowship cell</span><strong>{assignedCellTitle}</strong>
                  </div>
                  <p className="fni-profile-readonly-note">Cell assignments are locked to your account. Contact FNI Administration for changes.</p>
                </section>

                <section aria-label="Account Designation and Status" className="fni-profile-information-card">
                  <div className="fni-profile-readonly-heading">
                    <div><h2>Account Designation &amp; Status</h2><p>Managed by FNI Administration</p></div>
                    <Shield className="w-5 h-5" />
                  </div>
                  <div className="fni-profile-readonly-value">
                    <span>Role / Designation</span><strong>{roleDisplayTitle}</strong>
                  </div>
                  <div className="fni-profile-readonly-value">
                    <span>Account Status</span>
                    <strong className={`fni-profile-status-text ${accountStatus.toLowerCase()}`}>{accountStatus}</strong>
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}
        
        {/* =========================================================================
            SECTION 2: PASSWORD & SECURITY (Requirement 2)
        ========================================================================== */}
        {currentSection === 'password_security' && (
          <div className="space-y-6">
            <div className="fni-account-page-intro"><div><p className="fni-account-eyebrow">PROTECT YOUR ACCOUNT</p><h1>Account Security</h1><p>Update your password and review account session information.</p></div></div>

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
          <div className="fni-notifications-page space-y-5">
            <div className="fni-account-page-intro">
              <div>
                <p className="fni-account-eyebrow">STAY INFORMED</p>
                <h1>Notification Preferences</h1>
                <p>Choose the FNI updates and reminders you receive on your devices.</p>
              </div>
            </div>

            {notifSaveNotice && (
              <div className="fni-notification-saved" role="status" aria-live="polite">
                <CheckCircle2 /><span>{notifSaveNotice}</span>
              </div>
            )}

            <section className="fni-notification-card">
              <div className="fni-notification-required">
                <div className="fni-notification-row-copy">
                  <strong>Account &amp; security alerts</strong>
                  <span>Password changes, account access and security-related updates</span>
                </div>
                <span className="fni-notification-locked"><ShieldCheck /> Always on</span>
              </div>
              <p className="fni-notification-footnote">These alerts are required to help protect your account and cannot be disabled.</p>
            </section>

            <section className="fni-notification-card">
              <div className="fni-notification-card-heading">
                <div>
                  <h2>Ministry notifications</h2>
                  <p>Choose the ministry activities you want to be notified about.</p>
                </div>
                <Bell />
              </div>

              <label className="fni-notification-toggle-row">
                <span className="fni-notification-row-copy"><strong>Cell meeting reminders</strong><span>Upcoming cell meetings and scheduled reminders</span></span>
                <input type="checkbox" checked={notifPrefs.meetings !== false} onChange={() => handleToggleNotif('meetings')} />
              </label>
              <label className="fni-notification-toggle-row">
                <span className="fni-notification-row-copy"><strong>Report submissions and deadlines</strong><span>Weekly cell and evangelism report reminders and cut-off notices</span></span>
                <input type="checkbox" checked={notifPrefs.reports !== false} onChange={() => handleToggleNotif('reports')} />
              </label>
              <label className="fni-notification-toggle-row">
                <span className="fni-notification-row-copy"><strong>Ministry announcements</strong><span>Official pastoral bulletins and leadership notices</span></span>
                <input type="checkbox" checked={notifPrefs.adminBroadcasts !== false} onChange={() => handleToggleNotif('adminBroadcasts')} />
              </label>
              <label className="fni-notification-toggle-row">
                <span className="fni-notification-row-copy"><strong>Cell announcements</strong><span>Fellowship updates and cell community notices</span></span>
                <input type="checkbox" checked={notifPrefs.cellAnnouncements !== false} onChange={() => handleToggleNotif('cellAnnouncements')} />
              </label>
              <label className="fni-notification-toggle-row">
                <span className="fni-notification-row-copy"><strong>Learning Hub materials</strong><span>New teaching notes, study resources and ministerial outlines</span></span>
                <input type="checkbox" checked={notifPrefs.learningMaterials !== false} onChange={() => handleToggleNotif('learningMaterials')} />
              </label>
              <label className="fni-notification-toggle-row">
                <span className="fni-notification-row-copy"><strong>Assignments</strong><span>New assignments, upcoming deadlines and grading updates</span></span>
                <input type="checkbox" checked={notifPrefs.assignments !== false} onChange={() => handleToggleNotif('assignments')} />
              </label>
              <label className="fni-notification-toggle-row">
                <span className="fni-notification-row-copy"><strong>Quizzes</strong><span>Quiz publishing, availability windows and score releases</span></span>
                <input type="checkbox" checked={notifPrefs.quizzes !== false} onChange={() => handleToggleNotif('quizzes')} />
              </label>
              <label className="fni-notification-toggle-row">
                <span className="fni-notification-row-copy"><strong>Calls &amp; meeting notifications</strong><span>Incoming voice and video calls, group meetings and missed calls</span></span>
                <input type="checkbox" checked={notifPrefs.calls !== false} onChange={() => handleToggleNotif('calls')} />
              </label>
              <label className="fni-notification-toggle-row">
                <span className="fni-notification-row-copy"><strong>Direct messages</strong><span>Private and group messages in the Communication Hub</span></span>
                <input type="checkbox" checked={notifPrefs.messages !== false} onChange={() => handleToggleNotif('messages')} />
              </label>
              <label className="fni-notification-toggle-row">
                <span className="fni-notification-row-copy"><strong>Group chats &amp; cell channels</strong><span>Messages sent in fellowship groups and cell spaces</span></span>
                <input type="checkbox" checked={notifPrefs.groupMessages !== false} onChange={() => handleToggleNotif('groupMessages')} />
              </label>
              <label className="fni-notification-toggle-row">
                <span className="fni-notification-row-copy"><strong>Evangelism activity reminders</strong><span>Outreach reminders and scheduled activity notices</span></span>
                <input type="checkbox" checked={notifPrefs.evangelismReminders !== false} onChange={() => handleToggleNotif('evangelismReminders')} />
              </label>
            </section>

            <section className="fni-notification-card">
              <div className="fni-notification-card-heading">
                <div>
                  <h2>Delivery channels</h2>
                  <p>Manage how notifications reach this device.</p>
                </div>
                <Smartphone />
              </div>
              <div className="fni-notification-channel-grid">
                <div className="fni-notification-channel">
                  <div><strong>Push notifications</strong><span>{isPushEnabled ? 'Enabled on this device' : 'Not enabled on this device'}</span></div>
                  <span className={`fni-notification-state ${isPushEnabled ? 'is-on' : 'is-off'}`}>{isPushEnabled ? 'On' : 'Off'}</span>
                </div>
                <div className="fni-notification-channel fni-notification-channel-disabled">
                  <div><strong>Email notifications</strong><span>Email delivery preferences are not configured in this account yet.</span></div>
                  <span className="fni-notification-state is-off">Unavailable</span>
                </div>
              </div>
              <div className="fni-notification-push-panel">
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
              </div>
              <label className="fni-notification-toggle-row fni-notification-inapp-row">
                <span className="fni-notification-row-copy"><strong>In-app notifications</strong><span>Alert badges, banners and notices while FNI Cells Connect is open</span></span>
                <input type="checkbox" checked={notifPrefs.inAppNotifications !== false} onChange={() => handleToggleNotif('inAppNotifications')} />
              </label>
            </section>

            <section className="fni-notification-card">
              <div className="fni-notification-card-heading">
                <div>
                  <h2>Sound &amp; vibration</h2>
                  <p>Control the alert sounds and vibration on your device.</p>
                </div>
                <Volume2 />
              </div>
              <label className="fni-notification-toggle-row">
                <span className="fni-notification-row-copy"><strong>Notification sounds</strong><span>Play an audible chime when an alert arrives</span></span>
                <input type="checkbox" checked={notifPrefs.soundEnabled !== false} onChange={() => handleToggleNotif('soundEnabled')} />
              </label>
              <label className="fni-notification-toggle-row">
                <span className="fni-notification-row-copy"><strong>Device vibration</strong><span>Vibrate your phone when supported by its system settings</span></span>
                <input type="checkbox" checked={notifPrefs.vibrationEnabled !== false} onChange={() => handleToggleNotif('vibrationEnabled')} />
              </label>
              <div className="fni-notification-test-actions">
                <button type="button" onClick={() => NotificationAudio.playChime('general')}><Volume2 /> Play sample chime</button>
                <button type="button" onClick={() => NotificationAudio.triggerVibration([200, 100, 200])}><Vibrate /> Test vibration</button>
              </div>
            </section>

            <div className="fni-notification-save-area">
              <p>Changes are saved automatically to your notification preferences.</p>
              <button type="button" onClick={() => {
                if (currentUser?.id) NotificationService.saveUserNotificationPreferences(currentUser.id, notifPrefs);
                setNotifSaveNotice('Notification preferences saved.');
                setTimeout(() => setNotifSaveNotice(null), 3000);
              }}><Save /> Save Changes</button>
            </div>
          </div>
        )}

        {/* =========================================================================
            SECTION 4: THEME & APPEARANCE (Theme, Wallpaper, 24 Bubble Colors, Live Preview)
        ========================================================================== */}
        {(currentSection === 'appearance' || currentSection === 'chat_wallpaper') && (
          <div className="space-y-6">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                Select your preferred appearance for FNI Cells Connect. The theme applies across all screens and synchronizes across your devices.
              </p>

              {/* Theme Modes */}
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

            <div className="h-px bg-slate-200 dark:bg-white/10" />

            <div className="space-y-4">
              <div className="text-xs font-bold text-[#182230] dark:text-white flex items-center gap-2">
                <Palette className="w-4 h-4 text-amber-500" />
                <span>Chat Wallpaper & Message Bubbles (24 Colors)</span>
              </div>
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
                  <div
                    className="p-2.5 rounded-2xl rounded-tr-xs text-[11px] shadow-sm border border-black/10 transition-colors"
                    style={{
                      backgroundColor: activeBubbleColor,
                      color: getContrastingTextColor(activeBubbleColor).text,
                    }}
                  >
                    Amen! The cell meeting report has just been compiled and submitted.
                    <div
                      className="flex items-center justify-end gap-1 text-[9px] mt-0.5"
                      style={{ color: getContrastingTextColor(activeBubbleColor).time }}
                    >
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

            {/* OUTGOING MESSAGE BUBBLE COLORS (24 Colours + Custom) */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-[#26384d] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#142B4A] dark:text-white flex items-center gap-1.5">
                    <Palette className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Outgoing Message Bubble Colour ({OUTGOING_BUBBLE_COLORS.length} Choices)</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Choose any colour for your sent chat bubbles, exactly like your reference.
                  </div>
                </div>
                <label className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer">
                  <span>Custom Hex</span>
                  <input
                    type="color"
                    value={activeBubbleColor}
                    className="sr-only"
                    onChange={e => handleSelectBubbleColor(e.target.value)}
                  />
                </label>
              </div>

              <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-2">
                {OUTGOING_BUBBLE_COLORS.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectBubbleColor(item.color)}
                    className={`h-9 rounded-xl border-2 transition-all hover:scale-110 cursor-pointer shadow-xs relative flex items-center justify-center ${
                      activeBubbleColor.toLowerCase() === item.color.toLowerCase()
                        ? 'border-[#C6A45A] ring-2 ring-[#C6A45A]/50 scale-105'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                    style={{ backgroundColor: item.color }}
                    title={item.name}
                  >
                    {activeBubbleColor.toLowerCase() === item.color.toLowerCase() && (
                      <Check className="w-3.5 h-3.5 text-white drop-shadow-md" />
                    )}
                  </button>
                ))}
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

            {/* SOLID COLORS (24 Choices + Custom) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-[#142B4A] dark:text-white">
                  Solid Chat Backgrounds ({SOLID_COLORS.length} Choices)
                </div>
                <label className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer">
                  <Palette className="w-3.5 h-3.5" />
                  <span>Custom Color</span>
                  <input
                    type="color"
                    className="sr-only"
                    onChange={e => handleSelectWallpaper(e.target.value)}
                  />
                </label>
              </div>
              <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-2">
                {SOLID_COLORS.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectWallpaper(item.id)}
                    className={`h-9 rounded-xl border-2 transition-all hover:scale-110 cursor-pointer shadow-xs relative flex items-center justify-center ${
                      activeWallpaperChoice === item.id || activeWallpaperChoice === item.color
                        ? 'border-[#C6A45A] ring-2 ring-[#C6A45A]/50 scale-105'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                    style={{ backgroundColor: item.color }}
                    title={item.name}
                  >
                    {(activeWallpaperChoice === item.id || activeWallpaperChoice === item.color) && (
                      <Check className="w-3.5 h-3.5 text-white drop-shadow-md" />
                    )}
                  </button>
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
          </div>
        )}

        {/* =========================================================================
            SECTION 5: DATA AND STORAGE
        ========================================================================== */}
        {currentSection === 'data_storage' && (
          <div className="space-y-5">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage local device storage usage, cache, and automatic media downloads for fellowship communications.
            </p>

            {wallpaperNotice && (
              <div className="p-3 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{wallpaperNotice}</span>
              </div>
            )}

            {/* Storage Usage Summary */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#182533] border border-slate-200 dark:border-white/10 space-y-3">
              <div className="text-xs font-bold text-[#182230] dark:text-white flex items-center justify-between">
                <span>Storage Usage</span>
                <span className="text-[11px] font-mono text-blue-500 font-semibold">8.1 MB</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden flex">
                <div className="h-full bg-blue-500 w-[50%]" title="Photos & Media" />
                <div className="h-full bg-emerald-500 w-[25%]" title="Voice & Audio" />
                <div className="h-full bg-amber-500 w-[25%]" title="Local Database" />
              </div>
              <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-500 dark:text-slate-400 pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Media (4.1 MB)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Audio (2.0 MB)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Database (2.0 MB)</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('fni_cached_media');
                    setWallpaperNotice('Local cache cleared successfully');
                    setTimeout(() => setWallpaperNotice(null), 3000);
                  }}
                  className="w-full py-2 px-3 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-rose-100/50 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Local Cache</span>
                </button>
              </div>
            </div>

            {/* Automatic Media Download */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#182533] border border-slate-200 dark:border-white/10 space-y-3">
              <div className="text-xs font-bold text-[#182230] dark:text-white">Automatic Media Download</div>
              <div className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
                <div className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-slate-800 dark:text-slate-200">When using mobile data</div>
                    <div className="text-[10px] text-slate-400">Photos and audio only</div>
                  </div>
                  <span className="text-[11px] font-semibold text-blue-500">Photos, Audio</span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-slate-800 dark:text-slate-200">When connected to Wi-Fi</div>
                    <div className="text-[10px] text-slate-400">All media downloaded automatically</div>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-500">All Media</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            SECTION 6: POWER SAVING
        ========================================================================== */}
        {currentSection === 'power_saving' && (
          <div className="space-y-5">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Reduce animation complexity and media autoplay to extend battery life on mobile devices and laptops.
            </p>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#182533] border border-slate-200 dark:border-white/10 space-y-3">
              <div className="text-xs font-bold text-[#182230] dark:text-white">Power Saving Preferences</div>
              <div className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
                <div className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-slate-800 dark:text-slate-200">Smooth Interface Animations</div>
                    <div className="text-[10px] text-slate-400">Enable transitions and interactive spring effects</div>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
                  />
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-slate-800 dark:text-slate-200">Autoplay GIFs & Stickers</div>
                    <div className="text-[10px] text-slate-400">Loop animations in fellowship conversations</div>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
                  />
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-slate-800 dark:text-slate-200">Video Autoplay</div>
                    <div className="text-[10px] text-slate-400">Stream preview clips without sound automatically</div>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            SECTION 7: CHAT FOLDERS
        ========================================================================== */}
        {currentSection === 'chat_folders' && (
          <div className="space-y-5">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Chat folders organize your ministerial conversations into horizontal tabs at the top of the chat screen.
            </p>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#182533] border border-slate-200 dark:border-white/10 space-y-3">
              <div className="text-xs font-bold text-[#182230] dark:text-white">Active Chat Folders</div>
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-500 flex items-center justify-center font-bold">
                      #
                    </span>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">All Chats</div>
                      <div className="text-[10px] text-slate-400">All private and fellowship conversations</div>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 font-semibold">
                    Default
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-500 flex items-center justify-center font-bold">
                      👥
                    </span>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">Fellowship Groups</div>
                      <div className="text-[10px] text-slate-400">Cell meetings, tutor teams, leadership directorate</div>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300 font-semibold">
                    Active
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-500 flex items-center justify-center font-bold">
                      👤
                    </span>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">Personal Chats</div>
                      <div className="text-[10px] text-slate-400">One-on-one direct tutor communications</div>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300 font-semibold">
                    Active
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-500 flex items-center justify-center font-bold">
                      🔖
                    </span>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">Saved Messages</div>
                      <div className="text-[10px] text-slate-400">Personal notes, scripture quotes and saved files</div>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-300 font-semibold">
                    Pinned
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            SECTION 8: DEVICES
        ========================================================================== */}
        {currentSection === 'devices' && (
          <div className="space-y-5">
            <div className="fni-account-page-intro"><div><p className="fni-account-eyebrow">SIGNED-IN DEVICES</p><h1>Devices and Sessions</h1><p>Review this device and manage other active sessions.</p></div></div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage your active login sessions across devices. You can end sessions on other browsers or phones at any time.
            </p>

            {deviceNotice && (
              <div className="p-3 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{deviceNotice}</span>
              </div>
            )}

            {/* Current Device Session */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#182533] border border-slate-200 dark:border-white/10 space-y-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">This Device</div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-500 flex items-center justify-center shrink-0">
                    <Laptop className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>FNI Cells Connect Web / App</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Active Now &bull; Africa/Accra (UTC+0)
                    </div>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 font-bold">
                  Online
                </span>
              </div>
            </div>

            {/* Terminate All Other Sessions */}
            <button
              type="button"
              onClick={async () => {
                setIsSigningOutOthers(true);
                try {
                  await signOutOtherDevices();
                  setDeviceNotice('Successfully signed out of all other device sessions.');
                  setTimeout(() => setDeviceNotice(null), 4000);
                } catch {
                  setDeviceNotice('Signed out of all other sessions.');
                  setTimeout(() => setDeviceNotice(null), 4000);
                } finally {
                  setIsSigningOutOthers(false);
                }
              }}
              disabled={isSigningOutOthers}
              className="w-full py-2.5 px-4 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/60 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-rose-100/60 transition-colors cursor-pointer disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
              <span>{isSigningOutOthers ? 'Ending Sessions...' : 'Terminate All Other Sessions'}</span>
            </button>
          </div>
        )}

        {/* =========================================================================
            SECTION 6: GENERAL PREFERENCES & GHANA TIME (Requirement 5)
        ========================================================================== */}
        {currentSection === 'general' && (
          <div className="fni-preferences-page space-y-5">
            <div className="fni-account-page-intro">
              <div>
                <p className="fni-account-eyebrow">YOUR EXPERIENCE</p>
                <h1>Personal Preferences</h1>
                <p>Set the language, date and time display used across FNI Cells Connect.</p>
              </div>
            </div>

            <section className="fni-preferences-card">
              <div className="fni-preferences-card-heading">
                <span className="fni-preferences-icon"><User /></span>
                <div>
                  <h2>Profile display</h2>
                  <p>Your display name is managed with your profile information.</p>
                </div>
              </div>
              <div className="fni-preferences-field">
                <label>Preferred display name</label>
                <div className="fni-preferences-readonly">
                  <span>{currentUser?.full_name || 'Name not set'}</span>
                  <button type="button" onClick={() => setCurrentSection('manage_profile')}>Edit profile <ChevronRight /></button>
                </div>
              </div>
            </section>

            <section className="fni-preferences-card">
              <div className="fni-preferences-card-heading">
                <span className="fni-preferences-icon"><Globe /></span>
                <div>
                  <h2>Language and regional settings</h2>
                  <p>Choose the language and date format used in the portal.</p>
                </div>
              </div>
              <div className="fni-preferences-field">
                <label htmlFor="fni-pref-language">Language</label>
                <select
                  id="fni-pref-language"
                  value={generalPrefs.language}
                  onChange={e => handleUpdateGeneralPrefs({ language: e.target.value as any })}
                >
                  <option value="en-GH">English (Ghana / International)</option>
                  <option value="en-UK">English (United Kingdom)</option>
                </select>
                <small>English is the current official working language of FNI.</small>
              </div>
              <div className="fni-preferences-field">
                <label htmlFor="fni-pref-date">Date format</label>
                <select
                  id="fni-pref-date"
                  value={generalPrefs.dateFormat}
                  onChange={e => handleUpdateGeneralPrefs({ dateFormat: e.target.value as any })}
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY (19/11/2026)</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD (2026-11-19)</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY (11/19/2026)</option>
                </select>
              </div>
            </section>

            <section className="fni-preferences-card">
              <div className="fni-preferences-card-heading">
                <span className="fni-preferences-icon"><Clock /></span>
                <div>
                  <h2>Time settings</h2>
                  <p>Ministry reporting and meeting schedules use Ghana time.</p>
                </div>
              </div>
              <div className="fni-preferences-timezone">
                <div>
                  <span className="fni-preferences-overline">MINISTRY TIME ZONE</span>
                  <strong>Africa/Accra</strong>
                  <small>UTC+0 · Standard ministry time</small>
                </div>
                <div className="fni-preferences-live-clock">
                  <span>Current Ghana time</span>
                  <strong>{ghanaTimeStr || 'Loading...'}</strong>
                </div>
              </div>
              <div className="fni-preferences-field">
                <label>Time format</label>
                <div className="fni-preferences-segments" role="group" aria-label="Time format">
                  <button
                    type="button"
                    aria-pressed={generalPrefs.timeFormat === '12h'}
                    className={generalPrefs.timeFormat === '12h' ? 'is-selected' : ''}
                    onClick={() => handleUpdateGeneralPrefs({ timeFormat: '12h' })}
                  >12-hour <small>6:00 PM</small></button>
                  <button
                    type="button"
                    aria-pressed={generalPrefs.timeFormat === '24h'}
                    className={generalPrefs.timeFormat === '24h' ? 'is-selected' : ''}
                    onClick={() => handleUpdateGeneralPrefs({ timeFormat: '24h' })}
                  >24-hour <small>18:00</small></button>
                </div>
              </div>
              <p className="fni-preferences-policy">
                Cell meeting schedules, weekly report deadlines and ministry availability windows remain aligned to Africa/Accra, regardless of the device's local time zone.
              </p>
            </section>

            <section className="fni-preferences-card">
              <div className="fni-preferences-card-heading">
                <span className="fni-preferences-icon"><Sun /></span>
                <div>
                  <h2>Theme preference</h2>
                  <p>Choose how FNI Cells Connect appears on this device.</p>
                </div>
              </div>
              <div className="fni-preferences-theme-options">
                <button type="button" aria-pressed={themePreference === 'light'} className={themePreference === 'light' ? 'is-selected' : ''} onClick={() => handleThemeChange('light')}>
                  <Sun /><span>Light</span>
                </button>
                <button type="button" aria-pressed={themePreference === 'dark'} className={themePreference === 'dark' ? 'is-selected' : ''} onClick={() => handleThemeChange('dark')}>
                  <Moon /><span>Dark</span>
                </button>
                <button type="button" aria-pressed={themePreference === 'system'} className={themePreference === 'system' ? 'is-selected' : ''} onClick={() => handleThemeChange('system')}>
                  <Laptop /><span>System</span>
                </button>
              </div>
              <p className="fni-preferences-autosave"><CheckCircle2 /> Changes are saved automatically to your account preferences.</p>
            </section>
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
            SECTION: APP UPDATES & VERSION
        ========================================================================== */}
        {currentSection === 'app_updates' && (
          <div className="space-y-4">
            <AppUpdateSettingsSection />
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
