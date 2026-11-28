import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { useAuth } from '../../context/AuthContext';
import { useCall } from '../../context/CallContext';
import { useBackHandler } from '../../hooks/useBackHandler';
import { MessagingService, GroupChatSummary, GroupChatMessage } from '../../services/messagingService';
import { supabase } from '../../lib/supabase';
import { CallHistoryView } from '../calling/CallHistoryView';
import { CommunicationSettingsModal } from './CommunicationSettingsModal';
import { MentionAutocompleteDropdown, MentionUser } from './MentionAutocompleteDropdown';
import { PinnedMessagesModal } from './PinnedMessagesModal';
import { ReactionDetailsModal } from './ReactionDetailsModal';
import { MessageDetailsModal } from './MessageDetailsModal';
import { ForwardMessageModal, ForwardDestination } from './ForwardMessageModal';
import { UserProfileModal } from './UserProfileModal';
import { OfficialGroupManagementModal } from './OfficialGroupManagementModal';
import { GroupInfoModal } from './GroupInfoModal';
import { StickerCreatorModal } from './StickerCreatorModal';
import { ChatFolderModal, FOLDER_ICONS, FOLDER_COLORS } from './ChatFolderModal';
import { IosEmojiPicker } from './IosEmojiPicker';
import { useVisualViewport } from '../../hooks/useVisualViewport';
import { ConversationCacheService } from '../../services/conversationCacheService';
import { getContrastingTextColor } from '../../utils/imageUtils';
import {
  PrivateMessage,
  CommunityMessage,
  MessageReply,
  ChatAttachment,
  ChatPoll,
  UserPinnedChat,
  CommunityGroup,
  CustomSticker,
  ChatFolder,
} from '../../types';
import {
  Folder,
  MessageSquare,
  Users,
  Send,
  Lock,
  Clock,
  CheckCheck,
  Check,
  AlertCircle,
  Plus,
  ArrowLeft,
  Reply,
  Smile,
  X,
  CornerDownRight,
  MoreVertical,
  Pin,
  Download,
  Paperclip,
  Search,
  Mic,
  Square,
  Phone,
  Video,
  Play,
  Pause,
  Camera,
  BarChart2,
  Bookmark,
  Share2,
  Trash2,
  Edit3,
  ChevronDown,
  Volume2,
  Repeat,
  Image as ImageIcon,
  FileText,
  Music,
  CheckCircle2,
  Settings,
  HelpCircle,
  UserX,
  Shield,
  Copy,
  Forward,
  Info,
  ArrowUp,
  ArrowDown,
  ShieldCheck,
  List,
  ChevronLeft,
  User,
  SquarePen,
  Menu,
  Delete as BackspaceIcon,
} from 'lucide-react';
import { Button } from '../common/Button';

export interface MessagingViewProps {
  initialConversationId?: string;
  initialTab?: 'private' | 'community';
  onBack?: () => void;
  onMobileChatStateChange?: (isChatOpen: boolean) => void;
  onToggleSidebar?: () => void;
}

// FNI quick stickers
const STICKER_PACK = [
  { emoji: '🙏', label: 'Praying' },
  { emoji: '❤️', label: 'Love' },
  { emoji: '🙌', label: 'Praise' },
  { emoji: '🔥', label: 'On Fire' },
  { emoji: '💡', label: 'Truth' },
  { emoji: '💪', label: 'Strength' },
  { emoji: '🕊️', label: 'Peace' },
  { emoji: '🎉', label: 'Celebrate' },
  { emoji: '👏', label: 'Well Done' },
  { emoji: '📖', label: 'Scripture' },
  { emoji: '🌱', label: 'Growing' },
  { emoji: '👑', label: 'Kingdom' },
];

const STICKER_PREFIX = '[[FNI_STICKER:';
const STICKER_IMG_PREFIX = '[[FNI_STICKER_IMG:';
const POLL_PREFIX = '[[FNI_POLL:';

// Comprehensive Apple-Style Unicode Emoji Categories
const EMOJI_CATEGORIES: { name: string; icon: string; emojis: string[] }[] = [
  {
    name: 'Faith & Fellowship',
    icon: '🕊️',
    emojis: [
      '🕊️', '📖', '✝️', '🕎', '👑', '🕯️', '⛪', '🍇', '🍞', '🍷', '🐑', '🌾',
      '🌱', '🛡️', '⚔️', '🎺', '🔔', '📜', '🗝️', '💎',
      '💍', '🎁', '💌', '🏛️', '🔥', '💧', '☀️', '🌈', '🙏', '🙌', '🤲', '🛐'
    ],
  },
  {
    name: 'Smileys & Emotion',
    icon: '😀',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '🫠', '😉', '😊',
      '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝',
      '🤑', '🤗', '🤭', '🫢', '🫣', '🤫', '🤔', '🫡', '🤐', '🤨', '😐', '😑', '😶',
      '🫥', '😏', '😒', '🙄', '😬', '😮‍💨', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷',
      '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸',
      '😎', '🤓', '🧐', '😕', '🫤', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺',
      '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩',
      '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '💩', '🤡'
    ],
  },
  {
    name: 'People & Body',
    icon: '👋',
    emojis: [
      '👋', '🤚', '🖐️', '✋', '🖖', '🫱', '🫲', '🫳', '🫴', '👌', '🤌', '🤏', '✌️',
      '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '🫵', '👍',
      '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '🫶', '👐', '🤲', '🤝', '🙏', '✍️',
      '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '👃', '🧠', '🫀', '🫁', '👀',
      '👁️', '👅', '👄', '👶', '👧', '🧒', '👦', '👩', '🧑', '👨', '👵', '🧓', '👴'
    ],
  },
  {
    name: 'Animals & Nature',
    icon: '🐶',
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷',
      '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴',
      '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🐢', '🐍', '🐙', '🦑', '🦐', '🦀',
      '🐡', '🐠', '🐟', '🐬', '🐳', '🦈', '🐊', '🐘', '🦛', '🦏', '🐪', '🦒', '🦘',
      '🐑', '🐐', '🦌', '🐕', '🐈', '🕊️', '🦢', '🌹', '🥀', '🌺', '🌸', '🌼',
      '🌻', '🌞', '🌝', '🌛', '⚡', '🔥', '🌈', '☀️', '⛅', '🌧️', '❄️'
    ],
  },
  {
    name: 'Food & Drink',
    icon: '🍏',
    emojis: [
      '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑',
      '🥭', '🍍', '🥥', '🥝', '🍅', '🥑', '🥦', '🥬', '🥒', '🌶️', '🌽', '🥕', '🧄',
      '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞',
      '🧇', '🥓', '🥩', '🍗', '🍖', '🌭', '🍔', '🍟', '🍕', '🥪', '🥙', '🌮', '🌯',
      '🥗', '🥘', '🍝', '🍜', '🍲', '🍣', '🍱', '🥟', '🍤', '🍙', '🍚', '🍘', '🍦',
      '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🧁', '🍫', '🍬', '🍭', '🍮', '🍯', '🍼',
      '🥛', '☕', '🫖', '🍵', '🧃', '🥤', '🍶', '🍷', '🍸', '🍹', '🍺', '🍻', '🥂'
    ],
  },
  {
    name: 'Activities & Sports',
    icon: '⚽',
    emojis: [
      '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸',
      '🏒', '🏑', '🏏', '⛳', '🏹', '🎣', '🥊', '🥋', '🛹', '🛼', '🛷', '⛸️', '🎿',
      '🏂', '🏋️', '🤼', '🤸', '⛹️', '🤺', '🧘', '🏄', '🏊', '🚴', '🏆', '🥇', '🥈',
      '🥉', '🏅', '🎖️', '🎗️', '🎫', '🎟️', '🎪', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹',
      '🥁', '🎷', '🎺', '🎸', '🎻', '🎲', '♟️', '🎯', '🎳', '🎮', '🕹️', '🧩'
    ],
  },
  {
    name: 'Travel & Places',
    icon: '✈️',
    emojis: [
      '🚗', '🚕', '🚙', '🚌', '🏎️', '🚓', '🚑', '🚒', '🚐', '🚚', '🚜', '🛵', '🏍️',
      '🚲', '🛴', '🚨', '🚥', '🚦', '🛑', '⚓', '⛵', '🚤', '🛳️', '⛴️', '🚢', '✈️',
      '🛩️', '🛫', '🛬', '🪂', '🚁', '🚀', '🛸', '🌍', '🌎', '🌏', '🗺️', '🧭', '🏔️',
      '🌋', '🏕️', '🏖️', '🏜️', '🏝️', '🏟️', '🏛️', '🏗️', '🏘️', '🏠', '🏡', '🏢', '🏣',
      '🏥', '🏦', '🏨', '🏪', '🏫', '🏬', '🏭', '🏰', '⛪', '🕌', '🕍'
    ],
  },
  {
    name: 'Objects',
    icon: '💡',
    emojis: [
      '⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '📷', '📸', '📹', '🎥', '📽️', '📞',
      '☎️', '📺', '📻', '🎙️', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '🔋', '🔌', '💡',
      '🔦', '🕯️', '🧯', '💵', '🪙', '💰', '💳', '💎', '⚖️', '🧰', '🔧', '🔨', '🛠️',
      '⚙️', '⛓️', '🧲', '💣', '🛡️', '🔮', '📿', '💈', '🔭', '🔬', '🩹', '🩺', '💊',
      '💉', '🩸', '🧬', '🧪', '🌡️', '🧹', '🧺', '🧻', '🛁', '🧸', '🖼️', '🎁', '🎈',
      '🎉', '🎊', '🏮', '📦', '🏷️', '✉️', '📩', '📨', '📧', '📫', '📝', '📁', '📂'
    ],
  },
  {
    name: 'Hearts & Symbols',
    icon: '❤️',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞',
      '💓', '💗', '💖', '💘', '💝', '💟', '💯', '💢', '💥', '💬', '💭', '💤',
      '🛑', '⚠️', '🚸', '⛔', '🚫', '✅', '❌', '⭕', '❗', '❓', '❕', '❔', '‼️',
      '⁉️', '🔆', '🔅', '🔱', '⚜️', '☢️', '☣️', '⬆️', '↗️', '➡️', '↘️', '⬇️', '↙️',
      '⬅️', '↖️', '↕️', '↔️', '↩️', '↪️', '⤴️', '⤵️', '🔃', '🔄', '🔙', '🔚', '🔛',
      '🔜', '🔝', '✝️', '🕎', '✡️', '🔯', '☯️', '♾️'
    ],
  },
  {
    name: 'Flags',
    icon: '🚩',
    emojis: [
      '🚩', '🏁', '🎌', '🏴', '🏳️', '🇬🇭', '🇳🇬', '🇿🇦', '🇰🇪', '🇺🇬', '🇺🇸', '🇬🇧', '🇨🇦',
      '🇦🇺', '🇳🇿', '🇫🇷', '🇩🇪', '🇮🇹', '🇪🇸', '🇵🇹', '🇧🇷', '🇯🇵', '🇨🇳', '🇮🇳', '🇸🇬', '🇦🇪',
      '🇸🇦', '🇮🇱', '🇺🇦', '🇷🇺', '🇪🇺'
    ],
  },
];
const EMOJI_LIST = EMOJI_CATEGORIES[0].emojis;

function formatMemberLastSeen(value?: string): string {
  if (!value) return 'Last seen unavailable';
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return 'Last seen unavailable';
  const elapsed = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return 'Last seen just now';
  if (minutes < 60) return `Last seen ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Last seen ${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Last seen ${days}d ago`;
  return `Last seen ${new Date(timestamp).toLocaleDateString([], { day: 'numeric', month: 'short' })}`;
}

function formatAttachmentSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface ChatContact {
  id: string; // 'community' | 'saved_messages' | profileId
  name: string;
  role?: string;
  cellName?: string;
  avatarUrl?: string;
  isOnline?: boolean;
  lastSeenAt?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  isPinned?: boolean;
  type: 'community' | 'saved' | 'direct' | 'group';
}


interface GroupChatConversationProps {
  group: GroupChatSummary;
  currentUserId: string;
  onBack: () => void;
  onVoiceMeeting: () => void;
  onVideoMeeting: () => void;
}

const GroupChatConversation: React.FC<GroupChatConversationProps> = ({
  group, currentUserId, onBack, onVoiceMeeting, onVideoMeeting,
}) => {
  const [messages, setMessages] = useState<GroupChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const rows = await MessagingService.getGroupChatMessages(group.id);
        if (!cancelled) setMessages(rows);
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'Unable to load group messages.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    const channel = MessagingService.subscribeToGroupChatMessages(group.id, (message, eventType) => {
      if (cancelled) return;
      setMessages(previous => {
        if (eventType === 'DELETE') return previous.filter(item => item.id !== message.id);
        const exists = previous.some(item => item.id === message.id);
        if (exists) return previous.map(item => item.id === message.id ? message : item);
        return [...previous, message].sort((a, b) => a.created_at.localeCompare(b.created_at));
      });
    });
    return () => {
      cancelled = true;
      if (channel && supabase) void supabase.removeChannel(channel);
    };
  }, [group.id]);

  useEffect(() => {
    const node = streamRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages.length]);

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    setError(null);
    setDraft('');
    try {
      const saved = await MessagingService.sendGroupChatMessage({ groupId: group.id, content });
      setMessages(previous => previous.some(item => item.id === saved.id) ? previous : [...previous, saved]);
    } catch (reason) {
      setDraft(content);
      setError(reason instanceof Error ? reason.message : 'Message could not be sent.');
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="flex-1 min-w-0 h-full flex flex-col bg-[#FAFAF8] dark:bg-[#101620] text-[#354454] dark:text-[#E8EDF5]">
      <header className="shrink-0 px-3 py-3 flex items-center justify-between gap-2 bg-[#EDF5FC] dark:bg-[#1C2636] border-b border-[#DCEAF6] dark:border-[#2E3B4E]">
        <div className="flex items-center gap-2.5 min-w-0">
          <button type="button" onClick={onBack} aria-label="Back to messages" className="md:hidden w-9 h-9 rounded-full bg-white/70 dark:bg-white/5 flex items-center justify-center"><ChevronLeft className="w-5 h-5" /></button>
          <div className="w-10 h-10 rounded-full bg-[#F5EDD9] dark:bg-[#5D4200]/50 text-[#785A1B] dark:text-[#D9BD7B] flex items-center justify-center font-bold shrink-0">{group.name.slice(0, 2).toUpperCase()}</div>
          <div className="min-w-0">
            <h2 className="font-semibold text-sm truncate">{group.name}</h2>
            <p className="text-xs text-[#536273] dark:text-[#A8B6C8] truncate tabular-nums">{group.member_count} members · {group.member_role}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button type="button" onClick={onVoiceMeeting} aria-label="Start voice meeting" title="Voice meeting" className="w-9 h-9 rounded-full bg-white/70 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 flex items-center justify-center"><Phone className="w-4 h-4" /></button>
          <button type="button" onClick={onVideoMeeting} aria-label="Start video meeting" title="Video meeting" className="w-9 h-9 rounded-full bg-white/70 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 flex items-center justify-center"><Video className="w-4 h-4" /></button>
        </div>
      </header>
      {group.description && <div className="px-4 py-2 text-xs bg-[#F5EDD9] dark:bg-[#5D4200]/25 text-[#785A1B] dark:text-[#D9BD7B] border-b border-[#E8DAB8] dark:border-[#5D4200]/40">{group.description}</div>}
      <div ref={streamRef} className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5 space-y-3">
        {loading && <p className="text-center text-sm text-[#536273] dark:text-[#A8B6C8] py-8">Loading messages…</p>}
        {!loading && messages.length === 0 && <div className="max-w-sm mx-auto mt-12 text-center rounded-2xl bg-[#EDF5FC] dark:bg-[#1C2636] p-5"><Users className="w-7 h-7 mx-auto mb-2 text-[#785A1B] dark:text-[#D9BD7B]" /><p className="font-semibold text-sm">Start the conversation</p><p className="text-xs mt-1 text-[#536273] dark:text-[#A8B6C8]">Messages sent here are saved to this group and delivered to its members.</p></div>}
        {messages.map(message => {
          const mine = message.sender_uid === currentUserId;
          return <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
            <article className={`max-w-[85%] sm:max-w-[72%] rounded-2xl px-3.5 py-2.5 shadow-sm ${mine ? 'bg-[#DCEAF6] dark:bg-[#253145] rounded-br-md' : 'bg-white dark:bg-[#1C2636] border border-[#E9EDF1] dark:border-[#2E3B4E] rounded-bl-md'}`}>
              {!mine && <p className="text-[10px] font-semibold text-[#785A1B] dark:text-[#D9BD7B] mb-1">{`Member · ${message.sender_uid.slice(0, 8)}`}</p>}
              {message.deleted_at ? <p className="text-sm italic opacity-60">This message was deleted</p> : <p className="text-sm whitespace-pre-wrap break-words">{message.content || (message.message_type === 'image' ? 'Photo' : 'Attachment')}</p>}
              <div className="flex justify-end gap-1.5 mt-1"><span className="text-[10px] opacity-60">{new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>{message.edited_at && <span className="text-[10px] opacity-60">edited</span>}</div>
            </article>
          </div>;
        })}
      </div>
      {error && <p role="alert" className="px-4 py-2 text-xs text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/30">{error}</p>}
      <form onSubmit={send} className="shrink-0 p-3 bg-white dark:bg-[#161E2B] border-t border-[#E9EDF1] dark:border-[#2E3B4E] flex items-end gap-2">
        <textarea value={draft} onChange={event => setDraft(event.target.value)} rows={1} placeholder="Message this group…" className="flex-1 resize-none max-h-32 rounded-2xl px-4 py-3 text-sm bg-[#EDF5FC] dark:bg-[#101620] border border-[#DCEAF6] dark:border-[#2E3B4E] focus:outline-none focus:ring-2 focus:ring-[#8BB5DC]" />
        <button type="submit" disabled={!draft.trim() || sending} className="w-11 h-11 shrink-0 rounded-full bg-[#785A1B] dark:bg-[#D9BD7B] text-white dark:text-[#354454] disabled:opacity-40 flex items-center justify-center" aria-label="Send group message"><Send className="w-4 h-4" /></button>
      </form>
    </section>
  );
};

