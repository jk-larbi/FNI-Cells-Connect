import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCall } from '../../context/CallContext';
import { useBackHandler } from '../../hooks/useBackHandler';
import { CallSignalingService } from '../../services/callSignalingService';
import { CallHistoryRecord, CallType } from '../../types/calling';
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Video,
  Clock,
  Calendar,
  RotateCcw,
  Search,
  Filter,
  User,
  Shield,
  Plus,
  ArrowLeft,
} from 'lucide-react';
import { CreateMeetingModal } from './CreateMeetingModal';

interface CallHistoryViewProps {
  onBack?: () => void;
}

export const CallHistoryView: React.FC<CallHistoryViewProps> = ({ onBack }) => {
  const { currentUser } = useAuth();
  const { startDirectCall } = useCall();
  const [history, setHistory] = useState<CallHistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'missed' | 'incoming' | 'outgoing'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);

  // Back handler support
  useBackHandler(() => {
    if (isMeetingModalOpen) {
      setIsMeetingModalOpen(false);
      return true;
    }
    if (onBack) {
      onBack();
      return true;
    }
    return false;
  }, Boolean(isMeetingModalOpen || onBack));

  useEffect(() => {
    if (currentUser?.id) {
      loadHistory();
    }
  }, [currentUser?.id]);

  const loadHistory = async () => {
    if (!currentUser?.id) return;
    setIsLoading(true);
    try {
      const records = await CallSignalingService.getCallHistory(currentUser.id);
      setHistory(records);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredHistory = history.filter(record => {
    if (filter !== 'all' && record.direction !== filter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        record.peer_name.toLowerCase().includes(q) ||
        (record.peer_cell && record.peer_cell.toLowerCase().includes(q)) ||
        (record.room_title && record.room_title.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const handleRedial = (record: CallHistoryRecord, callType?: CallType) => {
    if (!record.peer_id) return;
    startDirectCall(
      {
        id: record.peer_id,
        name: record.peer_name,
        avatar: record.peer_avatar,
        cell: record.peer_cell,
      },
      callType || record.call_type
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-5xl mx-auto">
      {/* Top Header */}
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#667085] hover:text-[#142B4A] dark:text-slate-400 dark:hover:text-white cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 text-[#C6A45A] group-hover:-translate-x-1 transition-transform" />
          <span>Back to Previous</span>
        </button>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-[#142B4A] dark:text-white tracking-tight">
              Call & Meeting History
            </h1>
            <span className="text-xs bg-[#142B4A]/10 dark:bg-white/10 text-[#142B4A] dark:text-slate-200 px-2.5 py-0.5 rounded-full font-bold">
              {history.length} records
            </span>
          </div>
          <p className="text-xs text-[#667085] dark:text-slate-400 mt-0.5">
            Logs of your one-to-one voice calls, video calls, and group fellowship meetings
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsMeetingModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#142B4A] to-[#203D63] text-white text-xs font-bold hover:shadow-md transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#C6A45A]" />
            <span>New Group Meeting</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-white/10 p-3 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filter === 'all'
                ? 'bg-white dark:bg-white/10 text-[#142B4A] dark:text-white shadow-xs'
                : 'hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilter('missed')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filter === 'missed'
                ? 'bg-rose-500 text-white shadow-xs'
                : 'hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Missed
          </button>
          <button
            type="button"
            onClick={() => setFilter('incoming')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filter === 'incoming'
                ? 'bg-white dark:bg-white/10 text-[#142B4A] dark:text-white shadow-xs'
                : 'hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Incoming
          </button>
          <button
            type="button"
            onClick={() => setFilter('outgoing')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filter === 'outgoing'
                ? 'bg-white dark:bg-white/10 text-[#142B4A] dark:text-white shadow-xs'
                : 'hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Outgoing
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name or cell..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-600"
          />
        </div>
      </div>

      {/* History List */}
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-white/10 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-xs text-slate-400">Loading call history...</div>
        ) : filteredHistory.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400 space-y-2">
            <Phone className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="font-semibold">No call records found</p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Calls made or received through FNI Cells Connect will be securely logged here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {filteredHistory.map(record => {
              const isMissed = record.direction === 'missed';
              const isIncoming = record.direction === 'incoming';
              const isOutgoing = record.direction === 'outgoing';
              const isVideo = record.call_type === 'video';

              return (
                <div
                  key={record.id}
                  className="p-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors flex items-center justify-between gap-4"
                >
                  {/* Left: Direction Icon & Peer Info */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Direction Icon Badge */}
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                        isMissed
                          ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                          : isIncoming
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
                      }`}
                    >
                      {isMissed ? (
                        <PhoneMissed className="w-5 h-5" />
                      ) : isIncoming ? (
                        <PhoneIncoming className="w-5 h-5" />
                      ) : (
                        <PhoneOutgoing className="w-5 h-5" />
                      )}
                    </div>

                    {/* Peer Details */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-bold truncate ${
                            isMissed
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {record.peer_name}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded">
                          {isVideo ? <Video className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
                          <span className="capitalize">{record.call_type}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        {record.peer_cell && (
                          <>
                            <span>{record.peer_cell}</span>
                            <span>•</span>
                          </>
                        )}
                        <span>{new Date(record.created_at).toLocaleString()}</span>
                        <span>•</span>
                        <span className="font-mono">
                          {isMissed ? 'Missed' : formatDuration(record.duration_seconds)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Quick Action Buttons (Redial) */}
                  <div className="flex items-center gap-2 shrink-0">
                    {record.peer_id && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleRedial(record, 'voice')}
                          className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                          title="Call back (Voice)"
                        >
                          <Phone className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRedial(record, 'video')}
                          className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          title="Call back (Video)"
                        >
                          <Video className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Meeting Modal */}
      {isMeetingModalOpen && (
        <CreateMeetingModal
          isOpen={isMeetingModalOpen}
          onClose={() => setIsMeetingModalOpen(false)}
        />
      )}
    </div>
  );
};
