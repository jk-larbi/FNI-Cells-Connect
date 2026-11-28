import React from 'react';
import {
  ArrowRight, BarChart3, Bell, CircleHelp, ClipboardList,
  GraduationCap, History, Settings2, ShieldCheck, Users, Wallet,
} from 'lucide-react';
import { AppNavTab } from '../../types';

type AdminSettingsTab = 'system' | 'security' | 'audit';

interface MoreSettingsViewProps {
  onNavigate: (tab: AppNavTab) => void;
  onOpenAdminSettings: (tab: AdminSettingsTab) => void;
  onOpenHelp: () => void;
}

interface MoreAction {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}

const ActionRow: React.FC<{ item: MoreAction }> = ({ item }) => {
  const Icon = item.icon;
  return (
    <button type="button" onClick={item.onClick}
      className="group flex min-h-[76px] w-full items-center gap-3 border-b border-[#DCE3EC] bg-white px-4 py-3 text-left transition-colors hover:bg-[#F7F9FC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#8E6C23] last:border-b-0 sm:rounded-xl sm:border sm:px-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E4ECF7] text-[#142842]">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-[#142842]">{item.title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-[#5A6B7C]">{item.description}</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-[#8E6C23] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </button>
  );
};

const ActionGroup: React.FC<{ title: string; items: MoreAction[] }> = ({ title, items }) => (
  <section className="space-y-2.5">
    <h2 className="px-1 font-['Libre_Franklin'] text-xs font-bold uppercase tracking-[0.12em] text-[#8E6C23]">{title}</h2>
    <div className="overflow-hidden rounded-xl border border-[#DCE3EC] bg-white sm:grid sm:grid-cols-2 sm:gap-0 sm:overflow-visible sm:rounded-none sm:border-0 sm:bg-transparent">
      {items.map(item => <ActionRow key={item.title} item={item} />)}
    </div>
  </section>
);

export const MoreSettingsView: React.FC<MoreSettingsViewProps> = ({ onNavigate, onOpenAdminSettings, onOpenHelp }) => {
  const ministryItems: MoreAction[] = [
    { title: 'Cell leaders', description: 'Review leaders, assignments and reporting activity.', icon: Users, onClick: () => onNavigate('cell-leaders') },
    { title: 'Evangelism & follow-ups', description: 'Manage outreach records and follow-up progress.', icon: ClipboardList, onClick: () => onNavigate('evangelism') },
    { title: 'Offering ledger', description: 'Review recorded offerings and finance summaries.', icon: Wallet, onClick: () => onNavigate('finance') },
  ];
  const administrationItems: MoreAction[] = [
    { title: 'Ministry settings', description: 'Manage ministry vision, mission and central targets.', icon: Settings2, onClick: () => onOpenAdminSettings('system') },
    { title: 'Reporting & deadlines', description: 'Configure cell meeting and evangelism report cutoffs.', icon: ClipboardList, onClick: () => onNavigate('report-deadlines') },
    { title: 'Security & audit', description: 'Manage administrator security and account protections.', icon: ShieldCheck, onClick: () => onOpenAdminSettings('security') },
    { title: 'Audit trail', description: 'Review recorded administrator and system actions.', icon: History, onClick: () => onOpenAdminSettings('audit') },
    { title: 'Help & support', description: 'Find help, support information and app guidance.', icon: CircleHelp, onClick: onOpenHelp },
  ];
  const workspaceItems: MoreAction[] = [
    { title: 'Learning Portal', description: 'Assignments, quizzes, participation and grades.', icon: GraduationCap, onClick: () => onNavigate('learning-portal') },
    { title: 'Analytics', description: 'Review ministry activity and progress analytics.', icon: BarChart3, onClick: () => onNavigate('analytics') },
    { title: 'Notifications', description: 'Open important alerts and recent updates.', icon: Bell, onClick: () => onNavigate('notifications') },
  ];
  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 pb-4">
      <header className="border-b border-[#DCE3EC] pb-4 sm:rounded-xl sm:border sm:bg-white sm:px-6 sm:py-5">
        <p className="font-['Libre_Franklin'] text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8E6C23]">FNI CELLS CONNECT</p>
        <h1 className="mt-1 font-['Libre_Franklin'] text-2xl font-bold tracking-tight text-[#142842] sm:text-[28px]">More</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#5A6B7C]">Ministry tools, leadership, and workspace settings.</p>
      </header>
      <ActionGroup title="Ministry" items={ministryItems} />
      <ActionGroup title="Administration" items={administrationItems} />
      <ActionGroup title="Workspace" items={workspaceItems} />
    </main>
  );
};
