import React from 'react';
import { ArrowRight, LucideIcon } from 'lucide-react';

export interface SectionHubItem {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
}

interface SectionHubProps {
  title: string;
  description: string;
  items: SectionHubItem[];
  className?: string;
}

export const SectionHub: React.FC<SectionHubProps> = ({ title, description, items, className = '' }) => (
  <section className={`mx-auto w-full max-w-5xl space-y-4 sm:space-y-6 ${className}`.trim()}>
    <header className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm dark:border-white/10 dark:bg-[#111d2b] sm:px-6 sm:py-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#A88743]">FNI CELLS CONNECT</p>
      <h1 className="mt-1 text-xl font-extrabold tracking-tight text-[#142B4A] dark:text-white sm:text-2xl">{title}</h1>
      <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500 dark:text-slate-400 sm:text-sm">{description}</p>
    </header>

    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-4">
      {items.map(item => {
        const Icon = item.icon;
        return (
          <button
            key={item.title}
            type="button"
            onClick={item.onClick}
            className="group flex min-h-[76px] w-full min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition-colors hover:border-[#C6A45A]/70 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#229ED9]/40 active:bg-slate-100 dark:border-white/10 dark:bg-[#111d2b] dark:hover:bg-white/[0.04] dark:active:bg-white/[0.07] sm:min-h-[104px] sm:gap-4 sm:rounded-2xl sm:p-4"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#142B4A]/[0.06] text-[#142B4A] dark:bg-white/10 dark:text-[#D9BD7A] sm:h-11 sm:w-11">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-[#182230] dark:text-white">{item.title}</span>
              <span className="mt-0.5 block text-xs leading-snug text-slate-500 dark:text-slate-400">{item.description}</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-[#A88743]" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  </section>
);
