import React, { useState, useEffect } from 'react';
import { Share, PlusSquare, Smartphone, X, Check, ArrowRight } from 'lucide-react';

const DISMISS_KEY = 'fni_ios_install_guide_dismissed_v1';

export const isIosDevice = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isIos = /iPhone|iPad|iPod/.test(ua);
  const isIpadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return isIos || isIpadOs;
};

export const isStandaloneMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  const isNavigatorStandalone = (window.navigator as any).standalone === true;
  const isMediaStandalone = window.matchMedia?.('(display-mode: standalone)').matches === true;
  return isNavigatorStandalone || isMediaStandalone;
};

export const triggerIosInstallGuide = (): void => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('fni:open-ios-install-guide'));
  }
};

interface IosInstallGuideProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export const IosInstallGuide: React.FC<IosInstallGuideProps> = ({
  forceOpen = false,
  onClose,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(1);

  useEffect(() => {
    const handleCustomTrigger = () => setIsOpen(true);
    if (typeof window !== 'undefined') {
      window.addEventListener('fni:open-ios-install-guide', handleCustomTrigger);
    }

    if (forceOpen) {
      setIsOpen(true);
      return () => {
        if (typeof window !== 'undefined') {
          window.removeEventListener('fni:open-ios-install-guide', handleCustomTrigger);
        }
      };
    }

    // Only prompt iOS users who are currently browsing in Safari (not already installed)
    if (!isIosDevice() || isStandaloneMode()) {
      setIsOpen(false);
      return () => {
        if (typeof window !== 'undefined') {
          window.removeEventListener('fni:open-ios-install-guide', handleCustomTrigger);
        }
      };
    }

    // Check if dismissed previously
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const parsedTime = parseInt(dismissedAt, 10);
      // Suppress for 7 days after dismissal so we never repeatedly nag
      if (Date.now() - parsedTime < 7 * 24 * 60 * 60 * 1000) {
        setIsOpen(false);
        return () => {
          if (typeof window !== 'undefined') {
            window.removeEventListener('fni:open-ios-install-guide', handleCustomTrigger);
          }
        };
      }
    }

    // Delay display slightly so it doesn't block immediate initial render
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 2500);

    return () => {
      clearTimeout(timer);
      if (typeof window !== 'undefined') {
        window.removeEventListener('fni:open-ios-install-guide', handleCustomTrigger);
      }
    };
  }, [forceOpen]);

  const handleDismiss = (permanent = false) => {
    if (permanent) {
      localStorage.setItem(DISMISS_KEY, (Date.now() + 365 * 24 * 60 * 60 * 1000).toString());
    } else {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    }
    setIsOpen(false);
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="ios-install-title"
      aria-modal="false"
      className="fixed bottom-0 inset-x-0 z-50 p-3 sm:p-4 pb-[max(1rem,env(safe-area-inset-bottom))] animate-slideUp pointer-events-none"
    >
      <div className="max-w-md mx-auto w-full bg-[#0c1626]/95 dark:bg-[#0c1626]/95 backdrop-blur-xl border border-[#C6A45A]/30 rounded-3xl shadow-2xl p-5 text-white pointer-events-auto">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#142B4A] border border-[#C6A45A]/40 flex items-center justify-center shrink-0 shadow-sm">
              <Smartphone className="w-5 h-5 text-[#C6A45A]" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#C6A45A]/15 border border-[#C6A45A]/30 text-[9px] font-bold text-[#C6A45A] uppercase tracking-wider mb-0.5">
                iPhone / iPad App
              </div>
              <h3 id="ios-install-title" className="text-sm font-bold text-white tracking-tight">
                Install FNI Cells Connect
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleDismiss(false)}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Dismiss guide"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed mb-4">
          Add FNI to your Home Screen for a full-screen, native-like experience with notifications and instant offline access:
        </p>

        {/* 5 Clean Steps */}
        <div className="space-y-2 bg-[#142B4A]/60 rounded-2xl p-3 border border-slate-700/60 mb-4 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-5 h-5 rounded-full bg-[#C6A45A] text-[#0c1626] font-black text-[10px] flex items-center justify-center shrink-0">
              1
            </span>
            <span className="text-slate-200">
              Open <span className="font-bold text-white">FNI Cells Connect</span> in Apple Safari.
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="w-5 h-5 rounded-full bg-[#C6A45A] text-[#0c1626] font-black text-[10px] flex items-center justify-center shrink-0">
              2
            </span>
            <span className="text-slate-200 flex items-center gap-1.5 flex-wrap">
              Tap the Safari <span className="inline-flex items-center gap-1 font-bold text-[#C6A45A] bg-white/10 px-1.5 py-0.5 rounded"><Share className="w-3 h-3" /> Share</span> button.
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="w-5 h-5 rounded-full bg-[#C6A45A] text-[#0c1626] font-black text-[10px] flex items-center justify-center shrink-0">
              3
            </span>
            <span className="text-slate-200 flex items-center gap-1.5 flex-wrap">
              Scroll down and tap <span className="inline-flex items-center gap-1 font-bold text-white bg-white/10 px-1.5 py-0.5 rounded"><PlusSquare className="w-3 h-3 text-[#C6A45A]" /> Add to Home Screen</span>.
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="w-5 h-5 rounded-full bg-[#C6A45A] text-[#0c1626] font-black text-[10px] flex items-center justify-center shrink-0">
              4
            </span>
            <span className="text-slate-200">
              Ensure <span className="font-bold text-white">Open as Web App</span> is checked (if prompted).
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="w-5 h-5 rounded-full bg-[#C6A45A] text-[#0c1626] font-black text-[10px] flex items-center justify-center shrink-0">
              5
            </span>
            <span className="text-slate-200">
              Tap <span className="font-bold text-[#C6A45A]">Add</span> at the top right. Launch from your home screen!
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={() => handleDismiss(true)}
            className="text-[11px] text-slate-400 hover:text-slate-200 font-medium cursor-pointer"
          >
            Don't show again
          </button>
          <button
            type="button"
            onClick={() => handleDismiss(false)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C6A45A] to-[#D4AF37] hover:from-[#d4af37] hover:to-[#e0b865] text-[#0c1626] font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Got It</span>
          </button>
        </div>
      </div>
    </div>
  );
};
