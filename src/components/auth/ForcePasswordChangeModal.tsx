import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, Lock, CheckCircle2, AlertCircle, KeyRound, ArrowRight } from 'lucide-react';
import { Button } from '../common/Button';

export const ForcePasswordChangeModal: React.FC = () => {
  const { changePassword } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Criteria validation
  const minLength = newPassword.length >= 8;
  const notAdmin123 = newPassword !== 'admin123';
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const isValid = minLength && notAdmin123 && hasLetter && hasNumber && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setIsLoading(true);
    setError(null);

    const res = await changePassword(newPassword);
    setIsLoading(false);

    if (!res.success) {
      setError(res.error || 'Failed to update administrator password');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto custom-scrollbar overscroll-contain">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header Banner */}
        <div className="bg-navy-900 px-6 py-5 text-white relative shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-gold-500/20 text-gold-400 flex items-center justify-center mb-3 border border-gold-400/30">
            <KeyRound className="w-6 h-6 text-gold-400" />
          </div>
          <h2 className="text-xl font-extrabold tracking-tight text-white">
            Mandatory Security Setup
          </h2>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            First-time administrator login detected. As required by organisational security policy, you must create a new secure password before accessing the dashboard.
          </p>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar overscroll-contain flex-1">
          <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3 text-xs text-amber-900 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              The temporary credentials (<code className="font-bold bg-amber-100 px-1 py-0.5 rounded">admin123</code>) will be permanently disabled once this step is completed. You cannot skip this process.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              New Administrator Password
            </label>
            <div className="relative rounded-xl shadow-xs">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Enter new strong password"
                className="w-full pl-10 text-xs rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-navy-600 focus:border-navy-600 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Confirm New Password
            </label>
            <div className="relative rounded-xl shadow-xs">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full pl-10 text-xs rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-navy-600 focus:border-navy-600 font-mono"
              />
            </div>
          </div>

          {/* Password Strength Checklist */}
          <div className="bg-slate-50 rounded-2xl p-3 space-y-1.5 text-[11px] border border-slate-100">
            <div className="font-semibold text-slate-600 text-xs mb-1">Password Requirements:</div>
            <div className={`flex items-center gap-2 ${minLength ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
              <CheckCircle2 className="w-3.5 h-3.5" /> At least 8 characters
            </div>
            <div className={`flex items-center gap-2 ${hasLetter ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Contains letters
            </div>
            <div className={`flex items-center gap-2 ${hasNumber ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Contains numbers
            </div>
            <div className={`flex items-center gap-2 ${notAdmin123 && newPassword.length > 0 ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Not equal to temporary password (admin123)
            </div>
            <div className={`flex items-center gap-2 ${passwordsMatch ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Passwords match
            </div>
          </div>

          {error && (
            <div className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={!isValid}
            isLoading={isLoading}
            className="w-full rounded-xl mt-2"
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Save Password & Access Dashboard
          </Button>
        </form>
      </div>
    </div>
  );
};
