import React, { useState } from 'react';
import {
  Forward,
  X,
  Search,
  Users,
  User,
  Check,
  Loader2,
  Quote,
} from 'lucide-react';
import { useBackHandler } from '../../hooks/useBackHandler';
import { CommunityMessage, PrivateMessage } from '../../types';

export interface ForwardDestination {
  type: 'community' | 'private';
  id: string;
  name: string;
  role?: string;
  avatarUrl?: string;
  cellName?: string;
}

export interface ForwardMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: CommunityMessage | PrivateMessage | null;
  onForwardToTarget: (target: ForwardDestination) => Promise<void>;
  tutorList?: any[];
}

export const ForwardMessageModal: React.FC<ForwardMessageModalProps> = ({
  isOpen,
  onClose,
  message,
  onForwardToTarget,
  tutorList = [],
}) => {
  const [search, setSearch] = useState('');
  const [selectedTarget, setSelectedTarget] = useState<ForwardDestination | null>(null);
  const [forwarding, setForwarding] = useState(false);

  useBackHandler(() => {
    if (isOpen) {
      onClose();
      return true;
    }
    return false;
  }, isOpen);

  if (!isOpen || !message) return null;

  // Only show real, supplied tutor destinations. The former hard-coded
  // "themelios-community" target was not a real Supabase group identifier.
  const destinations: ForwardDestination[] = [
    ...tutorList.map(t => ({
      type: 'private' as const,
      id: t.id,
      name: t.name || t.fullName || 'Tutor',
      role: t.role || 'tutor',
      avatarUrl: t.photoUrl || t.avatarUrl,
      cellName: t.cellName,
    })),
  ];

  const filtered = destinations.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.cellName && d.cellName.toLowerCase().includes(search.toLowerCase()))
  );

  const handleForward = async () => {
    if (!selectedTarget) return;
    try {
      setForwarding(true);
      await onForwardToTarget(selectedTarget);
      onClose();
    } catch (err) {
      console.warn('Forward failed:', err);
    } finally {
      setForwarding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Forward className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Forward Message</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Share with tutors or community</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message preview snippet */}
        <div className="p-4 bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
            <Quote className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-blue-600 dark:text-blue-400 mb-0.5">{message.senderName}</p>
              <p className="line-clamp-2 text-slate-700 dark:text-slate-300">{message.content || 'Attachment'}</p>
            </div>
          </div>
        </div>

        {/* Search Input */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search chat or tutor..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-slate-100 dark:bg-slate-800/80 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
            />
          </div>
        </div>

        {/* Destination List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No matching chats or tutors found.
            </div>
          ) : (
            filtered.map(dest => {
              const isSelected = selectedTarget?.id === dest.id && selectedTarget?.type === dest.type;
              return (
                <button
                  key={`${dest.type}-${dest.id}`}
                  type="button"
                  onClick={() => setSelectedTarget(dest)}
                  className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition-colors ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {dest.type === 'community' ? (
                      <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Users className="w-5 h-5" />
                      </div>
                    ) : dest.avatarUrl ? (
                      <img
                        src={dest.avatarUrl}
                        alt={dest.name}
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-slate-200 dark:border-slate-700"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold flex items-center justify-center text-xs flex-shrink-0">
                        {dest.name
                          .split(' ')
                          .map(n => n[0])
                          .join('')
                          .substring(0, 2)
                          .toUpperCase() || 'U'}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {dest.name}
                        </p>
                        {dest.role && (
                          <span className="px-1.5 py-0.2 text-[10px] rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 capitalize">
                            {dest.role}
                          </span>
                        )}
                      </div>
                      {dest.cellName && (
                        <p className="text-xs text-slate-400 truncate">{dest.cellName}</p>
                      )}
                    </div>
                  </div>

                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ml-2 ${
                    isSelected
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-slate-300 dark:border-slate-600'
                  }`}>
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selectedTarget || forwarding}
            onClick={handleForward}
            className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm"
          >
            {forwarding && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Forward Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};
