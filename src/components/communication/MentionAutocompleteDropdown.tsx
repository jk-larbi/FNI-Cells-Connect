import React, { useEffect, useState, useRef } from 'react';
import { User, Shield, Award } from 'lucide-react';

export interface MentionUser {
  id: string;
  fullName: string;
  role?: string;
  avatarUrl?: string;
  cellName?: string;
}

export interface MentionAutocompleteDropdownProps {
  isOpen: boolean;
  query: string;
  users: MentionUser[];
  onSelect: (user: MentionUser) => void;
  onClose: () => void;
}

export const MentionAutocompleteDropdown: React.FC<MentionAutocompleteDropdownProps> = ({
  isOpen,
  query,
  users,
  onSelect,
  onClose,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const cleanQuery = query.toLowerCase().trim();
  const filteredUsers = users
    .filter(u => !cleanQuery || u.fullName.toLowerCase().includes(cleanQuery))
    .slice(0, 8); // Top 8 matches

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(filteredUsers.length, 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + Math.max(filteredUsers.length, 1)) % Math.max(filteredUsers.length, 1));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        if (filteredUsers.length > 0) {
          e.preventDefault();
          onSelect(filteredUsers[selectedIndex] || filteredUsers[0]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredUsers, selectedIndex, onSelect, onClose]);

  if (!isOpen || filteredUsers.length === 0) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute bottom-full left-0 right-0 mb-2 max-h-60 overflow-y-auto rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in slide-in-from-bottom-2 duration-150"
    >
      <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
        <span>Mention Member (@)</span>
        <span className="text-[10px] text-slate-400">↑↓ to navigate, Enter to choose</span>
      </div>
      <div className="py-1">
        {filteredUsers.map((user, idx) => {
          const isSelected = idx === selectedIndex;
          return (
            <button
              key={user.id}
              type="button"
              onClick={() => onSelect(user)}
              onMouseEnter={() => setSelectedIndex(idx)}
              className={`w-full px-3 py-2 flex items-center gap-3 text-left transition-colors ${
                isSelected
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200'
              }`}
            >
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.fullName}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-slate-200 dark:border-slate-700"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 font-semibold flex items-center justify-center text-xs flex-shrink-0 border border-blue-200 dark:border-blue-800">
                  {user.fullName
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase() || 'U'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold truncate">{user.fullName}</span>
                  {user.role && (
                    <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {user.role}
                    </span>
                  )}
                </div>
                {user.cellName && (
                  <p className="text-xs text-slate-400 truncate">{user.cellName}</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
