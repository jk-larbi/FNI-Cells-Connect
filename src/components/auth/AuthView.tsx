import React, { useState, useEffect, useMemo } from 'react';
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

  // Tutor Registration state (tutor enters full name, which automatically becomes username)
  const [regFullName, setRegFullName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  // Automatically derive clean @username from full name
  const derivedUsername = useMemo(() => {
    const clean = regFullName.toLowerCase().trim().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    return clean ? `@${clean}` : '';
  }, [regFullName]);

  // Tutor Login state
  const [loginCellId, setLoginCellId] = useState('');
  const [loginTutorName, setLoginTutorName] = useState('');
  const [signupCellId, setSignupCellId] = useState('');
  const [signupCells, setSignupCells] = useState<Array<{ id: string; name: string }>>([]);
  const [loginTutors, setLoginTutors] = useState<Array<{ id: string; name: string }>>([]);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [showTutorPassword, setShowTutorPassword] = useState(false);

  // Administrator Login state (username or legacy email + password)
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  useEffect(() => {
    let active = true;
    AuthService.getTutorSignupCells().then(cells => {
      if (active) setSignupCells(cells);
    }).catch(error => {
      if (active) setErrorMessage(error?.message || 'Could not load the official cell list.');
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    if (!loginCellId) { setLoginTutors([]); setLoginTutorName(''); return; }
    setDirectoryLoading(true);
    setLoginTutorName('');
    AuthService.getTutorsForCell(loginCellId).then(tutors => {
      if (active) setLoginTutors(tutors);
    }).catch(error => {
      if (active) setErrorMessage(error?.message || 'Could not load registered tutor names.');
    }).finally(() => { if (active) setDirectoryLoading(false); });
    return () => { active = false; };
  }, [loginCellId]);

  // Feedback states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successNotice, setSuccessNotice] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);

  // 1. Handle Tutor Registration (Strict Supabase Only - Enter Full Name -> Auto Username + Create & Confirm Password)
  const handleTutorSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessNotice('');

    if (!signupCellId) {
      setErrorMessage('Please select your cell fellowship.');
      return;
    }

    if (!regFullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (!regPassword || !regConfirmPassword) {
      setErrorMessage('Please create and confirm your personal password.');
      return;
    }

    if (regPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMessage('Passwords do not match. Please verify your password confirmation.');
      return;
    }

    setIsLoading(true);
    try {
      const cleanUsername = regFullName.toLowerCase().trim().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
      const res = await registerTutor({
        fullName: regFullName.trim(),
        username: cleanUsername,
        password: regPassword,
        confirmPassword: regConfirmPassword,
        cellId: signupCellId,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Registration failed.');
      } else {
        setSuccessNotice('Account created successfully! You are now signed in.');
        if (onSuccess) onSuccess();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Handle Tutor Login (Direct Supabase Auth - Cell + Full Name / Username + Password)
  const handleTutorLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessNotice('');

    if (!loginCellId || !loginTutorName.trim() || !loginPassword) {
      setErrorMessage('Please select your cell, enter your name or username, and enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await loginTutor({
        cellId: loginCellId,
        fullName: loginTutorName.trim(),
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
      setErrorMessage('Please enter your administrator username and password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await loginAdmin({
        username: adminEmail.trim(),
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
              src={`${import.meta.env.BASE_URL}fni-official-logo.jpg`}
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
                  <span>Leader Registration</span>
                </div>
                <h2 className="text-lg font-bold text-[#142B4A]">
                  Register as a Cell Leader
                </h2>
                <p className="text-xs text-[#667085] mt-0.5">
                  Select your cell, enter your full name (which automatically becomes your username), and create your password.
                </p>
              </div>

              <form onSubmit={handleTutorSignUp} className="space-y-3.5">
                {/* 1. Select Cell */}
                <div className="text-left">
                  <label className="block text-xs font-semibold text-[#142B4A] mb-1">
                    Select Your Cell <span className="text-[#C74646]">*</span>
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-[#C6A45A] absolute left-3 top-3 pointer-events-none" />
                    <select
                      required
                      value={signupCellId}
                      onChange={e => setSignupCellId(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E3E8EF] rounded-xl text-xs text-[#182230] focus:ring-2 focus:ring-[#142B4A]/20 focus:outline-none"
                    >
                      <option value="">Select your cell created by Admin</option>
                      {signupCells.map(cell => (
                        <option key={cell.id} value={cell.id}>{cell.name}</option>
                      ))}
                    </select>
                  </div>
                  {signupCells.length === 0 && (
                    <p className="text-[10px] text-amber-700 mt-1">
                      No active cells are available yet. Please contact the administrator.
                    </p>
                  )}
                </div>

                {/* 2. Full Name (automatically becomes username) */}
                <div className="text-left">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-[#142B4A]">
                      Your Full Name <span className="text-[#C74646]">*</span>
                    </label>
                    {derivedUsername && (
                      <span className="text-[11px] font-bold text-[#142B4A] bg-[#142B4A]/5 px-2 py-0.5 rounded-md border border-[#C6A45A]/30">
                        Username: {derivedUsername}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#C6A45A] absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      required
                      maxLength={120}
                      value={regFullName}
                      onChange={e => setRegFullName(e.target.value)}
                      placeholder="Enter your full name (e.g. Grace Mensah)"
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E3E8EF] rounded-xl text-xs text-[#182230] placeholder-[#98A2B3] focus:ring-2 focus:ring-[#142B4A]/20 focus:outline-none"
                    />
                  </div>
                  <p className="text-[10px] text-[#667085] mt-1">
                    Your full name will automatically be your username {derivedUsername ? `(${derivedUsername})` : ''}.
                  </p>
                </div>

                {/* 3. Create Password */}
                <div className="text-left">
                  <label className="block text-xs font-semibold text-[#142B4A] mb-1">
                    Create Password <span className="text-[#C74646]">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#C6A45A] absolute left-3 top-3 pointer-events-none" />
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      maxLength={128}
                      value={regPassword}
                      onChange={e => setRegPassword(e.target.value)}
                      placeholder="Create your password (min. 6 characters)"
                      className="w-full pl-9 pr-10 py-2.5 bg-white border border-[#E3E8EF] rounded-xl text-xs text-[#182230] focus:ring-2 focus:ring-[#142B4A]/20 focus:outline-none"
                    />
                    <button
                      type="button"
                      aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-3 top-2.5 text-[#667085] hover:text-[#142B4A] cursor-pointer"
                    >
                      {showRegPassword ? <EyeOff className="w-4 h-4 text-[#C6A45A]" /> : <Eye className="w-4 h-4 text-[#667085]" />}
                    </button>
                  </div>
                </div>

                {/* 4. Confirm Password */}
                <div className="text-left">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-[#142B4A]">
                      Confirm Password <span className="text-[#C74646]">*</span>
                    </label>
                    {regPassword && regConfirmPassword && (
                      <span className={`text-[10px] font-bold ${regPassword === regConfirmPassword ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {regPassword === regConfirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#C6A45A] absolute left-3 top-3 pointer-events-none" />
                    <input
                      type={showRegConfirmPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      maxLength={128}
                      value={regConfirmPassword}
                      onChange={e => setRegConfirmPassword(e.target.value)}
                      placeholder="Confirm your password"
                      className="w-full pl-9 pr-10 py-2.5 bg-white border border-[#E3E8EF] rounded-xl text-xs text-[#182230] focus:ring-2 focus:ring-[#142B4A]/20 focus:outline-none"
                    />
                    <button
                      type="button"
                      aria-label={showRegConfirmPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                      className="absolute right-3 top-2.5 text-[#667085] hover:text-[#142B4A] cursor-pointer"
                    >
                      {showRegConfirmPassword ? <EyeOff className="w-4 h-4 text-[#C6A45A]" /> : <Eye className="w-4 h-4 text-[#667085]" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || signupCells.length === 0}
                  className="w-full mt-4 py-3.5 px-4 bg-[#142B4A] hover:bg-[#203D63] text-white font-bold text-xs uppercase tracking-widest rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 text-[#C6A45A]" />
                  <span>{isLoading ? 'Creating your account...' : 'Create Leader Account'}</span>
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
                  Select your cell and registered name, then enter your password.
                </p>
              </div>


              <form onSubmit={handleTutorLogin} className="space-y-3.5">
                <div className="text-left">
                  <label className="block text-xs font-semibold text-[#142B4A] mb-1">Cell <span className="text-[#C74646]">*</span></label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-[#C6A45A] absolute left-3 top-3 pointer-events-none" />
                    <select required value={loginCellId} onChange={e => setLoginCellId(e.target.value)} className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E3E8EF] rounded-xl text-xs text-[#182230]">
                      <option value="">Select your cell</option>
                      {signupCells.map(cell => <option key={cell.id} value={cell.id}>{cell.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="text-left">
                  <label className="block text-xs font-semibold text-[#142B4A] mb-1">
                    Your Full Name or Username <span className="text-[#C74646]">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#C6A45A] absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="text"
                      list="registered-cell-tutors"
                      required
                      value={loginTutorName}
                      onChange={e => setLoginTutorName(e.target.value)}
                      placeholder="Enter your full name or @username"
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E3E8EF] rounded-xl text-xs text-[#182230] placeholder-[#98A2B3] focus:ring-2 focus:ring-[#142B4A]/20 focus:outline-none"
                    />
                    <datalist id="registered-cell-tutors">
                      {loginTutors.map(tutor => (
                        <option key={tutor.id} value={tutor.name} />
                      ))}
                    </datalist>
                  </div>
                  {loginCellId && !directoryLoading && loginTutors.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 mt-1.5">
                      <span className="text-[10px] text-[#667085]">Quick select:</span>
                      {loginTutors.slice(0, 4).map(t => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setLoginTutorName(t.name)}
                          className="text-[10px] font-semibold text-[#142B4A] bg-[#142B4A]/5 hover:bg-[#142B4A]/10 px-2 py-0.5 rounded-full border border-[#E3E8EF] transition-colors cursor-pointer"
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-left">
                  <label className="block text-xs font-semibold text-[#142B4A] mb-1">Password <span className="text-[#C74646]">*</span></label>
                  <div className="relative group">
                    <Lock className="w-4 h-4 text-[#C6A45A] absolute left-3 top-3" />
                    <input type={showTutorPassword ? "text" : "password"} required value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="Enter your password" className="w-full pl-9 pr-10 py-2.5 bg-white border border-[#E3E8EF] rounded-xl text-xs text-[#182230]" />
                    <button type="button" aria-label={showTutorPassword ? "Hide password" : "Show password"} onClick={() => setShowTutorPassword(!showTutorPassword)} className="absolute right-3 top-2.5 text-[#667085]">
                      {showTutorPassword ? <EyeOff className="w-4 h-4 text-[#C6A45A]" /> : <Eye className="w-4 h-4 text-[#667085]" />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={isLoading || !loginCellId || !loginTutorName.trim() || !loginPassword} className="w-full mt-4 py-3.5 px-4 bg-[#142B4A] hover:bg-[#203D63] text-white font-bold text-xs uppercase tracking-widest rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50">
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
                    Administrator Username <span className="text-[#C74646]">*</span>
                  </label>
                  <div className="relative group">
                    <Mail className="w-4 h-4 text-[#C6A45A] absolute left-3 top-3 group-focus-within:scale-110 transition-transform" />
                    <input
                      type="text"
                      required
                      autoComplete="username"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="e.g. fni_admin"
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
