import React from 'react';

export interface StatItem {
  value: string | number;
  label: string;
  sublabel?: string;
}

interface StatsGridProps {
  stats: StatItem[];
  className?: string;
}

export const StatsGrid: React.FC<StatsGridProps> = ({ stats, className = '' }) => {
  return (
    <div
      className={`grid grid-cols-2 md:grid-cols-4 bg-white border border-[#E3E6EB] rounded-lg overflow-hidden divide-y md:divide-y-0 md:divide-x divide-[#E3E6EB] mb-6 shadow-xs ${className}`}
    >
      {stats.map((st, i) => (
        <div key={i} className="p-4 sm:p-5 flex flex-col justify-center">
          <div className="text-2xl sm:text-[26px] font-semibold tracking-tight text-[#0F2447] tabular-nums font-serif-title">
            {st.value}
          </div>
          <div className="text-xs font-medium text-[#5B6472] mt-0.5">
            {st.label}
          </div>
          {st.sublabel && (
            <div className="text-[11px] text-[#8C95A3] mt-0.5">
              {st.sublabel}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
