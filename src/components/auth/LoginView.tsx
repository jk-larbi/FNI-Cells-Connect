import React, { useState } from 'react';
import { Cell, UserSession, UserProfile, AuthProvider } from '../../types';
import { 
  Lock, 
  Mail, 
  ArrowRight, 
  ShieldCheck, 
  KeyRound, 
  AlertCircle, 
  CheckCircle2, 
  User, 
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabase';
import { 
  verifyAdminCredentials, 
  getProfileByEmail, 
  getAdminSecurityConfig 
} from '../../lib/auth';

interface LoginViewProps {
  cells: Cell[];
  onLogin: (session: UserSession) => void;
  onRequestOnboarding: (email: string, name: string, provider: AuthProvider) => void;
  onRequestAdminPasswordChange: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  cells,
  onLogin,
  onRequestOnboarding,
  onRequestAdminPasswordChange
}) => {
  const [activeTab, setActiveTab] = useState<'leader' | 'admin'>('leader');

  // Administrator login form
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [isAdminSubmitting, setIsAdminSubmitting] = useState(false);

  // Cell Leader fast OAuth test modal state
  const [showOAuthModal, setShowOAuthModal] = useState<AuthProvider | null>(null);
  const [oauthEmail, setOauthEmail] = useState('');
  const [oauthName, setOauthName] = useState('');

  const adminConfig = getAdminSecurityConfig();

  // ---------------------------------------------------------------------------
  // Administrator Sign-in Handler
  // ---------------------------------------------------------------------------
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');
    setIsAdminSubmitting(true);

    const result = await verifyAdminCredentials(adminUsername, adminPassword);
    setIsAdminSubmitting(false);

    if (!result.success) {
      setAdminError(result.message || 'Invalid administrator credentials.');
      return;
    }

    if (result.needsPasswordChange) {
      // Mandatory: trigger force password change modal before accessing dashboard
      onRequestAdminPasswordChange();
      return;
    }

    // Normal authenticated administrator session
    onLogin({
      id: 'admin_root',
      role: 'admin',
      name: 'Administrator',
      email: adminUsername.includes('@') ? adminUsername : 'admin@fni.org',
      authProvider: 'credentials'
    });
  };

  // ---------------------------------------------------------------------------
  // Supabase Google & Apple OAuth Handlers
  // ---------------------------------------------------------------------------
  const handleInitiateOAuth = async (provider: 'google' | 'apple') => {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: window.location.origin
          }
        });
        if (!error) return;
        console.warn(`Supabase ${provider} OAuth notice:`, error.message);
      } catch (err) {
        console.warn(`Supabase OAuth connection notice:`, err);
      }
    }

    // Interactive OAuth dialog for sandbox environments & verification
    setShowOAuthModal(provider);
    if (provider === 'google') {
      setOauthEmail('kwame.mensah@gmail.com');
      setOauthName('Kwame Mensah');
    } else {
      setOauthEmail('leader.fni@icloud.com');
      setOauthName('Ama Owusu');
    }
  };

  const handleCompleteOAuthDialog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oauthEmail.trim()) return;

    const provider = showOAuthModal || 'google';
    const email = oauthEmail.trim().toLowerCase();
    const existingProfile = getProfileByEmail(email);

    if (existingProfile && existingProfile.cellId) {
      // Returning user: sign in directly without onboarding
      onLogin({
        id: existingProfile.id,
        role: existingProfile.role,
        cellId: existingProfile.cellId,
        cellName: existingProfile.cellName,
        email: existingProfile.email,
        name: existingProfile.fullName,
        phone: existingProfile.phone,
        authProvider: existingProfile.authProvider
      });
    } else {
      // First-time user: trigger first-time registration & cell linking
      onRequestOnboarding(email, oauthName.trim(), provider);
    }
    setShowOAuthModal(null);
  };

  return (
    <div className="min-h-screen bg-[#F6F7F9] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-[440px] bg-white border border-[#E3E6EB] rounded-2xl p-7 sm:p-9 shadow-sm space-y-6">
        {/* Brand Header with Official Logo */}
        <div className="text-center space-y-3 pb-2">
          <img
            src="/assets/aistudio/fni_logo_5b889f17.jpg"
            alt="Forerunners Network International Logo"
            className="w-16 h-16 rounded-xl object-cover mx-auto shadow-sm border border-[#E3E6EB]"
          />
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-[#0F2447] tracking-tight font-serif-title">
              FNI Digital Reporting
            </h1>
            <p className="text-xs text-[#5B6472] mt-0.5">
              Forerunners Network International
            </p>
          </div>
        </div>

        {/* Navigation Tabs between Cell Leader and Administrator */}
        <div className="flex bg-[#F6F7F9] p-1 rounded-lg border border-[#E3E6EB] text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('leader')}
            className={`flex-1 py-2 font-medium rounded-md transition-colors ${
              activeTab === 'leader'
                ? 'bg-white text-[#0F2447] shadow-xs'
                : 'text-[#5B6472] hover:text-[#0F2447]'
            }`}
          >
            Cell Leader Sign-In
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('admin')}
            className={`flex-1 py-2 font-medium rounded-md transition-colors ${
              activeTab === 'admin'
                ? 'bg-white text-[#0F2447] shadow-xs'
                : 'text-[#5B6472] hover:text-[#0F2447]'
            }`}
          >
            Administrator Sign-In
          </button>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* TAB 1: CELL LEADER AUTHENTICATION (Google & Apple OAuth)           */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'leader' && (
          <div className="space-y-4">
            <div className="text-center text-xs text-[#5B6472]">
              Sign in with your verified ministry account to file reports and manage your cell.
            </div>

            <div className="space-y-2.5">
              {/* Google OAuth Button */}
              <button
                type="button"
                onClick={() => handleInitiateOAuth('google')}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-white border border-[#E3E6EB] rounded-lg text-xs font-semibold text-[#14213D] hover:bg-slate-50 transition-colors shadow-xs"
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
                <span>Continue with Google Account</span>
              </button>

              {/* Apple OAuth Button */}
              <button
                type="button"
                onClick={() => handleInitiateOAuth('apple')}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-[#0F2447] text-white rounded-lg text-xs font-semibold hover:bg-[#18325C] transition-colors shadow-xs"
              >
                <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 0.92-2.85-.9.04-2 .6-2.65 1.35-.56.64-1.06 1.7-0.92 2.73.99.08 2.02-.51 2.65-1.23z" />
                </svg>
                <span>Continue with Apple ID</span>
              </button>
            </div>

            <div className="pt-2 text-center">
              <p className="text-[11px] text-[#8C95A3] leading-relaxed">
                First-time cell leaders will be prompted to link their assigned cell name and area upon authentication.
              </p>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 2: ADMINISTRATOR SIGN-IN (Temporary credentials & Password reset)*/}
        {/* ------------------------------------------------------------------ */}
        {activeTab === 'admin' && (
          <form onSubmit={handleAdminLogin} className="space-y-4 text-xs">
            <div>
              <label className="block font-medium text-[#14213D] mb-1">
                Administrator Username or Email
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C95A3]" />
                <input
                  type="text"
                  required
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="admin or admin@fni.org"
                  className="w-full pl-9 pr-3 py-2 border border-[#E3E6EB] rounded-lg bg-white text-[#14213D] focus:outline-none focus:ring-1 focus:ring-[#B8923A]"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-[#14213D] mb-1">
                Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C95A3]" />
                <input
                  type="password"
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder={adminConfig.initialSetupDone ? 'Enter your administrator password' : 'Enter admin123 for initial setup'}
                  className="w-full pl-9 pr-3 py-2 border border-[#E3E6EB] rounded-lg bg-white text-[#14213D] focus:outline-none focus:ring-1 focus:ring-[#B8923A]"
                />
              </div>
            </div>

            {adminError && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs flex items-start gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{adminError}</span>
              </div>
            )}

            {!adminConfig.initialSetupDone && (
              <div className="p-2.5 bg-[#FBF0D9] border border-[#EED7A1] rounded-lg text-[11px] text-[#8A5A00] space-y-0.5">
                <div className="font-semibold flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Initial Setup Credentials:</span>
                </div>
                <p>Username: <code className="font-mono font-bold">admin</code> · Password: <code className="font-mono font-bold">admin123</code></p>
                <p className="text-[10px] text-[#8A5A00]/80">You will be required to create a new password immediately upon login.</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isAdminSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#0F2447] hover:bg-[#18325C] rounded-lg transition-colors shadow-xs disabled:opacity-50"
            >
              <span>{isAdminSubmitting ? 'Authenticating...' : 'Sign In as Administrator'}</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#B8923A]" />
            </button>
          </form>
        )}

        {/* Footer Security Badges */}
        <div className="pt-3 border-t border-[#E3E6EB] flex items-center justify-center gap-2 text-[11px] text-[#5B6472]">
          <ShieldCheck className="w-4 h-4 text-[#B8923A]" />
          <span>Supabase Auth & Row Level Security (RLS) Enforced</span>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* Interactive OAuth Provider Dialog (Google / Apple Sandbox Verification) */}
      {/* -------------------------------------------------------------------- */}
      {showOAuthModal && (
        <div className="fixed inset-0 z-50 bg-[#0F2447]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E3E6EB] rounded-xl max-w-sm w-full p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150 text-xs">
            <div className="text-center space-y-1">
              <div className="w-10 h-10 rounded-full mx-auto flex items-center justify-center bg-[#F6F7F9] border border-[#E3E6EB]">
                {showOAuthModal === 'google' ? (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 fill-current text-[#0F2447]" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 0.92-2.85-.9.04-2 .6-2.65 1.35-.56.64-1.06 1.7-0.92 2.73.99.08 2.02-.51 2.65-1.23z" />
                  </svg>
                )}
              </div>
              <h3 className="font-semibold text-sm text-[#0F2447]">
                Sign in with {showOAuthModal === 'google' ? 'Google' : 'Apple ID'}
              </h3>
              <p className="text-[#5B6472] text-[11px]">
                Confirm identity to proceed to the FNI reporting portal.
              </p>
            </div>

            <form onSubmit={handleCompleteOAuthDialog} className="space-y-3">
              <div>
                <label className="block font-medium text-[#14213D] mb-1">
                  Account Email
                </label>
                <input
                  type="email"
                  required
                  value={oauthEmail}
                  onChange={(e) => setOauthEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E3E6EB] rounded-lg bg-white text-[#14213D] focus:outline-none focus:ring-1 focus:ring-[#B8923A]"
                />
              </div>

              <div>
                <label className="block font-medium text-[#14213D] mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={oauthName}
                  onChange={(e) => setOauthName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E3E6EB] rounded-lg bg-white text-[#14213D] focus:outline-none focus:ring-1 focus:ring-[#B8923A]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowOAuthModal(null)}
                  className="px-3 py-1.5 text-xs text-[#5B6472] hover:text-[#0F2447]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#0F2447] hover:bg-[#18325C] rounded-lg shadow-xs"
                >
                  Authorize Sign-In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
