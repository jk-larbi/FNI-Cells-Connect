import React, { useState, useEffect } from 'react';
import { ArrowRight, Flame, Target, Eye, Compass } from 'lucide-react';
import { SoulTargetService } from '../../services/soulTargetService';
import { SoulTargetMetrics } from '../../types';

interface MinistryVisionViewProps {
  onProceed: () => void;
}

export const MinistryVisionView: React.FC<MinistryVisionViewProps> = ({ onProceed }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [metrics, setMetrics] = useState<SoulTargetMetrics | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 80);
    const unsub = SoulTargetService.subscribeToLiveSoulTracking(m => {
      setMetrics(m);
    });
    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, []);

  return (
    <div className="min-h-screen bg-white text-[#182230] flex flex-col justify-between items-center px-4 py-8 sm:py-12 relative overflow-hidden font-sans selection:bg-[#C6A45A]/20 selection:text-[#142B4A]">
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

      {/* Main Centered Content */}
      <main className="w-full max-w-2xl mx-auto flex flex-col items-center text-center my-auto z-10 px-4">
        {/* 1. Official FNI Ministry Logo */}
        <div
          className={`relative mb-5 sm:mb-6 transition-all duration-1000 transform ${
            isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
          }`}
        >
          {/* Subtle Outer Pulsing Glow */}
          <div className="absolute -inset-2.5 rounded-3xl bg-gradient-to-r from-[#C6A45A]/30 via-[#142B4A]/10 to-[#C6A45A]/30 blur-md animate-pulse" />
          <div className="absolute -inset-1.5 rounded-3xl border border-[#C6A45A]/50" />

          {/* Logo Frame: Full Emblem Preserved */}
          <div className="w-28 h-28 sm:w-36 sm:h-36 md:w-40 md:h-40 rounded-3xl overflow-hidden border-2 border-white shadow-xl bg-[#142B4A] flex items-center justify-center p-1 relative z-10">
            <img
              src={`${import.meta.env.BASE_URL}fni-official-logo.jpg`}
              alt="Forerunners Network International Logo"
              className="w-full h-full object-contain rounded-2xl"
            />
          </div>
        </div>

        {/* Platform Title */}
        <div
          className={`transition-all duration-1000 delay-150 transform ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <h1 className="fni-portal-title text-2xl sm:text-3xl md:text-4xl font-black text-[#142B4A] tracking-tight leading-none mb-2">
            FNI CELLS CONNECT
          </h1>
          <div className="h-0.5 w-16 bg-[#C6A45A] mx-auto rounded-full mb-6 sm:mb-8" />
        </div>

        {/* STRICTLY THE THREE CORE STATEMENTS: VISION, MISSION, SOUL-WINNING TARGET */}
        <div className="w-full space-y-4 text-left">
          {/* 1. VISION STATEMENT */}
          <div
            className={`vision-statement-card p-5 sm:p-6 rounded-3xl bg-white border border-[#E3E8EF] shadow-md shadow-slate-200/50 relative overflow-hidden group ${isLoaded ? 'is-visible' : 'opacity-0'}`}
            style={{ animationDelay: isLoaded ? '120ms' : '0ms' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-xl bg-[#142B4A] text-[#C6A45A]">
                <Eye className="w-4 h-4" />
              </div>
              <span className="vision-card-heading text-xs font-black uppercase tracking-wider text-[#142B4A]">
                Our Vision
              </span>
            </div>
            <p className="text-xs sm:text-sm md:text-base text-[#182230] font-serif italic leading-relaxed pl-1">
              “To raise a global army of consecrated believers equipped with apostolic and prophetic depth, establishing the reign of Christ across all spheres of society.”
            </p>
          </div>

          {/* 2. MISSION STATEMENT */}
          <div
            className={`vision-statement-card p-5 sm:p-6 rounded-3xl bg-white border border-[#E3E8EF] shadow-md shadow-slate-200/50 relative overflow-hidden group ${isLoaded ? 'is-visible' : 'opacity-0'}`}
            style={{ animationDelay: isLoaded ? '650ms' : '0ms' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-xl bg-[#142B4A] text-[#C6A45A]">
                <Compass className="w-4 h-4" />
              </div>
              <span className="vision-card-heading text-xs font-black uppercase tracking-wider text-[#142B4A]">
                Our Mission
              </span>
            </div>
            <p className="text-xs sm:text-sm md:text-base text-[#182230] font-serif italic leading-relaxed pl-1">
              “Mobilizing territorial cell fellowships, rigorous discipleship training, dynamic evangelism outreaches, and systematic pastoral care to transform lives and communities.”
            </p>
          </div>

          {/* 3. SOUL-WINNING TARGET */}
          <div
            className={`p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#142B4A] to-[#203D63] text-white border border-[#142B4A] shadow-xl relative overflow-hidden transition-all duration-700 delay-600 transform ${
              isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-[#C6A45A] text-[#142B4A]">
                  <Target className="w-4 h-4" />
                </div>
                <span className="text-xs font-black uppercase tracking-wider text-[#C6A45A]">
                  Annual Soul-Winning Target
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-white bg-[#C6A45A]/25 px-2.5 py-0.5 rounded-full border border-[#C6A45A]/50 tracking-wider uppercase">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Tracking
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mt-2 mb-1">
              <div className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                {metrics ? `${metrics.annualTarget.toLocaleString()} Souls` : '3,000 Souls'}
              </div>
              <div className="text-xs sm:text-sm font-bold text-[#C6A45A]">
                {metrics ? `${metrics.verifiedSoulsWon} Won (${metrics.percentageAchieved}%)` : 'Live Harvest Stream'}
              </div>
            </div>

            {/* Live Progress Bar */}
            <div className="w-full bg-black/30 rounded-full h-2.5 my-3 overflow-hidden border border-white/10">
              <div
                className="bg-gradient-to-r from-[#C6A45A] to-emerald-400 h-full rounded-full transition-all duration-700 shadow-sm"
                style={{ width: `${metrics ? metrics.percentageAchieved : 0}%` }}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-300 gap-2 pt-1 border-t border-white/10">
              <span>
                Remaining: <strong className="text-white">{metrics ? metrics.remainingSouls.toLocaleString() : '5,000'} souls</strong>
              </span>
              <div className="flex items-center gap-2 text-[10px] text-[#C6A45A]">
                <span>Outreach: +{metrics?.soulsFromEvangelism || 0}</span>
                <span>&bull;</span>
                <span>Cell Meetings: +{metrics?.soulsFromCells || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Proceed Button to Second Screen */}
        <div
          className={`mt-8 sm:mt-10 w-full max-w-sm transition-all duration-1000 delay-750 transform ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <button
            type="button"
            onClick={onProceed}
            className="w-full py-4 px-8 rounded-2xl bg-[#142B4A] hover:bg-[#203D63] text-white font-bold text-xs uppercase tracking-widest shadow-xl shadow-[#142B4A]/30 hover:shadow-2xl transition-all flex items-center justify-center gap-3 border border-[#C6A45A]/50 group cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#C6A45A]"
          >
            <span>Proceed to Portal</span>
            <ArrowRight className="w-4 h-4 text-[#C6A45A] group-hover:translate-x-1.5 transition-transform" />
          </button>
        </div>
      </main>

      {/* Subtle Institutional Footer */}
      <footer className="w-full text-center text-[11px] text-[#667085] z-10 pt-4">
        <p className="font-medium">
          Forerunners Network International &bull; Advancing the Great Commission
        </p>
      </footer>
    </div>
  );
};
