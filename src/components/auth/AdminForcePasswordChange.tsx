import React, { useState } from 'react';
import { ShieldAlert, KeyRound, CheckCircle2, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { setAdminNewPassword } from '../../lib/auth';

interface AdminForcePasswordChangeProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const AdminForcePasswordChange: React.FC<AdminForcePasswordChangeProps> = ({
  onSuccess,
  onCancel
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword === 'admin123') {
      setError('New password cannot be the temporary setup password (admin123).');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsSubmitting(true);
    const result = await setAdminNewPassword(newPassword);
    setIsSubmitting(false);

    if (result.success) {
      onSuccess();
    } else {
      setError(result.message || 'Failed to update password.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0F2447]/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-[#E3E6EB] rounded-xl max-w-md w-full p-7 sm:p-8 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-[#FBF0D9] text-[#8A5A00] rounded-full flex items-center justify-center mx-auto border border-[#EED7A1] shadow-xs">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-semibold text-[#0F2447] font-serif-title">
            Initial Administrator Setup
          </h2>
          <p className="text-xs text-[#5B6472] leading-relaxed">
            You have signed in with the initial setup credentials. As a mandatory ministry security requirement, you must set a new administrator password before accessing the dashboard.
          </p>
        </div>

        <div className="p-3 bg-[#F6F7F9] rounded-lg border border-[#E3E6EB] text-[11px] text-[#5B6472] space-y-1">
          <div className="font-semibold text-[#0F2447] flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-[#B8923A]" />
            <span>Security Policy Notice:</span>
          </div>
          <p>
            The temporary password (<code className="font-mono bg-white px-1 py-0.5 rounded border border-[#E3E6EB]">admin123</code>) will be permanently disabled immediately upon submission.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-[#14213D] mb-1">
              New Administrator Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C95A3]" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full pl-9 pr-10 py-2.5 border border-[#E3E6EB] rounded-lg bg-white text-[#14213D] focus:outline-none focus:ring-2 focus:ring-[#B8923A]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C95A3] hover:text-[#0F2447]"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block font-medium text-[#14213D] mb-1">
              Confirm New Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C95A3]" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full pl-9 pr-3 py-2.5 border border-[#E3E6EB] rounded-lg bg-white text-[#14213D] focus:outline-none focus:ring-2 focus:ring-[#B8923A]"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded border border-red-200">
              {error}
            </p>
          )}

          <div className="pt-2 space-y-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#0F2447] hover:bg-[#18325C] rounded-lg transition-colors shadow-xs disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Securing Account...' : 'Set Password & Enter Dashboard'}</span>
              <ArrowRight className="w-4 h-4 text-[#B8923A]" />
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="w-full text-center text-[11px] text-[#5B6472] hover:text-[#0F2447] py-1"
            >
              Cancel & Sign Out
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
