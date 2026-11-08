import React, { useState, useEffect } from 'react';
import { ArrowRight, Sparkles, BookOpen, Shield, LogIn, UserPlus } from 'lucide-react';

interface SimpleLandingViewProps {
  onSignUp: () => void;
  onLogIn: () => void;
  onViewOverview?: () => void;
}

export const SimpleLandingView: React.FC<SimpleLandingViewProps> = ({
  onSignUp,
  onLogIn,
}) => {
  // Active statement tab: 'mission' or 'vision' with smooth animation
  const [activeTab, setActiveTab] = useState<'mission' | 'vision'>('mission');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Auto-cycle through mission and vision every 8 seconds if user doesn't toggle
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTab(prev => (prev === 'mission' ? 'vision' : 'mission'));
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-white text-[#182230] flex flex-col justify-between items-center px-4 py-8 sm:py-12 relative overflow-hidden font-sans selection:bg-[#C6A45A]/20 selection:text-[#142B4A]">
      {/* Background Decorative Gold & Navy Aura */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
        <div className="w-[500px] h-[500px] sm:w-[720px] sm:h-[720px] rounded-full bg-gradient-to-tr from-[#142B4A]/5 via-transparent to-[#C6A45A]/10 blur-3xl animate-pulse" />
        <div className="w-[400px] h-[400px] sm:w-[600px] sm:h-[600px] rounded-full border border-[#C6A45A]/15 animate-[spin_60s_linear_infinite]" />
        <div className="w-[600px] h-[600px] sm:w-[850px] sm:h-[850px] rounded-full border border-[#142B4A]/5 animate-[spin_90s_linear_infinite_reverse]" />
      </div>

      {/* Top Ministry Accent Bar */}
      <div className={`transition-all duration-1000 transform ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'} w-full flex justify-center pt-2 z-10`}>
        <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#142B4A]/5 border border-[#C6A45A]/30">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C6A45A] animate-ping" />
          <span className="text-[11px] font-bold text-[#142B4A] uppercase tracking-widest">
            Forerunners Network International
          </span>
        </div>
      </div>

      {/* Main Centered Animated Hero Content */}
      <main className="w-full max-w-2xl mx-auto flex flex-col items-center text-center my-auto z-10 px-4">
        {/* 1. Official FNI Ministry Logo with Floating Animation & Gold Glow */}
        <div
          className={`relative mb-6 sm:mb-8 transition-all duration-1000 delay-200 transform ${
            isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
          }`}
        >
          {/* Subtle Outer Pulsing Glow */}
          <div className="absolute -inset-3 rounded-full bg-gradient-to-r from-[#C6A45A]/30 via-[#142B4A]/20 to-[#C6A45A]/30 blur-md animate-pulse" />

          {/* Concentric Gold Accent Rings */}
          <div className="absolute -inset-2 rounded-3xl border border-[#C6A45A]/50 transition-all duration-500" />
          <div className="absolute -inset-1 rounded-3xl border border-[#142B4A]/10" />

          {/* Logo Frame: Clean, preserving the emblem and full proportions */}
          <div className="w-36 h-36 sm:w-44 sm:h-44 md:w-52 md:h-52 rounded-3xl overflow-hidden border-2 border-white shadow-2xl bg-[#142B4A] flex items-center justify-center p-1 relative z-10 group hover:scale-[1.02] transition-transform duration-500">
            <img
              src="/fni-official-logo.jpg"
              alt="Forerunners Network International Official Logo"
              className="w-full h-full object-contain rounded-2xl"
            />
          </div>
        </div>

        {/* Platform Title */}
        <div
          className={`transition-all duration-1000 delay-300 transform ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#142B4A] tracking-tight leading-none mb-2">
            FNI CELLS CONNECT
          </h1>
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-[#C6A45A] mb-4">
            Connecting Cells • Strengthening Fellowship
          </p>
        </div>

        {/* 2. Mission and Statements Animated Showcase */}
        <div
          className={`w-full max-w-xl transition-all duration-1000 delay-500 transform ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          {/* Statement Tab Controls */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <button
              type="button"
              onClick={() => setActiveTab('mission')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 flex items-center gap-1.5 ${
                activeTab === 'mission'
                  ? 'bg-[#142B4A] text-white shadow-md shadow-[#142B4A]/20 scale-105 border border-[#142B4A]'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C6A45A]" />
              <span>Mission Statement</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('vision')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 flex items-center gap-1.5 ${
                activeTab === 'vision'
                  ? 'bg-[#142B4A] text-white shadow-md shadow-[#142B4A]/20 scale-105 border border-[#142B4A]'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-[#C6A45A]" />
              <span>Vision Statement</span>
            </button>
          </div>

          {/* Animated Statement Box */}
          <div className="relative bg-gradient-to-b from-white to-[#F8FAFC] rounded-3xl p-6 sm:p-8 border border-[#E3E8EF] shadow-lg shadow-slate-200/50 overflow-hidden min-h-[160px] flex items-center justify-center">
            {/* Elegant Quotation Mark Watermark */}
            <span className="absolute top-2 left-4 text-7xl text-[#C6A45A]/10 font-serif select-none pointer-events-none">
              “
            </span>

            {/* Mission Statement */}
            <div
              className={`transition-all duration-700 ease-in-out transform ${
                activeTab === 'mission'
                  ? 'opacity-100 scale-100 block'
                  : 'opacity-0 scale-95 hidden'
              }`}
            >
              <span className="inline-block text-[10px] font-bold tracking-widest text-[#C6A45A] uppercase mb-2">
                Our Mission
              </span>
              <p className="text-sm sm:text-base md:text-lg text-[#142B4A] font-serif italic leading-relaxed max-w-lg mx-auto">
                “Mobilizing territorial cell fellowships, rigorous discipleship training, dynamic evangelism outreaches, and systematic pastoral care to transform lives and communities.”
              </p>
            </div>

            {/* Vision Statement */}
            <div
              className={`transition-all duration-700 ease-in-out transform ${
                activeTab === 'vision'
                  ? 'opacity-100 scale-100 block'
                  : 'opacity-0 scale-95 hidden'
              }`}
            >
              <span className="inline-block text-[10px] font-bold tracking-widest text-[#C6A45A] uppercase mb-2">
                Our Vision
              </span>
              <p className="text-sm sm:text-base md:text-lg text-[#142B4A] font-serif italic leading-relaxed max-w-lg mx-auto">
                “To raise a global army of consecrated believers equipped with apostolic and prophetic depth, establishing the reign of Christ across all spheres of society.”
              </p>
            </div>
          </div>
        </div>

        {/* 3. Action Buttons: Proceed to Registration Portal / Log In */}
        <div
          className={`mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md transition-all duration-1000 delay-700 transform ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          {/* Primary CTA: Go to Registration Portal */}
          <button
            type="button"
            onClick={onSignUp}
            className="w-full sm:flex-1 py-4 px-6 rounded-2xl bg-[#142B4A] hover:bg-[#203D63] text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-[#142B4A]/25 hover:shadow-xl transition-all flex items-center justify-center gap-2 border border-[#142B4A] group cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#C6A45A]"
          >
            <UserPlus className="w-4 h-4 text-[#C6A45A]" />
            <span>Registration Portal</span>
            <ArrowRight className="w-4 h-4 text-[#C6A45A] group-hover:translate-x-1.5 transition-transform" />
          </button>

          {/* Secondary CTA: Log In */}
          <button
            type="button"
            onClick={onLogIn}
            className="w-full sm:w-auto py-4 px-7 rounded-2xl bg-white hover:bg-slate-50 text-[#142B4A] border-2 border-[#142B4A] hover:border-[#C6A45A] font-bold text-xs uppercase tracking-widest transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#142B4A]/20"
          >
            <LogIn className="w-4 h-4 text-[#142B4A]" />
            <span>Log In</span>
          </button>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="w-full text-center text-[11px] text-[#667085] z-10 pt-4">
        <p className="font-medium">
          Forerunners Network International &bull; Advancing the Great Commission
        </p>
      </footer>
    </div>
  );
};
