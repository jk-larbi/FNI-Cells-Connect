import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  headerBorder?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  subtitle,
  action,
  headerBorder = true,
}) => {
  return (
    <div className={`fni-glass-card bg-white dark:bg-[#111c2d] rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-card transition-all duration-200 ${className}`}>
      {(title || action) && (
        <div className={`px-5 py-4 flex items-center justify-between ${headerBorder ? 'border-b border-slate-100 dark:border-white/10' : ''}`}>
          <div>
            {title && <h3 className="text-sm font-bold text-navy-900 dark:text-slate-100 tracking-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
};
