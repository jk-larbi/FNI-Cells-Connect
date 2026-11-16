import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { ProfilePhotoUploader } from '../common/ProfilePhotoUploader';
import { Lock,
  Palette,
  Eye,
  EyeOff, User, Phone, CheckCircle2, AlertCircle, Shield } from 'lucide-react';

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, changePassword, updateAvatar, deleteOwnAccount } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'appearance' | 'delete'>('profile');
  const wallpaperStorageKey = `fni-chat-wallpapers:${currentUser?.id || 'guest'}`;
  const [chatWallpapers, setChatWallpapers] = useState<Record<string, string>>({});
  const [chatWallpaperImages, setChatWallpaperImages] = useState<Record<string, string>>({});
  const [wallpaperNotice, setWallpaperNotice] = useState('');
  const chatWallpaperOptions = [
    { id: 'default', name: 'Classic', color: '#F5F7FA', image: 'none' },
    { id: 'blue', name: 'Ocean', color: '#EAF2FB', image: 'radial-gradient(circle at 15% 20%, rgba(91,145,205,.16) 0 2px, transparent 3px), radial-gradient(circle at 80% 70%, rgba(91,145,205,.12) 0 2px, transparent 3px)' },
    { id: 'lavender', name: 'Lavender', color: '#F1EEFA', image: 'radial-gradient(circle at 20% 25%, rgba(137,112,190,.16), transparent 34%), radial-gradient(circle at 80% 75%, rgba(137,112,190,.12), transparent 30%)' },
    { id: 'sage', name: 'Sage', color: '#EDF4EF', image: 'radial-gradient(circle at 80% 20%, rgba(91,145,108,.15), transparent 32%), radial-gradient(circle at 15% 80%, rgba(91,145,108,.12), transparent 30%)' },
    { id: 'sand', name: 'Warm sand', color: '#F7F0E5', image: 'radial-gradient(circle at 18% 18%, rgba(198,164,90,.18), transparent 34%), radial-gradient(circle at 82% 82%, rgba(198,164,90,.13), transparent 30%)' },
    { id: 'night', name: 'Midnight', color: '#E8ECF3', image: 'radial-gradient(circle at 20% 20%, rgba(20,43,74,.15), transparent 34%), radial-gradient(circle at 80% 80%, rgba(20,43,74,.12), transparent 30%)' },
  ];

  useEffect(() => {
    try {
      const saved = localStorage.getItem(wallpaperStorageKey);
      const images = localStorage.getItem(`${wallpaperStorageKey}:images`);
      setChatWallpapers(saved ? JSON.parse(saved) : {});
      setChatWallpaperImages(images ? JSON.parse(images) : {});
    } catch {
      setChatWallpapers({});
      setChatWallpaperImages({});
    }
  }, [wallpaperStorageKey]);

  const saveChatWallpaper = (key: 'community' | 'private', id: string) => {
    const next = { ...chatWallpapers, [key]: id };
    setChatWallpapers(next);
    try { localStorage.setItem(wallpaperStorageKey, JSON.stringify(next)); } catch {}
    window.dispatchEvent(new CustomEvent('fni-chat-wallpaper-updated'));
    setWallpaperNotice(`${key === 'community' ? 'Community' : 'Private chat'} wallpaper saved on this device.`);
  };

  const uploadChatWallpaper = (key: 'community' | 'private', file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setWallpaperNotice('Choose an image file for your wallpaper.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setWallpaperNotice('Choose an image smaller than 3 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      const next = { ...chatWallpaperImages, [key]: reader.result };
      setChatWallpaperImages(next);
      try { localStorage.setItem(`${wallpaperStorageKey}:images`, JSON.stringify(next)); } catch {
        setWallpaperNotice('This image is too large for device storage. Choose a smaller image.');
        return;
      }
      window.dispatchEvent(new CustomEvent('fni-chat-wallpaper-updated'));
      setWallpaperNotice(`${key === 'community' ? 'Community' : 'Private chat'} wallpaper photo saved.`);
    };
    reader.readAsDataURL(file);
  };

  const removeChatWallpaperPhoto = (key: 'community' | 'private') => {
    const next = { ...chatWallpaperImages };
    delete next[key];
    setChatWallpaperImages(next);
    try { localStorage.setItem(`${wallpaperStorageKey}:images`, JSON.stringify(next)); } catch {}
    saveChatWallpaper(key, 'default');
    window.dispatchEvent(new CustomEvent('fni-chat-wallpaper-updated'));
  };
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'idle' | 'success' | 'error'; message?: string }>({ type: 'idle' });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setPasswordStatus({ type: 'error', message: 'Password must be at least 8 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    setIsUpdatingPassword(true);
    setPasswordStatus({ type: 'idle' });

    const res = await changePassword(newPassword);
    setIsUpdatingPassword(false);

    if (res.success) {
      setPasswordStatus({ type: 'success', message: 'Password updated successfully!' });
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPasswordStatus({ type: 'error', message: res.error || 'Failed to update password' });
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') return;
    setIsDeleting(true);
    setDeleteError('');
    const result = await deleteOwnAccount();
    setIsDeleting(false);
    if (!result.success) setDeleteError(result.error || 'Account deletion failed. Please try again.');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Account Settings"
      size="lg"
    >
      <div className="space-y-4">
        {/* Sub-tabs */}
        <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-100 pb-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`min-h-10 px-3 py-2 rounded-xl text-center transition-colors ${
              activeTab === 'profile' ? 'bg-navy-900 text-white' : 'text-slate-500 hover:text-navy-900'
            }`}
          >
            Profile Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('password')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'password' ? 'bg-navy-900 text-white' : 'text-slate-500 hover:text-navy-900'
            }`}
          >
            Security & Password
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('appearance')}
            className={`inline-flex min-h-10 items-center justify-center gap-1.5 px-3 py-2 rounded-xl transition-colors ${
              activeTab === 'appearance' ? 'bg-navy-900 text-white' : 'text-slate-500 hover:text-navy-900'
            }`}
          >
            <Palette className="h-3.5 w-3.5" /> Chat Appearance
          </button>
          <button type="button" onClick={() => setActiveTab('delete')} className={activeTab === 'delete' ? 'min-h-10 px-3 py-2 rounded-xl bg-rose-600 text-white' : 'min-h-10 px-3 py-2 rounded-xl text-rose-600 border border-rose-100 hover:bg-rose-50'}>Delete Account</button>
        </div>

        {activeTab === 'profile' && (
          <div className="space-y-3 text-xs">
            {/* Ministry Photo Uploader */}
            <div className="bg-[#F5F7FA] p-3.5 rounded-2xl border border-[#E3E8EF]">
              <div className="text-[10px] font-bold text-[#667085] uppercase tracking-wider mb-2">
                Official Ministry Photo
              </div>
              <ProfilePhotoUploader
                currentAvatarUrl={currentUser?.avatar_url}
                userName={currentUser?.full_name}
                userRole={currentUser?.role}
                onPhotoUploaded={async (url) => {
                  await updateAvatar(url);
                }}
                onPhotoRemoved={async () => {
                  await updateAvatar('');
                }}
              />
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Full Name</span>
                <span className="font-bold text-navy-950">{currentUser?.full_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Email Address</span>
                <span className="font-medium text-slate-700">{currentUser?.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Role</span>
                <span className="capitalize font-bold text-navy-900">{currentUser?.role.replace('_', ' ')}</span>
              </div>
              {currentUser?.cell_name && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Registered Cell</span>
                  <span className="font-bold text-gold-600 bg-gold-50 px-2 py-0.5 rounded-md border border-gold-200">
                    {currentUser.cell_name}
                  </span>
                </div>
              )}
              {currentUser?.region_name && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Region</span>
                  <span className="font-medium text-slate-700">{currentUser.region_name}</span>
                </div>
              )}
              {currentUser?.phone_number && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Phone / WhatsApp</span>
                  <span className="font-medium text-slate-700">{currentUser.phone_number}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Sign-In Provider</span>
                <span className="capitalize font-medium text-slate-700">{currentUser?.auth_provider || 'Email'}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              For security compliance, name and role modifications must be authorized by national administration.
            </p>\n            <button type="button" onClick={() => setActiveTab("delete")} className="w-full rounded-xl border border-rose-200 bg-rose-50 p-3 text-left transition-colors hover:bg-rose-100">\n              <span className="block text-sm font-bold text-rose-700">Delete account</span>\n              <span className="mt-1 block text-xs leading-relaxed text-rose-700/80">Permanently remove your FNI account and personal profile.</span>\n            </button>
          </div>
        )}

        {activeTab === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-3 text-xs">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-[11px] text-blue-900 flex items-start gap-2">
              <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                Change your administrator password securely. New password will be immediately required on your next session.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <input
                  type={showNewPassword ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full pl-9 pr-9 text-xs rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-800 focus:bg-white focus:ring-1 focus:ring-navy-600 focus:border-navy-600"
                />
                <button
                  type="button"
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                >
                  {showNewPassword ? <EyeOff className="w-3.5 h-3.5 text-[#C6A45A]" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full pl-9 pr-9 text-xs rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-800 focus:bg-white focus:ring-1 focus:ring-navy-600 focus:border-navy-600"
                />
                <button
                  type="button"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5 text-[#C6A45A]" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {passwordStatus.type === 'error' && (
              <div className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passwordStatus.message}</span>
              </div>
            )}

            {passwordStatus.type === 'success' && (
              <div className="text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{passwordStatus.message}</span>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isUpdatingPassword}
              className="w-full rounded-xl mt-2"
            >
              Update Password
            </Button>
          </form>
        )}

        {activeTab === 'appearance' && (
          <div className="space-y-5 text-xs">
            <div>
              <h3 className="mb-1 text-sm font-bold text-navy-950">Chat wallpapers</h3>
              <p className="text-slate-500">Choose the background used in FNI Community and your private conversations. These choices are saved on this device.</p>
            </div>
            {(['community', 'private'] as const).map(key => (
              <section key={key} className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                <div className="mb-3 font-bold text-navy-900">{key === 'community' ? 'FNI Community' : 'Private chats'}</div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {chatWallpaperOptions.map(option => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => saveChatWallpaper(key, option.id)}
                      className={`rounded-xl border p-1.5 text-[10px] font-semibold ${(chatWallpapers[key] || 'default') === option.id ? 'border-gold-500 ring-2 ring-gold-200' : 'border-slate-200'}`}
                    >
                      <span className="mb-1 block h-12 rounded-lg border border-black/5" style={{ backgroundColor: option.color, backgroundImage: option.image }} />
                      {option.name}
                    </button>
                  ))}
                </div>
                <label className="mt-3 flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2.5 font-semibold text-navy-900 hover:bg-slate-50">
                  Upload your own photo
                  <input type="file" accept="image/*" className="hidden" onChange={event => { uploadChatWallpaper(key, event.currentTarget.files?.[0]); event.currentTarget.value = ''; }} />
                </label>
                {chatWallpaperImages[key] && (
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-emerald-700">Custom photo selected</span>
                    <button type="button" onClick={() => removeChatWallpaperPhoto(key)} className="font-semibold text-rose-600">Remove photo</button>
                  </div>
                )}
              </section>
            ))}
            {wallpaperNotice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-emerald-800">{wallpaperNotice}</p>}
            <p className="text-[11px] text-slate-400">Wallpaper settings are device-specific. Set them again on another phone or browser if needed.</p>
          </div>
        )}

        {activeTab === 'delete' && (
          <div className="space-y-3 text-xs">
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800"><div className="font-bold text-sm mb-1">Permanently delete this account</div>This removes your sign-in account and FNI profile, including personal account details. You will be signed out immediately. This action cannot be undone.</div>
            <p className="text-slate-600">You can register again later using the same username and other credentials once deletion has completed.</p>
            <label className="block font-semibold text-slate-700">Type DELETE to confirm</label>
            <input value={deleteConfirmation} onChange={e => setDeleteConfirmation(e.target.value)} placeholder="Type DELETE" autoComplete="off" autoCapitalize="characters" className="w-full min-h-12 rounded-xl border border-slate-200 p-3 text-base" />
            {deleteError && <div role="alert" className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-rose-700">{deleteError}</div>}
            <Button type="button" variant="danger" size="md" isLoading={isDeleting} disabled={deleteConfirmation !== 'DELETE' || isDeleting} onClick={handleDeleteAccount} className="w-full min-h-12 rounded-xl">Permanently Delete My Account</Button>
          </div>
        )}
      </div>
    </Modal>
  );
};
