import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  MessageSquare,
  Phone,
  Video,
  Mail,
  Smartphone,
  Shield,
  Camera,
  Upload,
  Palette,
  Trash2,
  Check,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AuthService } from '../../services/authService';
import { processBannerImage } from '../../utils/imageUtils';
import { PRESET_PROFILE_BANNERS } from '../../constants/chatThemeConstants';
import { useBackHandler } from '../../hooks/useBackHandler';

export interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    fullName: string;
    role?: string;
    avatarUrl?: string;
    bannerUrl?: string;
    cellName?: string;
    phone?: string;
    email?: string;
  } | null;
  onStartPrivateChat?: (userId: string) => void;
  onStartVoiceCall?: (userId: string) => void;
  onStartVideoCall?: (userId: string) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onStartPrivateChat,
  onStartVoiceCall,
  onStartVideoCall,
}) => {
  const { currentUser, updateBanner, updateAvatar } = useAuth();

  const [activeBanner, setActiveBanner] = useState<string>('');
  const [activeAvatar, setActiveAvatar] = useState<string>('');
  const [showBannerPicker, setShowBannerPicker] = useState(false);
  const [isUpdatingBanner, setIsUpdatingBanner] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const bannerFileInputRef = useRef<HTMLInputElement>(null);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setActiveBanner(user.bannerUrl || '');
      setActiveAvatar(user.avatarUrl || '');
      setShowBannerPicker(false);
      setFeedbackMsg(null);
    }
  }, [user]);

  useBackHandler(() => {
    if (isOpen) {
      if (showBannerPicker) {
        setShowBannerPicker(false);
        return true;
      }
      onClose();
      return true;
    }
    return false;
  }, isOpen);

  if (!isOpen || !user) return null;

  const isSelf = currentUser?.id === user.id;
  const canEdit = isSelf || currentUser?.role === 'super_admin' || currentUser?.role === 'admin';

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 3000);
  };

  // Handler for saving banner
  const applyBanner = async (bannerUrl: string) => {
    setIsUpdatingBanner(true);
    setActiveBanner(bannerUrl);
    try {
      if (user?.id) {
        localStorage.setItem(`fni_profile_banner_${user.id}`, bannerUrl);
        await AuthService.updateUserBanner(user.id, bannerUrl).catch(() => {});
      }
      if (currentUser?.id) {
        await updateBanner(bannerUrl).catch(() => {});
      }
      window.dispatchEvent(
        new CustomEvent('fni-profile-banner-updated', {
          detail: { userId: user.id, bannerUrl },
        })
      );
      showFeedback('Background image updated!');
      setShowBannerPicker(false);
    } catch (err: any) {
      console.error('Failed to update banner:', err);
      showFeedback('Background updated locally.');
      setShowBannerPicker(false);
    } finally {
      setIsUpdatingBanner(false);
    }
  };

  const handleBannerFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUpdatingBanner(true);
      const compressedDataUrl = await processBannerImage(file);
      await applyBanner(compressedDataUrl);
    } catch (err: any) {
      console.error('Banner processing failed:', err);
      showFeedback(err?.message || 'Failed to process image');
      setIsUpdatingBanner(false);
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleAvatarFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async event => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          setActiveAvatar(dataUrl);
          if (isSelf) {
            await updateAvatar(dataUrl);
          } else if (canEdit) {
            await AuthService.updateUserAvatar(user.id, dataUrl);
          }
          showFeedback('Profile picture updated!');
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error('Avatar update failed:', err);
      showFeedback('Could not update profile picture.');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Cover banner */}
        <div
          className="h-28 relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-cover bg-center overflow-hidden transition-all duration-300"
          style={activeBanner ? { backgroundImage: activeBanner.startsWith('linear-gradient') || activeBanner.startsWith('radial-gradient') ? activeBanner : `url(${activeBanner})` } : undefined}
        >
          {/* Subtle gradient overlay to keep icons and text clear */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/15 to-transparent pointer-events-none" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 text-white/90 hover:text-white rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm transition-colors z-20 cursor-pointer"
            title="Close profile"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Edit / Set Background Image Button (Always available directly on the banner) */}
          <div className="absolute bottom-2 right-2 z-20 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowBannerPicker(v => !v)}
              className="px-2.5 py-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-[11px] font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer border border-white/20"
              title="Set or change profile background image"
            >
              <Camera className="w-3.5 h-3.5 text-cyan-300" />
              <span>{activeBanner ? 'Change Cover' : 'Set Background'}</span>
            </button>
          </div>

          {/* Banner Selector Drawer / Popover */}
          {showBannerPicker && (
            <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-md z-30 p-3 flex flex-col justify-between animate-fadeIn text-white">
              <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                <div className="flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold">Profile Cover Background</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBannerPicker(false)}
                  className="p-1 rounded-full hover:bg-white/10 text-white/80 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Presets and Upload */}
              <div className="space-y-2 py-1 overflow-y-auto custom-scrollbar flex-1">
                <div className="grid grid-cols-3 gap-1.5">
                  {PRESET_PROFILE_BANNERS.map(preset => (
                    <button
                      key={preset.id}
                      type="button"
                      disabled={isUpdatingBanner}
                      onClick={() => applyBanner(preset.url)}
                      className={`h-7 rounded-lg text-[10px] font-semibold text-white/90 border relative overflow-hidden transition-all hover:scale-102 flex items-center justify-center cursor-pointer shadow-xs ${
                        activeBanner === preset.url ? 'ring-2 ring-cyan-400 border-white' : 'border-white/20'
                      }`}
                      style={{ background: preset.url }}
                      title={preset.name}
                    >
                      <span className="truncate px-1 bg-black/30 rounded">{preset.name.split(' ')[0]}</span>
                      {activeBanner === preset.url && (
                        <Check className="w-3 h-3 text-white absolute top-0.5 right-0.5" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isUpdatingBanner}
                    onClick={() => bannerFileInputRef.current?.click()}
                    className="flex-1 py-1.5 px-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Image</span>
                  </button>

                  {activeBanner && (
                    <button
                      type="button"
                      disabled={isUpdatingBanner}
                      onClick={() => applyBanner('')}
                      className="py-1.5 px-2 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 font-semibold text-[11px] flex items-center justify-center gap-1 cursor-pointer border border-rose-500/30"
                      title="Reset cover to default"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
              </div>

              <input
                ref={bannerFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleBannerFileUpload}
                className="hidden"
              />
            </div>
          )}
        </div>

        {/* Profile info header */}
        <div className="px-6 pb-6 pt-0 relative flex flex-col items-center text-center -mt-12">
          {/* Avatar container with optional change button */}
          <div className="relative group mb-3">
            {activeAvatar ? (
              <img
                src={activeAvatar}
                alt={user.fullName}
                className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-slate-900 shadow-lg"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 font-bold text-2xl flex items-center justify-center border-4 border-white dark:border-slate-900 shadow-lg">
                {user.fullName
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .substring(0, 2)
                  .toUpperCase() || 'U'}
              </div>
            )}

            <button
              type="button"
              onClick={() => avatarFileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-md border-2 border-white dark:border-slate-900 transition-all cursor-pointer"
              title="Change profile picture"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>

            <input
              ref={avatarFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarFileUpload}
              className="hidden"
            />
          </div>

          {feedbackMsg && (
            <div className="mb-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold animate-fadeIn">
              {feedbackMsg}
            </div>
          )}

          <h3 className="text-xl font-bold text-slate-900 dark:text-white">{user.fullName}</h3>

          <div className="flex flex-wrap items-center justify-center gap-2 mt-1.5 mb-4">
            {user.role && (
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 capitalize">
                {user.role}
              </span>
            )}
            {user.cellName && (
              <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {user.cellName}
              </span>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center justify-center gap-3 w-full mb-6">
            {onStartPrivateChat && (
              <button
                type="button"
                onClick={() => {
                  onStartPrivateChat(user.id);
                  onClose();
                }}
                className="flex-1 py-2.5 px-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Message</span>
              </button>
            )}
            {onStartVoiceCall && (
              <button
                type="button"
                onClick={() => {
                  onStartVoiceCall(user.id);
                  onClose();
                }}
                className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 transition-all active:scale-95 cursor-pointer"
                title="Start Voice Call"
              >
                <Phone className="w-5 h-5" />
              </button>
            )}
            {onStartVideoCall && (
              <button
                type="button"
                onClick={() => {
                  onStartVideoCall(user.id);
                  onClose();
                }}
                className="p-2.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 transition-all active:scale-95 cursor-pointer"
                title="Start Video Call"
              >
                <Video className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Details list */}
          <div className="w-full text-left space-y-2.5 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
            {user.email && (
              <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
                <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="truncate">{user.email}</span>
              </div>
            )}
            {user.phone && (
              <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
                <Smartphone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span>{user.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
              <Shield className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span>Registered FNI Fellowship Tutor</span>
            </div>
          </div>

          {/* Customize Profile Background Option */}
          <button
            type="button"
            onClick={() => setShowBannerPicker(true)}
            className="w-full mt-3 py-2.5 px-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer border border-slate-200 dark:border-white/10 active:scale-98"
          >
            <Palette className="w-4 h-4 text-cyan-500" />
            <span>Set / Change Profile Background Image</span>
          </button>
        </div>
      </div>
    </div>
  );
};
