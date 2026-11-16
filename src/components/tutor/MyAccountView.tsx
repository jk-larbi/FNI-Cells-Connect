import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
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
} from 'lucide-react';

interface MyAccountViewProps {
  onBack?: () => void;
}

export const MyAccountView: React.FC<MyAccountViewProps> = ({ onBack }) => {
  const { currentUser, changePassword, updateAvatar, logout, deleteOwnAccount } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passNotice, setPassNotice] = useState<{ text: string; isError: boolean } | null>(null);
  const [showDeletePanel, setShowDeletePanel] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') return;
    setIsDeletingAccount(true);
    setDeleteError('');
    const result = await deleteOwnAccount();
    setIsDeletingAccount(false);
    if (!result.success) setDeleteError(result.error || 'Account deletion failed. Please contact FNI support.');
    // On success, AuthContext signs the user out and returns them to the login screen.
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassNotice(null);

    if (newPassword.length < 6) {
      setPassNotice({ text: 'Password must be at least 6 characters.', isError: true });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassNotice({ text: 'Passwords do not match.', isError: true });
      return;
    }

    setIsChangingPass(true);
    try {
      const res = await changePassword(newPassword);
      if (res.success) {
        setPassNotice({ text: 'Password updated successfully.', isError: false });
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPassNotice({ text: res.error || 'Password update failed.', isError: true });
      }
    } finally {
      setIsChangingPass(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 sm:space-y-6">
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

        <h1 className="text-xl sm:text-2xl font-black text-[#142B4A] tracking-tight">
          My Account & Security
        </h1>
        <p className="text-sm text-[#667085] mt-1 leading-relaxed">
          Manage your personal credentials, view your fellowship cell association, and update security settings.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-[#E3E8EF] p-4 sm:p-6 shadow-sm space-y-4">
          <div className="pb-4 border-b border-[#E3E8EF] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#182230]">{currentUser.full_name}</h2>
                <p className="text-xs text-[#667085]">{String(currentUser.role || 'tutor').replace(/_/g, ' ')} &bull; {currentUser.cell_name || 'Fellowship'}</p>
              </div>
            </div>

            {/* Profile Picture Uploader for Tutor */}
            <div className="p-3 bg-[#F5F7FA] rounded-2xl border border-[#E3E8EF]">
              <div className="text-[10px] font-bold text-[#667085] uppercase tracking-wider mb-2">
                Leader Profile Picture
              </div>
              <ProfilePhotoUploader
                currentAvatarUrl={currentUser?.avatar_url}
                userName={currentUser?.full_name}
                userRole={currentUser?.role}
                size="md"
                onPhotoUploaded={async (url) => {
                  await updateAvatar(url);
                }}
                onPhotoRemoved={async () => {
                  await updateAvatar('');
                }}
              />
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-[#667085] mb-0.5">Account Leader Name</label>
              <div className="p-2.5 rounded-xl border border-[#E3E8EF] bg-[#F5F7FA] font-medium text-[#182230]">
                {currentUser.full_name || 'Cell Leader'}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#667085] mb-0.5">Assigned Cell</label>
              <div className="p-2.5 rounded-xl border border-[#E3E8EF] bg-[#F5F7FA] font-medium text-[#182230]">
                {currentUser.cell_name || 'Assigned Cell'}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#667085] mb-0.5">Account Role & Status</label>
              <div className="p-2.5 rounded-xl border border-[#E3E8EF] bg-[#F5F7FA] font-medium text-[#182230] flex items-center justify-between">
                <span className="capitalize">{currentUser.role || 'Tutor'}</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#23845B]">
                  <span className="w-2 h-2 rounded-full bg-[#23845B]"></span>
                  Active
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={logout}
              className="w-full py-2.5 rounded-xl border border-rose-200 text-[#C74646] hover:bg-[#FFF5F5] text-xs font-bold transition-colors flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out from Tutor Portal</span>
            </button>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="bg-white rounded-2xl border border-[#E3E8EF] p-4 sm:p-6 shadow-sm space-y-4">
          <div className="pb-3 border-b border-[#E3E8EF]">
            <h3 className="text-sm font-bold text-[#182230]">Update Password</h3>
            <p className="text-xs text-[#667085] mt-0.5">
              Choose a strong password to protect your cell reporting access.
            </p>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-3.5 text-xs">
            {passNotice && (
              <div
                className={`p-3 rounded-xl border-l-4 font-semibold text-xs flex items-center gap-2 ${
                  passNotice.isError
                    ? 'bg-[#FFF5F5] border-[#C74646] text-[#C74646]'
                    : 'bg-emerald-50 border-[#23845B] text-[#23845B]'
                }`}
              >
                {passNotice.isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                <span>{passNotice.text}</span>
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
              <span>{isChangingPass ? 'Updating...' : 'Change Password'}</span>
            </button>
          </form>
        </div>

        <section className="bg-white rounded-2xl border border-rose-200 p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <Trash2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-rose-700">Delete My Account</h3>
              <p className="text-xs text-slate-600 mt-1">
                Permanently remove your FNI sign-in account and personal profile. This action cannot be undone; you may register again later if permitted by an administrator.
              </p>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            Your submitted reports may be retained for ministry records. If you lead a cell, it will be left unassigned for an administrator to update.
          </p>
          {!showDeletePanel ? (
            <button type="button" onClick={() => setShowDeletePanel(true)} className="min-h-11 px-4 py-2.5 rounded-xl border border-rose-200 text-rose-700 text-sm font-bold hover:bg-rose-50">
              Delete my account
            </button>
          ) : (
            <div className="space-y-2 border-t border-rose-100 pt-3">
              <p className="text-xs font-semibold text-slate-800">This cannot be undone. Type DELETE to confirm.</p>
              <input value={deleteConfirmation} onChange={e => setDeleteConfirmation(e.target.value)} autoComplete="off" placeholder="Type DELETE" className="w-full min-h-11 p-3 rounded-xl border border-rose-200 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-rose-200" />
              {deleteError && <p role="alert" className="text-xs text-rose-700">{deleteError}</p>}
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => { setShowDeletePanel(false); setDeleteConfirmation(''); setDeleteError(''); }} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold">Cancel</button>
                <button type="button" disabled={deleteConfirmation !== 'DELETE' || isDeletingAccount} onClick={handleDeleteAccount} className="min-h-11 px-4 py-2.5 rounded-xl bg-rose-700 text-white text-sm font-bold disabled:opacity-40">
                  {isDeletingAccount ? 'Deleting account...' : 'Permanently delete account'}
                </button>
              </div>
            </div>
          )}
        </section>
      )}
      </div>
    </div>
  );
};