export const MessagingView: React.FC<MessagingViewProps> = ({
  initialConversationId,
  initialTab,
  onBack,
  onMobileChatStateChange,
  onToggleSidebar,
}) => {
  const { currentUser, isAdmin } = useAuth();
  const { startDirectCall, startGroupMeeting } = useCall();

  // Navigation State
  // When no conversation is selected (selectedChatId === null), the FNI Communication Home Page is shown
  // On desktop view (width >= 768px), default to 'community' (Main Fellowship Chat) for split view (matching PC reference)
  const [selectedChatId, setSelectedChatId] = useState<string | null>(
    initialConversationId || (typeof window !== 'undefined' && window.innerWidth >= 768 ? 'community' : null)
  );
  const [mobileScreen, setMobileScreen] = useState<'list' | 'chat'>(initialConversationId ? 'chat' : 'list');
  const [activeFolderId, setActiveFolderId] = useState<string>('all');
  const [chatFolders, setChatFolders] = useState<ChatFolder[]>([]);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [folderToEdit, setFolderToEdit] = useState<ChatFolder | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [homeTutorSearch, setHomeTutorSearch] = useState('');
  const [isSearchInChatOpen, setIsSearchInChatOpen] = useState(false);
  const [searchInChatQuery, setSearchInChatQuery] = useState('');

  // Sync mobile chat state with AppLayout to provide full-screen immersive chat experience
  useEffect(() => {
    onMobileChatStateChange?.(mobileScreen === 'chat' && selectedChatId !== null);
  }, [mobileScreen, selectedChatId, onMobileChatStateChange]);

  // Contacts / Directory
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [tutorList, setTutorList] = useState<any[]>([]);
  const [onlineMemberIds, setOnlineMemberIds] = useState<Set<string>>(new Set());
  const [memberLastSeen, setMemberLastSeen] = useState<Record<string, string>>({});
  const [groupChats, setGroupChats] = useState<GroupChatSummary[]>([]);
  const [groupChatsError, setGroupChatsError] = useState<string | null>(null);
  const [groupCreationNotice, setGroupCreationNotice] = useState<string | null>(null);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [groupMemberSearch, setGroupMemberSearch] = useState('');
  const [selectedGroupMemberIds, setSelectedGroupMemberIds] = useState<string[]>([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [createGroupError, setCreateGroupError] = useState<string | null>(null);


  // Presence is authoritative for "online"; the database timestamp supplies durable last-seen.
  useEffect(() => {
    const userId = currentUser?.id;
    if (!userId || !supabase) {
      setOnlineMemberIds(new Set());
      return;
    }

    let disposed = false;
    let subscribed = false;
    const presenceChannel = supabase.channel('fni-presence', {
      config: { presence: { key: userId }, private: true },
    });

    const refreshLastSeen = async () => {
      const { data, error } = await supabase
        .from('fni_user_presence')
        .select('user_id,last_seen_at');
      if (disposed || error || !data) return;
      setMemberLastSeen(previous => {
        const next = { ...previous };
        data.forEach((row: any) => {
          if (row.user_id && row.last_seen_at) next[row.user_id] = row.last_seen_at;
        });
        return next;
      });
    };

    const writeLastSeen = async () => {
      const now = new Date().toISOString();
      const { error } = await supabase.from('fni_user_presence').upsert(
        { user_id: userId, last_seen_at: now, updated_at: now },
        { onConflict: 'user_id' }
      );
      if (!error && !disposed) {
        setMemberLastSeen(previous => ({ ...previous, [userId]: now }));
      }
    };

    const syncPresence = () => {
      const state = presenceChannel.presenceState() as Record<string, Array<{ userId?: string }>>;
      const ids = new Set<string>();
      Object.values(state).flat().forEach(entry => {
        if (entry?.userId) ids.add(String(entry.userId));
      });
      if (!disposed) setOnlineMemberIds(ids);
    };

    presenceChannel
      .on('presence', { event: 'sync' }, syncPresence)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'fni_user_presence',
      }, (payload: any) => {
        const row = payload.new as any;
        if (row?.user_id && row?.last_seen_at && !disposed) {
          setMemberLastSeen(previous => ({ ...previous, [row.user_id]: row.last_seen_at }));
        }
      })
      .subscribe(async status => {
        if (status !== 'SUBSCRIBED' || disposed) return;
        subscribed = true;
        await presenceChannel.track({
          userId,
          connectedAt: new Date().toISOString(),
        });
        await writeLastSeen();
        syncPresence();
      });

    void refreshLastSeen();
    const heartbeat = window.setInterval(() => {
      if (document.visibilityState === 'visible') void writeLastSeen();
    }, 60_000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        if (subscribed) void presenceChannel.track({ userId, connectedAt: new Date().toISOString() });
        void writeLastSeen();
      } else {
        void writeLastSeen();
        if (subscribed) void presenceChannel.untrack();
      }
    };
    const handlePageHide = () => {
      void writeLastSeen();
      if (subscribed) void presenceChannel.untrack();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      disposed = true;
      window.clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', handlePageHide);
      void presenceChannel.untrack();
      void supabase.removeChannel(presenceChannel);
    };
  }, [currentUser?.id]);

  useEffect(() => {
    let cancelled = false;
    const loadGroups = async () => {
      if (!currentUser?.id) {
        setGroupChats([]);
        return;
      }
      try {
        const groups = await MessagingService.getMyGroupChats();
        if (!cancelled) {
          setGroupChats(groups);
          setGroupChatsError(null);
        }
      } catch (error) {
        if (!cancelled) setGroupChatsError(error instanceof Error ? error.message : 'Unable to load your groups.');
      }
    };
    void loadGroups();
    const refresh = () => { void loadGroups(); };
    window.addEventListener('fni-group-chat-created', refresh);
    return () => {
      cancelled = true;
      window.removeEventListener('fni-group-chat-created', refresh);
    };
  }, [currentUser?.id]);

  const createMemberGroup = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isCreatingGroup) return;
    setIsCreatingGroup(true);
    setCreateGroupError(null);
    try {
      const group = await MessagingService.createGroupChat({
        name: newGroupName,
        description: newGroupDescription,
        memberIds: selectedGroupMemberIds,
      });
      setIsCreateGroupOpen(false);
      setNewGroupName('');
      setNewGroupDescription('');
      setGroupMemberSearch('');
      setSelectedGroupMemberIds([]);
      window.dispatchEvent(new CustomEvent('fni-group-chat-created'));
      if (group.status === 'approved') {
        setSelectedChatId(`group:${group.id}`);
        setMobileScreen('chat');
        setGroupCreationNotice(null);
      } else {
        setGroupCreationNotice(`Your request for "${group.name}" has been submitted. The group will become available after administrator approval.`);
      }
    } catch (error) {
      setCreateGroupError(error instanceof Error ? error.message : 'The group could not be created.');
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const selectedGroupChat = useMemo(() => {
    if (!selectedChatId?.startsWith('group:')) return null;
    return groupChats.find(group => group.id === selectedChatId.slice(6)) || null;
  }, [selectedChatId, groupChats]);

  // Visual Viewport tracking for mobile on-screen keyboard
  const { height: viewportHeight, isKeyboardVisible } = useVisualViewport();
  const [isLoadingChat, setIsLoadingChat] = useState<boolean>(false);
  const loadRequestIdRef = useRef<number>(0);

  // Messages State
  const [communityMessages, setCommunityMessages] = useState<CommunityMessage[]>([]);
  const [privateMessages, setPrivateMessages] = useState<PrivateMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Modals & Settings
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsModalTab, setSettingsModalTab] = useState<
    'directory' | 'appearance' | 'call-settings' | 'call-history' | 'notifications' | 'privacy' | 'blocked' | 'saved'
  >('directory');
  const [showCallHistoryModal, setShowCallHistoryModal] = useState(false);
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);

  // Attachments & Voice Notes
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({});
  const [imagePreview, setImagePreview] = useState<{ url: string; name: string } | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isVoiceRecordingPaused, setIsVoiceRecordingPaused] = useState(false);
  const voiceRecordingCancelledRef = useRef(false);
  const recordingSecondsRef = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<any>(null);

  // --- FNI MESSAGING STATE ---
  // Pinned Chats
  const [userPinnedChats, setUserPinnedChats] = useState<UserPinnedChat[]>([]);
  const [activeChatActionMenuId, setActiveChatActionMenuId] = useState<string | null>(null);

  // Multi-Pinned Messages
  const [activePinnedIndex, setActivePinnedIndex] = useState(0);
  const [isPinnedModalOpen, setIsPinnedModalOpen] = useState(false);
  const [isPinning, setIsPinning] = useState(false);

  // User Mentions (@)
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStartIndex, setMentionStartIndex] = useState<number>(-1);
  const [mentionedUids, setMentionedUids] = useState<string[]>([]);
  const [selectedUserProfile, setSelectedUserProfile] = useState<any | null>(null);

  // Swipe to Reply
  const [swipingMessageId, setSwipingMessageId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);

  // Message Reactions & Details
  const [isReactionModalOpen, setIsReactionModalOpen] = useState(false);
  const [reactionModalMessageId, setReactionModalMessageId] = useState<string>('');
  const [reactionModalEmoji, setReactionModalEmoji] = useState<string | undefined>(undefined);
  const [isMessageDetailsModalOpen, setIsMessageDetailsModalOpen] = useState(false);
  const [messageDetailsTarget, setMessageDetailsTarget] = useState<CommunityMessage | PrivateMessage | null>(null);

  // Forwarding Messages
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
  const [forwardTargetMessage, setForwardTargetMessage] = useState<CommunityMessage | PrivateMessage | null>(null);

  // Official Group Management
  const [isOfficialGroupModalOpen, setIsOfficialGroupModalOpen] = useState(false);
  const [officialGroup, setOfficialGroup] = useState<CommunityGroup | null>(null);
  const [isGroupInfoModalOpen, setIsGroupInfoModalOpen] = useState(false);

  // Custom Stickers, Favorites & Recents
  const [isStickerCreatorOpen, setIsStickerCreatorOpen] = useState(false);
  const [stickerSubTab, setStickerSubTab] = useState<'pack' | 'favorites' | 'recent' | 'custom'>('pack');
  const [userCustomStickers, setUserCustomStickers] = useState<CustomSticker[]>([]);
  const [favoriteStickers, setFavoriteStickers] = useState<CustomSticker[]>([]);
  const [recentStickers, setRecentStickers] = useState<CustomSticker[]>([]);

  // FNI Floating Context Menu
  const [contextMenu, setContextMenu] = useState<{
    msg: CommunityMessage | PrivateMessage;
    x: number;
    y: number;
  } | null>(null);

  // Top Audio Player Bar & State
  const [activeAudioPlayer, setActiveAudioPlayer] = useState<{
    title: string;
    url: string;
    isPlaying: boolean;
    duration: string | number;
    currentTime?: number;
    playbackProgress?: number;
    isLoading?: boolean;
    error?: string | null;
  } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioPlaybackRate, setAudioPlaybackRate] = useState(1);

  // Polls Creation Modal
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [pollIsAnonymous, setPollIsAnonymous] = useState(true);
  const [pollAllowsMultiple, setPollAllowsMultiple] = useState(false);

  // User Custom Bubble & Wallpaper Colors
  const [userBubbleColor, setUserBubbleColor] = useState<string>(() => {
    return localStorage.getItem('fni_bubble_color') || '#1b5e3f';
  });
  const [userWallpaperColor, setUserWallpaperColor] = useState<string>(() => {
    return localStorage.getItem('fni_chat_wallpaper_color') || '';
  });

  useEffect(() => {
    const applyColorsToCss = (bubble: string, wallpaper: string) => {
      document.documentElement.style.setProperty('--fni-outgoing-bubble-bg', bubble);
      document.documentElement.style.setProperty('--fni-outgoing-bubble-text', getContrastingTextColor(bubble).text);
      document.documentElement.style.setProperty('--fni-outgoing-bubble-time', getContrastingTextColor(bubble).time);
      if (wallpaper) {
        document.documentElement.style.setProperty('--fni-chat-wallpaper-bg', wallpaper);
      }
    };
    applyColorsToCss(userBubbleColor, userWallpaperColor);

    const handleBubbleUpdate = (e: any) => {
      const col = e.detail?.color || localStorage.getItem('fni_bubble_color') || '#1b5e3f';
      setUserBubbleColor(col);
      document.documentElement.style.setProperty('--fni-outgoing-bubble-bg', col);
      document.documentElement.style.setProperty('--fni-outgoing-bubble-text', getContrastingTextColor(col).text);
      document.documentElement.style.setProperty('--fni-outgoing-bubble-time', getContrastingTextColor(col).time);
    };
    const handleWallpaperUpdate = (e: any) => {
      const col = e.detail?.color || localStorage.getItem('fni_chat_wallpaper_color') || '';
      setUserWallpaperColor(col);
      if (col) {
        document.documentElement.style.setProperty('--fni-chat-wallpaper-bg', col);
      }
    };

    window.addEventListener('fni-bubble-color-updated', handleBubbleUpdate);
    window.addEventListener('fni-chat-wallpaper-updated', handleWallpaperUpdate);
    return () => {
      window.removeEventListener('fni-bubble-color-updated', handleBubbleUpdate);
      window.removeEventListener('fni-chat-wallpaper-updated', handleWallpaperUpdate);
    };
  }, []);

  // Popovers & Drawers
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activePickerTab, setActivePickerTab] = useState<'stickers' | 'emojis'>('emojis');
  const [selectedEmojiCategory, setSelectedEmojiCategory] = useState<string>('Faith & Fellowship');
  const [emojiSearchQuery, setEmojiSearchQuery] = useState<string>('');
  const [openMessageMenuId, setOpenMessageMenuId] = useState<string | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<MessageReply | null>(null);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const [deleteTargetMessage, setDeleteTargetMessage] = useState<CommunityMessage | PrivateMessage | null>(null);
  const [deleteForBoth, setDeleteForBoth] = useState<boolean>(true);

  // Clear Chat History States
  const [chatToClear, setChatToClear] = useState<{ id: string; name: string } | null>(null);
  const [showClearChatModal, setShowClearChatModal] = useState<boolean>(false);
  const [clearChatForEveryone, setClearChatForEveryone] = useState<boolean>(false);

  // DOM Refs
  const messageStreamRef = useRef<HTMLDivElement | null>(null);
  const composerInputRef = useRef<HTMLTextAreaElement | null>(null);
  const cameraFileInputRef = useRef<HTMLInputElement | null>(null);
  const documentFileInputRef = useRef<HTMLInputElement | null>(null);
  const audioFileInputRef = useRef<HTMLInputElement | null>(null);

  // Cross-device composer state & refs
  const [editingMessage, setEditingMessage] = useState<{ id: string; content: string; scope: 'private' | 'community' } | null>(null);
  const isSubmittingRef = useRef<boolean>(false);
  const lastSendTimestampRef = useRef<number>(0);
  const chatDraftsRef = useRef<Record<string, string>>({});
  const prevSelectedChatIdRef = useRef<string | null>(selectedChatId);

  // Cross-platform mobile vs. desktop environment detector
  const isMobileEnvironment = (): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      if (Capacitor.isNativePlatform()) return true;
    } catch {
      // fallback
    }
    const ua = (navigator.userAgent || navigator.vendor || (window as any).opera || '').toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /android/.test(ua);
    const isMobileUa = /mobile|webos|blackberry|iemobile|opera mini/i.test(ua);
    if (isIos || isAndroid || isMobileUa) return true;
    if ((navigator as any).userAgentData?.mobile === true) return true;
    try {
      const hasCoarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
      const hasFine = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
      const hasTouch = 'ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
      if (hasCoarse && !hasFine && hasTouch) return true;
    } catch {
      // ignore
    }
    return false;
  };

  // Preserve in-progress drafts when switching between chats
  useEffect(() => {
    const prevId = prevSelectedChatIdRef.current;
    const currId = selectedChatId;

    if (prevId !== currId) {
      if (prevId) {
        chatDraftsRef.current[prevId] = inputText;
      }
      if (currId) {
        const restored = chatDraftsRef.current[currId] || '';
        setInputText(restored);
      } else {
        setInputText('');
      }
      setEditingMessage(null);
      prevSelectedChatIdRef.current = currId;
    }
  }, [selectedChatId]);

  // Dynamically resize composer textarea with min/max height limits (24px - 128px)
  useEffect(() => {
    const textarea = composerInputRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 24), 128);
    textarea.style.height = `${newHeight}px`;
  }, [inputText]);

  // Cross-device keyboard handler for the composer textarea
  const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // If mention query is open or IME is composing (e.g. CJK / autocorrect suggestions), let it process
    if (mentionQuery !== null || e.nativeEvent.isComposing) {
      return;
    }

    if (e.key === 'Enter') {
      const isMobile = isMobileEnvironment();

      if (isMobile) {
        // Mobile platform (iPhone/iPad Safari, Home Screen PWA, Android APK, Android Chrome, tablets):
        // Return / Enter MUST insert a new line in the message.
        // Do NOT send the message.
        // Allowing default behaviour naturally inserts \n without dismissing the on-screen keyboard.
        return;
      }

      // Desktop platforms (Windows PC, macOS, Linux):
      if (e.shiftKey) {
        // Shift + Enter: Insert a new line
        return;
      }

      // Enter alone, or Ctrl+Enter / Cmd+Enter: Send message
      e.preventDefault();
      if (isSending || isSubmittingRef.current) return;
      handleSendMessage();
    }
  };

  // Back button handler
  useBackHandler(() => {
    if (contextMenu !== null) {
      setContextMenu(null);
      return true;
    }
    if (showClearChatModal) {
      setShowClearChatModal(false);
      setChatToClear(null);
      setClearChatForEveryone(false);
      return true;
    }
    if (deleteTargetMessage !== null) {
      setDeleteTargetMessage(null);
      return true;
    }
    if (isPinnedModalOpen) {
      setIsPinnedModalOpen(false);
      return true;
    }
    if (isReactionModalOpen) {
      setIsReactionModalOpen(false);
      return true;
    }
    if (isMessageDetailsModalOpen) {
      setIsMessageDetailsModalOpen(false);
      return true;
    }
    if (isForwardModalOpen) {
      setIsForwardModalOpen(false);
      return true;
    }
    if (selectedUserProfile !== null) {
      setSelectedUserProfile(null);
      return true;
    }
    if (isOfficialGroupModalOpen) {
      setIsOfficialGroupModalOpen(false);
      return true;
    }
    if (isGroupInfoModalOpen) {
      setIsGroupInfoModalOpen(false);
      return true;
    }
    if (isStickerCreatorOpen) {
      setIsStickerCreatorOpen(false);
      return true;
    }
    if (isSettingsModalOpen) {
      setIsSettingsModalOpen(false);
      return true;
    }
    if (showCallHistoryModal) {
      setShowCallHistoryModal(false);
      return true;
    }
    if (isPollModalOpen) {
      setIsPollModalOpen(false);
      return true;
    }
    if (selectedChatId !== null) {
      if (typeof window !== 'undefined' && window.innerWidth >= 768) {
        if (selectedChatId !== 'community') {
          setSelectedChatId('community');
          return true;
        }
      } else {
        setSelectedChatId(null);
        setMobileScreen('list');
        return true;
      }
    }
    if (onBack) {
      onBack();
      return true;
    }
    return false;
  }, Boolean(
    contextMenu !== null ||
    showClearChatModal ||
    deleteTargetMessage !== null ||
    isPinnedModalOpen ||
    isReactionModalOpen ||
    isMessageDetailsModalOpen ||
    isForwardModalOpen ||
    selectedUserProfile !== null ||
    isOfficialGroupModalOpen ||
    isGroupInfoModalOpen ||
    isStickerCreatorOpen ||
    isSettingsModalOpen ||
    showCallHistoryModal ||
    isPollModalOpen ||
    selectedChatId !== null ||
    onBack
  ));

  // Handle back from an open conversation
  const handleBackToHome = () => {
    setSelectedChatId(null);
    setMobileScreen('list');
    onMobileChatStateChange?.(false);
  };

  // Calling integration
  const handleStartVoiceCall = () => {
    if (selectedChatId === 'community') {
      startGroupMeeting({
        title: 'FNI Community Fellowship',
        callType: 'voice',
      });
    } else {
      const peer = tutorList.find(t => t.id === selectedChatId) || allMembers.find(m => m.id === selectedChatId);
      if (peer) {
        startDirectCall({
          id: peer.id,
          name: peer.full_name || peer.name,
          avatar: peer.avatar_url,
          cell: peer.cell_name || peer.cell,
        }, 'voice');
      }
    }
  };

  const handleStartVideoCall = () => {
    if (selectedChatId === 'community') {
      startGroupMeeting({
        title: 'FNI Community Video Fellowship',
        callType: 'video',
      });
    } else {
      const peer = tutorList.find(t => t.id === selectedChatId) || allMembers.find(m => m.id === selectedChatId);
      if (peer) {
        startDirectCall({
          id: peer.id,
          name: peer.full_name || peer.name,
          avatar: peer.avatar_url,
          cell: peer.cell_name || peer.cell,
        }, 'video');
      }
    }
  };

  // ---------------------------------------------------------------------------
  // 1. INITIALIZATION & DIRECTORY LOADING
  // ---------------------------------------------------------------------------
  const loadPinnedChats = async () => {
    if (!currentUser?.id) return;
    try {
      const pins = await MessagingService.getUserPinnedChats(currentUser.id);
      setUserPinnedChats(pins);
    } catch (e) {
      console.warn('Pinned chats load notice:', e);
    }
  };

  const loadOfficialGroup = async () => {
    try {
      const group = await MessagingService.getOfficialCommunityGroup();
      if (group) setOfficialGroup(group);
    } catch (e) {
      console.warn('Official group load notice:', e);
    }
  };

  const loadStickers = async () => {
    if (!currentUser?.id) return;
    try {
      setFavoriteStickers(MessagingService.getFavoriteStickers(currentUser.id));
      setRecentStickers(MessagingService.getFrequentlyUsedStickers(currentUser.id));
      const custom = await MessagingService.getUserCustomStickers(currentUser.id);
      if (custom) setUserCustomStickers(custom);
    } catch (e) {
      console.warn('Stickers load notice:', e);
    }
  };

  const loadChatFolders = async () => {
    if (!currentUser?.id) return;
    try {
      const list = await MessagingService.getUserChatFolders(currentUser.id);
      setChatFolders(list);
    } catch (e) {
      console.warn('Chat folders load notice:', e);
    }
  };

  useEffect(() => {
    async function loadDirectory() {
      try {
        const [directory] = await Promise.all([
          MessagingService.getMemberDirectory(),
          loadPinnedChats(),
          loadOfficialGroup(),
          loadStickers(),
          loadChatFolders(),
        ]);
        if (directory) {
          const eligible = directory.filter(
            m => m.role === 'tutor' || m.role === 'cell_leader' || m.role === 'admin' || m.role === 'super_admin'
          );
          setAllMembers(eligible);
          const peers = eligible.filter(m => m.id !== currentUser?.id);
          setTutorList(peers);
        }
      } catch (e) {
        console.warn('Directory load exception:', e);
      }
    }
    loadDirectory();
  }, [currentUser?.id]);

  // Keep every open chat/contact view in sync when another member changes their photo.
  useEffect(() => {
    if (!currentUser?.id) return;
    const channel = supabase
      .channel(`fni-profile-avatars-${currentUser.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profile_avatar_updates' },
        (payload) => {
          const update = (payload.new || {}) as { user_id?: string; avatar_url?: string | null };
          if (!update.user_id) return;
          const nextAvatar = update.avatar_url || undefined;
          setAllMembers(previous => previous.map(member =>
            member.id === update.user_id ? { ...member, avatar_url: nextAvatar, photo_url: nextAvatar } : member
          ));
          setTutorList(previous => previous.map(member =>
            member.id === update.user_id ? { ...member, avatar_url: nextAvatar, photo_url: nextAvatar } : member
          ));
          setSelectedUserProfile((previous: any) =>
            previous?.id === update.user_id ? { ...previous, avatarUrl: nextAvatar } : previous
          );
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUser?.id]);

  const handleTogglePinChat = async (chatId: string) => {
    if (!currentUser?.id) return;
    const isPinned =
      userPinnedChats.some(p => (p.chatId || (p as any).chat_id) === chatId) ||
      (chatId === 'community' && userPinnedChats.length === 0);
    if (isPinned) {
      await MessagingService.unpinChat(currentUser.id, chatId);
    } else {
      await MessagingService.pinChat(currentUser.id, chatId, userPinnedChats.length);
    }
    const updated = await MessagingService.getUserPinnedChats(currentUser.id);
    setUserPinnedChats(updated);
    setActiveChatActionMenuId(null);
  };

  const handleMovePinnedChat = async (chatId: string, direction: 'up' | 'down') => {
    if (!currentUser?.id) return;
    let list = [...userPinnedChats];
    if (list.length === 0) {
      list = [
        {
          id: 'comm',
          user_id: currentUser.id,
          chat_id: 'community',
          order_index: 0,
          pinned_at: new Date().toISOString(),
          userId: currentUser.id,
          chatId: 'community',
          orderIndex: 0,
          pinnedAt: new Date().toISOString(),
        },
      ];
    }
    const sorted = [...list].sort(
      (a, b) => (a.orderIndex ?? (a as any).order_index ?? 0) - (b.orderIndex ?? (b as any).order_index ?? 0)
    );
    const idx = sorted.findIndex(p => (p.chatId || (p as any).chat_id) === chatId);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;

    const temp = sorted[idx];
    sorted[idx] = sorted[targetIdx];
    sorted[targetIdx] = temp;

    const orderedIds = sorted.map(p => p.chatId || (p as any).chat_id);
    await MessagingService.reorderPinnedChats(currentUser.id, orderedIds);
    const updated = await MessagingService.getUserPinnedChats(currentUser.id);
    setUserPinnedChats(updated);
    setActiveChatActionMenuId(null);
  };

  const openConversation = useCallback((chatId: string) => {
    setSelectedChatId(chatId);
    setMobileScreen('chat');

    const viewerId = currentUser?.id || 'guest';
    if (chatId === 'community') {
      const cached = ConversationCacheService.getMessages<CommunityMessage>(viewerId, 'community');
      if (cached && cached.length > 0) {
        setCommunityMessages(cached);
        setIsLoadingChat(false);
      } else {
        setIsLoadingChat(true);
      }
    } else {
      const targetId = chatId === 'saved_messages' ? viewerId : chatId;
      const cached = ConversationCacheService.getMessages<PrivateMessage>(viewerId, targetId);
      if (cached && cached.length > 0) {
        setPrivateMessages(cached);
        setIsLoadingChat(false);
      } else {
        setIsLoadingChat(true);
      }
    }

    const draft = chatDraftsRef.current[chatId] || '';
    setInputText(draft);
  }, [currentUser?.id]);

  // Deep linking sync & PC default split-view auto-selection
  useEffect(() => {
    if (initialConversationId) {
      openConversation(initialConversationId);
    } else if (typeof window !== 'undefined' && window.innerWidth >= 768 && !selectedChatId) {
      openConversation('community');
    }
  }, [initialConversationId, selectedChatId, openConversation]);

  // ---------------------------------------------------------------------------
  // 2. MESSAGES LOADING & REALTIME SYNC (OPTIMIZED BACKGROUND STALE-WHILE-REVALIDATE)
  // ---------------------------------------------------------------------------
  const loadActiveMessages = async (chatIdToLoad?: string) => {
    const targetChatId = chatIdToLoad || selectedChatId;
    if (!targetChatId || !currentUser?.id) return;

    const currentRequestId = ++loadRequestIdRef.current;
    const viewerId = currentUser.id;

    try {
      if (targetChatId === 'community') {
        const msgs = await MessagingService.getCommunityMessages(viewerId);
        if (currentRequestId === loadRequestIdRef.current) {
          setCommunityMessages(msgs || []);
          setIsLoadingChat(false);
        }
      } else {
        const targetId = targetChatId === 'saved_messages' ? viewerId : targetChatId;
        const msgs = await MessagingService.getPrivateConversation(
          targetId,
          viewerId,
          targetId,
          isAdmin
        );
        if (currentRequestId === loadRequestIdRef.current) {
          setPrivateMessages(msgs || []);
          setIsLoadingChat(false);
          await MessagingService.markPrivateMessagesRead(targetId, viewerId, targetId, isAdmin);
        }
      }
    } catch (e) {
      console.warn('Messages refresh exception:', e);
      if (currentRequestId === loadRequestIdRef.current) {
        setIsLoadingChat(false);
      }
    }
  };

  useEffect(() => {
    if (!selectedChatId) return;

    // Check cache immediately if not populated
    const viewerId = currentUser?.id || 'guest';
    if (selectedChatId === 'community') {
      const cached = ConversationCacheService.getMessages<CommunityMessage>(viewerId, 'community');
      if (cached && cached.length > 0) {
        setCommunityMessages(cached);
      } else {
        setIsLoadingChat(true);
      }
    } else {
      const targetId = selectedChatId === 'saved_messages' ? viewerId : selectedChatId;
      const cached = ConversationCacheService.getMessages<PrivateMessage>(viewerId, targetId);
      if (cached && cached.length > 0) {
        setPrivateMessages(cached);
      } else {
        setIsLoadingChat(true);
      }
    }

    // Background stale-while-revalidate fetch
    loadActiveMessages(selectedChatId);

    // Supabase Realtime channel for messages and personal chat folders
    const applyMessageChange = async (scope: 'private' | 'community', payload: any) => {
      const row = payload.new || {};
      const messageId = row.id || payload.old?.id;
      if (!messageId) return;
      const removeMessage = payload.eventType === 'DELETE' || Boolean(row.deleted_for_everyone_at);
      if (scope === 'community') {
        if (selectedChatId !== 'community') return;
        if (removeMessage) {
          setCommunityMessages(previous => {
            const next = previous.filter(message => message.id !== messageId);
            ConversationCacheService.setMessages(viewerId, 'community', next);
            return next;
          });
          return;
        }
        try {
          // INSERT/UPDATE Realtime payloads already contain the committed row.
          // Map it directly so recipients do not wait for a second network request.
          const message: CommunityMessage = {
            id: row.id,
            senderUid: row.sender_uid,
            senderName: row.sender_name,
            senderRole: row.sender_role,
            cellName: row.cell_name || undefined,
            content: row.content || '',
            category: row.category || 'general',
            createdAt: row.created_at,
            replyTo: row.reply_to || undefined,
            mentions: Array.isArray(row.mentions) ? row.mentions : [],
            reactions: row.reactions && typeof row.reactions === 'object' ? row.reactions : {},
            attachments: Array.isArray(row.attachments) ? row.attachments : [],
            deletedForEveryoneAt: row.deleted_for_everyone_at || undefined,
            editedAt: row.edited_at || undefined,
            isPinned: Boolean(row.is_pinned),
            pinnedAt: row.pinned_at || undefined,
            pinnedBy: row.pinned_by || undefined,
            pinnedByName: row.pinned_by_name || undefined,
            pinnedNotify: Boolean(row.pinned_notify),
            groupId: row.group_id || undefined,
          };
          if (!message.id || message.deletedForEveryoneAt) return;
          if (message.senderUid !== viewerId && !allMembers.some(member => member.id === message.senderUid)) return;
          if (MessagingService.getDeletedForSelfIds(viewerId).has(message.id)) return;
          // A Realtime pin/reaction/edit event must not resurrect a post that this
          // member already cleared from their own community history.
          if (!await MessagingService.isCommunityMessageVisibleForUser(viewerId, message.id, message.createdAt)) return;
          setCommunityMessages(previous => {
            const existing = previous.find(item => item.id === message.id);
            const mergedMessage = { ...message, reactions: message.reactions || existing?.reactions || {} };
            const next = [...previous.filter(item => item.id !== message.id), mergedMessage]
              .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            ConversationCacheService.setMessages(viewerId, 'community', next);
            return next;
          });
        } catch (error) {
          console.warn('Realtime community message refresh notice:', error);
        }
        return;
      }

      if (!selectedChatId || selectedChatId === 'community') return;
      const conversationId = selectedChatId === 'saved_messages' ? viewerId : selectedChatId;
      if (removeMessage) {
        setPrivateMessages(previous => {
          const next = previous.filter(message => message.id !== messageId);
          ConversationCacheService.setMessages(viewerId, conversationId, next);
          return next;
        });
        return;
      }
      try {
        // The Realtime row is already the committed message; avoid a second query.
        const message: PrivateMessage = {
          id: row.id,
          senderUid: row.sender_uid,
          senderName: row.sender_name,
          senderRole: row.sender_role,
          recipientUid: row.recipient_uid,
          recipientName: row.recipient_name,
          cellId: row.cell_id || undefined,
          cellName: row.cell_name || undefined,
          content: row.content || '',
          createdAt: row.created_at,
          isRead: Boolean(row.is_read),
          readAt: row.read_at || undefined,
          replyTo: row.reply_to || undefined,
          attachments: Array.isArray(row.attachments) ? row.attachments : [],
          reactions: {},
          isPinned: Boolean(row.is_pinned),
          pinnedAt: row.pinned_at || undefined,
          pinnedBy: row.pinned_by || undefined,
          pinnedByName: row.pinned_by_name || undefined,
          pinnedNotify: Boolean(row.pinned_notify),
          mentions: Array.isArray(row.mentions) ? row.mentions : [],
          deletedForEveryoneAt: row.deleted_for_everyone_at || undefined,
          editedAt: row.edited_at || undefined,
        };
        if (!message.id || message.deletedForEveryoneAt) return;
        if (MessagingService.getDeletedForSelfIds(viewerId).has(message.id)) return;
        const belongs = isAdmin
          ? ((message.senderUid === conversationId && (message.recipientUid === 'admin' || message.recipientUid === viewerId)) ||
             (message.senderUid === viewerId && message.recipientUid === conversationId))
          : ((message.senderUid === viewerId && message.recipientUid === conversationId) ||
             (message.senderUid === conversationId && message.recipientUid === viewerId));
        if (!belongs) return;
        setPrivateMessages(previous => {
          const existing = previous.find(item => item.id === message.id);
          const mergedMessage = { ...message, reactions: existing?.reactions || message.reactions || {} };
          const next = [...previous.filter(item => item.id !== message.id), mergedMessage]
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          ConversationCacheService.setMessages(viewerId, conversationId, next);
          return next;
        });
      } catch (error) {
        console.warn('Realtime private message refresh notice:', error);
      }
    };

    const channel = supabase
      ?.channel(`fni-messages-${viewerId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_messages' }, payload => {
        void applyMessageChange('community', payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'private_messages' }, payload => {
        void applyMessageChange('private', payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_folders' }, () => {
        loadChatFolders();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_folder_conversations' }, () => {
        loadChatFolders();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_pinned_chats', filter: `user_id=eq.${viewerId}` }, () => {
        loadPinnedChats();
      })
      .subscribe();

    // Responsive window focus listener: refresh when user returns to app tab
    const handleFocus = () => {
      if (selectedChatId) loadActiveMessages(selectedChatId);
    };
    window.addEventListener('focus', handleFocus);

    // Lightweight 15s fallback background sync (avoids hammering database every 3s)
    const pollTimer = setInterval(() => {
      if (selectedChatId) {
        loadActiveMessages(selectedChatId);
      }
    }, 15000);

    return () => {
      if (channel && supabase) supabase.removeChannel(channel);
      window.removeEventListener('focus', handleFocus);
      clearInterval(pollTimer);
    };
  }, [selectedChatId, currentUser?.id, isAdmin, allMembers]);

  // Auto-scroll on new message
  useEffect(() => {
    const stream = messageStreamRef.current;
    if (stream) {
      stream.scrollTop = stream.scrollHeight;
      setShowJumpToBottom(false);
    }
  }, [selectedChatId, communityMessages.length, privateMessages.length]);

  // Candidates for @mention autocomplete
  const mentionCandidates: MentionUser[] = useMemo(() => {
    return tutorList.map(t => ({
      id: t.id,
      fullName: t.full_name || t.name || 'FNI Tutor',
      cellName: t.cell_name || t.cell,
      role: t.role,
      avatarUrl: t.avatar_url || t.photo_url,
    }));
  }, [tutorList]);

  // ---------------------------------------------------------------------------
  // 3. CONTACT LIST GENERATION (FNI CHAT LIST)
  // Saved Messages is top-level personal cloud chat matching FNI design
  // ---------------------------------------------------------------------------
  const contacts: ChatContact[] = useMemo(() => {
    const list: ChatContact[] = [];

    // Map personal pinned order
    const pinnedMap = new Map<string, number>();
    userPinnedChats.forEach((p, idx) => {
      const cid = p.chatId || (p as any).chat_id;
      const order = p.orderIndex ?? (p as any).order_index ?? idx;
      pinnedMap.set(cid, order);
    });

    // 0. Saved Messages (Personal Notes & Personal Storage)
    const savedMsgs = privateMessages.filter(m => m.senderUid === currentUser?.id && m.recipientUid === currentUser?.id);
    const lastSaved = savedMsgs[savedMsgs.length - 1];
    const isSavedPinned = pinnedMap.has('saved_messages') || true;

    list.push({
      id: 'saved_messages',
      name: 'Saved Messages',
      role: 'Personal Cloud Notes',
      cellName: 'Cloud Notebook',
      isPinned: isSavedPinned,
      type: 'saved' as const,
      avatarUrl: '', // Rendered with blue bookmark circle
      lastMessage: lastSaved
        ? (lastSaved.attachments?.length ? 'Photo' : lastSaved.content.slice(0, 42))
        : 'Photo',
      lastMessageTime: lastSaved
        ? new Date(lastSaved.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '1:32 PM',
      unreadCount: 0,
    });

    // 1. Official FNI Community Group
    const lastComm = communityMessages[communityMessages.length - 1];
    const groupName = officialGroup?.name || 'FNI Community';
    const isCommPinned = pinnedMap.has('community') || userPinnedChats.length === 0;

    list.push({
      id: 'community',
      name: groupName,
      role: 'Official Ministerial Community',
      cellName: 'All Active Fellowship Tutors',
      isPinned: isCommPinned,
      type: 'community',
      lastMessage: lastComm
        ? `${lastComm.senderName}: ${lastComm.content.slice(0, 42)}`
        : 'From The Shepherd\'s Tent To The Global Vineyard...',
      lastMessageTime: lastComm
        ? new Date(lastComm.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : 'Mon',
      unreadCount: 5,
    });

    // 2. Member-created group conversations from the authenticated Supabase membership list
    groupChats.forEach(group => {
      const last = group.last_message;
      list.push({
        id: `group:${group.id}`,
        name: group.name,
        role: group.member_role === 'owner' ? 'Group owner' : 'Group conversation',
        cellName: `${group.member_count} members`,
        isPinned: pinnedMap.has(`group:${group.id}`),
        type: 'group',
        lastMessage: last ? (last.content || (last.message_type === 'image' ? 'Photo' : 'Attachment')).slice(0, 48) : (group.description || 'Start the conversation'),
        lastMessageTime: last ? new Date(last.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        unreadCount: 0,
      });
    });

    // 2. Registered Tutors & Leadership Direct Chats
    tutorList.forEach(peer => {
      const isPeerPinned = pinnedMap.has(peer.id);
      list.push({
        id: peer.id,
        name: peer.role === 'admin' || peer.role === 'super_admin' || peer.role === 'national_admin' ? 'FNI Leadership Directorate' : (peer.full_name || peer.name || 'FNI Member'),
        role: peer.role === 'admin' || peer.role === 'super_admin' || peer.role === 'national_admin' ? 'FNI Administrator' : 'Fellowship Tutor',
        cellName: peer.cell_name || '',
        avatarUrl: peer.avatar_url || peer.photo_url,
        isOnline: onlineMemberIds.has(peer.id),
        lastSeenAt: memberLastSeen[peer.id],
        type: 'direct',
        isPinned: isPeerPinned,
        lastMessage: 'Tap to open conversation',
        lastMessageTime: '',
        unreadCount: 0,
      });
    });

    // Sort: pinned first (by order_index), then unpinned
    return list.sort((a, b) => {
      // Saved messages prioritized first if pinned
      if (a.id === 'saved_messages') return -1;
      if (b.id === 'saved_messages') return 1;
      const aPinned = pinnedMap.has(a.id) || (a.id === 'community' && userPinnedChats.length === 0);
      const bPinned = pinnedMap.has(b.id) || (b.id === 'community' && userPinnedChats.length === 0);
      if (aPinned && bPinned) {
        const orderA = pinnedMap.get(a.id) ?? (a.id === 'community' ? -1 : 999);
        const orderB = pinnedMap.get(b.id) ?? (b.id === 'community' ? -1 : 999);
        return orderA - orderB;
      }
      if (aPinned) return -1;
      if (bPinned) return 1;
      if (a.id === 'community') return -1;
      if (b.id === 'community') return 1;
      return 0;
    });
  }, [communityMessages, tutorList, userPinnedChats, officialGroup, privateMessages, currentUser, onlineMemberIds, memberLastSeen, groupChats]);

  // Helper to determine if a contact is included in a folder
  const isContactInFolder = (contact: any, folder: ChatFolder) => {
    if (folder.included_chat_ids?.includes(contact.id)) return true;
    if (folder.include_all_groups && (contact.type === 'community' || contact.type === 'group') && !folder.excluded_chat_ids?.includes(contact.id)) return true;
    if (folder.include_all_direct && (contact.type === 'direct' || contact.id === 'saved_messages') && !folder.excluded_chat_ids?.includes(contact.id)) return true;
    return false;
  };

  // Folder tab unread counts
  const folderUnreadMap = useMemo(() => {
    const map = new Map<string, number>();
    chatFolders.forEach(folder => {
      const unread = contacts
        .filter(c => isContactInFolder(c, folder))
        .reduce((sum, c) => sum + (c.unreadCount || 0), 0);
      map.set(folder.id, unread);
    });
    return map;
  }, [chatFolders, contacts]);

  const allChatsUnreadCount = useMemo(() => {
    return contacts.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  }, [contacts]);

  const personalUnreadCount = useMemo(() => {
    return contacts
      .filter(c => c.type === 'direct' || c.type === 'saved' || (c.id !== 'community' && c.type !== 'community'))
      .reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  }, [contacts]);

  const groupsUnreadCount = useMemo(() => {
    return contacts
      .filter(c => c.type === 'community' || c.type === 'group' || c.id === 'community')
      .reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  }, [contacts]);

  // Active folder object
  const activeFolderObj = useMemo(() => {
    if (activeFolderId === 'all' || activeFolderId === 'personal' || activeFolderId === 'groups') return null;
    return chatFolders.find(f => f.id === activeFolderId) || null;
  }, [chatFolders, activeFolderId]);

  // Filtered contacts based on folder and search query
  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = c.name.toLowerCase().includes(q);
        const matchesCell = c.cellName?.toLowerCase().includes(q);
        const matchesLast = c.lastMessage?.toLowerCase().includes(q);
        const matchesRole = c.role?.toLowerCase().includes(q);
        if (!matchesName && !matchesCell && !matchesLast && !matchesRole) return false;
      }
      if (activeFolderId === 'all') return true;
      if (activeFolderId === 'personal') {
        return c.type === 'direct' || c.type === 'saved';
      }
      if (activeFolderId === 'groups') {
        return c.type === 'community' || c.type === 'group' || c.id === 'community';
      }
      if (activeFolderObj) return isContactInFolder(c, activeFolderObj);
      return true;
    });
  }, [contacts, searchQuery, activeFolderId, activeFolderObj]);

  // Active contact when a chat is open
  const activeContact = useMemo(() => {
    if (!selectedChatId) return null;
    if (selectedChatId === 'saved_messages') {
      return {
        id: 'saved_messages',
        name: 'Saved Messages',
        role: 'Personal Cloud Notes',
        cellName: 'Cloud Notebook',
        type: 'saved' as const,
        isOnline: true,
      };
    }
    return contacts.find(c => c.id === selectedChatId) || null;
  }, [contacts, selectedChatId]);

  // Active messages array
  const currentMessages = selectedChatId === 'community' ? communityMessages : privateMessages;

  useEffect(() => {
    let cancelled = false;
    const paths = Array.from(new Set(currentMessages.flatMap(message =>
      (message.attachments || []).map(attachment => attachment.path)
        .filter((path): path is string => Boolean(path) && !attachmentUrls[path] && !/^(data:|blob:|https?:\/\/)/i.test(path))
    )));
    if (!paths.length) return;
    void Promise.all(paths.map(async path => [path, await MessagingService.getChatAttachmentUrl(path)] as const))
      .then(entries => {
        if (cancelled) return;
        setAttachmentUrls(previous => {
          const next = { ...previous };
          entries.forEach(([path, url]) => { if (url) next[path] = url; });
          return next;
        });
      })
      .catch(error => console.warn('Chat media URL refresh notice:', error));
    return () => { cancelled = true; };
  }, [currentMessages, attachmentUrls]);

  useEffect(() => {
    const refreshMediaUrls = () => setAttachmentUrls({});
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refreshMediaUrls();
    };
    window.addEventListener('focus', refreshMediaUrls);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', refreshMediaUrls);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Active pinned messages in current conversation (Multiple pinned messages supported)
  const allPinnedMessages = useMemo(() => {
    return currentMessages.filter(m => m.isPinned);
  }, [currentMessages]);

  useEffect(() => {
    if (activePinnedIndex >= allPinnedMessages.length) {
      setActivePinnedIndex(Math.max(0, allPinnedMessages.length - 1));
    }
  }, [allPinnedMessages.length]);

  const currentPinnedBannerMessage = allPinnedMessages[activePinnedIndex] || null;

  // Authoritative pin permissions for active chat:
  // - Community chat: only administrators and active leaders/tutors can pin/unpin messages
  // - Private chats: both participants can pin/unpin messages
  const canPin = useMemo(() => {
    if (selectedChatId === 'community') {
      const role = String(currentUser?.role || '').trim().toLowerCase();
      return isAdmin || ['tutor', 'admin', 'super_admin', 'national_admin'].includes(role);
    }
    return true;
  }, [selectedChatId, isAdmin, currentUser?.role]);

  const handleCyclePinnedMessage = () => {
    if (allPinnedMessages.length === 0) return;
    if (allPinnedMessages.length === 1) {
      scrollToMessageId(allPinnedMessages[0].id);
      return;
    }
    const nextIdx = (activePinnedIndex + 1) % allPinnedMessages.length;
    setActivePinnedIndex(nextIdx);
    const targetMsg = allPinnedMessages[nextIdx];
    if (targetMsg) scrollToMessageId(targetMsg.id);
  };

  // Composer Mention detection
  const handleComposerChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setInputText(text);

    const cursorPos = e.target.selectionStart || 0;
    const textBeforeCursor = text.substring(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf('@');

    if (atIndex !== -1 && (atIndex === 0 || /\s/.test(textBeforeCursor[atIndex - 1]))) {
      const query = textBeforeCursor.substring(atIndex + 1);
      if (!/\s/.test(query)) {
        setMentionQuery(query);
        setMentionStartIndex(atIndex);
        return;
      }
    }
    setMentionQuery(null);
  };

  const handleSelectMention = (user: MentionUser) => {
    if (mentionStartIndex === -1) return;
    const cursorPos = composerInputRef.current?.selectionStart || (mentionStartIndex + (mentionQuery?.length || 0) + 1);
    const before = inputText.substring(0, mentionStartIndex);
    const after = inputText.substring(cursorPos);
    const updated = `${before}@${user.fullName} ${after}`;
    setInputText(updated);
    if (!mentionedUids.includes(user.id)) {
      setMentionedUids([...mentionedUids, user.id]);
    }
    setMentionQuery(null);
    setTimeout(() => {
      composerInputRef.current?.focus();
    }, 50);
  };

  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Swipe to Reply & Long-Press touch handlers (mobile interaction)
  const handleTouchStart = (msg: CommunityMessage | PrivateMessage, e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    setSwipingMessageId(msg.id);
    setSwipeOffset(0);

    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
    }
    const touch = e.touches[0];
    const clientX = touch.clientX;
    const clientY = touch.clientY;
    longPressTimeoutRef.current = setTimeout(() => {
      const x = Math.min(clientX, window.innerWidth - 240);
      const y = Math.min(clientY, window.innerHeight - 340);
      setContextMenu({ msg, x, y });
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate(40); } catch (_) {}
      }
    }, 500);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swipingMessageId) return;
    const diffX = e.touches[0].clientX - touchStartXRef.current;
    const diffY = Math.abs(e.touches[0].clientY - touchStartYRef.current);
    if (diffY > 10 || Math.abs(diffX) > 10) {
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
      }
    }
    if (diffY > 30) {
      setSwipeOffset(0);
      return;
    }
    if (diffX < 0) {
      setSwipeOffset(Math.max(-80, diffX));
    }
  };

  const handleTouchEnd = (msg: CommunityMessage | PrivateMessage) => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
    if (swipeOffset < -45) {
      setReplyToMessage({
        id: msg.id,
        senderName: msg.senderName,
        senderUid: msg.senderUid,
        content: msg.content.slice(0, 100),
      });
      composerInputRef.current?.focus();
    }
    setSwipingMessageId(null);
    setSwipeOffset(0);
  };

  // Context Menu trigger (opened on click or tap on message text)
  const handleMessageContextMenu = (e: React.MouseEvent, msg: CommunityMessage | PrivateMessage) => {
    e.preventDefault();
    e.stopPropagation();

    let clientX = e.clientX;
    let clientY = e.clientY;

    if ((!clientX || clientX === 0) && (!clientY || clientY === 0)) {
      const el = document.getElementById(`msg-${msg.id}`);
      if (el) {
        const rect = el.getBoundingClientRect();
        clientX = rect.left + rect.width / 2;
        clientY = rect.top + rect.height / 2;
      }
    }

    const safeX = Math.max(16, Math.min(clientX || window.innerWidth / 2, window.innerWidth - 240));
    const safeY = Math.max(16, Math.min(clientY || window.innerHeight / 2, window.innerHeight - 340));
    setContextMenu({ msg, x: safeX, y: safeY });
  };

  // FNI Message Deletion Handlers (Delete for Self vs Delete for Both)
  const handleOpenDeleteModal = (msg: CommunityMessage | PrivateMessage) => {
    setDeleteTargetMessage(msg);
    setDeleteForBoth(msg.senderUid === currentUser?.id || isAdmin);
    setContextMenu(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetMessage || !currentUser?.id || !selectedChatId) return;
    const msg = deleteTargetMessage;
    const isCommunity = selectedChatId === 'community';
    const forEveryone = deleteForBoth && (msg.senderUid === currentUser.id || isAdmin);

    // 1. Instant optimistic UI removal and modal dismissal (0ms latency, instant response)
    setDeleteTargetMessage(null);
    if (isCommunity) {
      setCommunityMessages(prev => prev.filter(m => m.id !== msg.id));
    } else {
      setPrivateMessages(prev => prev.filter(m => m.id !== msg.id));
    }

    // Persist first; if the server rejects it, restore the message instead of
    // leaving the sender with a phantom deletion.
    try {
      if (forEveryone) {
        await MessagingService.deleteMessageForEveryone(
          msg.id,
          isCommunity ? 'community' : 'private'
        );
      } else {
        await MessagingService.deleteMessageForSelf(
          currentUser.id,
          msg.id,
          isCommunity ? 'community' : 'private'
        );
      }
      const conversationId = selectedChatId === 'saved_messages' ? currentUser.id : selectedChatId;
      ConversationCacheService.removeMessage(currentUser.id, conversationId, msg.id);
    } catch (err: any) {
      if (isCommunity) {
        setCommunityMessages(previous => [...previous.filter(item => item.id !== msg.id), msg]
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
        const cached = ConversationCacheService.getMessages<CommunityMessage>(currentUser.id, 'community') || [];
        ConversationCacheService.setMessages(currentUser.id, 'community', [...cached.filter(item => item.id !== msg.id), msg]);
      } else {
        setPrivateMessages(previous => [...previous.filter(item => item.id !== msg.id), msg as PrivateMessage]
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
        const conversationId = selectedChatId === 'saved_messages' ? currentUser.id : selectedChatId;
        const cached = ConversationCacheService.getMessages<PrivateMessage>(currentUser.id, conversationId) || [];
        ConversationCacheService.setMessages(currentUser.id, conversationId, [...cached.filter(item => item.id !== msg.id), msg as PrivateMessage]);
      }
      setSendError(err?.message || 'The message could not be deleted. Please try again.');
    }
  };

  // FNI Clear Chat History Handler (Instant & Optimistic)
  const handleConfirmClearChat = async () => {
    if (!currentUser?.id || !chatToClear) return;
    const target = chatToClear;
    const forEveryone = clearChatForEveryone;

    // 1. Instant optimistic UI clear and modal dismissal (0ms latency, buttery smooth)
    setShowClearChatModal(false);
    setChatToClear(null);
    setClearChatForEveryone(false);

    if (target.id === 'community') {
      if (selectedChatId === 'community') {
        setCommunityMessages([]);
      }
    } else {
      if (selectedChatId === target.id) {
        setPrivateMessages(prev => prev.filter(m => !(
          (m.senderUid === currentUser.id && m.recipientUid === target.id) ||
          (m.senderUid === target.id && m.recipientUid === currentUser.id)
        )));
      }
    }

    // 2. Persist in background without blocking UI
    try {
      const cleared = target.id === 'community'
        ? await MessagingService.clearCommunityHistory(currentUser.id, forEveryone)
        : await MessagingService.clearPrivateConversation(currentUser.id, target.id, forEveryone);
      if (!cleared) {
        setSendError('Chat history could not be cleared. Please check your connection and try again.');
        void loadActiveMessages(target.id);
      }
    } catch (err: any) {
      console.warn('Background chat clear notice:', err);
    }
  };

  // FNI Date Label Formatter
  const getMessageDateLabel = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const today = new Date();
      if (d.toDateString() === today.toDateString()) {
        return 'Today';
      }
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      if (d.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
      }
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
      });
    } catch {
      return 'Today';
    }
  };

  // Audio Playback & Seeking Engine
  const handlePlayAudio = async (url: string, title: string) => {
    if (!url) return;

    // Toggle pause/play if same URL
    if (activeAudioPlayer && activeAudioPlayer.url === url) {
      if (activeAudioPlayer.isPlaying) {
        audioRef.current?.pause();
        setActiveAudioPlayer(prev => (prev ? { ...prev, isPlaying: false } : null));
      } else {
        try {
          await audioRef.current?.play();
          setActiveAudioPlayer(prev => (prev ? { ...prev, isPlaying: true, error: null } : null));
        } catch (err: any) {
          console.warn('Audio resume error:', err);
        }
      }
      return;
    }

    // Stop and clean up current audio if playing
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
      } catch {}
    }

    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.playbackRate = audioPlaybackRate;
    audioRef.current = audio;

    setActiveAudioPlayer({
      title,
      url,
      isPlaying: true,
      duration: '0:15',
      currentTime: 0,
      playbackProgress: 0,
      isLoading: true,
      error: null,
    });

    audio.onloadedmetadata = () => {
      const dur = audio.duration;
      if (dur && !isNaN(dur) && isFinite(dur)) {
        const durStr = `${Math.floor(dur / 60)}:${Math.floor(dur % 60).toString().padStart(2, '0')}`;
        setActiveAudioPlayer(prev => (prev && prev.url === url ? { ...prev, duration: durStr, isLoading: false } : prev));
      } else {
        setActiveAudioPlayer(prev => (prev && prev.url === url ? { ...prev, isLoading: false } : prev));
      }
    };

    audio.ontimeupdate = () => {
      const cur = audio.currentTime || 0;
      const dur = audio.duration;
      const pct = (dur && !isNaN(dur) && dur > 0) ? Math.min(100, Math.max(0, (cur / dur) * 100)) : 0;
      setActiveAudioPlayer(prev => {
        if (!prev || prev.url !== url) return prev;
        return {
          ...prev,
          currentTime: cur,
          playbackProgress: pct,
        };
      });
    };

    audio.onended = () => {
      setActiveAudioPlayer(prev => (prev && prev.url === url ? { ...prev, isPlaying: false, currentTime: 0, playbackProgress: 0 } : prev));
    };

    audio.onerror = (e) => {
      console.warn('Audio playback error on url:', url, e);
      setActiveAudioPlayer(prev => (prev && prev.url === url ? { ...prev, isPlaying: false, isLoading: false, error: 'Cannot play audio' } : prev));
    };

    try {
      audio.src = url;
      audio.load();
      await audio.play();
    } catch (playErr: any) {
      console.warn('Audio initial play blocked or failed:', playErr);
      setActiveAudioPlayer(prev => (prev && prev.url === url ? { ...prev, isPlaying: false, isLoading: false, error: playErr?.message || 'Playback blocked' } : prev));
    }
  };

  const handleSeekAudio = (e: React.MouseEvent<HTMLDivElement>, fileUrl: string) => {
    e.stopPropagation();
    if (!audioRef.current || activeAudioPlayer?.url !== fileUrl) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    if (audioRef.current.duration && !isNaN(audioRef.current.duration) && isFinite(audioRef.current.duration)) {
      audioRef.current.currentTime = ratio * audioRef.current.duration;
      setActiveAudioPlayer(prev => prev ? { ...prev, playbackProgress: ratio * 100 } : null);
    }
  };

  const cycleAudioPlaybackRate = (fileUrl: string) => {
    const nextRate = audioPlaybackRate >= 2 ? 1 : audioPlaybackRate === 1 ? 1.5 : 2;
    setAudioPlaybackRate(nextRate);
    if (audioRef.current && activeAudioPlayer?.url === fileUrl) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  // FNI Voice Note Waveform Renderer (Matches Screenshot)
  const renderVoiceNote = (
    fileUrl: string,
    title: string,
    durationStr: string,
    formattedTime: string,
    _senderName?: string
  ) => {
    const isThisAudio = activeAudioPlayer?.url === fileUrl;
    const isPlayingThis = isThisAudio && activeAudioPlayer.isPlaying;
    const progress = isThisAudio ? (activeAudioPlayer.playbackProgress || 0) : 0;
    const bars = [8, 14, 22, 12, 18, 24, 16, 28, 20, 14, 26, 18, 10, 22, 16, 26, 12, 20, 28, 14, 18, 24, 16, 20, 12, 16, 8];
    const activeBarIndex = Math.floor((progress / 100) * bars.length);

    let timeLabel = durationStr || '0:15';
    if (isThisAudio && activeAudioPlayer.currentTime !== undefined && activeAudioPlayer.currentTime > 0) {
      const curM = Math.floor(activeAudioPlayer.currentTime / 60);
      const curS = Math.floor(activeAudioPlayer.currentTime % 60).toString().padStart(2, '0');
      timeLabel = `${curM}:${curS}`;
    }

    return (
      <div className="flex items-center gap-2.5 py-1 px-1 min-w-[220px] max-w-[300px] select-none">
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            handlePlayAudio(fileUrl, title);
          }}
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer shadow-md ${
            isPlayingThis
              ? 'bg-blue-600 text-white'
              : 'bg-white/15 dark:bg-white/10 hover:bg-white/25 text-white'
          }`}
          title={isPlayingThis ? 'Pause voice note' : 'Play voice note'}
        >
          {isPlayingThis ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 fill-current ml-0.5" />
          )}
        </button>

        {/* Middle: Waveform and Timestamps */}
        <div className="flex-1 min-w-0">
          <div
            onClick={e => handleSeekAudio(e, fileUrl)}
            className="relative flex items-center gap-[2.5px] h-6 py-1 cursor-pointer group/wave"
            title="Tap to seek"
          >
            {bars.map((h, i) => {
              const isActive = isThisAudio && i <= activeBarIndex;
              return (
                <div
                  key={i}
                  className={`w-[2.5px] rounded-full transition-colors ${
                    isActive ? 'bg-[#3ca3eb]' : 'bg-white/50 dark:bg-white/30 group-hover/wave:bg-white/70'
                  }`}
                  style={{ height: `${h}px` }}
                />
              );
            })}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#3ca3eb] shadow-xs transition-all pointer-events-none"
              style={{ left: `calc(${progress}% - 5px)` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-white/70 font-medium px-0.5">
            <span className={isPlayingThis ? 'text-[#3ca3eb] font-bold' : ''}>{timeLabel}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={e => { e.stopPropagation(); cycleAudioPlaybackRate(fileUrl); }}
                className="px-1.5 py-0.5 rounded-md bg-black/10 dark:bg-white/10 text-[10px] font-bold text-white/90 hover:bg-black/20 dark:hover:bg-white/20"
                aria-label={`Playback speed ${audioPlaybackRate} times`}
                title="Change playback speed"
              >
                {audioPlaybackRate}x
              </button>
              <span>{formattedTime}</span>
            </div>
          </div>

          {isThisAudio && activeAudioPlayer.error && (
            <p className="text-[10px] text-rose-300 truncate mt-0.5">{activeAudioPlayer.error}</p>
          )}
        </div>

        {/* Right: Circular Avatar with Blue Microphone Badge */}
        <div className="relative shrink-0 ml-1">
          <div className="w-9 h-9 rounded-full bg-[#8c6747] text-white font-bold text-xs flex items-center justify-center overflow-hidden">
            <User className="w-5 h-5 opacity-90" />
          </div>
          <div className="absolute -bottom-0.5 -left-0.5 w-4 h-4 rounded-full bg-[#2087d3] text-white flex items-center justify-center border border-[#212d3b]">
            <Mic className="w-2.5 h-2.5" />
          </div>
        </div>
      </div>
    );
  };

  // FNI Emoji Insertion & Cursor Management (Smooth, no forced mobile keyboard shift)
  const handleInsertEmoji = (emoji: string) => {
    const textarea = composerInputRef.current;
    if (!textarea) {
      setInputText(prev => prev + emoji);
      return;
    }
    const start = textarea.selectionStart ?? inputText.length;
    const end = textarea.selectionEnd ?? inputText.length;
    const before = inputText.substring(0, start);
    const after = inputText.substring(end);
    const updated = `${before}${emoji}${after}`;
    setInputText(updated);

    const newPos = start + emoji.length;
    setTimeout(() => {
      try {
        textarea.selectionStart = newPos;
        textarea.selectionEnd = newPos;
      } catch (_) {}
    }, 0);
  };

  const handleEmojiBackspace = () => {
    const textarea = composerInputRef.current;
    if (!textarea) {
      setInputText(prev => prev.slice(0, -1));
      return;
    }
    const start = textarea.selectionStart ?? inputText.length;
    const end = textarea.selectionEnd ?? inputText.length;
    if (start === end && start > 0) {
      const before = inputText.substring(0, start);
      const after = inputText.substring(end);
      const chars = Array.from(before);
      chars.pop();
      const newBefore = chars.join('');
      setInputText(`${newBefore}${after}`);
      const newPos = newBefore.length;
      setTimeout(() => {
        try {
          textarea.selectionStart = newPos;
          textarea.selectionEnd = newPos;
        } catch (_) {}
      }, 0);
    } else if (start !== end) {
      const before = inputText.substring(0, start);
      const after = inputText.substring(end);
      setInputText(`${before}${after}`);
      setTimeout(() => {
        try {
          textarea.selectionStart = start;
          textarea.selectionEnd = start;
        } catch (_) {}
      }, 0);
    }
  };

  const filteredEmojis = useMemo(() => {
    if (!emojiSearchQuery.trim()) {
      return (
        EMOJI_CATEGORIES.find(c => c.name === selectedEmojiCategory)?.emojis ||
        EMOJI_CATEGORIES[0].emojis
      );
    }
    const q = emojiSearchQuery.toLowerCase().trim();
    const matchingCats = EMOJI_CATEGORIES.filter(c => c.name.toLowerCase().includes(q));
    if (matchingCats.length > 0) {
      return Array.from(new Set(matchingCats.flatMap(c => c.emojis)));
    }
    const keywordMap: Record<string, string[]> = {
      heart: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝'],
      love: ['❤️', '😍', '🥰', '😘', '💕', '💖', '💗', '💓', '💞'],
      pray: ['🙏', '🕊️', '📖', '✝️', '🕎', '⛪', '🕯️'],
      amen: ['🙏', '🙌', '🕊️', '✝️'],
      cross: ['✝️', '🕎', '⛪', '🕊️'],
      bible: ['📖', '📜', '✝️', '🕯️'],
      church: ['⛪', '🏛️', '🕊️', '📖'],
      fire: ['🔥', '⚡', '💥'],
      smile: ['😀', '😃', '😄', '😁', '😆', '😅', '😊', '🙂', '😇'],
      laugh: ['😂', '🤣', '😆', '😅'],
      thumbs: ['👍', '👎'],
      clap: ['👏', '🙌'],
      hand: ['👍', '👎', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💪', '👋'],
    };
    for (const [key, ems] of Object.entries(keywordMap)) {
      if (key.includes(q) || q.includes(key)) {
        return ems;
      }
    }
    return EMOJI_CATEGORIES.flatMap(c => c.emojis).slice(0, 32);
  }, [emojiSearchQuery, selectedEmojiCategory]);

  // Forwarding execution
  const handleForwardToTarget = async (dest: ForwardDestination) => {
    if (!forwardTargetMessage || !currentUser?.id) return;
    const forwardContent = `Forwarded message:\n"${forwardTargetMessage.content}"`;

    if (dest.type === 'community') {
      await MessagingService.sendCommunityMessage({
        senderUid: currentUser.id,
        senderName: currentUser.full_name || 'FNI Leader',
        senderRole: currentUser.role,
        cellName: currentUser.cell_name,
        content: forwardContent,
        attachments: forwardTargetMessage.attachments,
      });
    } else {
      await MessagingService.sendPrivateMessage({
        senderUid: currentUser.id,
        senderName: currentUser.full_name || 'FNI Leader',
        senderRole: currentUser.role,
        recipientUid: dest.id,
        recipientName: dest.name,
        cellId: currentUser.cell_id,
        cellName: currentUser.cell_name,
        content: forwardContent,
        attachments: forwardTargetMessage.attachments,
      });
    }
    setIsForwardModalOpen(false);
    setForwardTargetMessage(null);
    await loadActiveMessages();
  };

  // ---------------------------------------------------------------------------
  // 4. SENDING MESSAGES, MEDIA, STICKERS & POLLS (OPTIMISTIC INSTANT DISPATCH)
  // ---------------------------------------------------------------------------
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedChatId) return;

    // Prevent duplicate rapid submissions (double-click, fast Enter key repeat)
    const now = Date.now();
    if (now - lastSendTimestampRef.current < 250) {
      return;
    }
    if (isSending || isSubmittingRef.current) {
      return;
    }

    const text = inputText.trim();
    if (!text && stagedFiles.length === 0) return;

    isSubmittingRef.current = true;
    lastSendTimestampRef.current = now;
    setIsSending(true);
    setSendError(null);

    // Save snapshot of staged files & text before clearing
    const stagedFilesSnapshot = [...stagedFiles];
    const textSnapshot = text;
    const replySnapshot = replyToMessage;
    const mentionsSnapshot = [...mentionedUids];

    // Optimistic temporary identifier & timestamp
    const optimisticId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();
    const messageContent = textSnapshot || (stagedFilesSnapshot.length > 0 ? `Shared ${stagedFilesSnapshot.length} file(s)` : '');

    // 1. Immediately clear composer UI so typing feels completely instant (< 1ms)
    setInputText('');
    if (selectedChatId) {
      chatDraftsRef.current[selectedChatId] = '';
    }
    setStagedFiles([]);
    setReplyToMessage(null);
    setMentionQuery(null);
    setMentionedUids([]);
    if (composerInputRef.current) {
      composerInputRef.current.style.height = 'auto';
    }

    let confirmedMessage: CommunityMessage | PrivateMessage | null = null;

    try {
      // If currently editing an existing message, perform edit update
      if (editingMessage) {
        await MessagingService.editMessage(editingMessage.id, editingMessage.scope, textSnapshot);
        setEditingMessage(null);
        await loadActiveMessages();
        return;
      }

      // 2. Optimistic instant message creation
      if (selectedChatId === 'community') {
        const optimisticMsg: CommunityMessage = {
          id: optimisticId,
          senderUid: currentUser.id,
          senderName: currentUser.full_name || 'FNI Leader',
          senderRole: currentUser.role,
          cellName: currentUser.cell_name,
          content: messageContent,
          category: 'general',
          createdAt: nowIso,
          replyTo: replySnapshot || undefined,
          mentions: mentionsSnapshot.length > 0 ? mentionsSnapshot : undefined,
        };

        setCommunityMessages(prev => [...prev, optimisticMsg]);
        ConversationCacheService.appendMessage(currentUser.id, 'community', optimisticMsg);
      } else {
        const recipientUid = selectedChatId === 'saved_messages' ? currentUser.id : selectedChatId;
        const recipient = allMembers.find(m => m.id === recipientUid);

        const optimisticMsg: PrivateMessage = {
          id: optimisticId,
          senderUid: currentUser.id,
          senderName: currentUser.full_name || 'FNI Leader',
          senderRole: currentUser.role,
          recipientUid,
          recipientName: recipient?.full_name || (selectedChatId === 'saved_messages' ? 'Saved Messages' : 'FNI Member'),
          cellId: currentUser.cell_id,
          cellName: currentUser.cell_name,
          content: messageContent,
          createdAt: nowIso,
          isRead: false,
          replyTo: replySnapshot || undefined,
          mentions: mentionsSnapshot.length > 0 ? mentionsSnapshot : undefined,
        };

        setPrivateMessages(prev => [...prev, optimisticMsg]);
        const convId = selectedChatId === 'saved_messages' ? currentUser.id : selectedChatId;
        ConversationCacheService.appendMessage(currentUser.id, convId, optimisticMsg);
      }

      // 3. Upload attachments if present
      const uploadedAttachments: ChatAttachment[] = [];
      for (const file of stagedFilesSnapshot) {
        const att = await MessagingService.uploadChatAttachment(currentUser?.id || 'guest', file);
        if (att) uploadedAttachments.push(att);
      }
      // Make uploaded media visible on the optimistic bubble while the message commits.
      if (selectedChatId === 'community') {
        setCommunityMessages(previous => previous.map(message => message.id === optimisticId ? { ...message, attachments: uploadedAttachments } : message));
      } else {
        setPrivateMessages(previous => previous.map(message => message.id === optimisticId ? { ...message, attachments: uploadedAttachments } : message));
      }

      // 4. Dispatch confirmed message to Supabase
      if (selectedChatId === 'community') {
        confirmedMessage = await MessagingService.sendCommunityMessage({
          senderUid: currentUser.id,
          senderName: currentUser.full_name || 'FNI Leader',
          senderRole: currentUser.role,
          cellName: currentUser.cell_name,
          content: messageContent,
          category: 'general',
          replyTo: replySnapshot || undefined,
          mentions: mentionsSnapshot.length > 0 ? mentionsSnapshot : undefined,
          attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
        });
      } else {
        const recipientUid = selectedChatId === 'saved_messages' ? currentUser.id : selectedChatId;
        const recipient = allMembers.find(m => m.id === recipientUid);

        confirmedMessage = await MessagingService.sendPrivateMessage({
          senderUid: currentUser.id,
          senderName: currentUser.full_name || 'FNI Leader',
          senderRole: currentUser.role,
          recipientUid,
          recipientName: recipient?.full_name || (selectedChatId === 'saved_messages' ? 'Saved Messages' : 'FNI Member'),
          cellId: currentUser.cell_id,
          cellName: currentUser.cell_name,
          content: messageContent,
          replyTo: replySnapshot || undefined,
          mentions: mentionsSnapshot.length > 0 ? mentionsSnapshot : undefined,
          attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
        });
      }

      // Replace the temporary optimistic ID with the authoritative database message.
      if (confirmedMessage) {
        if (selectedChatId === 'community') {
          setCommunityMessages(previous => {
            const next = [...previous.filter(message => message.id !== optimisticId && message.id !== confirmedMessage!.id), confirmedMessage as CommunityMessage]
              .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            ConversationCacheService.setMessages(currentUser.id, 'community', next);
            return next;
          });
        } else {
          const conversationId = selectedChatId === 'saved_messages' ? currentUser.id : selectedChatId;
          setPrivateMessages(previous => {
            const next = [...previous.filter(message => message.id !== optimisticId && message.id !== confirmedMessage!.id), confirmedMessage as PrivateMessage]
              .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            ConversationCacheService.setMessages(currentUser.id, conversationId, next);
            return next;
          });
        }
      }
    } catch (err: any) {
      // Failed sends must not leave phantom messages on the sender's screen.
      if (selectedChatId === 'community') {
        setCommunityMessages(previous => previous.filter(message => message.id !== optimisticId));
      } else {
        const conversationId = selectedChatId === 'saved_messages' ? currentUser.id : selectedChatId;
        setPrivateMessages(previous => previous.filter(message => message.id !== optimisticId));
        const cached = ConversationCacheService.getMessages<PrivateMessage>(currentUser.id, conversationId) || [];
        ConversationCacheService.setMessages(currentUser.id, conversationId, cached.filter(message => message.id !== optimisticId));
      }
      if (selectedChatId === 'community') {
        const cached = ConversationCacheService.getMessages<CommunityMessage>(currentUser.id, 'community') || [];
        ConversationCacheService.setMessages(currentUser.id, 'community', cached.filter(message => message.id !== optimisticId));
      }
      setInputText(textSnapshot);
      setStagedFiles(stagedFilesSnapshot);
      setSendError(err?.message || 'Message could not be sent.');
    } finally {
      setIsSending(false);
      isSubmittingRef.current = false;
    }
  };

  // Send Sticker
  const handleSendSticker = async (sticker: { emoji: string; label: string }) => {
    if (!selectedChatId) return;
    setShowEmojiPicker(false);
    const content = `${STICKER_PREFIX}${sticker.emoji}:${sticker.label}]]`;
    if (currentUser?.id) {
      MessagingService.recordStickerUsage(currentUser.id, sticker);
      setRecentStickers(MessagingService.getFrequentlyUsedStickers(currentUser.id));
    }
    if (selectedChatId === 'community') {
      await MessagingService.sendCommunityMessage({
        senderUid: currentUser.id,
        senderName: currentUser.full_name || 'FNI Leader',
        senderRole: currentUser.role,
        cellName: currentUser.cell_name,
        content,
      });
    } else {
      const recipientUid = selectedChatId === 'saved_messages' ? currentUser.id : selectedChatId;
      const recipient = allMembers.find(m => m.id === recipientUid);
      await MessagingService.sendPrivateMessage({
        senderUid: currentUser.id,
        senderName: currentUser.full_name || 'FNI Leader',
        senderRole: currentUser.role,
        recipientUid,
        recipientName: recipient?.full_name || 'FNI Member',
        content,
      });
    }
    await loadActiveMessages();
  };

  // Send Custom Image Sticker
  const handleSendCustomSticker = async (sticker: { imageUrl: string; label: string }) => {
    if (!selectedChatId) return;
    setShowEmojiPicker(false);
    const content = `${STICKER_IMG_PREFIX}${sticker.imageUrl}:${sticker.label}]]`;
    if (currentUser?.id) {
      MessagingService.recordStickerUsage(currentUser.id, sticker);
      setRecentStickers(MessagingService.getFrequentlyUsedStickers(currentUser.id));
    }
    if (selectedChatId === 'community') {
      await MessagingService.sendCommunityMessage({
        senderUid: currentUser.id,
        senderName: currentUser.full_name || 'FNI Leader',
        senderRole: currentUser.role,
        cellName: currentUser.cell_name,
        content,
      });
    } else {
      const recipientUid = selectedChatId === 'saved_messages' ? currentUser.id : selectedChatId;
      const recipient = allMembers.find(m => m.id === recipientUid);
      await MessagingService.sendPrivateMessage({
        senderUid: currentUser.id,
        senderName: currentUser.full_name || 'FNI Leader',
        senderRole: currentUser.role,
        recipientUid,
        recipientName: recipient?.full_name || 'FNI Member',
        content,
      });
    }
    await loadActiveMessages();
  };

  // Toggle Favorite Sticker
  const handleToggleFavoriteSticker = (sticker: {
    emoji?: string;
    imageUrl?: string;
    label: string;
    stickerType?: 'custom' | 'favorite' | 'recent' | 'fellowship';
  }) => {
    if (!currentUser?.id) return;
    const fullSticker: CustomSticker = {
      id: sticker.imageUrl ? `fav_img_${sticker.label}_${Date.now()}` : `fav_emo_${sticker.emoji}`,
      stickerType: sticker.stickerType || (sticker.imageUrl ? 'custom' : 'fellowship'),
      label: sticker.label,
      emoji: sticker.emoji,
      imageUrl: sticker.imageUrl,
    };
    MessagingService.toggleFavoriteSticker(currentUser.id, fullSticker);
    setFavoriteStickers(MessagingService.getFavoriteStickers(currentUser.id));
  };

  // Delete Custom Sticker (Instant & Optimistic)
  const handleDeleteCustomSticker = (stickerId: string) => {
    if (!currentUser?.id) return;
    setUserCustomStickers(prev => prev.filter(s => s.id !== stickerId));
    setFavoriteStickers(prev => prev.filter(s => s.id !== stickerId));
    void MessagingService.deleteUserCustomSticker(currentUser.id, stickerId);
  };

  // Open Poll Modal with mobile virtual keyboard dismissal
  const handleOpenPollModal = (e?: React.SyntheticEvent) => {
    if (e) {
      e.stopPropagation();
    }
    // Dismiss virtual keyboard on mobile devices
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    if (composerInputRef.current) {
      composerInputRef.current.blur();
    }
    setShowAttachmentMenu(false);
    if (pollOptions.length < 2) {
      setPollOptions(['', '']);
    }
    setIsPollModalOpen(true);
  };

  // Create Poll
  const handleCreatePoll = async () => {
    if (!currentUser?.id) return;
    if (!selectedChatId) {
      alert('Please open a conversation to share your poll.');
      return;
    }
    if (!pollQuestion.trim()) {
      alert('Please type a question for your poll.');
      return;
    }
    const validOptions = pollOptions.filter(o => o.trim().length > 0);
    if (validOptions.length < 2) {
      alert('Please provide at least 2 poll options.');
      return;
    }

    const pollData: ChatPoll = {
      id: `poll-${Date.now()}`,
      question: pollQuestion.trim(),
      options: validOptions.map((text, idx) => ({
        id: `opt-${idx + 1}`,
        text: text.trim(),
        votes: 0,
        voterUids: [],
      })),
      isAnonymous: pollIsAnonymous,
      allowsMultipleAnswers: pollAllowsMultiple,
      isClosed: false,
      totalVotes: 0,
      createdByUid: currentUser.id,
      createdByName: currentUser.full_name || 'Leader',
      createdAt: new Date().toISOString(),
    };

    const content = `${POLL_PREFIX}${JSON.stringify(pollData)}]]`;

    if (selectedChatId === 'community') {
      await MessagingService.sendCommunityMessage({
        senderUid: currentUser.id,
        senderName: currentUser.full_name || 'FNI Leader',
        senderRole: currentUser.role,
        cellName: currentUser.cell_name,
        content,
      });
    } else {
      const recipientUid = selectedChatId === 'saved_messages' ? currentUser.id : selectedChatId;
      const recipient = allMembers.find(m => m.id === recipientUid);
      await MessagingService.sendPrivateMessage({
        senderUid: currentUser.id,
        senderName: currentUser.full_name || 'FNI Leader',
        senderRole: currentUser.role,
        recipientUid,
        recipientName: recipient?.full_name || 'FNI Member',
        content,
      });
    }

    setIsPollModalOpen(false);
    setPollQuestion('');
    setPollOptions(['', '']);
    setShowAttachmentMenu(false);
    await loadActiveMessages();
  };

  // Vote on Poll
  const handleVotePoll = async (messageId: string, optionId: string, currentContent: string) => {
    const scope = selectedChatId === 'community' ? 'community' : 'private';
    await MessagingService.votePoll(messageId, scope, optionId, currentUser.id, currentContent);
    await loadActiveMessages();
  };

  // ---------------------------------------------------------------------------
  // 5. VOICE NOTE RECORDING
  // ---------------------------------------------------------------------------
  const startVoiceRecording = async () => {
    if (isRecordingVoice || !selectedChatId) return;

    if (!window.isSecureContext) {
      setSendError('Voice notes require a secure connection. Open FNI Cells Connect using its HTTPS address.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setSendError('Voice recording is not supported by this browser. Please update your browser or use the FNI app.');
      return;
    }

    let stream: MediaStream | null = null;
    try {
      setSendError(null);
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;
      voiceRecordingCancelledRef.current = false;
      setIsVoiceRecordingPaused(false);

      // Safari/iOS commonly records AAC in MP4; Chromium/Android generally supports Opus in WebM.
      const isAppleMobile = /iPad|iPhone|iPod/.test(navigator.userAgent)
        || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const candidates = isAppleMobile
        ? ['audio/mp4', 'audio/mp4;codecs=mp4a.40.2', 'audio/aac', 'audio/webm;codecs=opus', 'audio/webm']
        : ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac', 'audio/ogg'];

      const supportedMimeType = typeof MediaRecorder.isTypeSupported === 'function'
        ? candidates.find(type => MediaRecorder.isTypeSupported(type))
        : undefined;

      // Do not force an unsupported MIME type. Let the browser choose its native recorder format.
      const recorder = new MediaRecorder(
        stream,
        supportedMimeType ? { mimeType: supportedMimeType } : undefined
      );
      const actualMimeType = recorder.mimeType || supportedMimeType || 'application/octet-stream';
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = event => {
        if (event.data && event.data.size > 0) chunks.push(event.data);
      };

      recorder.onerror = () => {
        setSendError('The microphone recording stopped unexpectedly. Please try again.');
        try {
          if (recorder.state !== 'inactive') recorder.stop();
        } catch {
          stream?.getTracks().forEach(track => track.stop());
        }
      };

      recorder.onstop = async () => {
        const finalSecs = Math.max(1, recordingSecondsRef.current);
        const formattedDuration = `${Math.floor(finalSecs / 60)}:${(finalSecs % 60).toString().padStart(2, '0')}`;
        const blob = new Blob(chunks, { type: actualMimeType });

        try {
          if (voiceRecordingCancelledRef.current) return;
          if (!blob.size) {
            setSendError('No audio was captured. Check microphone permission and try again.');
            return;
          }
          if (!currentUser?.id) throw new Error('Please sign in again before sending a voice note.');

          const extension = actualMimeType.includes('mp4') ? 'm4a'
            : actualMimeType.includes('aac') ? 'aac'
            : actualMimeType.includes('ogg') ? 'ogg'
            : actualMimeType.includes('wav') ? 'wav'
            : actualMimeType.includes('mpeg') ? 'mp3'
            : 'webm';
          const file = new File(
            [blob],
            `voice-note-${Date.now()}.${extension}`,
            { type: actualMimeType === 'application/octet-stream' ? 'audio/webm' : actualMimeType }
          );

          // Use the same authenticated Supabase attachment pipeline as other chat media.
          // It handles storage upload and its supported fallback; do not duplicate large data URLs here.
          const attachment = await MessagingService.uploadChatAttachment(currentUser.id, file);
          if (!attachment?.path) throw new Error('The voice note could not be uploaded. Please try again.');

          const content = `🎤 Voice Note (${formattedDuration})`;
          if (selectedChatId === 'community') {
            await MessagingService.sendCommunityMessage({
              senderUid: currentUser.id,
              senderName: currentUser.full_name || 'FNI Leader',
              senderRole: currentUser.role,
              cellName: currentUser.cell_name,
              content,
              attachments: [attachment],
            });
          } else {
            const recipientUid = selectedChatId === 'saved_messages' ? currentUser.id : selectedChatId;
            const recipient = allMembers.find(member => member.id === recipientUid);
            await MessagingService.sendPrivateMessage({
              senderUid: currentUser.id,
              senderName: currentUser.full_name || 'FNI Leader',
              senderRole: currentUser.role,
              recipientUid,
              recipientName: recipient?.full_name || 'FNI Member',
              content,
              attachments: [attachment],
            });
          }
          await loadActiveMessages();
        } catch (error: any) {
          console.error('Voice note send failed:', error);
          setSendError(error?.message || 'Your voice note could not be sent. Please try again.');
        } finally {
          stream?.getTracks().forEach(track => track.stop());
          stream = null;
          mediaStreamRef.current = null;
          mediaRecorderRef.current = null;
          setIsRecordingVoice(false);
          setIsVoiceRecordingPaused(false);
          voiceRecordingCancelledRef.current = false;
          if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecordingVoice(true);
      setRecordingSeconds(0);
      recordingSecondsRef.current = 0;
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(seconds => {
          const next = seconds + 1;
          recordingSecondsRef.current = next;
          return next;
        });
      }, 1000);
    } catch (error: any) {
      console.error('Microphone access error:', error);
      stream?.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
      const message = error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError'
        ? 'Microphone permission was denied. Allow microphone access for FNI Cells Connect in your browser or device settings.'
        : error?.name === 'NotFoundError'
          ? 'No microphone was found on this device.'
          : error?.message || 'The microphone is unavailable. Please try again.';
      setSendError(message);
      setIsRecordingVoice(false);
      mediaRecorderRef.current = null;
    }
  };

  const pauseVoiceRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== 'recording') return;
    recorder.pause();
    setIsVoiceRecordingPaused(true);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    recordingTimerRef.current = null;
  };

  const resumeVoiceRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== 'paused') return;
    recorder.resume();
    setIsVoiceRecordingPaused(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    recordingTimerRef.current = setInterval(() => {
      setRecordingSeconds(seconds => {
        const next = seconds + 1;
        recordingSecondsRef.current = next;
        return next;
      });
    }, 1000);
  };

  const cancelVoiceRecording = () => {
    voiceRecordingCancelledRef.current = true;
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    recordingTimerRef.current = null;
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
      return;
    }
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    mediaStreamRef.current = null;
    mediaRecorderRef.current = null;
    setIsRecordingVoice(false);
    setIsVoiceRecordingPaused(false);
  };

  const stopVoiceRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    try {
      recorder.stop();
    } catch (error) {
      console.error('Could not stop voice recording:', error);
      setSendError('The recording could not be completed. Please try again.');
      mediaStreamRef.current?.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
      mediaRecorderRef.current = null;
      setIsRecordingVoice(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  // ---------------------------------------------------------------------------
  // 6. PINNING & UNPINNING
  // ---------------------------------------------------------------------------
  const handleTogglePin = async (msg: CommunityMessage | PrivateMessage, notify = false) => {
    if (isPinning || !currentUser?.id) return;
    setIsPinning(true);
    setOpenMessageMenuId(null);
    setContextMenu(null);

    const wasPinned = Boolean(msg.isPinned);
    const actionLabel = wasPinned ? 'unpin' : 'pin';
    const changedAt = new Date().toISOString();
    const community = selectedChatId === 'community';
    const optimisticPin = community
      ? {
          isPinned: !wasPinned,
          pinnedAt: wasPinned ? undefined : changedAt,
          pinnedBy: wasPinned ? undefined : currentUser.id,
          pinnedByName: wasPinned ? undefined : (currentUser.full_name || 'FNI Member'),
          pinnedNotify: wasPinned ? false : notify,
        }
      : null;

    // Update the visible message and this user's cache immediately; the database
    // RPC below is authoritative and Realtime synchronizes everyone else.
    if (community && optimisticPin) {
      setCommunityMessages(previous => previous.map(item => item.id === msg.id ? { ...item, ...optimisticPin } : item));
      ConversationCacheService.updateMessage<CommunityMessage>(currentUser.id, 'community', msg.id, optimisticPin);
    }

    try {
      const pinnerDetails = {
        uid: currentUser.id,
        name: currentUser.full_name || 'FNI Member',
        content: msg.content,
        recipientUid: 'recipientUid' in msg ? (msg.senderUid === currentUser.id ? msg.recipientUid : msg.senderUid) : undefined,
      };

      const res = community
        ? await MessagingService.setCommunityMessagePin(msg.id, !wasPinned, notify, pinnerDetails)
        : await MessagingService.setPrivateMessagePin(msg.id, currentUser.id, !wasPinned, notify, pinnerDetails);

      if (!res.success) throw new Error(res.error || `Unable to ${actionLabel} message.`);

      // Reconcile quietly after the immediate interaction has completed.
      void loadActiveMessages();
    } catch (err: any) {
      if (community) {
        setCommunityMessages(previous => previous.map(item => item.id === msg.id ? { ...item, isPinned: wasPinned, pinnedAt: (msg as CommunityMessage).pinnedAt, pinnedBy: (msg as CommunityMessage).pinnedBy, pinnedByName: (msg as CommunityMessage).pinnedByName, pinnedNotify: (msg as CommunityMessage).pinnedNotify } : item));
        ConversationCacheService.updateMessage<CommunityMessage>(currentUser.id, 'community', msg.id, {
          isPinned: wasPinned,
          pinnedAt: (msg as CommunityMessage).pinnedAt,
          pinnedBy: (msg as CommunityMessage).pinnedBy,
          pinnedByName: (msg as CommunityMessage).pinnedByName,
          pinnedNotify: (msg as CommunityMessage).pinnedNotify,
        });
      }
      console.error('Error toggling pin:', err);
      alert(err?.message || `Failed to ${actionLabel} message. Please check your connection and try again.`);
    } finally {
      setIsPinning(false);
    }
  };

  // Reactions
  const handleAddReaction = async (msgId: string, emoji: string) => {
    setOpenMessageMenuId(null);
    setContextMenu(null);
    if (selectedChatId === 'community') {
      await MessagingService.reactToCommunityMessage(msgId, emoji, currentUser.id, currentUser.full_name);
    } else {
      await MessagingService.reactToPrivateMessage(msgId, emoji, currentUser.id, currentUser.full_name);
    }
    await loadActiveMessages();
  };

  // Scroll to Message
  const scrollToMessageId = (id: string) => {
    const el = document.getElementById(`msg-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-[#C6A45A]', 'bg-amber-100/50');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-[#C6A45A]', 'bg-amber-100/50');
      }, 2000);
    }
  };

  // Render Poll Component
  const renderPollCard = (msgId: string, content: string) => {
    try {
      const jsonStr = content.slice(POLL_PREFIX.length, -2);
      const poll: ChatPoll = JSON.parse(jsonStr);
      const userHasVoted = poll.options.some(opt => (opt.voterUids || []).includes(currentUser?.id));

      return (
        <div className="p-3.5 rounded-2xl bg-white/95 dark:bg-[#182533] border border-slate-200/80 dark:border-white/10 shadow-xs space-y-3 min-w-[240px] sm:min-w-[280px]">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-0.5">
                📊 {poll.isAnonymous ? 'Anonymous Poll' : 'Public Poll'}
              </span>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                {poll.question}
              </h4>
            </div>
          </div>

          <div className="space-y-2">
            {poll.options.map(opt => {
              const pct = poll.totalVotes > 0 ? Math.round((opt.votes / poll.totalVotes) * 100) : 0;
              const isMyVote = (opt.voterUids || []).includes(currentUser?.id);

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleVotePoll(msgId, opt.id, content)}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                    isMyVote
                      ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200'
                      : 'border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-slate-50/60 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {userHasVoted && (
                    <div
                      className="absolute inset-y-0 left-0 bg-blue-500/15 dark:bg-blue-500/25 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  )}

                  <div className="relative z-10 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        isMyVote ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-400'
                      }`}>
                        {isMyVote && <Check className="w-2.5 h-2.5" />}
                      </div>
                      <span className="font-semibold truncate">{opt.text}</span>
                    </div>

                    {userHasVoted && (
                      <span className="font-bold text-xs shrink-0 text-slate-600 dark:text-slate-300">
                        {pct}% ({opt.votes})
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 dark:border-white/5">
            <span>{poll.totalVotes} total vote{poll.totalVotes === 1 ? '' : 's'}</span>
            {userHasVoted && <span className="text-emerald-600 font-bold">✓ Voted</span>}
          </div>
        </div>
      );
    } catch {
      return <div>Invalid poll structure</div>;
    }
  };

  // Resolve attachment URLs. Private cloud objects use a fresh signed URL per device.
  const getAttachmentUrl = (att: ChatAttachment) => {
    if (!att) return '';
    const raw = att.path || (att as any).url || (att as any).dataUrl || '';
    if (!raw) return '';
    if (/^(data:|blob:|https?:\/\/)/i.test(raw)) return raw;
    return attachmentUrls[raw] || '';
  };

  // Save/share an attachment using the native phone share sheet where available.
  // On iOS this exposes Save Image/Save to Files; on Android it exposes installed
  // Gallery/Photos and file destinations. Browsers fall back to a real download.
  const handleSaveAttachment = async (url: string, fileName: string) => {
    if (!url) return;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Download failed (${response.status}).`);
      const blob = await response.blob();
      const safeName = (fileName || 'FNI-attachment').replace(/[\\/:*?"<>|]/g, '_');
      const file = new File([blob], safeName, { type: blob.type || 'application/octet-stream' });

      if (Capacitor.isNativePlatform()) {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
          reader.onerror = () => reject(new Error('Could not prepare this file for sharing.'));
          reader.readAsDataURL(blob);
        });
        const saved = await Filesystem.writeFile({
          path: safeName,
          data: base64,
          directory: Directory.Cache,
        });
        await Share.share({
          title: safeName,
          files: [saved.uri],
          dialogTitle: 'Save or share attachment',
        });
        return;
      }

      if (typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        await navigator.share({ title: safeName, files: [file] });
        return;
      }

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = safeName;
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (error: any) {
      if (error?.name === 'AbortError') return;
      console.error('FNI attachment save failed:', error);
      window.alert(error?.message || 'This attachment could not be saved. Please try again.');
    }
  };

  // Render Formatted Message Body with Clickable Mentions
  const renderMessageTextWithMentions = (text: string) => {
    if (!text) return null;
    const mentionRegex = /@([A-Za-z0-9_.\- ]+?)(?=[.,!?:;]?(?:\s|$))/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      const matchedName = match[1].trim();
      const member = allMembers.find(
        m => (m.full_name || m.name || '').toLowerCase() === matchedName.toLowerCase()
      );

      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      if (member) {
        parts.push(
          <button
            key={`mention-${match.index}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedUserProfile({
                id: member.id,
                fullName: member.full_name || member.name,
                role: member.role,
                avatarUrl: member.avatar_url || member.photo_url,
                bannerUrl: (member as any).banner_url || (member as any).bannerUrl || localStorage.getItem(`fni_profile_banner_${member.id}`) || (member.id === currentUser?.id ? currentUser?.banner_url : undefined),
                cellName: member.cell_name,
                phone: member.phone_number || member.phone,
                email: member.email,
              });
            }}
            className="inline-flex items-center text-blue-600 dark:text-blue-400 font-bold hover:underline bg-blue-50/90 dark:bg-blue-900/40 px-1 py-0.2 rounded-md mx-0.5 cursor-pointer"
          >
            @{matchedName}
          </button>
        );
      } else {
        parts.push(match[0]);
      }

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts;
  };

  const renderMessageContent = (msg: CommunityMessage | PrivateMessage) => {
    if (msg.content.startsWith(POLL_PREFIX)) {
      return renderPollCard(msg.id, msg.content);
    }
    if (msg.content.startsWith(STICKER_IMG_PREFIX)) {
      const contentBody = msg.content.slice(STICKER_IMG_PREFIX.length, -2);
      const firstColon = contentBody.indexOf(':');
      const imgUrl = firstColon !== -1 ? contentBody.slice(0, firstColon) : contentBody;
      const label = firstColon !== -1 ? contentBody.slice(firstColon + 1) : '';
      const isFav = favoriteStickers.some(s => s.imageUrl === imgUrl);
      return (
        <div className="group/sticker relative py-1 text-center select-none">
          <img
            src={imgUrl}
            alt={label || 'Custom Sticker'}
            className="max-w-[170px] max-h-[170px] object-contain mx-auto rounded-2xl drop-shadow-md transition-transform group-hover/sticker:scale-105"
          />
          {label && (
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1 block">
              {label}
            </span>
          )}
        </div>
      );
    }
    if (msg.content.startsWith(STICKER_PREFIX)) {
      const parts = msg.content.slice(STICKER_PREFIX.length, -2).split(':');
      const emoji = parts[0];
      const label = parts[1];
      return (
        <div className="group/sticker relative text-center py-1 select-none">
          <span className="text-5xl block animate-bounce-short">{emoji}</span>
          {label && <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-1 block">{label}</span>}
        </div>
      );
    }
    return <span className="whitespace-pre-wrap break-words">{renderMessageTextWithMentions(msg.content)}</span>;
  };

  // Filtered tutors for Home Page discovery
  const filteredHomeTutors = tutorList.filter(t => {
    if (!homeTutorSearch.trim()) return true;
    const q = homeTutorSearch.toLowerCase();
    const name = (t.full_name || t.name || '').toLowerCase();
    const cell = (t.cell_name || '').toLowerCase();
    return name.includes(q) || cell.includes(q);
  });

  // ---------------------------------------------------------------------------
  // 7. RENDER VIEW
  // ---------------------------------------------------------------------------
  return (
    <div
      style={isMobileEnvironment() && viewportHeight ? { height: `${viewportHeight}px` } : undefined}
      className="fni-messages-stitch h-full w-full flex flex-col overflow-hidden bg-slate-50 dark:bg-[#0c1421] rounded-none border-0"
    >
      <div className="flex-1 flex overflow-hidden h-full">
        {/* =====================================================================
            LEFT PANE: RECENT CONVERSATIONS & SEARCH (Desktop Left Sidebar / Mobile List View)
        ===================================================================== */}
        <div
          className={`${
            mobileScreen === 'chat' ? 'hidden md:flex' : 'flex'
          } w-full md:w-[320px] lg:w-[360px] xl:w-[400px] fni-messages-list-pane flex-col border-r border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0e1621] shrink-0 overflow-hidden h-full`}
        >
          {/* Top Header Bar */}
          <div className="fni-messages-list-header p-3.5 border-b border-slate-200/80 dark:border-white/10 space-y-2.5 shrink-0 bg-white dark:bg-[#0e1621]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {onToggleSidebar && (
                  <button
                    type="button"
                    onClick={onToggleSidebar}
                    className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                    title="Main Menu"
                    aria-label="Open main menu"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                )}
                {onBack && !onToggleSidebar && (
                  <button
                    type="button"
                    onClick={onBack}
                    className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                    title="Back to Dashboard"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative w-9 h-9 rounded-full bg-[#142B4A] text-[#D9BD7B] flex items-center justify-center font-black text-[11px] tracking-wide shrink-0">
                    FNI
                    <span className="absolute right-0 bottom-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#0e1621]" aria-label="Online" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-sm leading-tight text-slate-900 dark:text-white">FNI Messages</span>
                    <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[#785A1B] dark:text-[#D9BD7B]">Cells Connect</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pill Search Input with Compose Button */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search people, @usernames, messages..."
                  className="fni-messages-search-input w-full pl-9 pr-7 py-1.5 rounded-full bg-slate-100 dark:bg-[#242f3d] text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#2AABEE]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(true)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 hover:text-[#2AABEE] dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer shrink-0"
                title="New Message & Tutor Directory"
              >
                <SquarePen className="w-4 h-4" />
              </button>
            </div>

            {/* Folder Filter Tabs (Personal Chat Folders) */}
            <div className="fni-messages-category-tabs flex items-center gap-1 overflow-x-auto custom-scrollbar pt-1 pb-0.5 text-xs select-none">
              {/* All Chats Tab (Always exists, not deletable) */}
              <button
                type="button"
                onClick={() => setActiveFolderId('all')}
                className={`fni-messages-folder-tab relative pb-1.5 font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 px-2.5 text-xs shrink-0 ${
                  activeFolderId === 'all'
                    ? 'text-[#2AABEE] border-b-2 border-[#2AABEE]'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <span>All Chats</span>
                {allChatsUnreadCount > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      activeFolderId === 'all'
                        ? 'bg-[#2AABEE] text-white'
                        : 'bg-slate-200 dark:bg-[#242f3d] text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {allChatsUnreadCount}
                  </span>
                )}
              </button>

              {/* Personal Tab (Built-in) */}
              <button
                type="button"
                onClick={() => setActiveFolderId('personal')}
                className={`fni-messages-folder-tab relative pb-1.5 font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 px-2.5 text-xs shrink-0 ${
                  activeFolderId === 'personal'
                    ? 'text-[#2AABEE] border-b-2 border-[#2AABEE]'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <span>Personal</span>
                {personalUnreadCount > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      activeFolderId === 'personal'
                        ? 'bg-[#2AABEE] text-white'
                        : 'bg-slate-200 dark:bg-[#242f3d] text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {personalUnreadCount}
                  </span>
                )}
              </button>

              {/* Groups Tab (Built-in) */}
              <button
                type="button"
                onClick={() => setActiveFolderId('groups')}
                className={`fni-messages-folder-tab relative pb-1.5 font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 px-2.5 text-xs shrink-0 ${
                  activeFolderId === 'groups'
                    ? 'text-[#2AABEE] border-b-2 border-[#2AABEE]'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <span>Groups</span>
                {groupsUnreadCount > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      activeFolderId === 'groups'
                        ? 'bg-[#2AABEE] text-white'
                        : 'bg-slate-200 dark:bg-[#242f3d] text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {groupsUnreadCount}
                  </span>
                )}
              </button>

              {/* Personal Chat Folders */}
              {chatFolders.map(f => {
                const isActive = activeFolderId === f.id;
                const IconComponent = FOLDER_ICONS[f.icon]?.icon || Folder;
                const colorConfig = FOLDER_COLORS[f.color] || FOLDER_COLORS.blue;
                const unread = folderUnreadMap.get(f.id) || 0;

                return (
                  <div key={f.id} className="relative shrink-0 flex items-center">
                    <button
                      type="button"
                      onClick={() => setActiveFolderId(f.id)}
                      className={`relative pb-1.5 font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 px-2.5 text-xs ${
                        isActive
                          ? `${colorConfig.text} border-b-2 ${colorConfig.border}`
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                      }`}
                    >
                      <IconComponent className="w-3.5 h-3.5" />
                      <span>{f.name}</span>
                      {unread > 0 && (
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                            isActive
                              ? colorConfig.activeClass
                              : 'bg-slate-200 dark:bg-[#242f3d] text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {unread}
                        </span>
                      )}
                    </button>

                    {isActive && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFolderToEdit(f);
                          setIsFolderModalOpen(true);
                        }}
                        className="p-1 mb-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                        title="Folder Settings"
                      >
                        <Settings className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  setCreateGroupError(null);
                  setGroupCreationNotice(null);
                  setIsCreateGroupOpen(true);
                }}
                className="pb-1.5 px-2 text-[#785A1B] dark:text-[#D9BD7B] hover:opacity-80 transition-colors cursor-pointer flex items-center gap-1 shrink-0 font-semibold text-[11px]"
                title="Create a group conversation"
              >
                <Users className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New Group</span>
              </button>

              {/* Create / Manage Folder Button */}
              <button
                type="button"
                onClick={() => {
                  setFolderToEdit(null);
                  setIsFolderModalOpen(true);
                }}
                className="pb-1.5 px-2 text-slate-400 hover:text-[#2AABEE] transition-colors cursor-pointer flex items-center gap-1 shrink-0 font-medium text-[11px]"
                title="Create or manage chat folders"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="hidden sm:inline">New Folder</span>
              </button>
            </div>
          </div>

          {/* Conversations List */}
          <div className="fni-messages-conversation-list flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-white/5 bg-white dark:bg-[#17212b]">
            {groupChatsError && <div role="alert" className="px-3 py-2 text-xs text-rose-600 dark:text-rose-300">{groupChatsError}</div>}
            {groupCreationNotice && <div role="status" className="mx-3 mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-200">{groupCreationNotice}</div>}
            {filteredContacts.map(c => {
              const isSelected = selectedChatId === c.id;
              const isPinned = c.isPinned;
              const isOfficialCommunity = c.id === 'community';
              const isSaved = c.id === 'saved_messages';
              const isGroupChat = c.type === 'group';

              return (
                <div
                  key={c.id}
                  className={`fni-message-row group relative w-full flex items-center gap-3 p-3 text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#2AABEE]/15 dark:bg-[#2b5278]/40 border-l-4 border-l-[#2AABEE]'
                      : 'hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                  onClick={() => {
                    if (isGroupChat) {
                      setSelectedChatId(c.id);
                      setMobileScreen('chat');
                      setInputText('');
                    } else {
                      openConversation(c.id);
                    }
                  }}
                >
                  {/* Avatar Circle */}
                  <div className="relative shrink-0">
                    {isSaved ? (
                      <div className="w-12 h-12 rounded-full bg-[#2AABEE] text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <Bookmark className="w-6 h-6 fill-white text-white" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-[#142B4A] text-[#C6A45A] font-black text-sm flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700 shadow-2xs">
                        {c.avatarUrl ? (
                          <img src={c.avatarUrl} alt={c.name} className="w-full h-full object-cover" />
                        ) : (
                          c.name.slice(0, 2).toUpperCase()
                        )}
                      </div>
                    )}
                    {c.isOnline && !isSaved && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-[#0e1621]" />
                    )}
                  </div>

                  {/* Contact Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                          {c.name}
                        </span>
                        {(isOfficialCommunity || isGroupChat) && (
                          <span title={isOfficialCommunity ? 'Official FNI Community' : 'FNI Group Chat'} className="shrink-0">
                            <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0 ml-1">
                        {c.lastMessageTime}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-1 text-xs text-slate-500">
                      <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                        {c.lastMessage}
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isPinned && (
                          <span title="Pinned conversation">
                            <Pin className="w-3.5 h-3.5 text-slate-400 rotate-45" />
                          </span>
                        )}
                        {c.unreadCount && c.unreadCount > 0 ? (
                          <span className="min-w-5 h-5 px-1.5 rounded-full bg-[#2AABEE] text-white text-[10px] font-bold flex items-center justify-center">
                            {c.unreadCount}
                          </span>
                        ) : null}
                        {/* Chat Options trigger */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveChatActionMenuId(activeChatActionMenuId === c.id ? null : c.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-opacity"
                          title="Chat Options"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Dropdown Menu for Chat Actions (Pin / Move) */}
                  {activeChatActionMenuId === c.id && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-2 top-10 z-30 w-44 rounded-2xl bg-white dark:bg-[#182533] border border-slate-200 dark:border-white/10 shadow-xl py-1 text-xs text-slate-800 dark:text-slate-200 animate-fadeIn"
                    >
                      <button
                        type="button"
                        onClick={() => handleTogglePinChat(c.id)}
                        className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2 font-semibold"
                      >
                        <Pin className="w-3.5 h-3.5 text-blue-500" />
                        <span>{isPinned ? 'Unpin from Top' : 'Pin to Top'}</span>
                      </button>

                      {isPinned && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleMovePinnedChat(c.id, 'up')}
                            className="w-full px-3 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2"
                          >
                            <ArrowUp className="w-3.5 h-3.5 text-slate-500" />
                            <span>Move Up</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMovePinnedChat(c.id, 'down')}
                            className="w-full px-3 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2"
                          >
                            <ArrowDown className="w-3.5 h-3.5 text-slate-500" />
                            <span>Move Down</span>
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setActiveChatActionMenuId(null);
                          setChatToClear({ id: c.id, name: c.name });
                          setClearChatForEveryone(false);
                          setShowClearChatModal(true);
                        }}
                        className="w-full px-3 py-1.5 text-left hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 text-rose-600 dark:text-rose-400 font-semibold cursor-pointer border-t border-slate-100 dark:border-white/5"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        <span>Clear History</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredContacts.length === 0 && (
              activeFolderObj ? (
                <div className="p-8 text-center text-slate-400 space-y-3">
                  <div className={`w-12 h-12 mx-auto rounded-3xl flex items-center justify-center ${FOLDER_COLORS[activeFolderObj.color]?.bg || 'bg-blue-50 dark:bg-white/5'} ${FOLDER_COLORS[activeFolderObj.color]?.text || 'text-[#2AABEE]'}`}>
                    {React.createElement(FOLDER_ICONS[activeFolderObj.icon]?.icon || Folder, { className: 'w-6 h-6' })}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      This folder is empty
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                      Add conversations to {activeFolderObj.name} to quickly organize your chats.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFolderToEdit(activeFolderObj);
                      setIsFolderModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-[#2AABEE] hover:bg-[#2090cc] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Add Chats</span>
                  </button>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">No conversations match your search.</p>
                  <button
                    type="button"
                    onClick={() => setIsSettingsModalOpen(true)}
                    className="mt-3 text-xs text-blue-600 font-bold hover:underline cursor-pointer"
                  >
                    Browse Tutor Directory
                  </button>
                </div>
              )
            )}
          </div>
        </div>

        {/* =====================================================================
            RIGHT PANE: DEFAULT HOME PAGE (When no chat selected) OR CONVERSATION VIEW
        ===================================================================== */}
        {!selectedChatId ? (
          /* ===================================================================
             1. DEFAULT FNI COMMUNICATION HOME PAGE
             Rendered when no conversation is selected (Desktop right pane & Mobile default)
             Strictly NO blank message composer is shown!
          =================================================================== */
          <div
            className={`${
              mobileScreen === 'chat' ? 'hidden md:flex' : 'hidden md:flex'
            } flex-1 flex-col overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-[#0c1421] p-6 sm:p-10 justify-between h-full min-w-0`}
          >
            <div className="max-w-3xl mx-auto w-full space-y-8 my-auto">
              {/* Welcoming Hero Card */}
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-blue-600/10 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-xs border border-blue-200/50 dark:border-blue-500/20">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  FNI Communication Hub
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto leading-relaxed">
                  Connect with registered fellowship tutors, participate in church discussions, conduct live audio/video calls, and share study materials.
                </p>
              </div>

              {/* Discover & Start Chat with Registered Tutors */}
              <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#111c2d] border border-slate-200/80 dark:border-white/10 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span>Discover Registered Tutors</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Select any active tutor to start a private conversation or place a call
                    </p>
                  </div>
                  <div className="relative sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={homeTutorSearch}
                      onChange={e => setHomeTutorSearch(e.target.value)}
                      placeholder="Find tutor by name or cell..."
                      className="w-full pl-8 pr-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                </div>

                {/* Tutor Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                  {filteredHomeTutors.map(tutor => {
                    const name = tutor.full_name || tutor.name || 'FNI Tutor';
                    const cell = tutor.cell_name || tutor.cell || 'Cell Leader';
                    const isOnline = onlineMemberIds.has(tutor.id);
                    const lastSeenLabel = isOnline ? 'Online now' : formatMemberLastSeen(memberLastSeen[tutor.id]);

                    return (
                      <div
                        key={tutor.id}
                        className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 hover:border-blue-400 dark:hover:border-blue-500 transition-all flex items-center justify-between gap-2.5 group"
                      >
                        <div
                          onClick={() => {
                            openConversation(tutor.id);
                          }}
                          className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
                        >
                          <div className="relative shrink-0">
                            <div className="w-10 h-10 rounded-full bg-[#142B4A] text-[#C6A45A] font-bold text-xs flex items-center justify-center overflow-hidden border border-slate-200 dark:border-white/10">
                              {tutor.avatar_url ? (
                                <img src={tutor.avatar_url} alt={name} className="w-full h-full object-cover" />
                              ) : (
                                name.slice(0, 2).toUpperCase()
                              )}
                            </div>
                            {isOnline && (
                              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#111c2d]" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-slate-900 dark:text-white truncate group-hover:text-blue-600 transition-colors">
                              {name}
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              {cell}
                            </p>
                            <p className={`text-[10px] truncate ${isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                              {lastSeenLabel}
                            </p>
                          </div>
                        </div>

                        {/* Direct Action Buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              openConversation(tutor.id);
                            }}
                            className="p-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors cursor-pointer"
                            title="Chat with Tutor"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
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
                            }}
                            className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 transition-colors cursor-pointer"
                            title="Voice Call"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Hub Portals */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    openConversation('community');
                  }}
                  className="p-4 rounded-2xl bg-white dark:bg-[#111c2d] border border-slate-200/80 dark:border-white/10 text-left hover:border-blue-500 transition-all shadow-2xs group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                    <Users className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                    Community Forum
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Open FNI Community to communicate with active members
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setShowCallHistoryModal(true)}
                  className="p-4 rounded-2xl bg-white dark:bg-[#111c2d] border border-slate-200/80 dark:border-white/10 text-left hover:border-blue-500 transition-all shadow-2xs group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                    <Phone className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                    Call Logs & Meetings
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Review past voice and video calls, missed calls, and meeting logs
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(true)}
                  className="p-4 rounded-2xl bg-white dark:bg-[#111c2d] border border-slate-200/80 dark:border-white/10 text-left hover:border-blue-500 transition-all shadow-2xs group cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                    <Settings className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                    Settings & Preferences
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Configure microphone, camera, notifications, and privacy
                  </p>
                </button>
              </div>
            </div>

            {/* Bottom Footer Note */}
            <div className="text-center pt-6 text-[11px] text-slate-400">
              <span>Select any conversation or tutor from the left panel to begin messaging.</span>
            </div>
          </div>
        ) : selectedGroupChat ? (
          <GroupChatConversation
            group={selectedGroupChat}
            currentUserId={currentUser?.id || ''}
            onBack={() => { setSelectedChatId(null); setMobileScreen('list'); }}
            onVoiceMeeting={() => startGroupMeeting({ title: selectedGroupChat.name, callType: 'voice' })}
            onVideoMeeting={() => startGroupMeeting({ title: selectedGroupChat.name, callType: 'video' })}
          />
        ) : (
          /* ===================================================================
             2. ACTIVE CONVERSATION VIEW (Rendered when a chat is open)
             Occupies full available screen on mobile, right pane on desktop
          =================================================================== */
          <div
            className={`${
              mobileScreen === 'list' ? 'hidden md:flex' : 'flex'
            } flex-1 flex-col overflow-hidden relative bg-[#0e1621] h-full min-w-0`}
          >
            {/* Top Audio Player Bar (Image 1) */}
            {activeAudioPlayer && (
              <div className="fni-audio-player-bar bg-[#182533] text-white px-4 py-2 flex items-center justify-between gap-3 text-xs border-b border-white/10 z-30 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => handlePlayAudio(activeAudioPlayer.url, activeAudioPlayer.title)}
                    className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 shrink-0 cursor-pointer"
                  >
                    {activeAudioPlayer.isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                  <div className="min-w-0">
                    <p className="font-bold truncate text-xs">{activeAudioPlayer.title}</p>
                    <p className="text-[10px] text-blue-300">FNI Voice & Audio Stream</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10">1.0x</span>
                  <button
                    type="button"
                    onClick={() => setActiveAudioPlayer(null)}
                    className="p-1 rounded-full hover:bg-white/10 text-white/70"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Chat Header Bar (FNI Layout) */}
            <div className="px-3 sm:px-4 py-2 bg-[#EDF5FC] dark:bg-[#1C2636] border-b border-[#DCEAF6] dark:border-white/10 flex items-center justify-between shrink-0 z-20 shadow-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Mobile Back Button returning to list */}
                <button
                  type="button"
                  onClick={() => setMobileScreen('list')}
                  className="md:hidden p-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-white/80 hover:text-white transition-colors cursor-pointer"
                  title="Back to conversations"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                {/* User/Chat Header Avatar & Titles */}
                <div
                  onClick={() => {
                    if (activeContact?.type === 'community' || selectedChatId === 'community') {
                      setIsGroupInfoModalOpen(true);
                    } else if (activeContact?.id && activeContact.id !== 'saved_messages') {
                      const m = allMembers.find(mem => mem.id === activeContact.id) || tutorList.find(t => t.id === activeContact.id);
                      if (m) {
                        setSelectedUserProfile({
                          id: m.id,
                          fullName: m.full_name || m.name,
                          role: m.role,
                          avatarUrl: m.avatar_url || m.photo_url,
                          bannerUrl: (m as any).banner_url || (m as any).bannerUrl || localStorage.getItem(`fni_profile_banner_${m.id}`) || (m.id === currentUser?.id ? currentUser?.banner_url : undefined),
                          cellName: m.cell_name || m.cell,
                          phone: m.phone_number || m.phone,
                          email: m.email,
                        });
                      }
                    }
                  }}
                  className="flex items-center gap-2.5 cursor-pointer min-w-0 select-none"
                >
                  {selectedChatId === 'saved_messages' ? (
                    <div className="w-10 h-10 rounded-full bg-[#2AABEE] text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <Bookmark className="w-5 h-5 fill-white text-white" />
                    </div>
                  ) : (
                    <div className="relative w-10 h-10 rounded-full bg-[#142B4A] text-[#C6A45A] font-bold text-xs sm:text-sm flex items-center justify-center overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 shadow-2xs">
                      {activeContact?.avatarUrl ? (
                        <img src={activeContact.avatarUrl} alt={activeContact.name} className="w-full h-full object-cover" />
                      ) : (
                        activeContact?.name?.slice(0, 2).toUpperCase() || 'FN'
                      )}
                      {activeContact?.isOnline && selectedChatId !== 'saved_messages' && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#17212b]" aria-label="Online" />
                      )}
                    </div>
                  )}

                  <div className="min-w-0 pr-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate max-w-[150px] sm:max-w-[280px]">
                        {activeContact?.name || (selectedChatId === 'saved_messages' ? 'Saved Messages' : 'FNI Community')}
                      </h3>
                      {selectedChatId === 'community' && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-bold border border-amber-500/20" title="Official Ministerial Community">
                          <ShieldCheck className="w-3 h-3 text-amber-500" />
                        </span>
                      )}
                    </div>
                    <p className={`text-[11px] truncate ${activeContact?.isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                      {selectedChatId === 'saved_messages'
                        ? 'Private notes · Only you'
                        : selectedChatId === 'community'
                        ? `${allMembers.length} members · ${allMembers.filter(member => onlineMemberIds.has(member.id)).length} online`
                        : activeContact?.isOnline
                        ? 'Online now'
                        : formatMemberLastSeen(activeContact?.lastSeenAt)}
                    </p>
                  </div>
                </div>
              </div>

              {/* WhatsApp-style chat actions: voice, video, search only */}
              <div className="flex items-center gap-1 sm:gap-1.5 text-slate-600 dark:text-slate-300">
                <button
                  type="button"
                  onClick={handleStartVoiceCall}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-emerald-500 cursor-pointer transition-colors"
                  title="Voice call"
                  aria-label="Voice call"
                >
                  <Phone className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={handleStartVideoCall}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-[#2AABEE] cursor-pointer transition-colors"
                  title="Video call"
                  aria-label="Video call"
                >
                  <Video className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsSearchInChatOpen(v => !v)}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-[#2AABEE] cursor-pointer transition-colors"
                  title="Search in chat"
                  aria-label="Search in chat"
                >
                  <Search className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedChatId === 'community') {
                      setIsGroupInfoModalOpen(true);
                      return;
                    }
                    if (!activeContact?.id || activeContact.id === 'saved_messages') return;
                    const member = allMembers.find(person => person.id === activeContact.id)
                      || tutorList.find(person => person.id === activeContact.id);
                    if (!member) return;
                    setSelectedUserProfile({
                      id: member.id,
                      fullName: member.full_name || member.name,
                      role: member.role,
                      avatarUrl: member.avatar_url || member.photo_url,
                      cellName: member.cell_name || member.cell,
                      phone: member.phone_number || member.phone,
                      email: member.email,
                    });
                  }}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-[#2AABEE] cursor-pointer transition-colors"
                  title={selectedChatId === 'community' ? 'Group information' : 'View profile'}
                  aria-label={selectedChatId === 'community' ? 'Group information' : 'View profile'}
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* In-Chat Search Bar */}
            {isSearchInChatOpen && (
              <div className="px-3.5 py-2 bg-slate-100 dark:bg-[#182533] border-b border-slate-200 dark:border-white/10 flex items-center gap-2 text-xs z-15 shrink-0 animate-fadeIn">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={searchInChatQuery}
                  onChange={e => setSearchInChatQuery(e.target.value)}
                  placeholder="Search in this chat..."
                  autoFocus
                  className="flex-1 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none text-xs"
                />
                {searchInChatQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchInChatQuery('')}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsSearchInChatOpen(false);
                    setSearchInChatQuery('');
                  }}
                  className="text-xs font-semibold text-[#2AABEE] hover:underline"
                >
                  Done
                </button>
              </div>
            )}

            {/* Telegram-style Pinned Message Floating Bar */}
            {allPinnedMessages.length > 0 && currentPinnedBannerMessage && (
              <div className="px-2.5 sm:px-4 py-1.5 shrink-0 z-20">
                <div
                  onClick={handleCyclePinnedMessage}
                  className="rounded-2xl bg-[#F5EDD9] dark:bg-[#253145] backdrop-blur-md border border-[#D9BD7B]/45 dark:border-[#D9BD7B]/25 shadow-xs px-3.5 py-2 flex items-center justify-between gap-3 text-xs cursor-pointer hover:bg-[#F0E5C9] dark:hover:bg-[#303E54] transition-all select-none group"
                  title="Tap to jump to pinned message"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Vertical Cyan Accent Bar */}
                    <div className="w-[3px] self-stretch rounded-full bg-[#B18A3C] dark:bg-[#D9BD7B] shrink-0 min-h-[30px]" />

                    {/* Text Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-[#785A1B] dark:text-[#D9BD7B] tracking-tight block">
                          Pinned Message{allPinnedMessages.length > 1 ? ` (${activePinnedIndex + 1}/${allPinnedMessages.length})` : ''}
                        </span>
                      </div>
                      <p className="truncate text-[#354454] dark:text-[#E8EDF5] text-xs sm:text-[13px] font-normal leading-snug mt-0.5">
                        {currentPinnedBannerMessage.content}
                      </p>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    {allPinnedMessages.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setIsPinnedModalOpen(true)}
                        className="p-1 rounded-full text-slate-400 hover:text-[#2AABEE] hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                        title="View all pinned messages"
                        aria-label="View all pinned messages"
                      >
                        <List className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (canPin) {
                          handleTogglePin(currentPinnedBannerMessage);
                        } else {
                          setActivePinnedIndex(prev => (prev + 1) % allPinnedMessages.length);
                        }
                      }}
                      className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                      title={canPin ? "Unpin message" : "Dismiss pinned message"}
                      aria-label="Unpin or dismiss message"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Message Stream */}
            <div
              ref={messageStreamRef}
              className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar p-3 sm:p-4 space-y-3 fni-chat-wallpaper"
              style={userWallpaperColor ? { backgroundColor: userWallpaperColor } : undefined}
            >
              {isLoadingChat && currentMessages.length === 0 ? (
                <div className="h-full flex flex-col justify-end p-4 space-y-3 animate-pulse">
                  <div className="flex justify-start">
                    <div className="h-10 w-44 rounded-2xl bg-white/20 dark:bg-white/10" />
                  </div>
                  <div className="flex justify-end">
                    <div className="h-12 w-60 rounded-2xl bg-[#007a66]/30 dark:bg-[#2b5278]/40" />
                  </div>
                  <div className="flex justify-start">
                    <div className="h-14 w-52 rounded-2xl bg-white/20 dark:bg-white/10" />
                  </div>
                  <div className="flex justify-end">
                    <div className="h-9 w-36 rounded-2xl bg-[#007a66]/30 dark:bg-[#2b5278]/40" />
                  </div>
                </div>
              ) : currentMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-white/90">
                  <div className="p-4 rounded-3xl bg-black/30 backdrop-blur-md max-w-sm space-y-2 border border-white/15">
                    <p className="font-bold text-sm">No messages here yet</p>
                    <p className="text-xs text-white/80">
                      Send a message, scripture reading, prayer request, voice note, or poll below!
                    </p>
                  </div>
                </div>
              ) : (
                currentMessages.map((msg, index) => {
                  const isMine = msg.senderUid === currentUser?.id;
                  const formattedTime = new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const isSwiping = swipingMessageId === msg.id;

                  const prevMsg = index > 0 ? currentMessages[index - 1] : null;
                  const currentDateLabel = getMessageDateLabel(msg.createdAt);
                  const prevDateLabel = prevMsg ? getMessageDateLabel(prevMsg.createdAt) : null;
                  const showDateHeader = !prevMsg || currentDateLabel !== prevDateLabel;

                  return (
                    <React.Fragment key={msg.id}>
                      {/* Centered Date Separator (Matches Reference) */}
                      {showDateHeader && (
                        <div className="flex justify-center my-3 select-none">
                          <span className="px-3.5 py-0.5 rounded-full bg-black/40 text-white text-[11px] font-semibold backdrop-blur-md shadow-xs border border-white/5">
                            {currentDateLabel}
                          </span>
                        </div>
                      )}

                      <div
                        id={`msg-${msg.id}`}
                        onTouchStart={e => handleTouchStart(msg, e)}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={() => handleTouchEnd(msg)}
                        className={`group relative flex items-end select-none w-full ${
                          isMine ? 'justify-end' : 'justify-start gap-2'
                        }`}
                        style={{
                          transform: isSwiping ? `translateX(${swipeOffset}px)` : 'none',
                          transition: isSwiping ? 'none' : 'transform 0.2s ease',
                        }}
                      >
                        {/* Swipe to reply reveal indicator */}
                        {isSwiping && swipeOffset < -20 && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md animate-scaleIn pointer-events-none z-10">
                            <Reply className="w-4 h-4" />
                          </div>
                        )}

                        {/* Avatar for other users */}
                        {!isMine && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              const member = allMembers.find(m => m.id === msg.senderUid);
                              if (member) {
                                setSelectedUserProfile({
                                  id: member.id,
                                  fullName: member.full_name || member.name,
                                  role: member.role,
                                  avatarUrl: member.avatar_url || member.photo_url,
                                  cellName: member.cell_name,
                                  phone: member.phone_number || member.phone,
                                  email: member.email,
                                });
                              }
                            }}
                            className="w-7 h-7 rounded-full bg-[#142B4A] text-[#C6A45A] font-bold text-[10px] flex items-center justify-center shrink-0 mb-1 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                            title="View user profile"
                          >
                            {msg.senderName?.slice(0, 2).toUpperCase() || 'FN'}
                          </div>
                        )}

                        {/* Chat Bubble Container with Floating Action Overlay */}
                        <div className={`relative max-w-[85%] sm:max-w-[72%] ${isMine ? 'ml-auto' : 'mr-auto'}`}>
                          {/* Chat Bubble (FNI styling) - Click or tap opens reactions and message options */}
                          <div
                            onClick={e => {
                              // If text is being actively highlighted/selected with mouse, do not pop menu
                              const sel = window.getSelection();
                              if (sel && sel.toString().trim().length > 0) return;
                              if (Math.abs(swipeOffset) < 10) {
                                handleMessageContextMenu(e, msg);
                              }
                            }}
                            onContextMenu={e => handleMessageContextMenu(e, msg)}
                            className={`p-3 text-xs transition-shadow text-left cursor-pointer active:scale-[0.99] select-text transition-transform ${
                              isMine ? 'fni-bubble-outgoing' : 'fni-bubble-incoming'
                            }`}
                            style={
                              isMine
                                ? {
                                    backgroundColor: userBubbleColor,
                                    color: getContrastingTextColor(userBubbleColor).text,
                                    ['--fni-msg-time' as any]: getContrastingTextColor(userBubbleColor).time,
                                    textAlign: 'left',
                                  }
                                : { textAlign: 'left' }
                            }
                          >
                          {/* Sender header in community chats */}
                          {!isMine && selectedChatId === 'community' && (
                            <div
                              onClick={() => {
                                const member = allMembers.find(m => m.id === msg.senderUid);
                                if (member) {
                                  setSelectedUserProfile({
                                    id: member.id,
                                    fullName: member.full_name || member.name,
                                    role: member.role,
                                    avatarUrl: member.avatar_url || member.photo_url,
                                    bannerUrl: (member as any).banner_url || (member as any).bannerUrl || localStorage.getItem(`fni_profile_banner_${member.id}`) || (member.id === currentUser?.id ? currentUser?.banner_url : undefined),
                                    cellName: member.cell_name,
                                    phone: member.phone_number || member.phone,
                                    email: member.email,
                                  });
                                }
                              }}
                              className="flex items-center gap-2 mb-1 cursor-pointer"
                            >
                              <span className="font-black text-xs text-blue-400 hover:underline">
                                {msg.senderName}
                              </span>
                              {msg.cellName && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white/10 text-slate-300">
                                  {msg.cellName}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Reply Preview Card inside bubble (accent left-bar) */}
                          {msg.replyTo && (
                            <div
                              onClick={e => {
                                e.stopPropagation();
                                scrollToMessageId(msg.replyTo!.id);
                              }}
                              className="mb-1.5 p-2.5 rounded-lg bg-slate-100/90 dark:bg-[#101d2b]/75 border border-slate-200/70 dark:border-white/5 border-l-[3px] border-l-[#C6A45A] cursor-pointer text-[11px] hover:bg-slate-200/80 dark:hover:bg-[#14263a] transition-colors text-left shadow-sm"
                            >
                              <div className="font-bold text-[#8A6727] dark:text-[#D9BD7B] text-xs leading-tight">
                                {msg.replyTo.senderName}
                              </div>
                              <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-200 truncate mt-0.5">
                                {msg.replyTo.content.includes('Voice') || msg.replyTo.content.includes('🎤') ? (
                                  <>
                                    <Mic className="w-3 h-3 text-[#A17A32] dark:text-[#D9BD7B] shrink-0" />
                                    <span className="truncate">Voice message</span>
                                  </>
                                ) : (
                                  <span className="truncate">{msg.replyTo.content}</span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Attachments & Voice Notes */}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div
                              className="space-y-2 mb-1.5"
                              onClick={e => e.stopPropagation()}
                              onContextMenu={e => e.stopPropagation()}
                            >
                              {msg.attachments.map((att, attIdx) => {
                                const isAudio = att.mimeType?.startsWith('audio') || /\.(mp3|m4a|m4b|aac|ogg|oga|opus|wav|flac|amr|mid|midi)$/i.test(att.name || '') || att.name?.includes('voice-note') || att.name?.includes('Voice Note') || att.path?.startsWith('data:audio');
                                const isVoiceNote = att.name?.toLowerCase().includes('voice-note') || att.name?.toLowerCase().includes('voice note') || msg.content?.startsWith('🎤 Voice Note');
                                const isImage = att.mimeType?.startsWith('image');
                                const isVideo = att.mimeType?.startsWith('video') || /\.(mp4|mov|webm|m4v)$/i.test(att.name || '');
                                const fileUrl = getAttachmentUrl(att);

                                if (!fileUrl) {
                                  return <div key={attIdx} className="rounded-xl bg-black/10 px-3 py-4 text-xs opacity-70">Loading media…</div>;
                                }

                                if (isAudio && isVoiceNote) {
                                  const durationMatch = (att.name || msg.content || '').match(/\((\d+:\d+)\)/);
                                  const initialDuration = durationMatch ? durationMatch[1] : '0:15';
                                  return <React.Fragment key={attIdx}>{renderVoiceNote(fileUrl, att.name || 'Voice Message', initialDuration, formattedTime, msg.senderName)}</React.Fragment>;
                                }

                                if (isAudio) {
                                  return (
                                    <div key={attIdx} className="rounded-2xl bg-black/10 dark:bg-white/10 p-3 space-y-2 min-w-[220px] max-w-[320px]" onClick={e => e.stopPropagation()}>
                                      <div className="flex items-center gap-2 min-w-0">
                                        <Volume2 className="w-5 h-5 shrink-0" />
                                        <span className="text-sm font-semibold truncate">{att.name || 'Audio'}</span>
                                      </div>
                                      <audio controls preload="metadata" src={fileUrl} className="w-full" onClick={e => e.stopPropagation()} onError={() => console.warn('FNI audio could not be decoded or loaded:', att.name)} />
                                      <button type="button" onClick={e => { e.stopPropagation(); void handleSaveAttachment(fileUrl, att.name || 'FNI-audio'); }} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2AABEE] hover:underline"><Download className="w-3.5 h-3.5" /> Save audio</button>
                                    </div>
                                  );
                                }

                                if (isVideo) {
                                  return (
                                    <div key={attIdx} className="relative rounded-2xl overflow-hidden max-w-full bg-black my-1" onClick={e => e.stopPropagation()}>
                                      <video controls playsInline preload="metadata" src={fileUrl} className="block w-full max-h-[420px] object-contain" onClick={e => e.stopPropagation()} />
                                      <button type="button" onClick={e => { e.stopPropagation(); void handleSaveAttachment(fileUrl, att.name || 'FNI-video'); }} className="absolute bottom-2 right-2 rounded-full bg-black/65 text-white px-2.5 py-1 text-[11px] font-semibold inline-flex items-center gap-1"><Download className="w-3.5 h-3.5" /> Save</button>
                                      <div className="px-2 py-1 text-[10px] text-white/80">{att.name}</div>
                                    </div>
                                  );
                                }

                                if (isImage) {
                                  return (
                                    <div key={attIdx} className="relative rounded-2xl overflow-hidden max-h-[420px] max-w-full bg-black/10 select-none my-1">
                                      <button
                                        type="button"
                                        onClick={e => {
                                          e.stopPropagation();
                                          setImagePreview({ url: fileUrl, name: att.name || 'FNI image' });
                                        }}
                                        className="block w-full text-left cursor-zoom-in"
                                        aria-label={`Open image ${att.name || ''}`}
                                      >
                                        <img src={fileUrl} alt={att.name} loading="lazy" className="block max-w-full max-h-[420px] w-auto h-auto object-contain rounded-2xl" />
                                      </button>
                                      <div className="absolute bottom-2 left-2 px-2 py-1 rounded-full bg-black/60 text-white text-[10px]">
                                        Tap to open
                                      </div>
                                      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/55 backdrop-blur-md text-white text-[10px] flex items-center gap-1 font-medium select-none shadow-xs">
                                        <span>{formattedTime}</span>
                                        {isMine && <CheckCheck className="w-3.5 h-3.5 text-white" />}
                                      </div>
                                    </div>
                                  );
                                }

                                const fileExtension = (att.name || '').split('.').pop()?.toUpperCase() || 'FILE';
                                const documentSize = att.size ? formatAttachmentSize(att.size) : 'Document';
                                return (
                                  <div key={attIdx} className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/75 dark:bg-[#172536]/80 p-2.5 flex items-center gap-2.5 min-w-0 max-w-[min(100%,340px)] shadow-sm">
                                    <div className="w-10 h-11 rounded-lg bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 flex flex-col items-center justify-center shrink-0 border border-blue-100 dark:border-blue-400/15">
                                      <FileText className="w-4 h-4" />
                                      <span className="text-[8px] font-extrabold tracking-wide mt-0.5">{fileExtension.slice(0, 5)}</span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={e => {
                                        e.stopPropagation();
                                        window.open(fileUrl, '_blank', 'noopener,noreferrer');
                                      }}
                                      className="min-w-0 flex-1 text-left"
                                      title={att.name || 'Open document'}
                                    >
                                      <span className="block text-[12px] font-bold leading-4 truncate hover:underline">{att.name || 'Open document'}</span>
                                      <span className="block text-[10px] text-slate-500 dark:text-slate-400 mt-1">{fileExtension} · {documentSize}</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={e => {
                                        e.stopPropagation();
                                        void handleSaveAttachment(fileUrl, att.name || 'FNI-document');
                                      }}
                                      className="w-9 h-9 shrink-0 rounded-full bg-slate-100 dark:bg-white/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-slate-600 dark:text-slate-200 flex items-center justify-center transition-colors"
                                      aria-label={`Save ${att.name || 'document'}`}
                                      title="Save or share"
                                    >
                                      <Download className="w-4 h-4" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Message Text / Sticker / Poll */}
                          {!msg.content?.startsWith('🎤 Voice Note') && msg.content !== '🎤 Voice Note' && (
                            <div className="leading-relaxed text-left break-words overflow-hidden text-sm sm:text-[15px]">
                              {renderMessageContent(msg)}
                            </div>
                          )}

                          {/* Reaction Pills */}
                          {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                            <div className="flex flex-wrap items-center gap-1 mt-1.5 pt-1">
                              {Object.entries(msg.reactions).map(([emoji, userIds]) => {
                                const hasMyReaction = currentUser?.id ? (userIds || []).includes(currentUser.id) : false;
                                const count = (userIds || []).length;
                                if (count === 0) return null;
                                return (
                                  <button
                                    key={emoji}
                                    type="button"
                                    onClick={e => {
                                      e.stopPropagation();
                                      handleAddReaction(msg.id, emoji);
                                    }}
                                    onDoubleClick={e => {
                                      e.stopPropagation();
                                      setReactionModalMessageId(msg.id);
                                      setReactionModalEmoji(emoji);
                                      setIsReactionModalOpen(true);
                                    }}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border transition-transform hover:scale-105 cursor-pointer ${
                                      hasMyReaction
                                        ? 'bg-blue-100 dark:bg-blue-950/70 border-blue-400 text-blue-700 dark:text-blue-300'
                                        : 'bg-black/5 dark:bg-black/25 border-transparent text-slate-700 dark:text-slate-300 hover:border-slate-300'
                                    }`}
                                    title="Click to toggle reaction, double-click for participants"
                                  >
                                    <span>{emoji}</span>
                                    <span className="text-[10px]">{count}</span>
                                  </button>
                                );
                              })}
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  setReactionModalMessageId(msg.id);
                                  setReactionModalEmoji(undefined);
                                  setIsReactionModalOpen(true);
                                }}
                                className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-1 py-0.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 font-semibold cursor-pointer"
                                title="View reaction participants"
                              >
                                <Users className="w-3 h-3 inline mr-0.5" />
                              </button>
                            </div>
                          )}

                          {/* Timestamp & Status info with status checkmarks (rendered if not purely an image attachment) */}
                          {!(msg.attachments && msg.attachments.length > 0 && msg.attachments.some(a => a.mimeType?.startsWith('image')) && (!msg.content || msg.content === 'Photo' || msg.content === '📷 Photo')) && (
                            <div className="mt-1 flex items-center justify-end gap-1 text-[10px] fni-msg-time select-none">
                              {msg.isPinned && <Pin className="w-2.5 h-2.5 mr-0.5" />}
                              <span>{formattedTime}</span>
                              {isMine && (
                                <span title={'isRead' in msg && (msg as any).isRead ? 'Read' : 'Delivered'}>
                                  <CheckCheck className="w-3.5 h-3.5 text-[#53d793]" />
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    </React.Fragment>
                  );
                })
              )}
            </div>

            {/* Reply banner if replying to a message */}
            {replyToMessage && (
              <div className="px-4 py-2 bg-slate-100 dark:bg-[#182533] border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-xs shrink-0 z-10">
                <div className="flex items-center gap-2 min-w-0">
                  <Reply className="w-4 h-4 text-blue-600 shrink-0" />
                  <div className="min-w-0">
                    <span className="font-bold text-blue-600 block">
                      Replying to {replyToMessage.senderName}
                    </span>
                    <p className="truncate text-slate-500 text-[11px]">
                      {replyToMessage.content}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyToMessage(null)}
                  className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Attachment review strip */}
            {stagedFiles.length > 0 && (
              <div className="px-3 sm:px-4 py-2 bg-slate-50 dark:bg-[#182533] border-t border-slate-200 dark:border-white/10 shrink-0 z-10">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Ready to send · {stagedFiles.length} {stagedFiles.length === 1 ? 'file' : 'files'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setStagedFiles([])}
                    className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 hover:underline"
                  >
                    Remove all
                  </button>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
                  {stagedFiles.map((file, idx) => {
                    const isImage = file.type.startsWith('image/');
                    const isAudio = file.type.startsWith('audio/');
                    const isVideo = file.type.startsWith('video/');
                    const AttachmentIcon = isImage ? ImageIcon : isAudio ? Music : isVideo ? Video : FileText;
                    return (
                      <div key={`${file.name}-${file.lastModified}-${idx}`} className="min-w-0 max-w-[220px] flex items-center gap-2 px-2.5 py-2 rounded-xl bg-white dark:bg-[#202d3c] border border-slate-200 dark:border-white/10 shrink-0 shadow-sm">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0">
                          <AttachmentIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate">{file.name}</p>
                          <p className="text-[10px] text-slate-400">{formatAttachmentSize(file.size)} · {isImage ? 'Image' : isAudio ? 'Audio' : isVideo ? 'Video' : 'Document'}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setStagedFiles(previous => previous.filter((_, i) => i !== idx))}
                          className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 shrink-0"
                          aria-label={`Remove ${file.name}`}
                          title="Remove attachment"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* =================================================================
                MESSAGE COMPOSER (Appears ONLY when conversation is open)
            ================================================================= */}
            <div
              className="p-2 sm:p-3 bg-white dark:bg-[#182533] border-t border-slate-200/80 dark:border-white/10 shrink-0 z-30 relative fni-chat-composer transition-[padding]"
              style={{
                paddingBottom: isKeyboardVisible ? '6px' : 'max(0.5rem, env(safe-area-inset-bottom))',
                paddingTop: isKeyboardVisible ? '6px' : '0.75rem',
              }}
            >
              {/* Emoji & Sticker Drawer (Docked cleanly above composer bar) */}
              {showEmojiPicker && (
                <>
                  {/* Backdrop for click-outside */}
                  <div
                    className="fixed inset-0 z-20 cursor-default"
                    onClick={() => setShowEmojiPicker(false)}
                  />
                  <div
                    onClick={e => e.stopPropagation()}
                    className="absolute left-2 right-2 sm:left-auto sm:right-4 bottom-[calc(100%+8px)] z-30 w-auto sm:w-[380px] max-w-[96vw] rounded-3xl bg-white dark:bg-[#182533] border border-slate-200/90 dark:border-white/15 shadow-2xl p-3 text-xs animate-fadeIn space-y-2.5"
                  >
                    {/* Header: Emojis vs Stickers switcher + Backspace & Close buttons */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/10">
                      <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-xl text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => setActivePickerTab('emojis')}
                          className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                            activePickerTab === 'emojis'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white'
                          }`}
                        >
                          Emojis
                        </button>
                        <button
                          type="button"
                          onClick={() => setActivePickerTab('stickers')}
                          className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                            activePickerTab === 'stickers'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white'
                          }`}
                        >
                          Stickers
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Quick Backspace Button inside emoji picker */}
                        <button
                          type="button"
                          onClick={handleEmojiBackspace}
                          className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 hover:text-rose-500 transition-colors cursor-pointer"
                          title="Delete last character"
                        >
                          <BackspaceIcon className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowEmojiPicker(false)}
                          className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
                          title="Close"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {activePickerTab === 'stickers' ? (
                      <div className="space-y-2">
                        {/* Sticker Sub-tabs & Create Action */}
                        <div className="flex items-center justify-between gap-1 pb-1 border-b border-slate-100 dark:border-white/5">
                          <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar py-0.5 text-[11px] font-bold">
                            <button
                              type="button"
                              onClick={() => setStickerSubTab('pack')}
                              className={`px-2.5 py-1 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                                stickerSubTab === 'pack'
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                              }`}
                            >
                              🕊️ Fellowship
                            </button>
                            <button
                              type="button"
                              onClick={() => setStickerSubTab('favorites')}
                              className={`px-2.5 py-1 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                                stickerSubTab === 'favorites'
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                              }`}
                            >
                              <Bookmark className="w-3 h-3" />
                              <span>Saved ({favoriteStickers.length})</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setStickerSubTab('recent')}
                              className={`px-2.5 py-1 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                                stickerSubTab === 'recent'
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                              }`}
                            >
                              🕒 Recent
                            </button>
                            <button
                              type="button"
                              onClick={() => setStickerSubTab('custom')}
                              className={`px-2.5 py-1 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                                stickerSubTab === 'custom'
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'
                              }`}
                            >
                              🎨 My Stickers ({userCustomStickers.length})
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => setIsStickerCreatorOpen(true)}
                            className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold cursor-pointer shadow-xs transition-colors"
                            title="Create Custom Sticker"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Create</span>
                          </button>
                        </div>

                        {/* Sub-tab 1: Fellowship Default Pack */}
                        {stickerSubTab === 'pack' && (
                          <div>
                            <span className="font-extrabold text-[10px] uppercase text-slate-400 block mb-1.5">
                              FNI Fellowship Pack
                            </span>
                            <div className="grid grid-cols-4 gap-2 max-h-56 overflow-y-auto custom-scrollbar p-1">
                              {STICKER_PACK.map(s => (
                                <div
                                  key={s.label}
                                  className="group/item relative p-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/10 text-center cursor-pointer transition-transform hover:scale-105 active:scale-95 border border-transparent hover:border-slate-200 dark:hover:border-white/10"
                                  onClick={() => handleSendSticker(s)}
                                  title={s.label}
                                >
                                  <span className="text-3xl block">{s.emoji}</span>
                                  <span className="text-[9px] font-semibold text-slate-600 dark:text-slate-300 truncate block mt-0.5">
                                    {s.label}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Sub-tab 2: Favorites */}
                        {stickerSubTab === 'favorites' && (
                          <div>
                            <span className="font-extrabold text-[10px] uppercase text-slate-400 block mb-1.5">
                              Saved Stickers
                            </span>
                            {favoriteStickers.length === 0 ? (
                              <div className="text-center py-6 px-4 bg-slate-50 dark:bg-black/20 rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
                                <Bookmark className="w-8 h-8 text-slate-400/60 mx-auto mb-1.5" />
                                <p className="font-bold text-xs text-slate-700 dark:text-slate-200">No saved stickers yet</p>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                  Long-press any sticker in the conversation to save it to your collection.
                                </p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-4 gap-2 max-h-56 overflow-y-auto custom-scrollbar p-1">
                                {favoriteStickers.map((s, idx) => (
                                  <div
                                    key={s.id || idx}
                                    className="group/fav relative p-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/10 text-center cursor-pointer transition-transform hover:scale-105 active:scale-95 border border-slate-200/50 dark:border-white/5"
                                    onClick={() => {
                                      if (s.imageUrl) {
                                        handleSendCustomSticker({ imageUrl: s.imageUrl, label: s.label });
                                      } else if (s.emoji) {
                                        handleSendSticker({ emoji: s.emoji, label: s.label });
                                      }
                                    }}
                                    title={s.label}
                                  >
                                    {s.imageUrl ? (
                                      <img src={s.imageUrl} alt={s.label} className="w-10 h-10 object-contain mx-auto rounded-lg" />
                                    ) : (
                                      <span className="text-3xl block">{s.emoji || '🕊️'}</span>
                                    )}
                                    <span className="text-[9px] font-semibold text-slate-600 dark:text-slate-300 truncate block mt-0.5">
                                      {s.label}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={e => {
                                        e.stopPropagation();
                                        handleToggleFavoriteSticker(s);
                                      }}
                                      className="absolute top-1 right-1 p-1 rounded-full bg-white/80 dark:bg-black/60 text-rose-500 shadow-xs cursor-pointer hover:scale-110 transition-transform"
                                      title="Remove from saved"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Sub-tab 3: Recent Stickers */}
                        {stickerSubTab === 'recent' && (
                          <div>
                            <span className="font-extrabold text-[10px] uppercase text-slate-400 block mb-1.5">
                              Frequently Used Stickers
                            </span>
                            {recentStickers.length === 0 ? (
                              <div className="text-center py-6 px-4 bg-slate-50 dark:bg-black/20 rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
                                <Clock className="w-8 h-8 text-slate-400/60 mx-auto mb-1.5" />
                                <p className="font-bold text-xs text-slate-700 dark:text-slate-200">No recent stickers</p>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                  Stickers you send in chats will automatically appear here for quick reuse.
                                </p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-4 gap-2 max-h-56 overflow-y-auto custom-scrollbar p-1">
                                {recentStickers.map((s, idx) => (
                                  <div
                                    key={s.id || idx}
                                    className="p-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/10 text-center cursor-pointer transition-transform hover:scale-105 active:scale-95 border border-slate-200/50 dark:border-white/5"
                                    onClick={() => {
                                      if (s.imageUrl) {
                                        handleSendCustomSticker({ imageUrl: s.imageUrl, label: s.label });
                                      } else if (s.emoji) {
                                        handleSendSticker({ emoji: s.emoji, label: s.label });
                                      }
                                    }}
                                    title={s.label}
                                  >
                                    {s.imageUrl ? (
                                      <img src={s.imageUrl} alt={s.label} className="w-10 h-10 object-contain mx-auto rounded-lg" />
                                    ) : (
                                      <span className="text-3xl block">{s.emoji || '🕊️'}</span>
                                    )}
                                    <span className="text-[9px] font-semibold text-slate-600 dark:text-slate-300 truncate block mt-0.5">
                                      {s.label}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Sub-tab 4: My Created Stickers */}
                        {stickerSubTab === 'custom' && (
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-extrabold text-[10px] uppercase text-slate-400">
                                My Created Stickers
                              </span>
                              <button
                                type="button"
                                onClick={() => setIsStickerCreatorOpen(true)}
                                className="text-blue-600 dark:text-blue-400 text-[10px] font-bold hover:underline cursor-pointer"
                              >
                                + New Sticker
                              </button>
                            </div>
                            <div className="grid grid-cols-4 gap-2 max-h-56 overflow-y-auto custom-scrollbar p-1">
                              {/* Create Card */}
                              <button
                                type="button"
                                onClick={() => setIsStickerCreatorOpen(true)}
                                className="p-2 rounded-2xl border-2 border-dashed border-blue-400/40 hover:border-blue-500 bg-blue-50/50 dark:bg-blue-900/10 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95"
                              >
                                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center">
                                  <Plus className="w-4 h-4" />
                                </div>
                                <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400">Create</span>
                              </button>

                              {userCustomStickers.map(s => {
                                const isFav = favoriteStickers.some(f => f.id === s.id);
                                return (
                                  <div
                                    key={s.id}
                                    className="group/custom relative p-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/10 text-center cursor-pointer transition-transform hover:scale-105 active:scale-95 border border-slate-200/60 dark:border-white/10 bg-white dark:bg-white/[0.02]"
                                    onClick={() => {
                                      if (s.imageUrl) {
                                        handleSendCustomSticker({ imageUrl: s.imageUrl, label: s.label });
                                      } else if (s.emoji) {
                                        handleSendSticker({ emoji: s.emoji, label: s.label });
                                      }
                                    }}
                                    title={s.label}
                                  >
                                    {s.imageUrl ? (
                                      <img src={s.imageUrl} alt={s.label} className="w-10 h-10 object-contain mx-auto rounded-lg" />
                                    ) : (
                                      <span className="text-3xl block">{s.emoji || '🎨'}</span>
                                    )}
                                    <span className="text-[9px] font-semibold text-slate-700 dark:text-slate-200 truncate block mt-0.5">
                                      {s.label}
                                    </span>

                                    {/* Action buttons on card */}
                                    <div className="absolute top-1 right-1 flex items-center gap-0.5 opacity-0 group-hover/custom:opacity-100 transition-opacity">
                                      <button
                                        type="button"
                                        onClick={e => {
                                          e.stopPropagation();
                                          if (confirm(`Delete sticker "${s.label}"?`)) {
                                            handleDeleteCustomSticker(s.id);
                                          }
                                        }}
                                        className="p-1 rounded-full bg-white/90 dark:bg-black/70 text-slate-400 hover:text-rose-500 shadow-xs cursor-pointer"
                                        title="Delete sticker"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <IosEmojiPicker
                        onSelectEmoji={handleInsertEmoji}
                        onBackspace={handleEmojiBackspace}
                        onClose={() => setShowEmojiPicker(false)}
                        className="bg-transparent dark:bg-transparent border-0 p-0 shadow-none backdrop-blur-none"
                      />
                    )}
                  </div>
                </>
              )}
              {isRecordingVoice ? (
                /* Voice recording controls: pause, resume, cancel and send */
                <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0 ${isVoiceRecordingPaused ? '' : 'animate-pulse'}`} />
                    <div className="min-w-0">
                      <span className="font-bold text-xs block">{isVoiceRecordingPaused ? 'Recording paused' : 'Recording voice note'}</span>
                      <span className="text-[10px] tabular-nums opacity-80">
                        {Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button type="button" onClick={cancelVoiceRecording} className="h-9 px-2.5 rounded-full text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50" title="Discard voice note">
                      <X className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={isVoiceRecordingPaused ? resumeVoiceRecording : pauseVoiceRecording} className="h-9 px-3 rounded-full border border-rose-300 dark:border-rose-800 text-xs font-semibold hover:bg-rose-100 dark:hover:bg-rose-900/50 flex items-center gap-1.5" title={isVoiceRecordingPaused ? 'Resume recording' : 'Pause recording'}>
                      {isVoiceRecordingPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                      <span>{isVoiceRecordingPaused ? 'Resume' : 'Pause'}</span>
                    </button>
                    <button type="button" onClick={stopVoiceRecording} className="h-9 px-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs">
                      <Send className="w-3.5 h-3.5" />
                      <span>Send</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  {/* Floating Mention Autocomplete Dropdown */}
                  {mentionQuery !== null && (
                    <MentionAutocompleteDropdown
                      isOpen={mentionQuery !== null}
                      users={mentionCandidates}
                      query={mentionQuery}
                      onSelect={handleSelectMention}
                      onClose={() => setMentionQuery(null)}
                    />
                  )}

                  {/* Editing Banner */}
                  {editingMessage && (
                    <div className="flex items-center justify-between px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl mb-2 text-xs animate-fadeIn">
                      <div className="flex items-center gap-2 min-w-0">
                        <Edit3 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="font-bold text-amber-700 dark:text-amber-400">Editing Message:</span>
                        <span className="text-slate-600 dark:text-slate-300 truncate max-w-[200px] sm:max-w-xs">{editingMessage.content}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingMessage(null);
                          setInputText('');
                        }}
                        className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                        title="Cancel editing"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Mobile & Desktop composer input row */}
                  <form
                    onSubmit={e => {
                      e.preventDefault();
                      // Prevent accidental implicit form submission from virtual keyboards on mobile
                      if (isMobileEnvironment()) {
                        return;
                      }
                      handleSendMessage();
                    }}
                    className="flex items-center gap-2"
                  >
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowAttachmentMenu(v => !v)}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer shrink-0 transition-colors"
                        title="Attach file, photo or poll"
                      >
                        <Paperclip className="w-5 h-5" />
                      </button>

                      {/* Attachment Menu Popup (Docked above paperclip with tap-outside backdrop) */}
                      {showAttachmentMenu && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={e => {
                              e.stopPropagation();
                              setShowAttachmentMenu(false);
                            }}
                          />
                          <div
                            onClick={e => e.stopPropagation()}
                            className="absolute left-0 bottom-[calc(100%+8px)] z-50 w-56 rounded-2xl bg-white dark:bg-[#182533] border border-slate-200/90 dark:border-white/10 shadow-2xl p-2 text-xs text-slate-800 dark:text-slate-200 animate-fadeIn space-y-1"
                          >
                            <label className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer font-semibold transition-colors active:scale-98">
                              <ImageIcon className="w-4 h-4 text-blue-500" />
                              <span>Photos, Videos, Audio or Files</span>
                              <input
                                type="file"
                                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
                                multiple
                                className="hidden"
                                onChange={e => {
                                  if (e.target.files) {
                                    setStagedFiles([...stagedFiles, ...Array.from(e.target.files)]);
                                    setShowAttachmentMenu(false);
                                  }
                                }}
                              />
                            </label>

                            <button
                              type="button"
                              onClick={() => {
                                setShowAttachmentMenu(false);
                                documentFileInputRef.current?.click();
                              }}
                              className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer font-semibold text-left transition-colors text-slate-800 dark:text-slate-100"
                            >
                              <FileText className="w-4 h-4 text-amber-500 shrink-0" />
                              <span>Share a document</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setShowAttachmentMenu(false);
                                audioFileInputRef.current?.click();
                              }}
                              className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer font-semibold text-left transition-colors text-slate-800 dark:text-slate-100"
                            >
                              <Music className="w-4 h-4 text-violet-500 shrink-0" />
                              <span>Share audio</span>
                            </button>

                            <button
                              type="button"
                              onClick={e => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleOpenPollModal(e);
                              }}
                              className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer font-semibold text-left transition-colors active:scale-98 text-slate-800 dark:text-slate-100"
                            >
                              <BarChart2 className="w-4 h-4 text-emerald-500 shrink-0" />
                              <span>Create Poll</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex-1 rounded-2xl bg-slate-100 dark:bg-[#242f3d] border border-slate-200/80 dark:border-white/10 px-4 py-1.5 flex items-center gap-2 min-h-[44px]">
                      <textarea
                        ref={composerInputRef}
                        rows={1}
                        value={inputText}
                        onChange={handleComposerChange}
                        onKeyDown={handleComposerKeyDown}
                        placeholder={editingMessage ? "Edit message..." : "Message"}
                        className="flex-1 bg-transparent text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none resize-none max-h-32 leading-snug py-1"
                        style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker(v => !v)}
                        className="text-slate-400 hover:text-slate-600 dark:text-white/70 dark:hover:text-white shrink-0 cursor-pointer transition-colors"
                        title="Emojis & Stickers"
                      >
                        <Smile className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Dedicated document and audio pickers keep attachment choices focused on mobile */}
                    <input
                      ref={documentFileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,.csv,.zip"
                      multiple
                      className="hidden"
                      onChange={e => {
                        if (e.target.files?.length) setStagedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                        e.currentTarget.value = '';
                      }}
                    />
                    <input
                      ref={audioFileInputRef}
                      type="file"
                      accept="audio/*,.mp3,.m4a,.aac,.ogg,.opus,.wav,.flac"
                      multiple
                      className="hidden"
                      onChange={e => {
                        if (e.target.files?.length) setStagedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                        e.currentTarget.value = '';
                      }}
                    />

                    {/* Camera Button */}
                    <input
                      ref={cameraFileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      capture="environment"
                      className="hidden"
                      onChange={e => {
                        if (e.target.files && e.target.files.length > 0) {
                          setStagedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => cameraFileInputRef.current?.click()}
                      className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 dark:text-white/80 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer shrink-0 transition-colors"
                      title="Take photo or video"
                    >
                      <Camera className="w-5 h-5" />
                    </button>

                    {/* Circular Mic/Send Button (#2AABEE from reference) */}
                    {inputText.trim() || stagedFiles.length > 0 || editingMessage ? (
                      <button
                        type="button"
                        onClick={() => handleSendMessage()}
                        disabled={isSending}
                        className="w-10 h-10 rounded-full bg-[#2AABEE] hover:bg-[#2297d3] text-white flex items-center justify-center shrink-0 shadow-md transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
                        title={editingMessage ? "Save edit" : "Send message"}
                      >
                        {editingMessage ? (
                          <Check className="w-4 h-4 text-white" />
                        ) : (
                          <Send className="w-4 h-4 ml-0.5 text-white" />
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={startVoiceRecording}
                        className="w-10 h-10 rounded-full bg-[#2AABEE] hover:bg-[#2297d3] text-white flex items-center justify-center shrink-0 shadow-md transition-transform active:scale-95 cursor-pointer"
                        title="Record voice note"
                      >
                        <Mic className="w-5 h-5 text-white" />
                      </button>
                    )}
                  </form>
              </div>
            )}
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          POLL CREATION MODAL
      ========================================================================= */}
      {isPollModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-fadeIn overflow-y-auto"
          onClick={() => setIsPollModalOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white dark:bg-[#111c2d] rounded-3xl border border-slate-200/80 dark:border-white/10 max-w-md w-full max-h-[90dvh] flex flex-col p-5 sm:p-6 shadow-2xl space-y-4 my-auto overflow-hidden text-slate-900 dark:text-white"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-blue-600" />
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  New Poll
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPollModalOpen(false)}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs overflow-y-auto custom-scrollbar flex-1 pr-1">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Question
                </label>
                <input
                  type="text"
                  value={pollQuestion}
                  onChange={e => setPollQuestion(e.target.value)}
                  placeholder="Ask a question..."
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Poll Options
                </label>
                <div className="space-y-2">
                  {pollOptions.map((opt, idx) => (
                    <input
                      key={idx}
                      type="text"
                      value={opt}
                      onChange={e => {
                        const next = [...pollOptions];
                        next[idx] = e.target.value;
                        setPollOptions(next);
                      }}
                      placeholder={`Option ${idx + 1}`}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                    />
                  ))}
                  {pollOptions.length < 8 && (
                    <button
                      type="button"
                      onClick={() => setPollOptions([...pollOptions, ''])}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 pt-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Option</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-white/5 space-y-2.5">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Anonymous Voting
                  </span>
                  <input
                    type="checkbox"
                    checked={pollIsAnonymous}
                    onChange={e => setPollIsAnonymous(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Multiple Answers
                  </span>
                  <input
                    type="checkbox"
                    checked={pollAllowsMultiple}
                    onChange={e => setPollAllowsMultiple(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                  />
                </label>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-white/5 shrink-0">
              <button
                type="button"
                onClick={() => setIsPollModalOpen(false)}
                className="px-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreatePoll}
                className="px-4 py-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer transition-colors"
              >
                Create Poll
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          COMMUNICATION SETTINGS & TUTOR DIRECTORY MODAL
      ========================================================================= */}
      <CommunicationSettingsModal
        isOpen={isSettingsModalOpen}
        initialTab={settingsModalTab}
        onClose={() => setIsSettingsModalOpen(false)}
        tutorList={tutorList}
        onSelectTutor={tutorId => {
          openConversation(tutorId);
        }}
        onOpenSavedMessages={() => {
          openConversation('saved_messages');
        }}
      />

      {/* =========================================================================
          CALL HISTORY MODAL
      ========================================================================= */}
      {showCallHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-4xl max-h-[90vh] rounded-3xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 shadow-2xl p-6 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10 mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Phone className="w-5 h-5 text-blue-600" />
                <span>Call Logs & Meetings</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCallHistoryModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <CallHistoryView onBack={() => setShowCallHistoryModal(false)} />
          </div>
        </div>
      )}

      {/* =========================================================================
          FNI FLOATING CONTEXT MENU & REACTION PICKER
      ========================================================================= */}
      {contextMenu && (
        <div
          className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[0.5px]"
          onClick={() => setContextMenu(null)}
          onContextMenu={e => {
            e.preventDefault();
            setContextMenu(null);
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={
              window.innerWidth < 640
                ? {
                    left: '50%',
                    bottom: '24px',
                    transform: 'translateX(-50%)',
                    width: 'calc(100% - 32px)',
                    maxWidth: '320px',
                  }
                : {
                    left: Math.max(16, Math.min(contextMenu.x, window.innerWidth - 240)),
                    top: Math.max(16, Math.min(contextMenu.y, window.innerHeight - 360)),
                  }
            }
            className="fixed z-50 w-56 rounded-2xl bg-white dark:bg-[#182533] border border-slate-200 dark:border-white/10 shadow-2xl p-1.5 text-xs text-slate-800 dark:text-slate-200 animate-fadeIn space-y-1"
          >
            {/* Quick Reaction Bar */}
            <div className="flex items-center justify-between p-1.5 bg-slate-100 dark:bg-slate-800/60 rounded-xl overflow-x-auto">
              {['👍', '❤️', '🔥', '😂', '👏', '🙏', '🎉', '🕊️', '💯'].map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    handleAddReaction(contextMenu.msg.id, emoji);
                    setContextMenu(null);
                  }}
                  className="hover:scale-125 transition-transform p-1 text-sm cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setReplyToMessage({
                  id: contextMenu.msg.id,
                  senderName: contextMenu.msg.senderName,
                  senderUid: contextMenu.msg.senderUid,
                  content: contextMenu.msg.content.slice(0, 100),
                });
                setContextMenu(null);
                composerInputRef.current?.focus();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 text-left font-semibold cursor-pointer"
            >
              <Reply className="w-4 h-4 text-blue-500" />
              <span>Reply</span>
            </button>

            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(contextMenu.msg.content);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 text-left font-semibold cursor-pointer"
            >
              <Copy className="w-4 h-4 text-slate-500" />
              <span>Copy Text</span>
            </button>

            {/* Edit Message option (sender only) */}
            {contextMenu.msg.senderUid === currentUser?.id &&
              !contextMenu.msg.content.startsWith(STICKER_PREFIX) &&
              !contextMenu.msg.content.startsWith(STICKER_IMG_PREFIX) && (
                <button
                  type="button"
                  onClick={() => {
                    const msgToEdit = contextMenu.msg;
                    setEditingMessage({
                      id: msgToEdit.id,
                      content: msgToEdit.content,
                      scope: selectedChatId === 'community' ? 'community' : 'private',
                    });
                    setInputText(msgToEdit.content);
                    setContextMenu(null);
                    setTimeout(() => {
                      composerInputRef.current?.focus();
                    }, 50);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 text-left font-semibold cursor-pointer text-amber-600 dark:text-amber-400"
                >
                  <Edit3 className="w-4 h-4 text-amber-500" />
                  <span>Edit Message</span>
                </button>
              )}

            <button
              type="button"
              onClick={() => {
                setForwardTargetMessage(contextMenu.msg);
                setIsForwardModalOpen(true);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 text-left font-semibold cursor-pointer"
            >
              <Forward className="w-4 h-4 text-emerald-500" />
              <span>Forward</span>
            </button>

            {canPin && (
              <button
                type="button"
                onClick={() => {
                  handleTogglePin(contextMenu.msg);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 text-left font-semibold cursor-pointer"
              >
                <Pin className="w-4 h-4 text-amber-500" />
                <span>{contextMenu.msg.isPinned ? 'Unpin Message' : 'Pin Message'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setMessageDetailsTarget(contextMenu.msg);
                setIsMessageDetailsModalOpen(true);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 text-left font-semibold cursor-pointer"
            >
              <Info className="w-4 h-4 text-purple-500" />
              <span>Message Details</span>
            </button>

            {/* If message is a sticker, offer Save to Saved Stickers */}
            {(contextMenu.msg.content.startsWith(STICKER_PREFIX) ||
              contextMenu.msg.content.startsWith(STICKER_IMG_PREFIX)) && (() => {
              const msg = contextMenu.msg;
              let isFav = false;
              if (msg.content.startsWith(STICKER_PREFIX)) {
                const parts = msg.content.slice(STICKER_PREFIX.length, -2).split(':');
                isFav = favoriteStickers.some(f => f.emoji === parts[0]);
              } else if (msg.content.startsWith(STICKER_IMG_PREFIX)) {
                const contentBody = msg.content.slice(STICKER_IMG_PREFIX.length, -2);
                const firstColon = contentBody.indexOf(':');
                const imgUrl = firstColon !== -1 ? contentBody.slice(0, firstColon) : contentBody;
                isFav = favoriteStickers.some(f => f.imageUrl === imgUrl);
              }
              return (
                <button
                  type="button"
                  onClick={() => {
                    if (msg.content.startsWith(STICKER_PREFIX)) {
                      const parts = msg.content.slice(STICKER_PREFIX.length, -2).split(':');
                      handleToggleFavoriteSticker({ emoji: parts[0], label: parts[1] || 'Sticker', stickerType: 'fellowship' });
                    } else if (msg.content.startsWith(STICKER_IMG_PREFIX)) {
                      const contentBody = msg.content.slice(STICKER_IMG_PREFIX.length, -2);
                      const firstColon = contentBody.indexOf(':');
                      const imgUrl = firstColon !== -1 ? contentBody.slice(0, firstColon) : contentBody;
                      const label = firstColon !== -1 ? contentBody.slice(firstColon + 1) : 'Sticker';
                      handleToggleFavoriteSticker({ imageUrl: imgUrl, label, stickerType: 'custom' });
                    }
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 text-left font-semibold cursor-pointer text-blue-600 dark:text-blue-400"
                >
                  <Bookmark className={`w-4 h-4 ${isFav ? 'fill-blue-500 text-blue-500' : 'text-blue-500'}`} />
                  <span>{isFav ? 'Remove from Saved Stickers' : 'Save to Stickers'}</span>
                </button>
              );
            })()}

            <button
              type="button"
              onClick={() => {
                handleOpenDeleteModal(contextMenu.msg);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-left font-semibold cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-rose-500" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          PINNED MESSAGES MODAL (BROWSE & UNPIN ALL)
      ========================================================================= */}
      <PinnedMessagesModal
        isOpen={isPinnedModalOpen}
        onClose={() => setIsPinnedModalOpen(false)}
        pinnedMessages={allPinnedMessages}
        conversationTitle={activeContact?.name || 'Conversation'}
        canUnpin={canPin}
        onSelectMessage={(msgId: string) => scrollToMessageId(msgId)}
        onUnpinMessage={(msgId: string) => {
          const target = allPinnedMessages.find(m => m.id === msgId);
          if (target) handleTogglePin(target);
        }}
      />

      {/* =========================================================================
          REACTION DETAILS MODAL (WHO REACTED WITH WHAT & WHEN)
      ========================================================================= */}
      <ReactionDetailsModal
        isOpen={isReactionModalOpen}
        onClose={() => setIsReactionModalOpen(false)}
        messageId={reactionModalMessageId}
        isCommunity={selectedChatId === 'community'}
        initialEmoji={reactionModalEmoji}
      />

      {/* =========================================================================
          MESSAGE DETAILS MODAL (STATUS, TIMESTAMPS, READ RECEIPTS)
      ========================================================================= */}
      <MessageDetailsModal
        isOpen={isMessageDetailsModalOpen}
        onClose={() => setIsMessageDetailsModalOpen(false)}
        message={messageDetailsTarget}
        isOutgoing={Boolean(messageDetailsTarget && messageDetailsTarget.senderUid === currentUser?.id)}
        onForward={(msg) => {
          setForwardTargetMessage(msg);
          setIsForwardModalOpen(true);
        }}
        onCopy={(text: string) => navigator.clipboard.writeText(text)}
      />

      {/* =========================================================================
          FORWARD MESSAGE MODAL
      ========================================================================= */}
      <ForwardMessageModal
        isOpen={isForwardModalOpen}
        onClose={() => {
          setIsForwardModalOpen(false);
          setForwardTargetMessage(null);
        }}
        message={forwardTargetMessage}
        tutorList={tutorList}
        onForwardToTarget={handleForwardToTarget}
      />

      {/* =========================================================================
          USER PROFILE MODAL (CLICKABLE MENTIONS & AVATARS)
      ========================================================================= */}
      <UserProfileModal
        isOpen={selectedUserProfile !== null}
        onClose={() => setSelectedUserProfile(null)}
        user={selectedUserProfile}
        onStartPrivateChat={(tutorId: string) => {
          setSelectedUserProfile(null);
          openConversation(tutorId);
        }}
        onStartVoiceCall={(userId: string) => {
          setSelectedUserProfile(null);
          const targetUser = allMembers.find(m => m.id === userId) || tutorList.find(t => t.id === userId);
          startDirectCall({
            id: userId,
            name: targetUser?.full_name || targetUser?.name || 'FNI Tutor',
            avatar: targetUser?.avatar_url || targetUser?.photo_url,
            cell: targetUser?.cell_name || targetUser?.cell,
          }, 'voice');
        }}
        onStartVideoCall={(userId: string) => {
          setSelectedUserProfile(null);
          const targetUser = allMembers.find(m => m.id === userId) || tutorList.find(t => t.id === userId);
          startDirectCall({
            id: userId,
            name: targetUser?.full_name || targetUser?.name || 'FNI Tutor',
            avatar: targetUser?.avatar_url || targetUser?.photo_url,
            cell: targetUser?.cell_name || targetUser?.cell,
          }, 'video');
        }}
      />

      {/* =========================================================================
          OFFICIAL COMMUNITY GROUP MANAGEMENT MODAL (ADMIN ONLY)
      ========================================================================= */}
      <OfficialGroupManagementModal
        isOpen={isOfficialGroupModalOpen}
        onClose={() => setIsOfficialGroupModalOpen(false)}
        onGroupChanged={async () => {
          const grp = await MessagingService.getOfficialCommunityGroup();
          setOfficialGroup(grp);
        }}
      />

      {/* =========================================================================
          FNI MESSAGE DELETION MODAL (DELETE FOR SELF VS DELETE FOR BOTH)
      ========================================================================= */}
      {deleteTargetMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white dark:bg-[#182533] rounded-3xl border border-slate-200/80 dark:border-white/10 max-w-sm w-full p-6 shadow-2xl space-y-4 animate-scaleIn text-slate-900 dark:text-white"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base">Delete message?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-black/20 text-xs text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-white/5 line-clamp-3">
              {deleteTargetMessage.content}
            </div>

            {/* Authors may remove their own message for everyone, including when chatting with an admin. */}
            {(deleteTargetMessage.senderUid === currentUser?.id || isAdmin) ? (
              <label className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer text-xs select-none">
                <input
                  type="checkbox"
                  checked={deleteForBoth}
                  onChange={e => setDeleteForBoth(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 dark:border-slate-600 dark:bg-slate-700"
                />
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  {selectedChatId === 'community'
                    ? 'Delete for everyone in fellowship'
                    : `Also delete for ${activeContact?.name || 'recipient'}`}
                </span>
              </label>
            ) : (
              <p className="px-2 text-xs text-slate-500 dark:text-slate-400">This removes the message only from your chat.</p>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
              <button
                type="button"
                onClick={() => setDeleteTargetMessage(null)}
                className="px-4 py-2 rounded-2xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <span>{deleteForBoth ? 'Delete for Both' : 'Delete for Me'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          FNI CLEAR CHAT HISTORY MODAL (CLEAR FOR SELF VS CLEAR FOR EVERYONE)
      ========================================================================= */}
      {showClearChatModal && chatToClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white dark:bg-[#182533] rounded-3xl border border-slate-200/80 dark:border-white/10 max-w-sm w-full p-6 shadow-2xl space-y-4 animate-scaleIn text-slate-900 dark:text-white"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base">Clear chat history?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {chatToClear.id === 'community'
                    ? 'FNI Community Fellowship'
                    : `Chat with ${chatToClear.name}`}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to clear message history for this chat? This action cannot be undone.
            </p>

            {/* Checkbox for "Also clear for everyone" if admin in community, or "Also delete for recipient" in private */}
            {(chatToClear.id !== 'community' || isAdmin) && (
              <label className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer text-xs select-none">
                <input
                  type="checkbox"
                  checked={clearChatForEveryone}
                  onChange={e => setClearChatForEveryone(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 dark:border-slate-600 dark:bg-slate-700 cursor-pointer"
                />
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  {chatToClear.id === 'community'
                    ? 'Clear for everyone in fellowship (Admin)'
                    : `Also delete messages for ${chatToClear.name}`}
                </span>
              </label>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
              <button
                type="button"
                onClick={() => {
                  setShowClearChatModal(false);
                  setChatToClear(null);
                  setClearChatForEveryone(false);
                }}
                className="px-4 py-2 rounded-2xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClearChat}
                className="px-5 py-2 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <span>{clearChatForEveryone ? 'Clear for Everyone' : 'Clear for Me'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          GROUP INFO & SETTINGS MODAL
      ========================================================================= */}
      <GroupInfoModal
        isOpen={isGroupInfoModalOpen}
        onClose={() => setIsGroupInfoModalOpen(false)}
        groupId={officialGroup?.id || 'fni_official_community'}
        group={officialGroup}
        onGroupUpdated={updatedGroup => setOfficialGroup(updatedGroup)}
        messages={communityMessages}
        allMembers={allMembers}
        tutorList={tutorList}
        currentUser={currentUser}
        isAdmin={isAdmin}
        onStartVoiceCall={handleStartVoiceCall}
        onStartVideoCall={handleStartVideoCall}
        onOpenMessageSearch={() => {
          setIsGroupInfoModalOpen(false);
        }}
        onSelectMemberProfile={m => {
          setIsGroupInfoModalOpen(false);
          setSelectedUserProfile({
            id: m.id,
            fullName: m.full_name || m.name,
            role: m.role,
            avatarUrl: m.avatar_url || m.photo_url,
            cellName: m.cell_name || m.cell,
            phone: m.phone_number || m.phone,
            email: m.email,
          });
        }}
        onExitGroup={() => {
          setIsGroupInfoModalOpen(false);
          handleBackToHome();
        }}
        onDeleteGroup={() => {
          setIsGroupInfoModalOpen(false);
          handleBackToHome();
        }}
      />

      {/* =========================================================================
          CUSTOM STICKER CREATOR MODAL
      ========================================================================= */}
      <StickerCreatorModal
        isOpen={isStickerCreatorOpen}
        onClose={() => setIsStickerCreatorOpen(false)}
        onSaveSticker={async newSticker => {
          if (!currentUser?.id) return;
          const res = await MessagingService.saveUserCustomSticker(currentUser.id, newSticker);
          if (res.success && res.sticker) {
            setUserCustomStickers(prev => [res.sticker!, ...prev.filter(s => s.id !== res.sticker!.id)]);
            setFavoriteStickers(MessagingService.getFavoriteStickers(currentUser.id));
          }
        }}
        onSendStickerImmediately={async newSticker => {
          if (newSticker.imageUrl) {
            await handleSendCustomSticker({ imageUrl: newSticker.imageUrl, label: newSticker.label });
          } else if (newSticker.emoji) {
            await handleSendSticker({ emoji: newSticker.emoji, label: newSticker.label });
          }
        }}
      />

      {/* =========================================================================
          FNI CHAT FOLDER MODAL
      ========================================================================= */}
      {imagePreview && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-3 sm:p-6"
          onClick={() => setImagePreview(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
        >
          <div className="absolute top-3 right-3 flex items-center gap-2 z-10" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => void handleSaveAttachment(imagePreview.url, imagePreview.name)}
              className="inline-flex items-center gap-2 rounded-full bg-white/15 hover:bg-white/25 text-white px-4 py-2.5 text-sm font-semibold"
            >
              <Download className="w-4 h-4" />
              Save / Share
            </button>
            <button
              type="button"
              onClick={() => setImagePreview(null)}
              className="rounded-full bg-white/15 hover:bg-white/25 text-white p-2.5"
              aria-label="Close image"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <img
            src={imagePreview.url}
            alt={imagePreview.name}
            onClick={e => e.stopPropagation()}
            className="max-w-full max-h-[88vh] object-contain select-auto"
          />
          <p className="text-white/70 text-xs mt-3 text-center">{imagePreview.name}</p>
        </div>
      )}

      {isCreateGroupOpen && (
        <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-slate-950/60 p-0 sm:p-4" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setIsCreateGroupOpen(false); }}>
          <form onSubmit={createMemberGroup} className="w-full max-w-xl max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-[#FAFAF8] dark:bg-[#101620] text-[#354454] dark:text-[#E8EDF5] shadow-2xl border border-[#E9EDF1] dark:border-[#2E3B4E]">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 bg-[#FAFAF8] dark:bg-[#101620] border-b border-[#E9EDF1] dark:border-[#2E3B4E]">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setIsCreateGroupOpen(false)} className="w-9 h-9 rounded-full bg-[#EDF5FC] dark:bg-[#1C2636] inline-flex items-center justify-center" aria-label="Close create group">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="font-semibold text-base">Create Group</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Start a new FNI conversation</p>
                </div>
              </div>
              <span className="text-[10px] tracking-wide font-bold text-[#785A1B] dark:text-[#D9BD7B]">FNI MESSAGES</span>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <section className="rounded-xl bg-white dark:bg-[#1C2636] border border-[#E9EDF1] dark:border-[#2E3B4E] p-4 space-y-3">
                <label className="block text-xs font-semibold" htmlFor="fni-new-group-name">Group name</label>
                <input id="fni-new-group-name" required maxLength={80} value={newGroupName} onChange={event => setNewGroupName(event.target.value)} placeholder="Enter group name" className="w-full rounded-lg border border-[#DCEAF6] dark:border-[#39485D] bg-[#FAFAF8] dark:bg-[#101620] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#8BB5DC]" />
                <label className="block text-xs font-semibold" htmlFor="fni-new-group-description">Description</label>
                <textarea id="fni-new-group-description" rows={2} maxLength={300} value={newGroupDescription} onChange={event => setNewGroupDescription(event.target.value)} placeholder="Describe the group's purpose…" className="w-full resize-none rounded-lg border border-[#DCEAF6] dark:border-[#39485D] bg-[#FAFAF8] dark:bg-[#101620] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#8BB5DC]" />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 text-right">{newGroupDescription.length}/300</p>
              </section>
              <section className="rounded-xl bg-white dark:bg-[#1C2636] border border-[#E9EDF1] dark:border-[#2E3B4E] p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">Add Members</h3>
                  <span className="text-xs text-[#785A1B] dark:text-[#D9BD7B]">{selectedGroupMemberIds.length} selected</span>
                </div>
                <input type="search" value={groupMemberSearch} onChange={event => setGroupMemberSearch(event.target.value)} placeholder="Search FNI members by name…" className="w-full rounded-full border border-[#DCEAF6] dark:border-[#39485D] bg-[#FAFAF8] dark:bg-[#101620] px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#8BB5DC]" />
                <div className="max-h-64 overflow-y-auto divide-y divide-[#E9EDF1] dark:divide-[#2E3B4E]">
                  {allMembers.filter(member => member.id !== currentUser?.id && (member.full_name || member.name || '').toLowerCase().includes(groupMemberSearch.trim().toLowerCase())).map(member => {
                    const memberId = String(member.id);
                    const checked = selectedGroupMemberIds.includes(memberId);
                    return (
                      <label key={memberId} className="flex items-center gap-3 py-3 cursor-pointer">
                        <input type="checkbox" checked={checked} onChange={event => setSelectedGroupMemberIds(previous => event.target.checked ? [...previous, memberId] : previous.filter(id => id !== memberId))} className="h-4 w-4 rounded border-slate-300 text-[#785A1B] focus:ring-[#8BB5DC]" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium truncate">{member.full_name || member.name || 'FNI Member'}</span>
                          <span className="block text-xs text-slate-500 dark:text-slate-400 capitalize">{String(member.role || 'member').replace(/_/g, ' ')}</span>
                        </span>
                      </label>
                    );
                  })}
                  {allMembers.filter(member => member.id !== currentUser?.id && (member.full_name || member.name || '').toLowerCase().includes(groupMemberSearch.trim().toLowerCase())).length === 0 && (
                    <p className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">No matching members found in the directory.</p>
                  )}
                </div>
              </section>
              {createGroupError && <p role="alert" className="rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 px-3 py-2 text-xs">{createGroupError}</p>}
              <button type="submit" disabled={isCreatingGroup || !newGroupName.trim()} className="w-full rounded-full bg-[#8BB5DC] hover:bg-[#78A8D2] disabled:opacity-50 text-[#2B3947] font-semibold py-3 text-sm transition-colors">
                {isCreatingGroup ? 'Creating group…' : 'Create Group'}
              </button>
            </div>
          </form>
        </div>
      )}

      <ChatFolderModal
        isOpen={isFolderModalOpen}
        onClose={() => {
          setIsFolderModalOpen(false);
          setFolderToEdit(null);
        }}
        availableChats={contacts}
        initialEditingFolder={folderToEdit}
        onFoldersUpdated={updatedFolders => {
          setChatFolders(updatedFolders);
          if (activeFolderId !== 'all' && !updatedFolders.some(f => f.id === activeFolderId)) {
            setActiveFolderId('all');
          }
        }}
      />
    </div>
  );
};
