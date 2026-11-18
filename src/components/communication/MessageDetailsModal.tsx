import React from 'react';
import {
  Info,
  X,
  Clock,
  Check,
  CheckCheck,
  Edit2,
  Pin,
  Smile,
  Copy,
  Forward,
  User,
  Paperclip,
} from 'lucide-react';
import { useBackHandler } from '../../hooks/useBackHandler';
import { CommunityMessage, PrivateMessage } from '../../types';

export interface MessageDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: CommunityMessage | PrivateMessage | null;
  isOutgoing: boolean;
  onForward?: (msg: CommunityMessage | PrivateMessage) => void;
  onCopy?: (text: string) => void;
}

export const MessageDetailsModal: React.FC<MessageDetailsModalProps> = ({
  isOpen,
  onClose,
  message,
  isOutgoing,
  onForward,
  onCopy,
}) => {
  useBackHandler(() => {
    if (isOpen) {
      onClose();
      return true;
    }
    return false;
  }, isOpen);

  if (!isOpen || !message) return null;

  const sentDate = new Date(message.createdAt);
  const formattedSentDate = sentDate.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedSentTime = sentDate.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const isPrivate = 'recipientUid' in message;
  const isRead = isPrivate ? (message as PrivateMessage).isRead : undefined;
  const readAt = isPrivate && (message as PrivateMessage).readAt
    ? new Date((message as PrivateMessage).readAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : undefined;

  const isPinned = Boolean(message.isPinned);
  const pinnedBy = (message as any).pinnedByName || (message as any).pinnedBy;
  const pinnedAt = (message as any).pinnedAt
    ? new Date((message as any).pinnedAt).toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : undefined;

  const editedAt = message.editedAt
    ? new Date(message.editedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : undefined;

  const totalReactions = message.reactions
    ? Object.values(message.reactions).reduce((acc, arr) => acc + (arr?.length || 0), 0)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Message Info</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Telegram-style details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Message Preview Bubble */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3.5 border border-slate-200/80 dark:border-slate-700/60">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {message.senderName}
              </span>
              {message.senderRole && (
                <span className="px-1.5 py-0.2 text-[10px] rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 capitalize">
                  {message.senderRole}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words">
              {message.content}
            </p>
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex items-center gap-1.5 text-xs text-slate-500">
                <Paperclip className="w-3.5 h-3.5" />
                <span>{message.attachments.length} attachment(s)</span>
              </div>
            )}
          </div>

          {/* Details List */}
          <div className="space-y-3 divide-y divide-slate-100 dark:divide-slate-800 text-sm">
            {/* Sent Timestamp */}
            <div className="pt-3 first:pt-0 flex items-start gap-3">
              <Clock className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-slate-400">Sent</p>
                <p className="font-medium text-slate-800 dark:text-slate-200">
                  {formattedSentTime} • {formattedSentDate}
                </p>
              </div>
            </div>

            {/* Read / Delivered Status */}
            {isPrivate && (
              <div className="pt-3 flex items-start gap-3">
                {isRead ? (
                  <CheckCheck className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                ) : (
                  <Check className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="text-xs text-slate-400">Read Status</p>
                  <p className="font-medium text-slate-800 dark:text-slate-200">
                    {isRead ? (readAt ? `Read at ${readAt}` : 'Read by recipient') : 'Delivered'}
                  </p>
                </div>
              </div>
            )}

            {/* Edited Info */}
            {editedAt && (
              <div className="pt-3 flex items-start gap-3">
                <Edit2 className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-slate-400">Edited</p>
                  <p className="font-medium text-slate-800 dark:text-slate-200">
                    Modified at {editedAt}
                  </p>
                </div>
              </div>
            )}

            {/* Pin Info */}
            {isPinned && (
              <div className="pt-3 flex items-start gap-3">
                <Pin className="w-4 h-4 text-amber-500 fill-current mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-slate-400">Pinned</p>
                  <p className="font-medium text-slate-800 dark:text-slate-200">
                    Pinned {pinnedBy ? `by ${pinnedBy}` : ''} {pinnedAt ? `on ${pinnedAt}` : ''}
                  </p>
                </div>
              </div>
            )}

            {/* Reactions Summary */}
            {totalReactions > 0 && (
              <div className="pt-3 flex items-start gap-3">
                <Smile className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-slate-400">Reactions ({totalReactions})</p>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {Object.entries(message.reactions || {}).map(([emoji, userNames]) => (
                      <span
                        key={emoji}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                      >
                        <span className="text-sm">{emoji}</span>
                        <span>{userNames?.length || 0}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          {onCopy && (
            <button
              type="button"
              onClick={() => {
                onCopy(message.content);
                onClose();
              }}
              className="flex-1 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Text</span>
            </button>
          )}
          {onForward && (
            <button
              type="button"
              onClick={() => {
                onForward(message);
                onClose();
              }}
              className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Forward className="w-3.5 h-3.5" />
              <span>Forward</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
