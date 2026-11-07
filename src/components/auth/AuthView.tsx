import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Shield,
  Lock,
  User,
  Users,
  Building,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  LogIn,
  UserPlus,
} from 'lucide-react';

export type AuthFlowView = 'tutor-signup' | 'login-select' | 'tutor-login' | 'admin-login';

interface AuthViewProps {
  initialView?: AuthFlowView;
  onBackToLanding?: () => void;
  onSuccess?: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  initialView = 'login-select',
  onBackToLanding,
  onSuccess,
}) => {
  const { loginAdmin, loginTutor, registerTutor } = useAuth();
  const [currentView, setCurrentView] = useState<AuthFlowView>(initialView);

  // Tutor Registration state (4 fields ONLY)
  const [regFullName, setRegFullName] = useState('');
  const [regCellName, setRegCellName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  // Tutor Login state (3 fields ONLY)
  const [loginFullName, setLoginFullName] = useState('');
  const [loginCellName, setLoginCellName] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Administrator Login state (1 field ONLY)
  const [adminPassword, setAdminPassword] = useState('');

  // Feedback states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  // 1. Handle Tutor Registration
  const handleTutorSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessNotice('');

    if (!regFullName.trim() || !regCellName.trim() || !regPassword || !regConfirmPassword) {
      setErrorMessage('Please complete all 4 fields.');
      return;
    }

    if (regPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await registerTutor({
        fullName: regFullName.trim(),
        cellName: regCellName.trim(),
        password: regPassword,
        confirmPassword: regConfirmPassword,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Registration failed.');
      } else {
        setSuccessNotice('Account created successfully! Redirecting...');
        if (onSuccess) onSuccess();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Handle Tutor Login (Full Name and Password ONLY)
  const handleTutorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessNotice('');

    if (!loginFullName.trim() || !loginPassword) {
      setErrorMessage('Please enter Full Name and Password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await loginTutor({
        fullName: loginFullName.trim(),
        password: loginPassword,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Authentication failed. Please verify credentials.');
      } else {
        if (onSuccess) onSuccess();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Handle Admin Login
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessNotice('');

    if (!adminPassword) {
      setErrorMessage('Please enter the administrator password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await loginAdmin(adminPassword);
      if (!res.success) {
        setErrorMessage(res.error || 'Administrator login failed.');
      } else {
        if (onSuccess) onSuccess();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#182230] flex flex-col justify-between items-center px-4 py-8 sm:py-12 relative overflow-hidden font-sans">
      {/* Subtle background decorative circle */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-[500px] h-[500px] sm:w-[700px] sm:h-[700px] rounded-full border border-[#C6A45A]/10 opacity-30"></div>
      </div>

      {/* Top Header / Back Navigation */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between z-10 mb-2">
        {currentView === 'login-select' || currentView === 'tutor-signup' ? (
          <button
            type="button"
            onClick={onBackToLanding}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#667085] hover:text-[#142B4A] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#C6A45A]" />
            <span>Back to Home</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setErrorMessage('');
              setCurrentView('login-select');
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#667085] hover:text-[#142B4A] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#C6A45A]" />
            <span>Back to Login Options</span>
          </button>
        )}
      </div>

      {/* Main Centered Container */}
      <main className="w-full max-w-md mx-auto flex flex-col items-center text-center my-auto z-10">
        {/* Official FNI Ministry Logo */}
        <div className="relative mb-5 group">
          <div className="absolute -inset-1.5 rounded-2xl border border-[#C6A45A]/35"></div>
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-white shadow-md bg-[#142B4A] flex items-center justify-center p-0.5">
            <img
              src="/fni-official-logo.jpg"
              alt="Forerunners Network International Official Logo"
              className="w-full h-full object-contain rounded-xl"
            />
          </div>
        </div>

        {/* Platform Name & Thin Gold Divider */}
        <h1 className="text-2xl sm:text-3xl font-black text-[#142B4A] tracking-tight leading-none mb-2">
          FNI CELLS CONNECT
        </h1>

        <div className="flex items-center justify-center gap-2 w-28 my-1.5">
          <div className="h-[1.5px] bg-gradient-to-r from-transparent to-[#C6A45A] flex-1"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-[#C6A45A]"></div>
          <div className="h-[1.5px] bg-gradient-to-l from-transparent to-[#C6A45A] flex-1"></div>
        </div>

        {/* Card Container for Current View */}
        <div className="w-full mt-5 bg-white rounded-2xl border-2 border-[#142B4A]/15 shadow-lg p-6 sm:p-7 text-left">
          {/* Alerts */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-[#FFF5F5] border-l-4 border-[#C74646] text-[#C74646] flex items-start gap-2.5 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successNotice && (
            <div className="mb-4 p-3 rounded-xl bg-[#F0FDF4] border-l-4 border-[#23845B] text-[#23845B] flex items-start gap-2.5 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* ============================================================ */}
          {/* 1. TUTOR REGISTRATION PAGE                                   */}
          {/* ============================================================ */}
          {currentView === 'tutor-signup' && (
            <div className="space-y-4">
              <div className="border-b border-[#E3E8EF] pb-3 text-center sm:text-left">
                <h2 className="text-lg font-bold text-[#142B4A]">
                  Create Your Tutor Account
                </h2>
                <p className="text-xs text-[#667085] mt-0.5">
                  Register your cell and leader credentials to start submitting reports.
                </p>
              </div>

              <form onSubmit={handleTutorSignUp} className="space-y-3.5">
                {/* 1. Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-[#142B4A] mb-1">
                    1. Full Name <span className="text-[#C74646]">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#C6A45A] absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      placeholder="e.g. Samuel Mensah"
                      className="w-full pl-9 pr-3 py-2 bg-white border border-[#E3E8EF] rounded-xl text-xs text-[#182230] placeholder-[#98A2B3] focus:border-[#142B4A] focus:ring-1 focus:ring-[#C6A45A] outline-none"
                    />
                  </div>
                </div>

                {/* 2. Cell Name */}
                <div>
                  <label className="block text-xs font-semibold text-[#142B4A] mb-1">
                    2. Cell Name <span className="text-[#C74646]">*</span>
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-[#C6A45A] absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={regCellName}
                      onChange={(e) => setRegCellName(e.target.value)}
                      placeholder="e.g. Grace Fellowship Central"
                      className="w-full pl-9 pr-3 py-2 bg-white border border-[#E3E8EF] rounded-xl text-xs text-[#182230] placeholder-[#98A2B3] focus:border-[#142B4A] focus:ring-1 focus:ring-[#C6A45A] outline-none"
                    />
                  </div>
                </div>

                {/* 3. Password */}
                <div>
                  <label className="block text-xs font-semibold text-[#142B4A] mb-1">
                    3. Password <span className="text-[#C74646]">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#C6A45A] absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Create a password (min 6 characters)"
                      className="w-full pl-9 pr-3 py-2 bg-white border border-[#E3E8EF] rounded-xl text-xs text-[#182230] placeholder-[#98A2B3] focus:border-[#142B4A] focus:ring-1 focus:ring-[#C6A45A] outline-none"
                    />
                  </div>
                </div>

                {/* 4. Confirm Password */}
                <div>
                  <label className="block text-xs font-semibold text-[#142B4A] mb-1">
                    4. Confirm Password <span className="text-[#C74646]">*</span>
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-[#C6A45A] absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full pl-9 pr-3 py-2 bg-white border border-[#E3E8EF] rounded-xl text-xs text-[#182230] placeholder-[#98A2B3] focus:border-[#142B4A] focus:ring-1 focus:ring-[#C6A45A] outline-none"
                    />
                  </div>
                </div>

                {/* SIGN UP Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-3 py-3 px-4 bg-[#142B4A] hover:bg-[#203D63] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 text-[#C6A45A]" />
                  <span>{isLoading ? 'Creating Account...' : 'Sign Up'}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#C6A45A]" />
                </button>
              </form>

              {/* Already have an account link */}
              <div className="pt-3 border-t border-[#E3E8EF] text-center">
                <span className="text-xs text-[#667085]">Already have an account? </span>
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage('');
                    setCurrentView('tutor-login');
                  }}
                  className="text-xs font-bold text-[#142B4A] hover:text-[#C6A45A] underline transition-colors cursor-pointer"
                >
                  Log In
                </button>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* 2. LOGIN PAGE (Select: Tutor vs Administrator)               */}
          {/* ============================================================ */}
          {currentView === 'login-select' && (
            <div className="space-y-4">
              <div className="border-b border-[#E3E8EF] pb-3 text-center sm:text-left">
                <h2 className="text-lg font-bold text-[#142B4A]">
                  Log In to FNI Cells Connect
                </h2>
                <p className="text-xs text-[#667085] mt-0.5">
                  Please select your account type:
                </p>
              </div>

              <div className="space-y-3 pt-1">
                {/* Option 1: LOG IN AS TUTOR */}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage('');
                    setCurrentView('tutor-login');
                  }}
                  className="w-full p-4 rounded-xl border-2 border-[#E3E8EF] hover:border-[#142B4A] hover:bg-[#F5F7FA] transition-all text-left flex items-center justify-between group cursor-pointer focus:outline-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#142B4A]/5 group-hover:bg-[#142B4A] text-[#142B4A] group-hover:text-[#C6A45A] flex items-center justify-center transition-colors">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-[#142B4A]">
                        Log In as Tutor
                      </div>
                      <div className="text-xs text-[#667085]">
                        Cell Leader / Field Fellowship Account
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#C6A45A] group-hover:translate-x-1 transition-transform" />
                </button>

                {/* Option 2: LOG IN AS ADMINISTRATOR */}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage('');
                    setCurrentView('admin-login');
                  }}
                  className="w-full p-4 rounded-xl border-2 border-[#E3E8EF] hover:border-[#142B4A] hover:bg-[#F5F7FA] transition-all text-left flex items-center justify-between group cursor-pointer focus:outline-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#142B4A]/5 group-hover:bg-[#142B4A] text-[#142B4A] group-hover:text-[#C6A45A] flex items-center justify-center transition-colors">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-[#142B4A]">
                        Log In as Administrator
                      </div>
                      <div className="text-xs text-[#667085]">
                        Church Leadership & Oversight Access
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#C6A45A] group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              {/* Link to sign up if new */}
              <div className="pt-3 border-t border-[#E3E8EF] text-center">
                <span className="text-xs text-[#667085]">New cell leader? </span>
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage('');
                    setCurrentView('tutor-signup');
                  }}
                  className="text-xs font-bold text-[#142B4A] hover:text-[#C6A45A] underline transition-colors cursor-pointer"
                >
                  Sign Up
                </button>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* 3. TUTOR LOGIN FORM (Full Name and Password ONLY)            */}
          {/* ============================================================ */}
          {currentView === 'tutor-login' && (
            <div className="space-y-4">
              <div className="border-b border-[#E3E8EF] pb-3 text-center sm:text-left">
                <h2 className="text-lg font-bold text-[#142B4A]">
                  Tutor Log In
                </h2>
                <p className="text-xs text-[#667085] mt-0.5">
                  Enter your registered full name and password to access your dashboard.
                </p>
              </div>

              <form onSubmit={handleTutorLogin} className="space-y-3.5">
                {/* 1. Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-[#142B4A] mb-1">
                    Full Name <span className="text-[#C74646]">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#C6A45A] absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={loginFullName}
                      onChange={(e) => setLoginFullName(e.target.value)}
                      placeholder="Enter your registered full name"
                      className="w-full pl-9 pr-3 py-2 bg-white border border-[#E3E8EF] rounded-xl text-xs text-[#182230] placeholder-[#98A2B3] focus:border-[#142B4A] focus:ring-1 focus:ring-[#C6A45A] outline-none"
                    />
                  </div>
                </div>

                {/* 2. Password */}
                <div>
                  <label className="block text-xs font-semibold text-[#142B4A] mb-1">
                    Password <span className="text-[#C74646]">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#C6A45A] absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-9 pr-3 py-2 bg-white border border-[#E3E8EF] rounded-xl text-xs text-[#182230] placeholder-[#98A2B3] focus:border-[#142B4A] focus:ring-1 focus:ring-[#C6A45A] outline-none"
                    />
                  </div>
                </div>

                {/* LOG IN Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-3 py-3 px-4 bg-[#142B4A] hover:bg-[#203D63] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <LogIn className="w-4 h-4 text-[#C6A45A]" />
                  <span>{isLoading ? 'Signing In...' : 'Log In'}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#C6A45A]" />
                </button>
              </form>

              {/* New tutor link */}
              <div className="pt-3 border-t border-[#E3E8EF] text-center">
                <span className="text-xs text-[#667085]">New tutor? </span>
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage('');
                    setCurrentView('tutor-signup');
                  }}
                  className="text-xs font-bold text-[#142B4A] hover:text-[#C6A45A] underline transition-colors cursor-pointer"
                >
                  Sign Up
                </button>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* 4. ADMINISTRATOR LOGIN FORM                                  */}
          {/* ============================================================ */}
          {currentView === 'admin-login' && (
            <div className="space-y-4">
              <div className="border-b border-[#E3E8EF] pb-3 text-center sm:text-left">
                <h2 className="text-lg font-bold text-[#142B4A]">
                  Administrator Log In
                </h2>
                <p className="text-xs text-[#667085] mt-0.5">
                  Enter authorized administrator password:
                </p>
              </div>

              <form onSubmit={handleAdminLogin} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#142B4A] mb-1">
                    Administrator Password <span className="text-[#C74646]">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#C6A45A] absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full pl-9 pr-3 py-2 bg-white border border-[#E3E8EF] rounded-xl text-xs text-[#182230] placeholder-[#98A2B3] focus:border-[#142B4A] focus:ring-1 focus:ring-[#C6A45A] outline-none"
                    />
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-white border border-[#C6A45A]/40 text-[11px] text-[#667085]">
                  <span className="font-semibold text-[#142B4A]">Initial Login Note: </span>
                  Default is <code className="bg-[#F5F7FA] px-1 py-0.5 rounded border border-[#E3E8EF] font-mono font-bold text-[#142B4A]">admin123</code>. You will configure your permanent password on first sign in.
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3 px-4 bg-[#142B4A] hover:bg-[#203D63] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <Shield className="w-4 h-4 text-[#C6A45A]" />
                  <span>{isLoading ? 'Authenticating...' : 'Log In'}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#C6A45A]" />
                </button>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* Subtle Minimal Footer Attribution */}
      <footer className="w-full text-center pb-2 z-10">
        <p className="text-[11px] font-semibold tracking-wider text-[#667085]/70 uppercase">
          Forerunners Network International &bull; For Internal Ministry Use Only
        </p>
      </footer>
    </div>
  );
};
