import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../lib/firebase';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { ProfilePhotoUploader } from '../common/ProfilePhotoUploader';
import { Lock, User, Phone, CheckCircle2, AlertCircle, Shield, Link2 } from 'lucide-react';

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, changePassword, updateAvatar, linkRecoveryProvider } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  
  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'idle' | 'success' | 'error'; message?: string }>({ type: 'idle' });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [providerBusy, setProviderBusy] = useState<'google' | 'apple' | null>(null);
  const [providerMessage, setProviderMessage] = useState('');

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Account Settings"
      size="md"
    >
      <div className="space-y-4">
        {/* Sub-tabs */}
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
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


            <div className="rounded-2xl border border-[#E3E8EF] p-4 space-y-3">
              <div className="flex items-center gap-2 text-[#142B4A] font-bold"><Link2 className="w-4 h-4 text-[#C6A45A]" /> Account recovery</div>
              <p className="text-[11px] text-slate-500">Link a Google account or Apple ID while signed in. You can then use that same account to sign in to this FNI profile without your FNI password.</p>
              {(['google', 'apple'] as const).map(provider => (
                <button key={provider} type="button" disabled={!!providerBusy || !!auth?.currentUser?.providerData.some(item => item.providerId === (provider === 'google' ? 'google.com' : 'apple.com'))} onClick={async () => {
                  setProviderBusy(provider); setProviderMessage('');
                  const result = await linkRecoveryProvider(provider);
                  setProviderBusy(null);
                  setProviderMessage(result.success ? (result.pending ? 'Redirecting to finish linking your account…' : (provider === 'google' ? 'Google account linked successfully.' : 'Apple ID linked successfully.')) : (result.error || 'Could not link account.'));
                }} className="w-full rounded-xl border border-[#D7DEE8] px-3 py-2.5 text-xs font-bold text-[#142B4A] hover:bg-slate-50 disabled:opacity-50">
                  {providerBusy === provider ? 'Connecting…' : auth?.currentUser?.providerData.some(item => item.providerId === (provider === 'google' ? 'google.com' : 'apple.com')) ? (provider === 'google' ? 'Google account linked' : 'Apple ID linked') : (provider === 'google' ? 'Link Google account' : 'Link Apple ID')}
                </button>
              ))}
              {providerMessage && <p role="status" className="text-[11px] text-[#142B4A] bg-[#F5F7FA] rounded-lg p-2">{providerMessage}</p>}
            </div>

            <p className="text-[11px] text-slate-400">
              For security compliance, name and role modifications must be authorized by national administration.
            </p>
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
                  type="password"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full pl-9 text-xs rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-800 focus:bg-white focus:ring-1 focus:ring-navy-600 focus:border-navy-600"
                />
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
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full pl-9 text-xs rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-800 focus:bg-white focus:ring-1 focus:ring-navy-600 focus:border-navy-600"
                />
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
      </div>
    </Modal>
  );
};
