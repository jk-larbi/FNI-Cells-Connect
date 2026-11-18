import React, { useState, useEffect } from 'react';
import { X, Smile, Loader2 } from 'lucide-react';
import { useBackHandler } from '../../hooks/useBackHandler';
import { MessagingService } from '../../services/messagingService';
import { MessageReactionParticipant } from '../../types';

export interface ReactionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  messageId: string;
  isCommunity: boolean;
  initialEmoji?: string;
}

export const ReactionDetailsModal: React.FC<ReactionDetailsModalProps> = ({
  isOpen,
  onClose,
  messageId,
  isCommunity,
  initialEmoji,
}) => {
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState<MessageReactionParticipant[]>([]);
  const [selectedEmoji, setSelectedEmoji] = useState<string>('all');

  useBackHandler(() => {
    if (isOpen) {
      onClose();
      return true;
    }
    return false;
  }, isOpen);

  useEffect(() => {
    if (!isOpen || !messageId) return;

    let isMounted = true;
    setLoading(true);

    MessagingService.getMessageReactionParticipants(messageId, isCommunity)
      .then(res => {
        if (!isMounted) return;
        setParticipants(res || []);
        if (initialEmoji && res.some(p => p.emoji === initialEmoji)) {
          setSelectedEmoji(initialEmoji);
        } else {
          setSelectedEmoji('all');
        }
      })
      .catch(err => {
        console.warn('Failed to load reactions:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, messageId, isCommunity, initialEmoji]);

  if (!isOpen) return null;

  // Group emojis and counts
  const emojiCounts = participants.reduce((acc, p) => {
    acc[p.emoji] = (acc[p.emoji] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const uniqueEmojis = Object.keys(emojiCounts);

  const filteredParticipants =
    selectedEmoji === 'all'
      ? participants
      : participants.filter(p => p.emoji === selectedEmoji);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Smile className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Reactions</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {participants.length} {participants.length === 1 ? 'person' : 'people'} reacted
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Reaction Filter Tabs */}
        {uniqueEmojis.length > 0 && (
          <div className="flex items-center gap-1.5 px-4 py-2.5 overflow-x-auto border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedEmoji('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 flex-shrink-0 ${
                selectedEmoji === 'all'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <span>All</span>
              <span className="opacity-80 text-[11px]">{participants.length}</span>
            </button>
            {uniqueEmojis.map(emoji => (
              <button
                key={emoji}
                type="button"
                onClick={() => setSelectedEmoji(emoji)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 flex-shrink-0 ${
                  selectedEmoji === emoji
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <span className="text-base leading-none">{emoji}</span>
                <span className="opacity-80 text-[11px]">{emojiCounts[emoji]}</span>
              </button>
            ))}
          </div>
        )}

        {/* Participants List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
              <p className="text-xs">Loading reactions...</p>
            </div>
          ) : filteredParticipants.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              No reactions found
            </div>
          ) : (
            filteredParticipants.map((p, idx) => {
              const name = p.userName || (p as any).user_name || 'Member';
              const avatar = p.avatarUrl || (p as any).avatar_url;
              const role = p.role;
              const time = p.createdAt || (p as any).created_at
                ? new Date(p.createdAt || (p as any).created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';

              return (
                <div
                  key={`${p.userId || (p as any).user_id}-${p.emoji}-${idx}`}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {avatar ? (
                      <img
                        src={avatar}
                        alt={name}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 font-semibold flex items-center justify-center text-sm border border-blue-200 dark:border-blue-800">
                        {name
                          .split(' ')
                          .map((n: string) => n[0])
                          .join('')
                          .substring(0, 2)
                          .toUpperCase() || 'U'}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {name}
                        </span>
                        {role && (
                          <span className="px-1.5 py-0.2 text-[10px] rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 capitalize">
                            {role}
                          </span>
                        )}
                      </div>
                      {time && <p className="text-[11px] text-slate-400">{time}</p>}
                    </div>
                  </div>

                  <span className="text-2xl" title={p.emoji}>
                    {p.emoji}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
