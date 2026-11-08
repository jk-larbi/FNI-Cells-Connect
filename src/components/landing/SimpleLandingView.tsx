import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, LogIn, UserPlus, Sparkles, ShieldCheck } from 'lucide-react';

interface SimpleLandingViewProps {
  onSignUp: () => void;
  onLogIn: () => void;
  onBackToVision?: () => void;
}

export const SimpleLandingView: React.FC<SimpleLandingViewProps> = ({
  onSignUp,
  onLogIn,
  onBackToVision,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 60);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-white text-[#182230] flex flex-col justify-between items-center px-4 py-8 sm:py-12 relative overflow-hidden font-sans selection:bg-[#C6A45A]/20 selection:text-[#142B4A]">
      {/* Dynamic Background Atmosphere: Radial Cosmic Grid & Golden Halo */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
        {/* Soft Radial Ambient Aura */}
        <div className="w-[500px] h-[500px] sm:w-[780px] sm:h-[780px] rounded-full bg-gradient-to-tr from-[#142B4A]/8 via-[#C6A45A]/12 to-transparent blur-3xl animate-pulse-glow" />

        {/* Outer Orbital Orbit Ring (Slow Clockwise) */}
        <div className="w-[450px] h-[450px] sm:w-[680px] sm:h-[680px] rounded-full border border-dashed border-[#C6A45A]/25 animate-[spin_50s_linear_infinite]" />

        {/* Inner Counter-Rotating Orbit Ring (Counter Clockwise) */}
        <div className="w-[320px] h-[320px] sm:w-[500px] sm:h-[500px] rounded-full border border-[#142B4A]/8 animate-[spin_70s_linear_infinite_reverse]" />

        {/* Ambient Orbiting Star Accent */}
        <div className="w-[450px] h-[450px] sm:w-[680px] sm:h-[680px] absolute flex items-start justify-center animate-[spin_35s_linear_infinite]">
          <div className="w-2.5 h-2.5 rounded-full bg-[#C6A45A] shadow-[0_0_12px_#C6A45A] animate-ping" />
        </div>
      </div>

      {/* Top Header Bar: Ministry Badge & Back Navigation */}
      <div
        className={`w-full max-w-xl mx-auto flex items-center justify-between z-10 pt-2 transition-all duration-700 transform ${
          isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
        }`}
      >
        {onBackToVision ? (
          <button
            type="button"
            onClick={onBackToVision}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-[#142B4A] hover:text-[#C6A45A] bg-[#142B4A]/5 hover:bg-[#142B4A]/10 border border-[#C6A45A]/20 transition-all cursor-pointer group"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#C6A45A] group-hover:-translate-x-1 transition-transform" />
            <span>Ministry Vision & Target</span>
          </button>
        ) : <div />}

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#142B4A]/5 border border-[#142B4A]/10">
          <ShieldCheck className="w-3.5 h-3.5 text-[#C6A45A]" />
          <span className="text-[10px] font-bold text-[#142B4A] tracking-wider uppercase">
            Official Portal
          </span>
        </div>
      </div>

      {/* Main Centered Content */}
      <main className="w-full max-w-xl mx-auto flex flex-col items-center text-center my-auto z-10 px-4">
        {/* 1. Official FNI Logo - Floating Levitating Animation & Radiant Golden Halo */}
        <div
          className={`relative mb-6 sm:mb-8 transition-all duration-1000 transform animate-float-slow ${
            isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
          }`}
        >
          {/* Multi-layered Pulsing Glow Backdrops */}
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-[#C6A45A]/35 via-[#142B4A]/15 to-[#C6A45A]/35 blur-xl animate-pulse-glow" />
          <div className="absolute -inset-2 rounded-3xl border border-[#C6A45A]/60 shadow-[0_0_20px_rgba(198,164,90,0.3)] transition-all duration-500" />
          <div className="absolute -inset-1 rounded-3xl border border-[#142B4A]/10" />

          {/* Logo Frame: High-End Emblem Glass-Pillar Frame */}
          <div className="w-36 h-36 sm:w-44 sm:h-44 md:w-52 md:h-52 rounded-3xl overflow-hidden border-2 border-white shadow-2xl bg-gradient-to-b from-[#142B4A] to-[#0D1E35] flex items-center justify-center p-1 relative z-10 group hover:scale-[1.04] transition-transform duration-500 cursor-pointer">
            <img
              src="/fni-official-logo.jpg"
              alt="Forerunners Network International Official Logo"
              className="w-full h-full object-contain rounded-2xl drop-shadow-md"
            />
          </div>
        </div>

        {/* 2. Platform Name - Big & Bold with Smooth Reveal */}
        <div
          className={`transition-all duration-1000 delay-150 transform ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-[#142B4A] tracking-tight leading-none mb-3">
            FNI CELLS CONNECT
          </h1>

          {/* Dynamic Gold Decorative Divider with Glowing Expanding Core */}
          <div className="flex items-center justify-center gap-2.5 w-44 sm:w-56 my-2.5 mx-auto">
            <div className="h-[2px] bg-gradient-to-r from-transparent via-[#C6A45A]/60 to-[#C6A45A] flex-1" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#C6A45A] shadow-[0_0_8px_#C6A45A] ring-2 ring-white animate-pulse" />
            <div className="h-[2px] bg-gradient-to-l from-transparent via-[#C6A45A]/60 to-[#C6A45A] flex-1" />
          </div>

          {/* 3. Short Elegant Tagline */}
          <p className="text-base sm:text-lg text-[#667085] font-serif italic tracking-wide mt-1 mb-8 sm:mb-10 max-w-md mx-auto leading-relaxed">
            “Connecting Cells. Strengthening Fellowship.”
          </p>
        </div>

        {/* 4. Two Buttons: SIGN UP and LOG IN with High-End Shimmer Effects */}
        <div
          className={`flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-sm sm:max-w-md transition-all duration-1000 delay-300 transform ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          {/* Sign Up Button: Deep Navy Blue with High-End Light Sweep Shimmer */}
          <button
            type="button"
            onClick={onSignUp}
            className="w-full sm:flex-1 py-4 px-7 rounded-2xl bg-gradient-to-r from-[#142B4A] to-[#203D63] hover:from-[#203D63] hover:to-[#142B4A] text-white font-bold text-xs uppercase tracking-widest shadow-[0_10px_25px_-5px_rgba(20,43,74,0.35)] hover:shadow-[0_15px_30px_-5px_rgba(20,43,74,0.5)] transition-all flex items-center justify-center gap-2 border border-[#C6A45A]/40 group cursor-pointer active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#C6A45A] shimmer-button"
          >
            <UserPlus className="w-4 h-4 text-[#C6A45A] group-hover:scale-110 transition-transform" />
            <span>Sign Up</span>
            <ArrowRight className="w-4 h-4 text-[#C6A45A] group-hover:translate-x-1.5 transition-transform" />
          </button>

          {/* Log In Button: Pristine White with Blue Accent Border & Elevation Hover */}
          <button
            type="button"
            onClick={onLogIn}
            className="w-full sm:flex-1 py-4 px-7 rounded-2xl bg-white hover:bg-slate-50 text-[#142B4A] hover:text-[#142B4A] border-2 border-[#142B4A] hover:border-[#C6A45A] font-bold text-xs uppercase tracking-widest transition-all shadow-md hover:shadow-xl flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#142B4A]/20 group"
          >
            <LogIn className="w-4 h-4 text-[#142B4A] group-hover:scale-110 transition-transform" />
            <span>Log In</span>
          </button>
        </div>
      </main>

      {/* Institutional Footer */}
      <footer
        className={`w-full text-center text-[11px] text-[#667085] z-10 pt-4 transition-all duration-700 delay-500 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <p className="font-medium tracking-wide">
          Forerunners Network International &bull; Advancing the Great Commission
        </p>
      </footer>
    </div>
  );
};
