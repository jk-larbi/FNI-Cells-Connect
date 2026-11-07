import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ReportService } from '../../services/reportService';
import { Shield, CheckCircle2, UserCheck, LayoutDashboard, RotateCcw } from 'lucide-react';

export const RoleSwitcherBanner: React.FC = () => {
  const { currentRole, switchRole, currentUser, isSupabaseActive } = useAuth();

  const handleResetData = () => {
    if (confirm('Reset portal data to fresh initial state (clears all reports)?')) {
      ReportService.resetToCleanSlate();
      window.location.reload();
    }
  };

  return (
    <div className="bg-navy-950 text-slate-200 border-b border-navy-800 text-xs px-5 py-2 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 font-bold text-gold-400 bg-navy-900 px-2.5 py-1 rounded-lg border border-navy-700 uppercase tracking-wider text-[10px]">
          <Shield className="w-3.5 h-3.5 text-gold-400" />
          PORTAL SWITCHER
        </span>
        <span className="text-slate-300 hidden sm:inline text-xs">
          Active View: <strong className="text-white font-semibold">{currentUser.full_name}</strong>{' '}
          <span className="text-slate-400">({currentRole === 'admin' ? 'Admin Panel' : 'Cell Leader Portal'})</span>
        </span>
        {isSupabaseActive ? (
          <span className="flex items-center gap-1 text-[11px] text-emerald-400 ml-2 font-medium">
            <CheckCircle2 className="w-3 h-3" /> Supabase Live
          </span>
        ) : (
          <span className="text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-md ml-2 font-medium">
            Fresh Portal (No Mockup Data)
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-slate-400 text-xs hidden sm:inline">Switch Persona:</span>
        <button
          onClick={() => switchRole('admin')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            currentRole === 'admin'
              ? 'bg-gold-500 text-navy-950 shadow-sm'
              : 'bg-navy-900 hover:bg-navy-800 text-slate-300'
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>Admin Panel</span>
        </button>

        <button
          onClick={() => switchRole('cell_leader')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            currentRole === 'cell_leader'
              ? 'bg-gold-500 text-navy-950 shadow-sm'
              : 'bg-navy-900 hover:bg-navy-800 text-slate-300'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Cell Leader</span>
        </button>

        <button
          onClick={handleResetData}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-navy-900 hover:bg-rose-950/70 hover:text-rose-300 text-slate-400 border border-navy-800 transition-colors ml-1"
          title="Reset portal to clean initial state"
        >
          <RotateCcw className="w-3 h-3" />
          <span className="hidden md:inline">Reset Slate</span>
        </button>
      </div>
    </div>
  );
};
