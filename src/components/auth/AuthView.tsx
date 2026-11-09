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
  Phone,
  Eye,
  EyeOff,
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

  // Tutor Registration state (Simplified: Full Name, Phone Number, Cell Name + optional Co-Leader)
  const [regFullName, setRegFullName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regCellName, setRegCellName] = useState('');
  const [regCoLeaderName, setRegCoLeaderName] = useState('');

  // Tutor Login state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showTutorPassword, setShowTutorPassword] = useState(false);

  // Administrator Login state (Email & Password via Supabase Auth)
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // Feedback states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);

  // 1. Handle Tutor Registration (Strict Supabase Only - Simplified 3 Fields + Optional Co-Leader)
  const handleTutorSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessNotice('');

    if (!regFullName.trim() || !regPhone.trim() || !regCellName.trim()) {
      setErrorMessage('Please provide your Full Name, Phone Number, and Cell Name.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await registerTutor({
        fullName: regFullName.trim(),
        phoneNumber: regPhone.trim(),
        cellName: regCellName.trim(),
        coLeaderName: regCoLeaderName.trim() || undefined,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Registration failed.');
      } else if (res.needsEmailVerification) {
        setSuccessNotice(
          res.verificationNotice ||
            `Account registered! Please sign in using your registered name or phone number.`
        );
        setCurrentView('tutor-login');
        setLoginIdentifier(regPhone.trim() || regFullName.trim());
      } else {
        setSuccessNotice('Cell registered successfully! Redirecting...');
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
      {/* Creative Background Celestial Radial Rings */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden animate-circle-drift">
        {/* 1. Central Breathing Radiant Aura */}
        <div className="w-[500px] h-[500px] sm:w-[750px] sm:h-[750px] rounded-full bg-gradient-to-tr from-[#142B4A]/8 via-[#C6A45A]/12 to-transparent blur-3xl animate-pulse-glow" />

        {/* 2. Expanding Concentric Ripple Wave Ring */}
        <div className="absolute w-[400px] h-[400px] sm:w-[620px] sm:h-[620px] rounded-full border border-[#C6A45A]/30 animate-ripple-wave" />

        {/* 3. Inner Astrolabe Ring (Clockwise, 22s) with Orbiting Diamond Satellite */}
        <div className="absolute w-[380px] h-[380px] sm:w-[560px] sm:h-[560px] rounded-full border-2 border-dashed border-[#C6A45A]/35 animate-spin-orbit">
          {/* Orbiting Satellite Node 1 (North) */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex items-center justify-center">
            <div className="w-3.5 h-3.5 rounded-full bg-[#C6A45A] shadow-[0_0_14px_#C6A45A] ring-4 ring-[#C6A45A]/20" />
          </div>
          {/* Orbiting Satellite Node 2 (South) */}
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-[#142B4A]/50" />
          </div>
        </div>

        {/* 4. Middle Resonant Ring (Counter-Clockwise, 28s) with Orbiting Beacon */}
        <div className="absolute w-[500px] h-[500px] sm:w-[740px] sm:h-[740px] rounded-full border border-dotted border-[#142B4A]/20 animate-spin-orbit-reverse">
          {/* Orbiting Satellite Node (East) */}
          <div className="absolute top-1/2 -right-2 -translate-y-1/2 flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-[#C6A45A] shadow-[0_0_10px_#C6A45A]" />
          </div>
          {/* Orbiting Satellite Node (West) */}
          <div className="absolute top-1/2 -left-1.5 -translate-y-1/2 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-[#142B4A]/40" />
          </div>
        </div>

        {/* 5. Outer Celestial Ring (Breathe & Harmonize, 14s) with Cardinal Compass Beacons */}
        <div className="absolute w-[640px] h-[640px] sm:w-[920px] sm:h-[920px] rounded-full border border-[#C6A45A]/20 animate-orbit-breathe">
          {/* Cardinal Points (North, South, East, West) */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#C6A45A] rotate-45 shadow-[0_0_6px_#C6A45A]" />
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#C6A45A] rotate-45 shadow-[0_0_6px_#C6A45A]" />
          <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-[#C6A45A] rotate-45 shadow-[0_0_6px_#C6A45A]" />
          <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-[#C6A45A] rotate-45 shadow-[0_0_6px_#C6A45A]" />
        </div>
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
                  Provide your name, contact phone, and cell details.
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

                {/* 2. Phone Number */}
                <div className="text-left">
                  <label className="block text-xs font-semibold text-[#142B4A] mb-1">
                    2. Phone Number <span className="text-[#C74646]">*</span>
                  </label>
                  <div className="relative group">
                    <Phone className="w-4 h-4 text-[#C6A45A] absolute left-3 top-3 group-focus-within:scale-110 transition-transform" />
                    <input
                      type="tel"
                      required
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="e.g. 0244123456"
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

                {/* 4. Second Cell Leader / Co-Leader (Optional) */}
                <div className="text-left">
                  <label className="block text-xs font-semibold text-[#142B4A] mb-1">
                    4. Co-Leader Full Name <span className="text-[#667085] font-normal">(Optional — for paired cells)</span>
                  </label>
                  <div className="relative group">
                    <Users className="w-4 h-4 text-[#C6A45A] absolute left-3 top-3 group-focus-within:scale-110 transition-transform" />
                    <input
                      type="text"
                      value={regCoLeaderName}
                      onChange={(e) => setRegCoLeaderName(e.target.value)}
                      placeholder="e.g. Mary Mensah (optional)"
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
                      type={showTutorPassword ? "text" : "password"}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-9 pr-10 py-2.5 bg-white border border-[#E3E8EF] rounded-xl text-xs text-[#182230] placeholder-[#98A2B3] focus:border-[#142B4A] focus:ring-2 focus:ring-[#C6A45A]/30 outline-none transition-all"
                    />
                    <button
                      type="button"
                      aria-label={showTutorPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowTutorPassword(!showTutorPassword)}
                      className="absolute right-3 top-2.5 text-[#667085] hover:text-[#142B4A] focus:outline-none cursor-pointer"
                    >
                      {showTutorPassword ? <EyeOff className="w-4 h-4 text-[#C6A45A]" /> : <Eye className="w-4 h-4 text-[#667085]" />}
                    </button>
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
                      placeholder="e.g. fniadmin@gmail.com"
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
                      type={showAdminPassword ? "text" : "password"}
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Enter administrator password"
                      className="w-full pl-9 pr-10 py-2.5 bg-white border border-[#E3E8EF] rounded-xl text-xs text-[#182230] placeholder-[#98A2B3] focus:border-[#142B4A] focus:ring-2 focus:ring-[#C6A45A]/30 outline-none transition-all"
                    />
                    <button
                      type="button"
                      aria-label={showAdminPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="absolute right-3 top-2.5 text-[#667085] hover:text-[#142B4A] focus:outline-none cursor-pointer"
                    >
                      {showAdminPassword ? <EyeOff className="w-4 h-4 text-[#C6A45A]" /> : <Eye className="w-4 h-4 text-[#667085]" />}
                    </button>
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
