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
  <section className="mx-auto w-full max-w-5xl space-y-6">
    <header className="space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#C6A45A]">FNI Cells Connect</p>
      <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#142B4A] dark:text-white">{title}</h1>
      <p className="text-sm text-[#667085] dark:text-slate-400">{description}</p>
    </header>
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {items.map(item => {
        const Icon = item.icon;
        return (
          <button key={item.title} type="button" onClick={item.onClick}
            className="group flex min-h-28 items-center gap-4 rounded-2xl border border-[#E3E8EF] dark:border-white/10 bg-white dark:bg-[#111d2b] p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#C6A45A]/60 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#229ED9]/30">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#142B4A]/[0.06] dark:bg-white/10 text-[#142B4A] dark:text-[#C6A45A] group-hover:bg-[#142B4A] group-hover:text-white transition-colors">
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-[#182230] dark:text-white">{item.title}</span>
              <span className="mt-1 block text-xs leading-relaxed text-[#667085] dark:text-slate-400">{item.description}</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-[#98A2B3] transition-transform group-hover:translate-x-1" />
          </button>
        );
      })}
    </div>
  </section>
);
