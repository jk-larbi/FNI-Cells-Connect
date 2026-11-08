import React from 'react';
import { ArrowRight, ArrowLeft, LogIn, UserPlus } from 'lucide-react';

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
  return (
    <div className="min-h-screen bg-white text-[#182230] flex flex-col justify-between items-center px-4 py-8 sm:py-12 relative overflow-hidden font-sans selection:bg-[#C6A45A]/20 selection:text-[#142B4A]">
      {/* Subtle restrained decorative background circles */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-[500px] h-[500px] sm:w-[680px] sm:h-[680px] rounded-full border border-[#C6A45A]/15 animate-pulse opacity-40" />
        <div className="w-[700px] h-[700px] sm:w-[920px] sm:h-[920px] rounded-full border border-[#142B4A]/5 opacity-30" />
      </div>

      {/* Top back button to Vision & Mission Screen */}
      <div className="w-full max-w-xl mx-auto flex items-center justify-start z-10 pt-2">
        {onBackToVision && (
          <button
            type="button"
            onClick={onBackToVision}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-[#142B4A] hover:text-[#C6A45A] bg-[#142B4A]/5 hover:bg-[#142B4A]/10 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#C6A45A]" />
            <span>Ministry Vision & Target</span>
          </button>
        )}
      </div>

      {/* Main Centered Content */}
      <main className="w-full max-w-xl mx-auto flex flex-col items-center text-center my-auto z-10 px-4">
        {/* 1. Official FNI Logo - Big & Prominent in Centre */}
        <div className="relative mb-6 sm:mb-8 group">
          {/* Subtle gold outer glow & accent border */}
          <div className="absolute -inset-2.5 rounded-3xl border border-[#C6A45A]/40 opacity-70 group-hover:scale-105 transition-all duration-300" />
          <div className="absolute -inset-1 rounded-3xl border border-[#142B4A]/10" />

          {/* Logo Frame: Pristine, preserving the complete emblem & pillars */}
          <div className="w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 rounded-3xl overflow-hidden border-2 border-white shadow-2xl bg-[#142B4A] flex items-center justify-center p-1">
            <img
              src="/fni-official-logo.jpg"
              alt="Forerunners Network International Official Logo"
              className="w-full h-full object-contain rounded-2xl"
            />
          </div>
        </div>

        {/* 2. Platform Name - Big & Bold in Official Blue */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-[#142B4A] tracking-tight leading-none mb-3">
          FNI CELLS CONNECT
        </h1>

        {/* Thin Gold Decorative Divider */}
        <div className="flex items-center justify-center gap-2.5 w-40 sm:w-52 my-2.5">
          <div className="h-[2px] bg-gradient-to-r from-transparent to-[#C6A45A] flex-1" />
          <div className="w-2 h-2 rounded-full bg-[#C6A45A] shadow-xs" />
          <div className="h-[2px] bg-gradient-to-l from-transparent to-[#C6A45A] flex-1" />
        </div>

        {/* 3. Short Elegant Tagline */}
        <p className="text-base sm:text-lg text-[#667085] font-medium italic tracking-wide mt-1 mb-8 sm:mb-10">
          Connecting Cells. Strengthening Fellowship.
        </p>

        {/* 4. Two Buttons: SIGN UP and LOG IN */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-sm sm:max-w-md">
          {/* Sign Up Button: Deep Navy Blue with Gold Detail */}
          <button
            type="button"
            onClick={onSignUp}
            className="w-full sm:flex-1 py-4 px-7 rounded-2xl bg-[#142B4A] hover:bg-[#203D63] text-white font-bold text-sm uppercase tracking-wider shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 border border-[#142B4A] group cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#C6A45A]"
          >
            <UserPlus className="w-4 h-4 text-[#C6A45A]" />
            <span>Sign Up</span>
            <ArrowRight className="w-4 h-4 text-[#C6A45A] group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Log In Button: White with Blue Border and Blue Text */}
          <button
            type="button"
            onClick={onLogIn}
            className="w-full sm:flex-1 py-4 px-7 rounded-2xl bg-white hover:bg-[#F5F7FA] text-[#142B4A] hover:text-[#142B4A] border-2 border-[#142B4A] hover:border-[#C6A45A] font-bold text-sm uppercase tracking-wider transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#142B4A]/20"
          >
            <LogIn className="w-4 h-4 text-[#142B4A]" />
            <span>Log In</span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center text-[11px] text-[#667085] z-10 pt-4">
        <p className="font-medium">
          Forerunners Network International &bull; Advancing the Great Commission
        </p>
      </footer>
    </div>
  );
};
