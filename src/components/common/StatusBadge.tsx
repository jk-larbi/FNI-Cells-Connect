import React from 'react';
import { ReportStatus } from '../../types';

interface StatusBadgeProps {
  status: ReportStatus;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const styles: Record<ReportStatus, string> = {
    Draft: 'bg-[#ECEEF2] text-[#5B6472] border-[#D9DDE3]',
    Submitted: 'bg-[#E6ECF7] text-[#1B3F7A] border-[#CFD8EB]',
    Approved: 'bg-[#E4F2E8] text-[#1E6B3A] border-[#C4E1CC]',
    Returned: 'bg-[#FBF0D9] text-[#8A5A00] border-[#EED7A1]',
    Overdue: 'bg-[#FBE5E3] text-[#A32B21] border-[#F2C4BF]'
  };

  const style = styles[status] || styles.Draft;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${style} ${className}`}
    >
      {status}
    </span>
  );
};
