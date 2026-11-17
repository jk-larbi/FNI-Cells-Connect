import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth,
  size,
}) => {
  const effectiveMaxWidth = maxWidth || size || 'lg';
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto custom-scrollbar overscroll-contain">
      <div className="flex min-h-screen items-center justify-center p-3 sm:p-6 text-center">
        <div
          className="fixed inset-0 bg-navy-950/60 backdrop-blur-xs transition-opacity"
          onClick={onClose}
        />
        <div
          className={`relative transform overflow-hidden rounded-3xl fni-glass-card bg-white dark:bg-[#111c2d] text-left shadow-2xl transition-all sm:my-8 w-full ${maxWidthClasses[effectiveMaxWidth]} border border-slate-200/80 dark:border-white/10 flex flex-col max-h-[92vh]`}
        >
          <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 px-4 py-3.5 sm:px-6 sm:py-4 bg-slate-50/80 dark:bg-[#172437] shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="hidden sm:flex items-center gap-1.5 shrink-0" title="Window controls">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56] border border-[#E0443E]/50 shadow-2xs" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E] border border-[#DEA123]/50 shadow-2xs" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F] border border-[#1AAB29]/50 shadow-2xs" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-navy-900 dark:text-white truncate">{title}</h3>
                {subtitle && <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">{subtitle}</p>}
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-slate-400 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
              aria-label="Close modal dialog"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar overscroll-contain flex-1">{children}</div>
        </div>
      </div>
    </div>
  );
};
