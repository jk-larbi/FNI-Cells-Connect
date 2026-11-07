import React from 'react';
import { ReportStatus, UserRole } from '../../types';

interface BadgeProps {
  children?: React.ReactNode;
  variant?: 'status' | 'role' | 'neutral' | 'gold' | 'success' | 'warning' | 'danger';
  status?: ReportStatus;
  role?: UserRole;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  status,
  role,
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-3 py-1 text-[11px]',
    lg: 'px-3.5 py-1.5 text-xs',
  };
  if (status) {
    const statusConfig: Record<ReportStatus, { label: string; bg: string; text: string }> = {
      'Newly Submitted': { label: 'Newly Submitted', bg: 'bg-blue-50', text: 'text-blue-700' },
      'Approved': { label: 'Approved', bg: 'bg-emerald-50', text: 'text-emerald-700' },
      'Needs Correction': { label: 'Needs Correction', bg: 'bg-rose-50', text: 'text-rose-700' },
      draft: { label: 'Draft', bg: 'bg-slate-100', text: 'text-slate-600' },
      submitted: { label: 'Submitted', bg: 'bg-blue-50', text: 'text-blue-700' },
      under_review: { label: 'Under Review', bg: 'bg-amber-50', text: 'text-amber-700' },
      approved: { label: 'Approved', bg: 'bg-emerald-50', text: 'text-emerald-700' },
      needs_revision: { label: 'Needs Revision', bg: 'bg-rose-50', text: 'text-rose-700' },
    };
    const cfg = statusConfig[status] || { label: status, bg: 'bg-slate-100', text: 'text-slate-700' };
    return (
      <span className={`inline-flex items-center rounded-full font-semibold ${sizeClasses[size]} ${cfg.bg} ${cfg.text} ${className}`}>
        <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-current opacity-80" />
        {children || cfg.label}
      </span>
    );
  }

  if (role) {
    const roleConfig: Record<UserRole, { label: string; bg: string; text: string }> = {
      tutor: { label: 'Tutor', bg: 'bg-slate-100', text: 'text-slate-700' },
      admin: { label: 'Admin', bg: 'bg-navy-900', text: 'text-white' },
      super_admin: { label: 'Super Admin', bg: 'bg-rose-50', text: 'text-rose-700' },
      national_admin: { label: 'National Admin', bg: 'bg-purple-50', text: 'text-purple-700' },
      regional_leader: { label: 'Regional Leader', bg: 'bg-blue-50', text: 'text-blue-700' },
      cell_leader: { label: 'Cell Leader', bg: 'bg-slate-100', text: 'text-slate-700' },
    };
    const cfg = roleConfig[role] || { label: role, bg: 'bg-slate-100', text: 'text-slate-700' };
    return (
      <span className={`inline-flex items-center rounded-full font-semibold ${sizeClasses[size]} ${cfg.bg} ${cfg.text} ${className}`}>
        {children || cfg.label}
      </span>
    );
  }

  const baseStyles = 'inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold';
  const variants = {
    neutral: 'bg-slate-100 text-slate-700',
    gold: 'bg-gold-50 text-gold-800',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-rose-50 text-rose-700',
  };

  return (
    <span className={`${baseStyles} ${variants[variant as keyof typeof variants] || variants.neutral} ${className}`}>
      {children}
    </span>
  );
};
