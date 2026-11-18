import React from 'react';
import { Pin, X, ArrowRight, Trash2, Calendar, FileText, Image, Mic } from 'lucide-react';
import { useBackHandler } from '../../hooks/useBackHandler';
import { CommunityMessage, PrivateMessage } from '../../types';

export interface PinnedMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  pinnedMessages: (CommunityMessage | PrivateMessage)[];
  onSelectMessage: (messageId: string) => void;
  onUnpinMessage: (messageId: string) => void;
  canUnpin: boolean;
  conversationTitle?: string;
}

export const PinnedMessagesModal: React.FC<PinnedMessagesModalProps> = ({
  isOpen,
  onClose,
  pinnedMessages,
  onSelectMessage,
  onUnpinMessage,
  canUnpin,
  conversationTitle = 'Conversation',
}) => {
  useBackHandler(() => {
    if (isOpen) {
      onClose();
      return true;
    }
    return false;
  }, isOpen);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Pin className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Pinned Messages</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {pinnedMessages.length} pinned in {conversationTitle}
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

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {pinnedMessages.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Pin className="w-12 h-12 mx-auto mb-3 opacity-30 stroke-1" />
              <p className="text-sm font-medium">No pinned messages yet</p>
              <p className="text-xs mt-1">Pin important announcements or instructions to keep them handy.</p>
            </div>
          ) : (
            pinnedMessages.map((msg, index) => {
              const pinnedByName = (msg as any).pinnedByName || (msg as any).pinnedBy || 'Leader';
              const pinnedAt = (msg as any).pinnedAt
                ? new Date((msg as any).pinnedAt).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : new Date(msg.createdAt).toLocaleDateString();

              const hasImages = msg.attachments?.some(a => a.mimeType?.startsWith('image/'));
              const hasAudio = msg.attachments?.some(a => a.mimeType?.startsWith('audio/'));
              const hasDocs = msg.attachments?.some(a => !a.mimeType?.startsWith('image/') && !a.mimeType?.startsWith('audio/'));

              return (
                <div
                  key={msg.id}
                  className="group relative bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl p-4 border border-slate-200/80 dark:border-slate-700/60 transition-all shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center justify-center">
                        #{index + 1}
                      </span>
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-200">
                        {msg.senderName}
                      </span>
                      {msg.senderRole && (
                        <span className="px-1.5 py-0.2 text-[10px] rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 capitalize">
                          {msg.senderRole}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Message snippet */}
                  <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-3 mb-2.5">
                    {msg.content || (msg.attachments && msg.attachments.length > 0 ? 'Attachment' : '')}
                  </p>

                  {/* Attachment badges */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                      {hasImages && (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium">
                          <Image className="w-3 h-3" /> Image
                        </span>
                      )}
                      {hasAudio && (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-medium">
                          <Mic className="w-3 h-3" /> Voice Note
                        </span>
                      )}
                      {hasDocs && (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-medium">
                          <FileText className="w-3 h-3" /> Document
                        </span>
                      )}
                    </div>
                  )}

                  {/* Footer with pin meta & actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/50 text-[11px] text-slate-400">
                    <div className="flex items-center gap-1">
                      <Pin className="w-3 h-3 text-amber-500 fill-current" />
                      <span>Pinned by {pinnedByName} • {pinnedAt}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {canUnpin && (
                        <button
                          type="button"
                          onClick={() => onUnpinMessage(msg.id)}
                          className="px-2 py-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors flex items-center gap-1 font-medium"
                          title="Unpin message"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Unpin</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          onSelectMessage(msg.id);
                          onClose();
                        }}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center gap-1 font-medium"
                      >
                        <span>Jump</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-xs text-slate-400">
            Tap "Jump" to scroll directly to the message in your chat.
          </p>
        </div>
      </div>
    </div>
  );
};
