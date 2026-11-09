import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AuthService } from '../../services/authService';
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
  Mail,
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
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 80);
    return () => clearTimeout(timer);
  }, []);

  // Tutor Registration state
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regCellName, setRegCellName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  // Tutor Login state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Administrator Login state (Email & Password via Supabase Auth)
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Feedback states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);

  // 1. Handle Tutor Registration (Strict Supabase Only)
  const handleTutorSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessNotice('');

    if (!regFullName.trim() || !regEmail.trim() || !regCellName.trim() || !regPassword || !regConfirmPassword) {
      setErrorMessage('Please complete all 5 fields.');
      return;
    }

    if (!regEmail.includes('@') || !regEmail.includes('.')) {
      setErrorMessage('Please enter a valid email address.');
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
        email: regEmail.trim(),
        cellName: regCellName.trim(),
        password: regPassword,
        confirmPassword: regConfirmPassword,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Registration failed.');
      } else if (res.needsEmailVerification) {
        setSuccessNotice(
          res.verificationNotice ||
            `Account created! A verification link was sent to ${regEmail}. Please confirm your email before signing in.`
        );
        setCurrentView('tutor-login');
        setLoginIdentifier(regEmail);
      } else {
        setSuccessNotice('Account created successfully! Redirecting...');
        if (onSuccess) onSuccess();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Handle Tutor Login (Direct Supabase Auth)
  const handleTutorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessNotice('');

    if (!loginIdentifier.trim() || !loginPassword) {
      setErrorMessage('Please enter your email (or full name) and password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await loginTutor({
        email: loginIdentifier.includes('@') ? loginIdentifier.trim() : undefined,
        fullName: !loginIdentifier.includes('@') ? loginIdentifier.trim() : undefined,
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

  // Send a secure Supabase password-reset link to the registered email.
  const handlePasswordReset = async (email: string) => {
    setErrorMessage('');
    setSuccessNotice('');
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Enter your registered email address first.');
      return;
    }
    setIsSendingReset(true);
    try {
      const result = await AuthService.requestPasswordReset(cleanEmail);
      if (!result.success) setErrorMessage(result.error || 'Could not send the password reset link.');
      else setSuccessNotice('If an account exists for this email, a password reset link has been sent. Check your inbox and spam folder.');
    } finally {
      setIsSendingReset(false);
    }
  };

  // 3. Handle Admin Login (Strict Supabase Auth with Server-Side Admin Role Verification)
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessNotice('');

    if (!adminEmail.trim() || !adminPassword) {
      setErrorMessage('Please enter both administrator email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await loginAdmin({
        email: adminEmail.trim(),
        password: adminPassword,
      });

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
    <div className="fni-auth-portal min-h-screen bg-white text-[#182230] flex flex-col justify-between items-center px-4 py-8 sm:py-12 relative overflow-hidden font-sans selection:bg-[#C6A45A]/20 selection:text-[#142B4A]">
      {/* Background Animated Halo & Golden Aura */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
        <div className="w-[500px] h-[500px] sm:w-[720px] sm:h-[720px] rounded-full bg-gradient-to-tr from-[#142B4A]/5 via-transparent to-[#C6A45A]/10 blur-3xl animate-pulse" />
        <div className="w-[420px] h-[420px] sm:w-[650px] sm:h-[650px] rounded-full border border-[#C6A45A]/15 animate-[spin_80s_linear_infinite]" />
        <div className="w-[620px] h-[620px] sm:w-[900px] sm:h-[900px] rounded-full border border-[#142B4A]/5 animate-[spin_110s_linear_infinite_reverse]" />
      </div>

      {/* Top Header / Back Navigation */}
      <div
        className={`w-full max-w-md mx-auto flex items-center justify-between z-10 mb-2 transition-all duration-700 ${
          isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
        }`}
      >
        {currentView === 'login-select' || currentView === 'tutor-signup' ? (
          <button
            type="button"
            onClick={onBackToLanding}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#667085] hover:text-[#142B4A] transition-colors cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 text-[#C6A45A] group-hover:-translate-x-1 transition-transform" />
            <span>Back to Portal Home</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setErrorMessage('');
              setCurrentView('login-select');
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#667085] hover:text-[#142B4A] transition-colors cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 text-[#C6A45A] group-hover:-translate-x-1 transition-transform" />
            <span>Back to Login Options</span>
          </button>
        )}
      </div>

      {/* Main Centered Container */}
      <main className="w-full max-w-md mx-auto flex flex-col items-center text-center my-auto z-10">
        {/* Official FNI Ministry Logo with Floating Animation & Glow */}
        <div
          className={`relative mb-5 transition-all duration-700 transform ${
            isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
          }`}
        >
          <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-[#C6A45A]/30 via-[#142B4A]/10 to-[#C6A45A]/30 blur-md animate-pulse" />
          <div className="absolute -inset-1 rounded-2xl border border-[#C6A45A]/40" />
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-white shadow-xl bg-[#142B4A] flex items-center justify-center p-0.5 relative z-10 hover:scale-105 transition-transform duration-300">
            <img
              src="/fni-official-logo.jpg"
              alt="Forerunners Network International Official Logo"
              className="w-full h-full object-cover rounded-xl"
            />
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="w-full mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2.5 text-left animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        {/* Global Success / Email Verification Banner */}
        {successNotice && (
          <div className="w-full mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-start gap-2.5 text-left animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <div className="flex-1 font-medium">{successNotice}</div>
          </div>
        )}

        {/* Card Frame for Current Auth Mode */}
        <div className="w-full bg-white/90 backdrop-blur-md border border-[#E3E8EF] shadow-2xl rounded-3xl p-6 sm:p-7 transition-all">
          {/* ============================================================ */}
          {/* 1. TUTOR REGISTRATION FORM (Strict Supabase Auth)            */}
          {/* ============================================================ */}
          {currentView === 'tutor-signup' && (
            <div className="space-y-4">
              <div className="border-b border-[#E3E8EF] pb-3 text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#142B4A]/5 border border-[#C6A45A]/30 text-[10px] font-bold text-[#142B4A] uppercase tracking-wider mb-1.5">
                  <UserPlus className="w-3 h-3 text-[#C6A45A]" />
                  <span>Cell Registration</span>
                </div>
                <h2 className="text-lg font-bold text-[#142B4A]">
                  Register Your Fellowship Cell
                </h2>
                <p className="text-xs text-[#667085] mt-0.5">
                  Provide your genuine email and fellowship details.
                </p>
              </div>

              <form onSubmit={handleTutorSignUp} className="space-y-3">
                {/* 1. Full Name */}
                <div className="text-left">
                  <label className="block text-xs font-semibold text-[#142B4A] mb-1">
                    1. Full Name <span className="text-[#C74646]">*</span>
                  </label>
                  <div className="relative group">
                    <User className="w-4 h-4 text-[#C6A45A] absolute left-3 top-3 group-focus-within:scale-110 transition-transform" />
                    <input
                      type="text"
                      required
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      placeholder="e.g. Samuel Mensah"
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E3E8EF] rounded-xl text-xs text-[#182230] placeholder-[#98A2B3] focus:border-[#142B4A] focus:ring-2 focus:ring-[#C6A45A]/30 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* 2. Email Address */}
                <div className="text-left">
                  <label className="block text-xs font-semibold text-[#142B4A] mb-1">
                    2. Email Address <span className="text-[#C74646]">*</span>
                  </label>
                  <div className="relative group">
                    <Mail className="w-4 h-4 text-[#C6A45A] absolute left-3 top-3 group-focus-within:scale-110 transition-transform" />
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="e.g. samuel.mensah@example.com"
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E3E8EF] rounded-xl text-xs text-[#182230] placeholder-[#98A2B3] focus:border-[#142B4A] focus:ring-2 focus:ring-[#C6A45A]/30 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* 3. Cell Fellowship Name */}
                <div className="text-left">
                  <label className="block text-xs font-semibold text-[#142B4A] mb-1">
                    3. Cell Fellowship Name <span className="text-[#C74646]">*</span>
                  </label>
                  <div className="relative group">
                    <Building className="w-4 h-4 text-[#C6A45A] absolute left-3 top-3 group-focus-within:scale-110 transition-transform" />
                    <input
                      type="text"
                      required
                      value={regCellName}
                      onChange={(e) => setRegCellName(e.target.value)}
                      placeholder="e.g. Grace Fellowship Central"
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E3E8EF] rounded-xl text-xs text-[#182230] placeholder-[#98A2B3] focus:border-[#142B4A] focus:ring-2 focus:ring-[#C6A45A]/30 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* 4. Password */}
                <div className="text-left">
                  <label className="block text-xs font-semibold text-[#142B4A] mb-1">
                    4. Password <span className="text-[#C74646]">*</span>
                  </label>
                  <div className="relative group">
                    <Lock className="w-4 h-4 text-[#C6A45A] absolute left-3 top-3 group-focus-within:scale-110 transition-transform" />
                    <input
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E3E8EF] rounded-xl text-xs text-[#182230] placeholder-[#98A2B3] focus:border-[#142B4A] focus:ring-2 focus:ring-[#C6A45A]/30 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* 5. Confirm Password */}
                <div className="text-left">
                  <label className="block text-xs font-semibold text-[#142B4A] mb-1">
                    5. Confirm Password <span className="text-[#C74646]">*</span>
                  </label>
                  <div className="relative group">
                    <KeyRound className="w-4 h-4 text-[#C6A45A] absolute left-3 top-3 group-focus-within:scale-110 transition-transform" />
                    <input
                      type="password"
                      required
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E3E8EF] rounded-xl text-xs text-[#182230] placeholder-[#98A2B3] focus:border-[#142B4A] focus:ring-2 focus:ring-[#C6A45A]/30 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* SIGN UP Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-4 py-3.5 px-4 bg-[#142B4A] hover:bg-[#203D63] text-white font-bold text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-[#142B4A]/25 hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer group active:scale-[0.99] border border-[#142B4A]"
                >
                  <UserPlus className="w-4 h-4 text-[#C6A45A]" />
                  <span>{isLoading ? 'Registering in Supabase...' : 'Sign Up'}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#C6A45A] group-hover:translate-x-1.5 transition-transform" />
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
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#142B4A]/5 border border-[#C6A45A]/30 text-[10px] font-bold text-[#142B4A] uppercase tracking-wider mb-1.5">
                  <LogIn className="w-3 h-3 text-[#C6A45A]" />
                  <span>Authorized Portal Access</span>
                </div>
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
                  className="w-full p-4 rounded-2xl border-2 border-[#E3E8EF] hover:border-[#142B4A] hover:bg-[#F5F7FA] transition-all text-left flex items-center justify-between group cursor-pointer focus:outline-none hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#142B4A]/5 group-hover:bg-[#142B4A] text-[#142B4A] group-hover:text-[#C6A45A] flex items-center justify-center transition-all group-hover:scale-105">
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
                  <ArrowRight className="w-4 h-4 text-[#C6A45A] group-hover:translate-x-1.5 transition-transform" />
                </button>

                {/* Option 2: LOG IN AS ADMINISTRATOR */}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage('');
                    setCurrentView('admin-login');
                  }}
                  className="w-full p-4 rounded-2xl border-2 border-[#E3E8EF] hover:border-[#142B4A] hover:bg-[#F5F7FA] transition-all text-left flex items-center justify-between group cursor-pointer focus:outline-none hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#142B4A]/5 group-hover:bg-[#142B4A] text-[#142B4A] group-hover:text-[#C6A45A] flex items-center justify-center transition-all group-hover:scale-105">
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
                  <ArrowRight className="w-4 h-4 text-[#C6A45A] group-hover:translate-x-1.5 transition-transform" />
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
          {/* 3. TUTOR LOGIN FORM (Direct Supabase Auth)                   */}
          {/* ============================================================ */}
          {currentView === 'tutor-login' && (
            <div className="space-y-4">
              <div className="border-b border-[#E3E8EF] pb-3 text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#142B4A]/5 border border-[#C6A45A]/30 text-[10px] font-bold text-[#142B4A] uppercase tracking-wider mb-1.5">
                  <Users className="w-3 h-3 text-[#C6A45A]" />
                  <span>Tutor Authentication</span>
                </div>
                <h2 className="text-lg font-bold text-[#142B4A]">
                  Tutor Log In
                </h2>
                <p className="text-xs text-[#667085] mt-0.5">
                  Sign in with your email or registered full name.
                </p>
              </div>

              <form onSubmit={handleTutorLogin} className="space-y-3.5">
                {/* 1. Email or Full Name */}
                <div className="text-left">
                  <label className="block text-xs font-semibold text-[#142B4A] mb-1">
                    Email Address or Full Name <span className="text-[#C74646]">*</span>
                  </label>
                  <div className="relative group">
                    <Mail className="w-4 h-4 text-[#C6A45A] absolute left-3 top-3 group-focus-within:scale-110 transition-transform" />
                    <input
                      type="text"
                      required
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="e.g. samuel.mensah@example.com"
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E3E8EF] rounded-xl text-xs text-[#182230] placeholder-[#98A2B3] focus:border-[#142B4A] focus:ring-2 focus:ring-[#C6A45A]/30 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* 2. Password */}
                <div className="text-left">
                  <label className="block text-xs font-semibold text-[#142B4A] mb-1">
                    Password <span className="text-[#C74646]">*</span>
                  </label>
                  <div className="relative group">
                    <Lock className="w-4 h-4 text-[#C6A45A] absolute left-3 top-3 group-focus-within:scale-110 transition-transform" />
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E3E8EF] rounded-xl text-xs text-[#182230] placeholder-[#98A2B3] focus:border-[#142B4A] focus:ring-2 focus:ring-[#C6A45A]/30 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* LOG IN Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-4 py-3.5 px-4 bg-[#142B4A] hover:bg-[#203D63] text-white font-bold text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-[#142B4A]/25 hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer group active:scale-[0.99] border border-[#142B4A]"
                >
                  <LogIn className="w-4 h-4 text-[#C6A45A]" />
                  <span>{isLoading ? 'Signing In...' : 'Log In'}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#C6A45A] group-hover:translate-x-1.5 transition-transform" />
                </button>
              </form>

              <div className="text-right -mt-1">
                <button type="button" disabled={isSendingReset} onClick={() => handlePasswordReset(loginIdentifier)} className="text-xs font-semibold text-[#142B4A] hover:text-[#C6A45A] underline disabled:opacity-50">
                  {isSendingReset ? 'Sending reset link...' : 'Forgot password?'}
                </button>
              </div>

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
          {/* 4. ADMINISTRATOR LOGIN FORM (Strict Supabase Auth)           */}
          {/* ============================================================ */}
          {currentView === 'admin-login' && (
            <div className="space-y-4">
              <div className="border-b border-[#E3E8EF] pb-3 text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#142B4A]/5 border border-[#C6A45A]/30 text-[10px] font-bold text-[#142B4A] uppercase tracking-wider mb-1.5">
                  <Shield className="w-3 h-3 text-[#C6A45A]" />
                  <span>Administrative Verification</span>
                </div>
                <h2 className="text-lg font-bold text-[#142B4A]">
                  Administrator Log In
                </h2>
                <p className="text-xs text-[#667085] mt-0.5">
                  Sign in with your verified administrator credentials.
                </p>
              </div>

              <form onSubmit={handleAdminLogin} className="space-y-3.5">
                <div className="text-left">
                  <label className="block text-xs font-semibold text-[#142B4A] mb-1">
                    Administrator Email <span className="text-[#C74646]">*</span>
                  </label>
                  <div className="relative group">
                    <Mail className="w-4 h-4 text-[#C6A45A] absolute left-3 top-3 group-focus-within:scale-110 transition-transform" />
                    <input
                      type="email"
                      required
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="e.g. pastor@fnicells.org"
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E3E8EF] rounded-xl text-xs text-[#182230] placeholder-[#98A2B3] focus:border-[#142B4A] focus:ring-2 focus:ring-[#C6A45A]/30 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="text-left">
                  <label className="block text-xs font-semibold text-[#142B4A] mb-1">
                    Password <span className="text-[#C74646]">*</span>
                  </label>
                  <div className="relative group">
                    <Lock className="w-4 h-4 text-[#C6A45A] absolute left-3 top-3 group-focus-within:scale-110 transition-transform" />
                    <input
                      type="password"
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Enter administrator password"
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E3E8EF] rounded-xl text-xs text-[#182230] placeholder-[#98A2B3] focus:border-[#142B4A] focus:ring-2 focus:ring-[#C6A45A]/30 outline-none transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-4 py-3.5 px-4 bg-[#142B4A] hover:bg-[#203D63] text-white font-bold text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-[#142B4A]/25 hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer group active:scale-[0.99] border border-[#142B4A]"
                >
                  <Shield className="w-4 h-4 text-[#C6A45A]" />
                  <span>{isLoading ? 'Verifying with Supabase...' : 'Log In as Administrator'}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#C6A45A] group-hover:translate-x-1.5 transition-transform" />
                </button>
              </form>
              <div className="text-right -mt-1">
                <button type="button" disabled={isSendingReset} onClick={() => handlePasswordReset(adminEmail)} className="text-xs font-semibold text-[#142B4A] hover:text-[#C6A45A] underline disabled:opacity-50">
                  {isSendingReset ? 'Sending reset link...' : 'Forgot password?'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Subtle Minimal Footer Attribution */}
      <footer className="w-full text-center pb-2 z-10 pt-4">
        <p className="text-[11px] font-semibold tracking-wider text-[#667085]/70 uppercase">
          Forerunners Network International &bull; For Internal Ministry Use Only
        </p>
      </footer>
    </div>
  );
};
