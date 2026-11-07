import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';
import { Shield, Lock, User, ArrowRight, Sparkles, AlertCircle, KeyRound, CheckCircle2 } from 'lucide-react';

interface AuthViewProps {
  onSuccess?: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onSuccess }) => {
  const { loginAdmin, loginOAuth, isSupabaseActive } = useAuth();
  const [activePortal, setActivePortal] = useState<'cell_leader' | 'admin'>('cell_leader');

  // Admin form state
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('admin123');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Cell Leader OAuth action
  const handleOAuthSignIn = async (
    provider: 'google' | 'apple',
    options?: { testEmail?: string; testName?: string }
  ) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await loginOAuth(provider, options);
      if (!res.success) {
        setErrorMessage(res.error || 'OAuth sign-in failed');
      } else {
        if (onSuccess) onSuccess();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Administrator login action
  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await loginAdmin(adminUsername, adminPassword);
      if (!res.success) {
        setErrorMessage(res.error || 'Administrator authentication failed');
      } else {
        if (onSuccess) onSuccess();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-center py-10 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <span className="text-3xl font-extrabold tracking-tight text-navy-950">
          forerunners<span className="text-gold-500">.</span>
        </span>
        <h2 className="text-xl font-bold tracking-tight text-navy-950 mt-1">
          Digital Ministry Reporting System
        </h2>
        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mt-0.5">
          Forerunners Network International (FNI)
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        {/* Portal Switcher Tabs */}
        <div className="bg-slate-200/80 p-1 rounded-2xl flex items-center mb-4 text-xs font-bold text-slate-600 shadow-inner">
          <button
            type="button"
            onClick={() => {
              setActivePortal('cell_leader');
              setErrorMessage('');
            }}
            className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
              activePortal === 'cell_leader'
                ? 'bg-white text-navy-950 shadow-card'
                : 'hover:text-navy-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-gold-500" />
            Cell Leader Access
          </button>
          <button
            type="button"
            onClick={() => {
              setActivePortal('admin');
              setErrorMessage('');
            }}
            className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
              activePortal === 'admin'
                ? 'bg-navy-900 text-white shadow-card'
                : 'hover:text-navy-900'
            }`}
          >
            <Shield className="w-4 h-4 text-gold-400" />
            Administrator Sign-In
          </button>
        </div>

        {/* Card Surface */}
        <div className="bg-white py-8 px-6 shadow-card rounded-3xl border border-slate-100 sm:px-8">
          {/* TAB 1: CELL LEADER ACCESS */}
          {activePortal === 'cell_leader' && (
            <div className="space-y-5 animate-fade-in">
              <div className="text-center">
                <h3 className="text-base font-extrabold text-navy-950">Cell Leader Sign-In</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Authenticate securely using your Google Account or Apple ID to submit weekly returns and manage fellowship records.
                </p>
              </div>

              {/* OAuth Buttons */}
              <div className="space-y-3 pt-2">
                {/* Google Sign-In */}
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleOAuthSignIn('google')}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all font-semibold text-xs text-slate-800 shadow-xs group"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google (Gmail)</span>
                </button>

                {/* Apple ID Sign-In */}
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleOAuthSignIn('apple')}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl bg-black hover:bg-neutral-900 transition-all font-semibold text-xs text-white shadow-xs"
                >
                  <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 170 170">
                    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.69-7.85-12.01-14.42-6.19-9.5-10.97-20.15-14.34-31.96-3.37-11.81-5.06-23.23-5.06-34.27 0-14.99 3.96-27.16 11.89-36.52 7.93-9.36 17.58-14.15 28.96-14.37 5.76 0 11.75 1.52 17.97 4.57 6.22 3.04 10.02 4.67 11.4 4.89 1.74-.33 5.86-2.07 12.37-5.22 6.51-3.15 12.37-4.62 17.58-4.41 12.83.65 23.3 5.48 31.42 14.51-11.3 6.85-16.85 16.5-16.64 28.96.22 9.89 4.12 18.29 11.71 25.19 7.59 6.9 16.6 10.74 27.03 11.53-2.61 7.82-5.76 15.22-9.43 22.2zM119.22 31.05c0-7.17 2.61-13.88 7.83-20.13 5.22-6.25 11.63-10.16 19.24-11.73.22 1.3.33 2.5.33 3.6 0 7.17-2.77 14.05-8.31 20.65-5.54 6.6-12.06 10.36-19.57 11.28.11-1.22.48-2.45.48-3.67z" />
                  </svg>
                  <span>Continue with Apple ID</span>
                </button>
              </div>

              {/* Explanatory Protocol Note */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 text-[11px] text-slate-500 space-y-1">
                <div className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> First-Time Registration & Returning Access
                </div>
                <p>
                  • First-time leaders are prompted to register their cell name, meeting schedule, and phone number.
                </p>
                <p>
                  • Returning users with registered cells are automatically recognised and bypass setup.
                </p>
              </div>

              {/* Instant Evaluation Testing Profiles */}
              <div className="pt-2 border-t border-slate-100">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Instant Test Accounts (Click to Test)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      handleOAuthSignIn('google', {
                        testEmail: 'new.leader.test@gmail.com',
                        testName: 'Pastor Joshua Danladi',
                      })
                    }
                    className="p-2.5 rounded-xl border border-dashed border-amber-300 bg-amber-50/60 hover:bg-amber-100/70 text-left transition-colors"
                  >
                    <div className="font-bold text-amber-950 flex items-center justify-between">
                      <span>1. First-Time Setup</span>
                      <span className="text-[9px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded font-mono">NEW</span>
                    </div>
                    <div className="text-[11px] text-amber-800 truncate">Triggers cell onboarding wizard</div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleOAuthSignIn('google', {
                        testEmail: 'michael.okon@gmail.com',
                        testName: 'Brother Michael Okon',
                      })
                    }
                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-slate-100 text-left transition-colors"
                  >
                    <div className="font-bold text-navy-950 flex items-center justify-between">
                      <span>2. Returning Leader</span>
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono">ACTIVE</span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">Grace Cell VI (Bypasses setup)</div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ADMINISTRATOR SIGN-IN */}
          {activePortal === 'admin' && (
            <div className="space-y-4 animate-fade-in">
              <div className="text-center">
                <div className="w-10 h-10 rounded-2xl bg-navy-900 text-gold-400 mx-auto flex items-center justify-center mb-2 shadow-xs">
                  <Shield className="w-5 h-5" />
                </div>
                <h3 className="text-base font-extrabold text-navy-950">Administrator Sign-In</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Protected administrative portal for national leadership and oversight.
                </p>
              </div>

              {/* Initial Setup Credentials Notice */}
              <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3 text-xs text-amber-950 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-900">
                  <KeyRound className="w-4 h-4 text-amber-600" />
                  Initial Setup Credentials
                </div>
                <div className="text-[11px] text-amber-900 leading-relaxed">
                  Use Username: <code className="bg-amber-200/70 px-1 py-0.5 rounded font-bold font-mono">admin</code>, Password: <code className="bg-amber-200/70 px-1 py-0.5 rounded font-bold font-mono">admin123</code>.
                </div>
                <div className="text-[10px] text-amber-800 mt-1 italic">
                  *組織 Security Requirement: Immediate mandatory password change enforced upon first login. Temporary credentials disabled once configured.
                </div>
              </div>

              <form onSubmit={handleAdminSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Administrator Username or Email
                  </label>
                  <div className="relative rounded-xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={adminUsername}
                      onChange={e => setAdminUsername(e.target.value)}
                      placeholder="admin"
                      className="w-full pl-10 text-xs rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-navy-600 focus:border-navy-600 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password
                  </label>
                  <div className="relative rounded-xl shadow-xs">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      required
                      value={adminPassword}
                      onChange={e => setAdminPassword(e.target.value)}
                      placeholder="admin123"
                      className="w-full pl-10 text-xs rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-navy-600 focus:border-navy-600 font-mono"
                    />
                  </div>
                </div>

                {errorMessage && (
                  <div className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="w-full rounded-xl mt-2"
                  isLoading={isLoading}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Sign In to Admin Panel
                </Button>
              </form>
            </div>
          )}

          {errorMessage && activePortal === 'cell_leader' && (
            <div className="mt-3 text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Backend & Security Indicator */}
        <div className="mt-4 text-center text-[11px] text-slate-400 flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Supabase PostgreSQL Auth & RLS Protected</span>
        </div>
      </div>
    </div>
  );
};
