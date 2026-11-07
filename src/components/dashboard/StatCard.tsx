import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  isActive?: boolean;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  isActive = false,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl p-5 border border-slate-100 shadow-card hover:shadow-elevated transition-all relative flex flex-col justify-between ${
        onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''
      }`}
    >
      {/* Top row: Icon squircle on left, subtle radio dot on right */}
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-navy-900 text-white flex items-center justify-center shadow-sm">
          {icon}
        </div>
        <div
          className={`w-3.5 h-3.5 rounded-full border-2 ${
            isActive
              ? 'border-navy-900 bg-navy-900'
              : 'border-slate-300 bg-transparent'
          } flex items-center justify-center`}
        >
          {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
        </div>
      </div>

      {/* Number and Label */}
      <div>
        <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-navy-950">
          {value}
        </div>
        <div className="text-xs font-medium text-slate-500 mt-1">
          {title}
        </div>
        {subtitle && (
          <div className="text-[10px] text-slate-400 mt-0.5 truncate">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};

export const ActionStatCard: React.FC<{
  label: string;
  sublabel?: string;
  onClick: () => void;
}> = ({ label, sublabel, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="bg-slate-100/90 hover:bg-slate-200/80 rounded-2xl p-5 border border-slate-200/60 shadow-subtle hover:shadow-card transition-all flex flex-col items-center justify-center text-center group"
    >
      <div className="w-10 h-10 rounded-full bg-slate-200 group-hover:bg-navy-900 group-hover:text-gold-400 text-slate-500 flex items-center justify-center font-bold text-lg transition-colors mb-2">
        +
      </div>
      <span className="text-xs font-bold text-navy-950">{label}</span>
      {sublabel && <span className="text-[10px] text-slate-400 mt-0.5">{sublabel}</span>}
    </button>
  );
};
