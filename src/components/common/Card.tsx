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
    <div className={`bg-white dark:bg-[#202532] rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-subtle ${className}`}>
      {(title || action) && (
        <div className={`px-5 py-4 flex items-center justify-between ${headerBorder ? 'border-b border-slate-100 dark:border-slate-700' : ''}`}>
          <div>
            {title && <h3 className="text-sm font-semibold text-navy-900 dark:text-slate-100 tracking-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
};
