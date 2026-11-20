import React from 'react';
import {
  X,
  MessageSquare,
  Phone,
  Video,
  Mail,
  Smartphone,
  Shield,
  Award,
  Users,
} from 'lucide-react';
import { useBackHandler } from '../../hooks/useBackHandler';

export interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    fullName: string;
    role?: string;
    avatarUrl?: string;
    bannerUrl?: string;
    cellName?: string;
    phone?: string;
    email?: string;
  } | null;
  onStartPrivateChat?: (userId: string) => void;
  onStartVoiceCall?: (userId: string) => void;
  onStartVideoCall?: (userId: string) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onStartPrivateChat,
  onStartVoiceCall,
  onStartVideoCall,
}) => {
  useBackHandler(() => {
    if (isOpen) {
      onClose();
      return true;
    }
    return false;
  }, isOpen);

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Cover banner */}
        <div
          className="h-28 relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-cover bg-center overflow-hidden transition-all duration-300"
          style={user.bannerUrl ? { backgroundImage: `url(${user.bannerUrl})` } : undefined}
        >
          {/* Subtle gradient overlay to keep icons and text clear */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/15 to-transparent pointer-events-none" />

          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 text-white/90 hover:text-white rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm transition-colors z-10 cursor-pointer"
            title="Close profile"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile info header */}
        <div className="px-6 pb-6 pt-0 relative flex flex-col items-center text-center -mt-12">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.fullName}
              className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-slate-900 shadow-lg mb-3"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 font-bold text-2xl flex items-center justify-center border-4 border-white dark:border-slate-900 shadow-lg mb-3">
              {user.fullName
                .split(' ')
                .map(n => n[0])
                .join('')
                .substring(0, 2)
                .toUpperCase() || 'U'}
            </div>
          )}

          <h3 className="text-xl font-bold text-slate-900 dark:text-white">{user.fullName}</h3>

          <div className="flex flex-wrap items-center justify-center gap-2 mt-1.5 mb-4">
            {user.role && (
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 capitalize">
                {user.role}
              </span>
            )}
            {user.cellName && (
              <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {user.cellName}
              </span>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center justify-center gap-3 w-full mb-6">
            {onStartPrivateChat && (
              <button
                type="button"
                onClick={() => {
                  onStartPrivateChat(user.id);
                  onClose();
                }}
                className="flex-1 py-2.5 px-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-1.5 active:scale-95"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Message</span>
              </button>
            )}
            {onStartVoiceCall && (
              <button
                type="button"
                onClick={() => {
                  onStartVoiceCall(user.id);
                  onClose();
                }}
                className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 transition-all active:scale-95"
                title="Start Voice Call"
              >
                <Phone className="w-5 h-5" />
              </button>
            )}
            {onStartVideoCall && (
              <button
                type="button"
                onClick={() => {
                  onStartVideoCall(user.id);
                  onClose();
                }}
                className="p-2.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 transition-all active:scale-95"
                title="Start Video Call"
              >
                <Video className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Details list */}
          <div className="w-full text-left space-y-2.5 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
            {user.email && (
              <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
                <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="truncate">{user.email}</span>
              </div>
            )}
            {user.phone && (
              <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
                <Smartphone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span>{user.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-2.5 text-slate-600 dark:text-slate-300">
              <Shield className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span>Registered FNI Fellowship Tutor</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
