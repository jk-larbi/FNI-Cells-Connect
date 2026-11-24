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
}

export const SectionHub: React.FC<SectionHubProps> = ({ title, description, items }) => (
  <section className="mx-auto w-full max-w-5xl space-y-4 sm:space-y-6">
    <div className="space-y-1.5 rounded-2xl bg-[#142B4A] px-4 py-4 sm:bg-transparent sm:px-0 sm:py-0">
      <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.16em] text-[#D9BD7A] sm:text-[#C6A45A]">FNI Cells Connect</p>
      <h1 className="text-xl sm:text-3xl font-black tracking-tight text-white sm:text-[#142B4A] sm:dark:text-white">{title}</h1>
      <p className="text-xs sm:text-sm text-white/75 sm:text-[#667085] sm:dark:text-slate-400">{description}</p>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-3">
      {items.map(item => {
        const Icon = item.icon;
        return (
          <button key={item.title} type="button" onClick={item.onClick}
            className="group flex min-h-[76px] sm:min-h-28 items-center gap-3 sm:gap-4 rounded-2xl border border-[#E3E8EF] dark:border-white/10 bg-white dark:bg-[#111d2b] p-3 sm:p-4 text-left shadow-sm transition-colors hover:border-[#C6A45A]/60 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#229ED9]/30 active:bg-slate-50 dark:active:bg-white/5">
            <span className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-[#142B4A]/[0.06] dark:bg-white/10 text-[#142B4A] dark:text-[#C6A45A] group-hover:bg-[#142B4A] group-hover:text-white transition-colors">
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-[#182230] dark:text-white">{item.title}</span>
              <span className="mt-0.5 sm:mt-1 block text-[11px] sm:text-xs leading-snug sm:leading-relaxed text-[#667085] dark:text-slate-400">{item.description}</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-[#98A2B3] transition-transform group-hover:translate-x-1" />
          </button>
        );
      })}
    </div>
  </section>
);
