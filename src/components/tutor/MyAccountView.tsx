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
  LogOut,
  CheckCircle2,
  AlertCircle,
  Save,
  ArrowLeft,
} from 'lucide-react';

interface MyAccountViewProps {
  onBack?: () => void;
}

export const MyAccountView: React.FC<MyAccountViewProps> = ({ onBack }) => {
  const { currentUser, changePassword, updateAvatar, logout } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passNotice, setPassNotice] = useState<{ text: string; isError: boolean } | null>(null);

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
          My Account & Security
        </h1>
        <p className="text-xs text-[#667085] mt-0.5">
          Manage your personal credentials, view your fellowship cell association, and update security settings.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-[#E3E8EF] p-6 shadow-sm space-y-4">
          <div className="pb-4 border-b border-[#E3E8EF] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#182230]">{currentUser.full_name}</h2>
                <p className="text-xs text-[#667085]">Cell Leader / Tutor &bull; {currentUser.cell_name || 'Fellowship'}</p>
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
        <div className="bg-white rounded-2xl border border-[#E3E8EF] p-6 shadow-sm space-y-4">
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
              <span>{isChangingPass ? 'Updating...' : 'Change Password'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
