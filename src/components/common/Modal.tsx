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
      <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
        <div
          className="fixed inset-0 bg-navy-950/60 backdrop-blur-xs transition-opacity"
          onClick={onClose}
        />
        <div
          className={`relative transform overflow-hidden rounded-2xl bg-white dark:bg-[#202532] text-left shadow-floating transition-all sm:my-8 w-full ${maxWidthClasses[effectiveMaxWidth]} border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]`}
        >
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#26384d] px-6 py-4 bg-slate-50 dark:bg-[#252B37] shrink-0">
            <div>
              <h3 className="text-base font-semibold text-navy-900 dark:text-slate-100">{title}</h3>
              {subtitle && <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#26384d] hover:text-slate-600 dark:hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="p-6 overflow-y-auto custom-scrollbar overscroll-contain flex-1">{children}</div>
        </div>
      </div>
    </div>
  );
};
