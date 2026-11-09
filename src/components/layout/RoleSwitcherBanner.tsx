import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ReportService } from '../../services/reportService';
import { Shield, CheckCircle2, RotateCcw } from 'lucide-react';

export const RoleSwitcherBanner: React.FC = () => {
  const { currentRole, currentUser, isSupabaseActive, isAdmin } = useAuth();

  const handleResetData = () => {
    if (confirm('Reset portal local cache (refreshes live records from Supabase)?')) {
      ReportService.resetToCleanSlate();
      window.location.reload();
    }
  };

  return (
    <div className="bg-[#142B4A] text-slate-200 border-b border-[#203D63] text-xs px-5 py-2 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 font-bold text-[#C6A45A] bg-[#0F1D31] px-2.5 py-1 rounded-lg border border-[#203D63] uppercase tracking-wider text-[10px]">
          <Shield className="w-3.5 h-3.5 text-[#C6A45A]" />
          ACTIVE SESSION
        </span>
        <span className="text-slate-300 hidden sm:inline text-xs">
          Authenticated: <strong className="text-white font-semibold">{currentUser?.full_name || 'User'}</strong>{' '}
          <span className="text-[#C6A45A] font-medium">({isAdmin ? 'Church Administrator' : 'Cell Fellowship Tutor'})</span>
        </span>
        {isSupabaseActive ? (
          <span className="flex items-center gap-1 text-[11px] text-emerald-400 ml-2 font-medium">
            <CheckCircle2 className="w-3 h-3" /> Supabase Live
          </span>
        ) : (
          <span className="text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-md ml-2 font-medium">
            Live Portal (Production Mode)
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-slate-400 text-xs hidden sm:inline">
          Access Level: <strong className="text-slate-200 uppercase">{currentRole}</strong>
        </span>

        <button
          onClick={handleResetData}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#203D63] hover:bg-[#142B4A] hover:text-[#C6A45A] text-slate-300 border border-[#203D63] transition-colors ml-1"
          title="Refresh local cache from Supabase"
        >
          <RotateCcw className="w-3 h-3" />
          <span className="hidden md:inline">Refresh Cache</span>
        </button>
      </div>
    </div>
  );
};
