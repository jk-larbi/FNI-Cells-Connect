import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCall } from '../../context/CallContext';
import { useBackHandler } from '../../hooks/useBackHandler';
import { CallHistoryView } from '../calling/CallHistoryView';
import {
  Settings,
  Phone,
  Video,
  Mic,
  Camera,
  Volume2,
  Users,
  Bell,
  Shield,
  UserX,
  Bookmark,
  X,
  Search,
  MessageSquare,
  Check,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../common/Button';

export interface CommunicationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTutor?: (tutorId: string) => void;
  onOpenSavedMessages?: () => void;
  tutorList?: any[];
}

export const CommunicationSettingsModal: React.FC<CommunicationSettingsModalProps> = ({
  isOpen,
  onClose,
  onSelectTutor,
  onOpenSavedMessages,
  tutorList = [],
}) => {
  const { currentUser } = useAuth();
  const { startDirectCall } = useCall();

  const [activeTab, setActiveTab] = useState<
    'directory' | 'call-settings' | 'call-history' | 'notifications' | 'privacy' | 'blocked' | 'saved'
  >('directory');

  // Directory search
  const [directorySearch, setDirectorySearch] = useState('');

  // Call Settings preferences (stored in localStorage)
  const [micEnabled, setMicEnabled] = useState(() => {
    return localStorage.getItem('fni_pref_mic_enabled') !== 'false';
  });
  const [camEnabled, setCamEnabled] = useState(() => {
    return localStorage.getItem('fni_pref_cam_enabled') !== 'false';
  });
  const [callRingtone, setCallRingtone] = useState(() => {
    return localStorage.getItem('fni_pref_ringtone') || 'chime';
  });

  // Notifications preferences
  const [chatSounds, setChatSounds] = useState(() => {
    return localStorage.getItem('fni_pref_chat_sounds') !== 'false';
  });
  const [pushAlerts, setPushAlerts] = useState(() => {
    return localStorage.getItem('fni_pref_push_alerts') !== 'false';
  });

  // Privacy preferences
  const [showOnlineStatus, setShowOnlineStatus] = useState(() => {
    return localStorage.getItem('fni_pref_show_online') !== 'false';
  });
  const [sendReadReceipts, setSendReadReceipts] = useState(() => {
    return localStorage.getItem('fni_pref_read_receipts') !== 'false';
  });

  // Blocked users
  const [blockedUsers, setBlockedUsers] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('fni_blocked_users') || '[]');
    } catch {
      return [];
    }
  });

  // Back button handler
  useBackHandler(() => {
    if (isOpen) {
      onClose();
      return true;
    }
    return false;
  }, isOpen);

  // Save preferences handlers
  const toggleMicPref = () => {
    const val = !micEnabled;
    setMicEnabled(val);
    localStorage.setItem('fni_pref_mic_enabled', String(val));
  };

  const toggleCamPref = () => {
    const val = !camEnabled;
    setCamEnabled(val);
    localStorage.setItem('fni_pref_cam_enabled', String(val));
  };

  const toggleChatSounds = () => {
    const val = !chatSounds;
    setChatSounds(val);
    localStorage.setItem('fni_pref_chat_sounds', String(val));
  };

  const togglePushAlerts = () => {
    const val = !pushAlerts;
    setPushAlerts(val);
    localStorage.setItem('fni_pref_push_alerts', String(val));
  };

  const toggleOnlineStatus = () => {
    const val = !showOnlineStatus;
    setShowOnlineStatus(val);
    localStorage.setItem('fni_pref_show_online', String(val));
  };

  const toggleReadReceipts = () => {
    const val = !sendReadReceipts;
    setSendReadReceipts(val);
    localStorage.setItem('fni_pref_read_receipts', String(val));
  };

  const handleUnblockUser = (userId: string) => {
    const updated = blockedUsers.filter((u: any) => u.id !== userId);
    setBlockedUsers(updated);
    localStorage.setItem('fni_blocked_users', JSON.stringify(updated));
  };

  if (!isOpen) return null;

  const filteredDirectory = tutorList.filter((t: any) => {
    if (!directorySearch.trim()) return true;
    const q = directorySearch.toLowerCase();
    const name = (t.full_name || t.name || '').toLowerCase();
    const cell = (t.cell_name || '').toLowerCase();
    const role = (t.role || '').toLowerCase();
    return name.includes(q) || cell.includes(q) || role.includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-navy-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[92vh] rounded-3xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/10 flex items-center justify-between bg-slate-50/60 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Communication Settings & Directory
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage your tutor contacts, calling preferences, history, and privacy
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="px-6 py-2.5 border-b border-slate-100 dark:border-white/5 bg-white dark:bg-[#0f172a] flex items-center gap-2 overflow-x-auto custom-scrollbar shrink-0 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('directory')}
            className={`px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'directory'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Tutor Directory</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/15 dark:bg-white/20">
              {tutorList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('call-settings')}
            className={`px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'call-settings'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Call Settings</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('call-history')}
            className={`px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'call-history'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Call History</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('saved')}
            className={`px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'saved'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Saved Messages</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            className={`px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'notifications'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Notifications</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={`px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'privacy'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Privacy</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('blocked')}
            className={`px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'blocked'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <UserX className="w-3.5 h-3.5" />
            <span>Blocked ({blockedUsers.length})</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-50/50 dark:bg-[#0c1421]">
          {/* 1. TUTOR DIRECTORY & CONTACT MANAGEMENT */}
          {activeTab === 'directory' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={directorySearch}
                    onChange={e => setDirectorySearch(e.target.value)}
                    placeholder="Search tutors by name, cell or role..."
                    className="w-full pl-9 pr-4 py-2 rounded-2xl bg-white dark:bg-[#182533] border border-slate-200 dark:border-white/10 text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <span className="text-xs text-slate-500 self-center">
                  Showing {filteredDirectory.length} active registered tutors
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredDirectory.map((tutor: any) => {
                  const name = tutor.full_name || tutor.name || 'FNI Tutor';
                  const cell = tutor.cell_name || tutor.cell || 'Unassigned Cell';
                  const role = tutor.role === 'admin' ? 'Administrator' : 'Cell Leader (Tutor)';
                  const isOnline = tutor.is_active || false;

                  return (
                    <div
                      key={tutor.id}
                      className="p-4 rounded-2xl bg-white dark:bg-[#182533] border border-slate-200/80 dark:border-white/5 shadow-2xs hover:shadow-md transition-all flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <div className="w-12 h-12 rounded-full bg-[#142B4A] text-[#C6A45A] font-bold text-sm flex items-center justify-center overflow-hidden border border-slate-200 dark:border-white/10">
                            {tutor.avatar_url ? (
                              <img src={tutor.avatar_url} alt={name} className="w-full h-full object-cover" />
                            ) : (
                              name.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          {isOnline && (
                            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-[#182533]" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                            {name}
                          </h4>
                          <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium truncate">
                            {cell}
                          </p>
                          <span className="inline-block mt-0.5 text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                            {role}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            if (onSelectTutor) {
                              onSelectTutor(tutor.id);
                              onClose();
                            }
                          }}
                          className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-300 transition-colors cursor-pointer"
                          title="Message Tutor"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            startDirectCall({
                              id: tutor.id,
                              name,
                              avatar: tutor.avatar_url,
                              cell,
                            }, 'voice');
                            onClose();
                          }}
                          className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300 transition-colors cursor-pointer"
                          title="Voice Call"
                        >
                          <Phone className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            startDirectCall({
                              id: tutor.id,
                              name,
                              avatar: tutor.avatar_url,
                              cell,
                            }, 'video');
                            onClose();
                          }}
                          className="p-2 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 text-purple-600 dark:text-purple-300 transition-colors cursor-pointer"
                          title="Video Call"
                        >
                          <Video className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. CALL SETTINGS */}
          {activeTab === 'call-settings' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="p-5 rounded-3xl bg-white dark:bg-[#182533] border border-slate-200/80 dark:border-white/5 space-y-4">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Mic className="w-4 h-4 text-blue-600" />
                  <span>Microphone & Audio Preferences</span>
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] cursor-pointer">
                    <div>
                      <span className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-200 block">
                        Start Calls with Microphone Unmuted
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Automatically activate your mic when answering or joining a call
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={micEnabled}
                      onChange={toggleMicPref}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] cursor-pointer">
                    <div>
                      <span className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-200 block">
                        Start Video Calls with Camera Enabled
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Turn camera on by default for high-definition video fellowship
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={camEnabled}
                      onChange={toggleCamPref}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-white dark:bg-[#182533] border border-slate-200/80 dark:border-white/5 space-y-4">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-blue-600" />
                  <span>Incoming Call Sound & Ringtone</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'chime', name: 'Celestial Chime', desc: 'Default FNI harmonious chime' },
                    { id: 'classic', name: 'Gentle Ring', desc: 'Soft bell tone' },
                    { id: 'modern', name: 'FNI Echo', desc: 'Clean modern pulse' },
                  ].map(rt => (
                    <button
                      key={rt.id}
                      type="button"
                      onClick={() => {
                        setCallRingtone(rt.id);
                        localStorage.setItem('fni_pref_ringtone', rt.id);
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        callRingtone === rt.id
                          ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-xs'
                          : 'border-slate-200 dark:border-white/10 hover:border-slate-300'
                      }`}
                    >
                      <span className="font-bold text-xs block mb-1">{rt.name}</span>
                      <span className="text-[10px] text-slate-500 block">{rt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 3. CALL HISTORY */}
          {activeTab === 'call-history' && (
            <div className="space-y-4">
              <CallHistoryView />
            </div>
          )}

          {/* 4. SAVED MESSAGES */}
          {activeTab === 'saved' && (
            <div className="max-w-xl mx-auto p-6 rounded-3xl bg-white dark:bg-[#182533] border border-slate-200/80 dark:border-white/5 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                <Bookmark className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Personal Saved Messages & Notes
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Keep scripture notes, prayer requests, personal reminders, and forwarded messages safe in your cloud storage.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenSavedMessages) {
                      onOpenSavedMessages();
                    } else if (onSelectTutor) {
                      onSelectTutor('saved_messages');
                    }
                    onClose();
                  }}
                  className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-transform active:scale-95 inline-flex items-center gap-2 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Open Saved Messages Notebook</span>
                </button>
              </div>
            </div>
          )}

          {/* 5. NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="p-5 rounded-3xl bg-white dark:bg-[#182533] border border-slate-200/80 dark:border-white/5 space-y-3">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Bell className="w-4 h-4 text-blue-600" />
                  <span>Alerts & Sounds</span>
                </h3>

                <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] cursor-pointer">
                  <div>
                    <span className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-200 block">
                      In-App Message Audio Alerts
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Play audio chime when receiving messages in active conversations
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={chatSounds}
                    onChange={toggleChatSounds}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] cursor-pointer">
                  <div>
                    <span className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-200 block">
                      Push Notifications for Direct Messages
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Receive alerts on your device even when FNI Cells Connect is in background
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={pushAlerts}
                    onChange={togglePushAlerts}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                </label>
              </div>
            </div>
          )}

          {/* 6. PRIVACY & VISIBILITY */}
          {activeTab === 'privacy' && (
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="p-5 rounded-3xl bg-white dark:bg-[#182533] border border-slate-200/80 dark:border-white/5 space-y-3">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span>Online Presence & Receipts</span>
                </h3>

                <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] cursor-pointer">
                  <div>
                    <span className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-200 block">
                      Share Online & Last Seen Status
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Allow other cell leaders and administration to see when you are active
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={showOnlineStatus}
                    onChange={toggleOnlineStatus}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] cursor-pointer">
                  <div>
                    <span className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-200 block">
                      Send Read Receipts
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Show double blue checkmarks when you have read messages
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={sendReadReceipts}
                    onChange={toggleReadReceipts}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                </label>
              </div>
            </div>
          )}

          {/* 7. BLOCKED USERS */}
          {activeTab === 'blocked' && (
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="p-5 rounded-3xl bg-white dark:bg-[#182533] border border-slate-200/80 dark:border-white/5 space-y-3">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <UserX className="w-4 h-4 text-rose-500" />
                  <span>Blocked Users</span>
                </h3>

                {blockedUsers.length === 0 ? (
                  <div className="py-8 text-center text-slate-400">
                    <p className="text-xs">You have not blocked any users.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {blockedUsers.map((u: any) => (
                      <div
                        key={u.id}
                        className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] flex items-center justify-between"
                      >
                        <div>
                          <p className="font-bold text-xs text-slate-900 dark:text-white">{u.name}</p>
                          <p className="text-[10px] text-slate-400">{u.reason || 'Blocked contact'}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUnblockUser(u.id)}
                          className="px-3 py-1 rounded-xl bg-slate-200 dark:bg-white/10 text-xs font-semibold hover:bg-slate-300"
                        >
                          Unblock
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
