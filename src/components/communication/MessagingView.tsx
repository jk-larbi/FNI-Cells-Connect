import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCall } from '../../context/CallContext';
import { useBackHandler } from '../../hooks/useBackHandler';
import { MessagingService } from '../../services/messagingService';
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
import {
  PrivateMessage,
  CommunityMessage,
  MessageReply,
  ChatAttachment,
  ChatPoll,
  UserPinnedChat,
  CommunityGroup,
  CustomSticker,
} from '../../types';
import {
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
  PanelRight,
  SquarePen,
  Delete as BackspaceIcon,
} from 'lucide-react';
import { Button } from '../common/Button';

export interface MessagingViewProps {
  initialConversationId?: string;
  initialTab?: 'private' | 'community';
  onBack?: () => void;
  onMobileChatStateChange?: (isChatOpen: boolean) => void;
}

// Telegram-style quick stickers
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
      '💓', '💗', '💖', '💘', '💝', '💟', '💯', '💢', '💥', '💫', '💬', '💭', '💤',
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

interface ChatContact {
  id: string; // 'community' | 'saved_messages' | profileId
  name: string;
  role?: string;
  cellName?: string;
  avatarUrl?: string;
  isOnline?: boolean;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  isPinned?: boolean;
  type: 'community' | 'saved' | 'direct';
}

export const MessagingView: React.FC<MessagingViewProps> = ({
  initialConversationId,
  initialTab,
  onBack,
  onMobileChatStateChange,
}) => {
  const { currentUser, isAdmin } = useAuth();
  const { startDirectCall, startGroupMeeting } = useCall();

  // Navigation State
  // When no conversation is selected (selectedChatId === null), the FNI Communication Home Page is shown
  // On desktop view (width >= 768px), default to 'saved_messages' for authentic Telegram split view
  const [selectedChatId, setSelectedChatId] = useState<string | null>(
    initialConversationId || (typeof window !== 'undefined' && window.innerWidth >= 768 ? 'saved_messages' : null)
  );
  const [mobileScreen, setMobileScreen] = useState<'list' | 'chat'>(initialConversationId ? 'chat' : 'list');
  const [activeFolder, setActiveFolder] = useState<'all' | 'fni' | 'personal' | 'unread' | 'channels'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [homeTutorSearch, setHomeTutorSearch] = useState('');
  const [isSearchInChatOpen, setIsSearchInChatOpen] = useState(false);
  const [searchInChatQuery, setSearchInChatQuery] = useState('');

  // Sync mobile chat state with AppLayout to provide full-screen immersive Telegram experience
  useEffect(() => {
    onMobileChatStateChange?.(mobileScreen === 'chat' && selectedChatId !== null);
  }, [mobileScreen, selectedChatId, onMobileChatStateChange]);

  // Contacts / Directory
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [tutorList, setTutorList] = useState<any[]>([]);

  // Messages State
  const [communityMessages, setCommunityMessages] = useState<CommunityMessage[]>([]);
  const [privateMessages, setPrivateMessages] = useState<PrivateMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Modals & Settings
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [showCallHistoryModal, setShowCallHistoryModal] = useState(false);
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);

  // Attachments & Voice Notes
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingSecondsRef = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<any>(null);

  // --- TELEGRAM-INSPIRED MESSAGING UPGRADE STATE ---
  // Pinned Chats
  const [userPinnedChats, setUserPinnedChats] = useState<UserPinnedChat[]>([]);
  const [activeChatActionMenuId, setActiveChatActionMenuId] = useState<string | null>(null);

  // Multi-Pinned Messages
  const [activePinnedIndex, setActivePinnedIndex] = useState(0);
  const [isPinnedModalOpen, setIsPinnedModalOpen] = useState(false);

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

  // Telegram Floating Context Menu
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

  // Polls Creation Modal
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [pollIsAnonymous, setPollIsAnonymous] = useState(true);
  const [pollAllowsMultiple, setPollAllowsMultiple] = useState(false);

  // Popovers & Drawers
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activePickerTab, setActivePickerTab] = useState<'stickers' | 'emojis'>('emojis');
  const [selectedEmojiCategory, setSelectedEmojiCategory] = useState<string>('Faith & Fellowship');
  const [emojiSearchQuery, setEmojiSearchQuery] = useState<string>('');
  const [showChatOptionsMenu, setShowChatOptionsMenu] = useState(false);
  const [openMessageMenuId, setOpenMessageMenuId] = useState<string | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<MessageReply | null>(null);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);
  const [deleteTargetMessage, setDeleteTargetMessage] = useState<CommunityMessage | PrivateMessage | null>(null);
  const [deleteForBoth, setDeleteForBoth] = useState<boolean>(true);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // DOM Refs
  const messageStreamRef = useRef<HTMLDivElement | null>(null);
  const composerInputRef = useRef<HTMLTextAreaElement | null>(null);
  const cameraFileInputRef = useRef<HTMLInputElement | null>(null);

  // Back button handler
  useBackHandler(() => {
    if (contextMenu !== null) {
      setContextMenu(null);
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
      setSelectedChatId(null);
      setMobileScreen('list');
      return true;
    }
    if (onBack) {
      onBack();
      return true;
    }
    return false;
  }, Boolean(
    contextMenu !== null ||
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

  useEffect(() => {
    async function loadDirectory() {
      try {
        const [directory] = await Promise.all([
          MessagingService.getMemberDirectory(),
          loadPinnedChats(),
          loadOfficialGroup(),
          loadStickers(),
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

  // Deep linking sync
  useEffect(() => {
    if (initialConversationId) {
      setSelectedChatId(initialConversationId);
      setMobileScreen('chat');
    }
  }, [initialConversationId]);

  // ---------------------------------------------------------------------------
  // 2. MESSAGES LOADING & REALTIME SYNC
  // ---------------------------------------------------------------------------
  const loadActiveMessages = async () => {
    if (!selectedChatId) return;
    try {
      if (selectedChatId === 'community') {
        const msgs = await MessagingService.getCommunityMessages(currentUser?.id);
        setCommunityMessages(msgs || []);
      } else {
        const targetId = selectedChatId === 'saved_messages' ? currentUser?.id : selectedChatId;
        if (targetId && currentUser?.id) {
          const msgs = await MessagingService.getPrivateConversation(
            targetId,
            currentUser.id,
            targetId,
            isAdmin
          );
          setPrivateMessages(msgs || []);
          await MessagingService.markPrivateMessagesRead(targetId, currentUser.id, targetId, isAdmin);
        }
      }
    } catch (e) {
      console.warn('Messages refresh exception:', e);
    }
  };

  useEffect(() => {
    if (selectedChatId) {
      loadActiveMessages();
    }

    // Supabase Realtime channel
    const channel = supabase
      ?.channel(`fni-telegram-messages-${currentUser?.id || 'guest'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_messages' }, () => {
        if (selectedChatId === 'community') loadActiveMessages();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'private_messages' }, () => {
        if (selectedChatId && selectedChatId !== 'community') loadActiveMessages();
      })
      .subscribe();

    // High-reliability 3s fallback poller
    const pollTimer = setInterval(() => {
      if (selectedChatId) {
        loadActiveMessages();
      }
    }, 3000);

    return () => {
      if (channel && supabase) supabase.removeChannel(channel);
      clearInterval(pollTimer);
    };
  }, [selectedChatId, currentUser?.id, isAdmin]);

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
  // 3. CONTACT LIST GENERATION (TELEGRAM CHAT LIST)
  // Saved Messages is top-level personal cloud chat matching Telegram
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

    // 0. Saved Messages (Telegram Cloud Notes & Personal Storage)
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
      avatarUrl: '', // Rendered with Telegram blue bookmark circle
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

    // 2. Registered Tutors & Leadership Direct Chats
    tutorList.forEach(peer => {
      const isPeerPinned = pinnedMap.has(peer.id);
      list.push({
        id: peer.id,
        name: peer.role === 'admin' || peer.role === 'super_admin' || peer.role === 'national_admin' ? 'FNI Leadership Directorate' : (peer.full_name || peer.name || 'FNI Member'),
        role: peer.role === 'admin' || peer.role === 'super_admin' || peer.role === 'national_admin' ? 'FNI Administrator' : 'Fellowship Tutor',
        cellName: peer.cell_name || '',
        avatarUrl: peer.avatar_url || peer.photo_url,
        isOnline: true,
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
  }, [communityMessages, tutorList, userPinnedChats, officialGroup, privateMessages, currentUser]);

  // Folder tab counts for Telegram categories
  const folderCounts = useMemo(() => {
    const allCount = contacts.length;
    const fniCount = contacts.filter(c => c.type === 'community' || c.id === 'community').length;
    const personalCount = contacts.filter(c => c.type === 'direct' || c.id === 'saved_messages').length;
    const unreadCount = contacts.filter(c => (c.unreadCount || 0) > 0 || c.id === 'community').length;
    const channelsCount = contacts.filter(c => c.type === 'community').length;
    return { allCount, fniCount, personalCount, unreadCount, channelsCount };
  }, [contacts]);

  // Filtered contacts based on folder and search query
  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = c.name.toLowerCase().includes(q);
        const matchesCell = c.cellName?.toLowerCase().includes(q);
        const matchesLast = c.lastMessage?.toLowerCase().includes(q);
        if (!matchesName && !matchesCell && !matchesLast) return false;
      }
      if (activeFolder === 'fni') return c.type === 'community' || c.id === 'community';
      if (activeFolder === 'personal') return c.type === 'direct' || c.id === 'saved_messages';
      if (activeFolder === 'unread') return (c.unreadCount || 0) > 0 || c.id === 'community';
      if (activeFolder === 'channels') return c.type === 'community';
      return true;
    });
  }, [contacts, searchQuery, activeFolder]);

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

  const handleCyclePinnedMessage = () => {
    if (allPinnedMessages.length === 0) return;
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

  // Swipe to Reply & Long-Press touch handlers (Mobile Telegram interaction)
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

  // Context Menu trigger
  const handleMessageContextMenu = (e: React.MouseEvent, msg: CommunityMessage | PrivateMessage) => {
    e.preventDefault();
    e.stopPropagation();
    const x = Math.min(e.clientX, window.innerWidth - 240);
    const y = Math.min(e.clientY, window.innerHeight - 340);
    setContextMenu({ msg, x, y });
  };

  // Telegram Message Deletion Handlers (Delete for Self vs Delete for Both)
  const handleOpenDeleteModal = (msg: CommunityMessage | PrivateMessage) => {
    setDeleteTargetMessage(msg);
    setDeleteForBoth(true);
    setContextMenu(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetMessage || !currentUser?.id) return;
    setIsDeleting(true);
    try {
      const msg = deleteTargetMessage;
      const isCommunity = selectedChatId === 'community';
      if (deleteForBoth) {
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
      // Remove immediately from active view
      if (isCommunity) {
        setCommunityMessages(prev => prev.filter(m => m.id !== msg.id));
      } else {
        setPrivateMessages(prev => prev.filter(m => m.id !== msg.id));
      }
      setDeleteTargetMessage(null);
    } catch (err) {
      console.error('Failed to delete message:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Telegram Date Label Formatter
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

  // Telegram Voice Note Waveform Renderer (Matches Screenshot)
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
            <span>{formattedTime}</span>
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

  // Telegram Emoji Insertion & Cursor Management (Smooth, no forced mobile keyboard shift)
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
  // 4. SENDING MESSAGES, MEDIA, STICKERS & POLLS
  // ---------------------------------------------------------------------------
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedChatId) return;

    const text = inputText.trim();
    if (!text && stagedFiles.length === 0) return;

    setIsSending(true);
    setSendError(null);

    try {
      const uploadedAttachments: ChatAttachment[] = [];
      for (const file of stagedFiles) {
        const att = await MessagingService.uploadChatAttachment(currentUser?.id || 'guest', file);
        if (att) uploadedAttachments.push(att);
      }

      if (selectedChatId === 'community') {
        await MessagingService.sendCommunityMessage({
          senderUid: currentUser.id,
          senderName: currentUser.full_name || 'FNI Leader',
          senderRole: currentUser.role,
          cellName: currentUser.cell_name,
          content: text || (uploadedAttachments.length > 0 ? `Shared ${uploadedAttachments.length} file(s)` : ''),
          category: 'general',
          replyTo: replyToMessage || undefined,
          mentions: mentionedUids.length > 0 ? mentionedUids : undefined,
          attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
        });
      } else {
        const recipientUid = selectedChatId === 'saved_messages' ? currentUser.id : selectedChatId;
        const recipient = allMembers.find(m => m.id === recipientUid);

        await MessagingService.sendPrivateMessage({
          senderUid: currentUser.id,
          senderName: currentUser.full_name || 'FNI Leader',
          senderRole: currentUser.role,
          recipientUid,
          recipientName: recipient?.full_name || (selectedChatId === 'saved_messages' ? 'Saved Messages' : 'FNI Member'),
          cellId: currentUser.cell_id,
          cellName: currentUser.cell_name,
          content: text || (uploadedAttachments.length > 0 ? `Shared ${uploadedAttachments.length} file(s)` : ''),
          replyTo: replyToMessage || undefined,
          mentions: mentionedUids.length > 0 ? mentionedUids : undefined,
          attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
        });
      }

      setInputText('');
      setStagedFiles([]);
      setReplyToMessage(null);
      setMentionQuery(null);
      setMentionedUids([]);
      await loadActiveMessages();
    } catch (err: any) {
      setSendError(err?.message || 'Message could not be sent.');
    } finally {
      setIsSending(false);
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

  // Delete Custom Sticker
  const handleDeleteCustomSticker = async (stickerId: string) => {
    if (!currentUser?.id) return;
    await MessagingService.deleteUserCustomSticker(currentUser.id, stickerId);
    setUserCustomStickers(prev => prev.filter(s => s.id !== stickerId));
    setFavoriteStickers(MessagingService.getFavoriteStickers(currentUser.id));
  };

  // Create Poll
  const handleCreatePoll = async () => {
    if (!selectedChatId || !pollQuestion.trim()) return;
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
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      alert('Voice recording is not supported on this device or browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Determine best supported audio container/codec across iOS, Android, and Desktop
      let mimeType = 'audio/webm;codecs=opus';
      if (typeof MediaRecorder.isTypeSupported === 'function') {
        const candidates = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/mp4;codecs=mp4a.40.2',
          'audio/mp4',
          'audio/aac',
          'audio/ogg',
        ];
        const supported = candidates.find(t => MediaRecorder.isTypeSupported(t));
        if (supported) mimeType = supported;
      }

      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, { mimeType });
      } catch {
        recorder = new MediaRecorder(stream);
        mimeType = recorder.mimeType || 'audio/webm';
      }

      const chunks: BlobPart[] = [];
      recorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const finalSecs = recordingSecondsRef.current || 1;
        const formattedDuration = `${Math.floor(finalSecs / 60)}:${(finalSecs % 60).toString().padStart(2, '0')}`;
        const blob = new Blob(chunks, { type: mimeType });

        if (blob.size > 0 && selectedChatId) {
          // Robust Data URL representation guaranteed to play on any device/offline
          const dataUrl = await new Promise<string>(resolve => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve('');
            reader.readAsDataURL(blob);
          });

          const ext = mimeType.includes('mp4') ? 'm4a' : (mimeType.includes('aac') ? 'aac' : 'webm');
          const file = new File([blob], `voice-note-${Date.now()}.${ext}`, { type: mimeType });

          let att: any = null;
          try {
            att = await MessagingService.uploadChatAttachment(currentUser?.id || 'guest', file);
          } catch (uploadErr) {
            console.warn('Voice note storage upload fallback:', uploadErr);
          }

          if (!att || !att.path) {
            att = {
              name: `Voice Note (${formattedDuration})`,
              path: dataUrl || '',
              mimeType: mimeType || 'audio/webm',
              size: blob.size,
            };
          }

          const content = `🎤 Voice Note (${formattedDuration})`;
          if (selectedChatId === 'community') {
            await MessagingService.sendCommunityMessage({
              senderUid: currentUser.id,
              senderName: currentUser.full_name || 'FNI Leader',
              senderRole: currentUser.role,
              cellName: currentUser.cell_name,
              content,
              attachments: [att],
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
              attachments: [att],
            });
          }
          await loadActiveMessages();
        }

        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250); // Timeslice 250ms for chunk reliability
      setIsRecordingVoice(true);
      setRecordingSeconds(0);
      recordingSecondsRef.current = 0;
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(sec => {
          const next = sec + 1;
          recordingSecondsRef.current = next;
          return next;
        });
      }, 1000);
    } catch (e: any) {
      console.error('Microphone access notice:', e);
      alert('Microphone access was denied or is unavailable on this device.');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecordingVoice) {
      mediaRecorderRef.current.stop();
      setIsRecordingVoice(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  // ---------------------------------------------------------------------------
  // 6. PINNING & UNPINNING
  // ---------------------------------------------------------------------------
  const handleTogglePin = async (msg: CommunityMessage | PrivateMessage, notify = false) => {
    setOpenMessageMenuId(null);
    setContextMenu(null);
    const pinnerDetails = {
      uid: currentUser.id,
      name: currentUser.full_name || 'FNI Leader',
      content: msg.content,
      recipientUid: 'recipientUid' in msg ? (msg.senderUid === currentUser.id ? msg.recipientUid : msg.senderUid) : undefined,
    };
    if (selectedChatId === 'community') {
      await MessagingService.setCommunityMessagePin(msg.id, !msg.isPinned, notify, pinnerDetails);
    } else {
      await MessagingService.setPrivateMessagePin(msg.id, currentUser.id, !msg.isPinned, notify, pinnerDetails);
    }
    await loadActiveMessages();
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

  // Resolve Attachment URL
  const getAttachmentUrl = (att: ChatAttachment) => {
    if (!att) return '';
    const raw = att.path || (att as any).url || (att as any).dataUrl || '';
    if (!raw) return '';
    if (raw.startsWith('data:') || raw.startsWith('blob:') || raw.startsWith('http://') || raw.startsWith('https://')) {
      return raw;
    }
    if (supabase) {
      const { data } = supabase.storage.from('fni-chat-media').getPublicUrl(raw);
      if (data?.publicUrl) return data.publicUrl;
    }
    return raw;
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
    <div className="h-[100dvh] md:h-[calc(100vh-5rem)] flex flex-col overflow-hidden bg-slate-50 dark:bg-[#0c1421] rounded-none md:rounded-3xl border-0 md:border border-slate-200/80 dark:border-white/10 shadow-none md:shadow-card">
      <div className="flex-1 flex overflow-hidden">
        {/* =====================================================================
            LEFT PANE: RECENT CONVERSATIONS & SEARCH (Desktop Left Sidebar / Mobile List View)
        ===================================================================== */}
        <div
          className={`${
            mobileScreen === 'chat' ? 'hidden md:flex' : 'flex'
          } w-full md:w-80 lg:w-96 flex-col border-r border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0e1621] shrink-0 overflow-hidden`}
        >
          {/* Top Header Bar */}
          <div className="p-3.5 border-b border-slate-200/80 dark:border-white/10 space-y-2.5 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {onBack && (
                  <button
                    type="button"
                    onClick={onBack}
                    className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                    title="Back to Dashboard"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <div className="flex items-center gap-1.5 font-bold text-sm text-slate-900 dark:text-white">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  <span>FNI Communication</span>
                </div>
              </div>
            </div>

            {/* Pill Search Input with Telegram-style Compose Button */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search"
                  className="w-full pl-9 pr-7 py-1.5 rounded-full bg-slate-100 dark:bg-[#242f3d] text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#2AABEE]"
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

            {/* Folder Filter Tabs (Telegram Category Pills Matching Reference) */}
            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pt-0.5 text-xs select-none">
              {[
                { id: 'all', label: 'All Chats', count: folderCounts.allCount },
                { id: 'fni', label: 'FNI ❤️', count: folderCounts.fniCount },
                { id: 'personal', label: 'Personal', count: folderCounts.personalCount },
                { id: 'unread', label: 'Unread', count: folderCounts.unreadCount },
                { id: 'channels', label: 'Channels', count: folderCounts.channelsCount },
              ].map(f => {
                const isActive = activeFolder === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setActiveFolder(f.id as any)}
                    className={`relative pb-1.5 font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 px-2 text-xs shrink-0 ${
                      isActive
                        ? 'text-[#2AABEE] border-b-2 border-[#2AABEE]'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    <span>{f.label}</span>
                    {f.count > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          isActive
                            ? 'bg-[#2AABEE] text-white'
                            : 'bg-slate-200 dark:bg-[#242f3d] text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {f.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-white/5 bg-white dark:bg-[#17212b]">
            {filteredContacts.map(c => {
              const isSelected = selectedChatId === c.id;
              const isPinned = c.isPinned;
              const isOfficialCommunity = c.id === 'community';
              const isSaved = c.id === 'saved_messages';

              return (
                <div
                  key={c.id}
                  className={`group relative w-full flex items-center gap-3 p-3 text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#2AABEE]/15 dark:bg-[#2b5278]/40 border-l-4 border-l-[#2AABEE]'
                      : 'hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                  onClick={() => {
                    setSelectedChatId(c.id);
                    setMobileScreen('chat');
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
                        {isOfficialCommunity && (
                          <span title="Official FNI Community" className="shrink-0">
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
                    </div>
                  )}
                </div>
              );
            })}

            {filteredContacts.length === 0 && (
              <div className="p-8 text-center text-slate-400">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs">No conversations match your search.</p>
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(true)}
                  className="mt-3 text-xs text-blue-600 font-bold hover:underline"
                >
                  Browse Tutor Directory
                </button>
              </div>
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
              mobileScreen === 'chat' ? 'hidden md:flex' : 'flex'
            } flex-1 flex-col overflow-y-auto custom-scrollbar bg-slate-50 dark:bg-[#0c1421] p-6 sm:p-10 justify-between`}
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
                    const isOnline = tutor.is_active || true;

                    return (
                      <div
                        key={tutor.id}
                        className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 hover:border-blue-400 dark:hover:border-blue-500 transition-all flex items-center justify-between gap-2.5 group"
                      >
                        <div
                          onClick={() => {
                            setSelectedChatId(tutor.id);
                            setMobileScreen('chat');
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
                          </div>
                        </div>

                        {/* Direct Action Buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedChatId(tutor.id);
                              setMobileScreen('chat');
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
                    setSelectedChatId('community');
                    setMobileScreen('chat');
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
        ) : (
          /* ===================================================================
             2. ACTIVE CONVERSATION VIEW (Rendered when a chat is open)
             Occupies full available screen on mobile, right pane on desktop
          =================================================================== */
          <div
            className={`${
              mobileScreen === 'list' ? 'hidden md:flex' : 'flex'
            } flex-1 flex-col overflow-hidden relative bg-[#0e1621]`}
          >
            {/* Top Audio Player Bar (Image 1) */}
            {activeAudioPlayer && (
              <div className="bg-[#182533] text-white px-4 py-2 flex items-center justify-between gap-3 text-xs border-b border-white/10 z-30 shrink-0">
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
                    <p className="text-[10px] text-blue-300">Telegram Voice & Audio Stream</p>
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

            {/* Chat Header Bar (Telegram Layout matching reference) */}
            <div className="px-3 sm:px-4 py-2 bg-white dark:bg-[#17212b] border-b border-slate-200 dark:border-white/10 flex items-center justify-between shrink-0 z-20 shadow-xs">
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
                    <div className="w-10 h-10 rounded-full bg-[#142B4A] text-[#C6A45A] font-bold text-xs sm:text-sm flex items-center justify-center overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 shadow-2xs">
                      {activeContact?.avatarUrl ? (
                        <img src={activeContact.avatarUrl} alt={activeContact.name} className="w-full h-full object-cover" />
                      ) : (
                        activeContact?.name?.slice(0, 2).toUpperCase() || 'FN'
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
                    <p className="text-[11px] text-slate-400 truncate">
                      {selectedChatId === 'saved_messages'
                        ? ''
                        : selectedChatId === 'community'
                        ? `${allMembers.length > 0 ? allMembers.length : 12} active tutors enrolled`
                        : activeContact?.isOnline
                        ? 'online'
                        : 'last seen recently'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Header Action Icons (Search, Calls, Details, Options) */}
              <div className="relative flex items-center gap-1 sm:gap-1.5 text-slate-600 dark:text-slate-300">
                <button
                  type="button"
                  onClick={() => setIsSearchInChatOpen(v => !v)}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-[#2AABEE] cursor-pointer transition-colors"
                  title="Search in chat"
                >
                  <Search className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={handleStartVideoCall}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-[#2AABEE] cursor-pointer transition-colors"
                  title="Video Call"
                >
                  <Video className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={handleStartVoiceCall}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-emerald-500 cursor-pointer transition-colors"
                  title="Voice Call"
                >
                  <Phone className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedChatId === 'community') setIsGroupInfoModalOpen(true);
                    else if (activeContact?.id && activeContact.id !== 'saved_messages') {
                      const m = allMembers.find(mem => mem.id === activeContact.id) || tutorList.find(t => t.id === activeContact.id);
                      if (m) {
                        setSelectedUserProfile({
                          id: m.id,
                          fullName: m.full_name || m.name,
                          role: m.role,
                          avatarUrl: m.avatar_url || m.photo_url,
                          cellName: m.cell_name || m.cell,
                          phone: m.phone_number || m.phone,
                          email: m.email,
                        });
                      }
                    }
                  }}
                  className="hidden sm:inline-flex p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-[#2AABEE] cursor-pointer transition-colors"
                  title="Chat Info & Settings"
                >
                  <PanelRight className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowChatOptionsMenu(v => !v)}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-[#2AABEE] cursor-pointer transition-colors"
                  title="Options"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>

                {/* Chat Options Dropdown */}
                {showChatOptionsMenu && (
                  <div className="absolute right-0 top-10 z-30 w-52 rounded-2xl bg-white dark:bg-[#182533] border border-slate-200 dark:border-white/10 shadow-xl py-1.5 text-xs text-slate-800 dark:text-slate-200 animate-fadeIn">
                    <button
                      type="button"
                      onClick={() => {
                        setShowChatOptionsMenu(false);
                        handleStartVoiceCall();
                      }}
                      className="w-full px-3.5 py-2 text-left hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2.5 font-semibold"
                    >
                      <Phone className="w-4 h-4 text-emerald-500" />
                      <span>Voice Call</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowChatOptionsMenu(false);
                        handleStartVideoCall();
                      }}
                      className="w-full px-3.5 py-2 text-left hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2.5 font-semibold"
                    >
                      <Video className="w-4 h-4 text-blue-500" />
                      <span>Video Call</span>
                    </button>
                    {selectedChatId === 'community' && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowChatOptionsMenu(false);
                          setIsGroupInfoModalOpen(true);
                        }}
                        className="w-full px-3.5 py-2 text-left hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2.5 font-semibold text-blue-600 dark:text-blue-400"
                      >
                        <Info className="w-4 h-4" />
                        <span>Group Info & Settings</span>
                      </button>
                    )}
                    {isAdmin && selectedChatId === 'community' && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowChatOptionsMenu(false);
                          setIsOfficialGroupModalOpen(true);
                        }}
                        className="w-full px-3.5 py-2 text-left hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2.5 font-semibold text-amber-600 dark:text-amber-400"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>Manage Official Group</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setShowChatOptionsMenu(false);
                        setIsSettingsModalOpen(true);
                      }}
                      className="w-full px-3.5 py-2 text-left hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2.5 font-semibold"
                    >
                      <Settings className="w-4 h-4 text-purple-500" />
                      <span>Settings & History</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowChatOptionsMenu(false);
                        handleBackToHome();
                      }}
                      className="w-full px-3.5 py-2 text-left hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2.5 font-semibold text-rose-600"
                    >
                      <X className="w-4 h-4" />
                      <span>Close Conversation</span>
                    </button>
                  </div>
                )}
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

            {/* Multi-Pinned Messages Bar (Telegram Cyan Left-Bar Layout) */}
            {allPinnedMessages.length > 0 && currentPinnedBannerMessage && (
              <div
                onClick={handleCyclePinnedMessage}
                className="px-4 py-2 bg-white dark:bg-[#17212b] border-b border-slate-200/80 dark:border-white/5 flex items-center justify-between gap-3 text-xs z-10 shadow-2xs cursor-pointer hover:bg-slate-50 dark:hover:bg-[#1f2b38] transition-colors select-none"
                title="Tap to cycle through pinned messages"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-[3px] self-stretch rounded-full bg-[#2AABEE] shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[11px] text-[#2AABEE] block">
                        Pinned Message {allPinnedMessages.length > 1 ? `(${activePinnedIndex + 1}/${allPinnedMessages.length})` : ''}
                      </span>
                      {currentPinnedBannerMessage.pinnedByName && (
                        <span className="text-[10px] text-slate-400">
                          by {currentPinnedBannerMessage.pinnedByName}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-slate-800 dark:text-slate-200 text-xs">
                      {currentPinnedBannerMessage.content.slice(0, 75)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                  <Pin className="w-4 h-4 text-slate-400 hover:text-[#2AABEE]" />
                  {allPinnedMessages.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setIsPinnedModalOpen(true)}
                      className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-[#2AABEE] text-[10px] font-bold flex items-center gap-1 px-1.5"
                      title="View all pinned messages"
                    >
                      <List className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">All Pins</span>
                    </button>
                  )}
                  {(isAdmin || currentPinnedBannerMessage.senderUid === currentUser?.id || selectedChatId !== 'community') && (
                    <button
                      type="button"
                      onClick={() => handleTogglePin(currentPinnedBannerMessage)}
                      className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500"
                      title="Unpin message"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Message Stream */}
            <div
              ref={messageStreamRef}
              className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-4 space-y-3 telegram-chat-wallpaper"
            >
              {currentMessages.length === 0 ? (
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
                      {/* Telegram Centered Date Separator (Matches Reference) */}
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
                        onContextMenu={e => handleMessageContextMenu(e, msg)}
                        onClick={e => {
                          if (window.innerWidth < 768 && Math.abs(swipeOffset) < 10) {
                            handleMessageContextMenu(e, msg);
                          }
                        }}
                        className={`group relative flex items-end gap-2 select-none w-full ${
                          isMine ? 'justify-end' : 'justify-start'
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
                            onClick={() => {
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

                        {/* Chat Bubble (Telegram styling matching reference) */}
                        <div
                          className={`relative max-w-[85%] sm:max-w-[72%] p-3 text-xs transition-shadow text-left ${
                            isMine ? 'telegram-bubble-outgoing ml-auto' : 'telegram-bubble-incoming mr-auto'
                          }`}
                          style={{ textAlign: 'left' }}
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

                          {/* Reply Preview Card inside bubble (Telegram cyan left-bar) */}
                          {msg.replyTo && (
                            <div
                              onClick={e => {
                                e.stopPropagation();
                                scrollToMessageId(msg.replyTo!.id);
                              }}
                              className="mb-1.5 p-2 rounded-xl bg-black/25 border-l-[3px] border-[#38a5e1] cursor-pointer text-[11px] hover:bg-black/35 transition-colors text-left"
                            >
                              <div className="font-bold text-[#38a5e1] text-xs leading-tight">
                                {msg.replyTo.senderName}
                              </div>
                              <div className="flex items-center gap-1 text-[11px] text-white/80 truncate mt-0.5">
                                {msg.replyTo.content.includes('Voice') || msg.replyTo.content.includes('🎤') ? (
                                  <>
                                    <Mic className="w-3 h-3 text-[#38a5e1] shrink-0" />
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
                            <div className="space-y-2 mb-1.5">
                              {msg.attachments.map((att, attIdx) => {
                                const isAudio = att.mimeType?.startsWith('audio') || att.name?.includes('voice-note') || att.name?.includes('Voice Note') || att.path?.startsWith('data:audio');
                                const isImage = att.mimeType?.startsWith('image');
                                const fileUrl = getAttachmentUrl(att);

                                if (isAudio) {
                                  const durationMatch = (att.name || msg.content || '').match(/\((\d+:\d+)\)/);
                                  const initialDuration = durationMatch ? durationMatch[1] : '0:15';
                                  return (
                                    <React.Fragment key={attIdx}>
                                      {renderVoiceNote(
                                        fileUrl,
                                        att.name || 'Voice Message',
                                        initialDuration,
                                        formattedTime,
                                        msg.senderName
                                      )}
                                    </React.Fragment>
                                  );
                                }

                                if (isImage) {
                                  return (
                                    <div key={attIdx} className="relative rounded-2xl overflow-hidden max-h-80 bg-black/10 select-none my-1">
                                      <img src={fileUrl} alt={att.name} className="w-full h-full object-cover rounded-2xl" />
                                      {/* Telegram photo timestamp overlay in bottom-right matching reference */}
                                      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/55 backdrop-blur-md text-white text-[10px] flex items-center gap-1 font-medium select-none shadow-xs">
                                        <span>{formattedTime}</span>
                                        {isMine && <CheckCheck className="w-3.5 h-3.5 text-white" />}
                                      </div>
                                    </div>
                                  );
                                }

                                return (
                                  <a
                                    key={attIdx}
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 rounded-xl bg-black/15 flex items-center gap-2 hover:underline"
                                  >
                                    <Paperclip className="w-4 h-4" />
                                    <span className="truncate">{att.name}</span>
                                  </a>
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

                          {/* Telegram Reaction Pills */}
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

                          {/* Timestamp & Status info with Telegram #53d793 checkmarks (rendered if not purely an image attachment) */}
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

                        {/* Desktop Hover action menu (Hidden on mobile; on mobile users tap or long-press) */}
                        <div className="hidden md:flex opacity-0 group-hover:opacity-100 transition-opacity items-center gap-0.5 text-white/80 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setReplyToMessage({
                                id: msg.id,
                                senderName: msg.senderName,
                                senderUid: msg.senderUid,
                                content: msg.content.slice(0, 100),
                              });
                              composerInputRef.current?.focus();
                            }}
                            className="p-1 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-xs text-white cursor-pointer"
                            title="Reply"
                          >
                            <Reply className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddReaction(msg.id, '❤️')}
                            className="p-1 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-xs text-white cursor-pointer"
                            title="Heart"
                          >
                            ❤️
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setForwardTargetMessage(msg);
                              setIsForwardModalOpen(true);
                            }}
                            className="p-1 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-xs text-white cursor-pointer"
                            title="Forward message"
                          >
                            <Forward className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDeleteModal(msg)}
                            className="p-1 rounded-full bg-black/30 hover:bg-rose-600/80 backdrop-blur-xs text-white hover:text-white cursor-pointer"
                            title="Delete message"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                          </button>
                          {(isAdmin || msg.senderUid === currentUser?.id || selectedChatId !== 'community') && (
                            <button
                              type="button"
                              onClick={() => handleTogglePin(msg)}
                              className="p-1 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-xs text-white cursor-pointer"
                              title={msg.isPinned ? 'Unpin' : 'Pin to top'}
                            >
                              <Pin className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={e => handleMessageContextMenu(e, msg)}
                            className="p-1 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-xs text-white cursor-pointer"
                            title="More options"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
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

            {/* Staged file chips */}
            {stagedFiles.length > 0 && (
              <div className="px-4 py-2 bg-slate-100 dark:bg-[#182533] border-t border-slate-200 dark:border-white/10 flex items-center gap-2 overflow-x-auto shrink-0 z-10 text-xs">
                {stagedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 shrink-0">
                    <Paperclip className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[120px]">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => setStagedFiles(stagedFiles.filter((_, i) => i !== idx))}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Attachment Menu Popup */}
            {showAttachmentMenu && (
              <div className="absolute left-4 bottom-16 z-30 w-52 rounded-2xl bg-white dark:bg-[#182533] border border-slate-200 dark:border-white/10 shadow-2xl p-2 text-xs text-slate-800 dark:text-slate-200 animate-fadeIn space-y-1">
                <label className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer font-semibold">
                  <ImageIcon className="w-4 h-4 text-blue-500" />
                  <span>Photo or Document</span>
                  <input
                    type="file"
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
                    setIsPollModalOpen(true);
                  }}
                  className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer font-semibold text-left"
                >
                  <BarChart2 className="w-4 h-4 text-emerald-500" />
                  <span>Create Poll</span>
                </button>
              </div>
            )}

            {/* =================================================================
                MESSAGE COMPOSER (Appears ONLY when conversation is open)
            ================================================================= */}
            <div
              className="p-3 bg-white dark:bg-[#182533] border-t border-slate-200/80 dark:border-white/10 shrink-0 z-30 relative"
              style={{
                paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
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
                      <div className="space-y-2">
                        {/* Search Input for Emojis */}
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          <input
                            type="text"
                            value={emojiSearchQuery}
                            onChange={e => setEmojiSearchQuery(e.target.value)}
                            placeholder="Search emojis (pray, amen, cross, love...)"
                            className="w-full pl-8 pr-8 py-1.5 rounded-xl bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                          />
                          {emojiSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setEmojiSearchQuery('')}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {/* Category Tabs */}
                        {!emojiSearchQuery && (
                          <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-1 text-base">
                            {EMOJI_CATEGORIES.map(cat => (
                              <button
                                key={cat.name}
                                type="button"
                                onClick={() => setSelectedEmojiCategory(cat.name)}
                                className={`p-1.5 rounded-xl transition-all shrink-0 cursor-pointer ${
                                  selectedEmojiCategory === cat.name
                                    ? 'bg-blue-50 dark:bg-blue-900/40 ring-1 ring-blue-500 scale-105'
                                    : 'hover:bg-slate-100 dark:hover:bg-white/5 opacity-70 hover:opacity-100'
                                }`}
                                title={cat.name}
                              >
                                <span>{cat.icon}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Emoji Grid */}
                        <div className="max-h-56 overflow-y-auto custom-scrollbar p-1">
                          <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                            {emojiSearchQuery ? `Search Results (${filteredEmojis.length})` : selectedEmojiCategory}
                          </div>
                          <div className="grid grid-cols-8 gap-1">
                            {filteredEmojis.map((emoji, eIdx) => (
                              <button
                                key={`${emoji}-${eIdx}`}
                                type="button"
                                onClick={() => handleInsertEmoji(emoji)}
                                className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-lg flex items-center justify-center cursor-pointer transition-transform hover:scale-125 active:scale-90"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                          {filteredEmojis.length === 0 && (
                            <p className="text-center text-slate-400 py-4 text-xs">No matching emojis found.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
              {isRecordingVoice ? (
                /* Voice recording active row */
                <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-600 animate-ping" />
                    <span className="font-bold text-xs">
                      Recording Voice Note ({Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, '0')})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={stopVoiceRecording}
                    className="p-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1 px-3 shadow-xs cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Send</span>
                  </button>
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

                  {/* Telegram mobile composer input row matching reference */}
                  <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAttachmentMenu(v => !v)}
                      className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer shrink-0 transition-colors"
                      title="Attach file, photo or poll"
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>

                    <div className="flex-1 rounded-full bg-slate-100 dark:bg-[#242f3d] border border-slate-200/80 dark:border-white/10 px-4 py-2 flex items-center gap-2">
                      <textarea
                        ref={composerInputRef}
                        rows={1}
                        value={inputText}
                        onChange={handleComposerChange}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        placeholder="Message"
                        className="flex-1 bg-transparent text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none resize-none max-h-24 leading-snug"
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

                    {/* Circular Vibrant Telegram Blue Mic/Send Button (#2AABEE from reference) */}
                    {inputText.trim() || stagedFiles.length > 0 ? (
                      <button
                        type="submit"
                        disabled={isSending}
                        className="w-10 h-10 rounded-full bg-[#2AABEE] hover:bg-[#2297d3] text-white flex items-center justify-center shrink-0 shadow-md transition-transform active:scale-95 cursor-pointer"
                        title="Send message"
                      >
                        <Send className="w-4 h-4 ml-0.5 text-white" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#111c2d] rounded-3xl border border-slate-200/80 dark:border-white/10 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/10">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-blue-600" />
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  New Poll
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPollModalOpen(false)}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Question
                </label>
                <input
                  type="text"
                  value={pollQuestion}
                  onChange={e => setPollQuestion(e.target.value)}
                  placeholder="Ask a question..."
                  className="w-full px-3 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      className="w-full px-3 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ))}
                  {pollOptions.length < 6 && (
                    <button
                      type="button"
                      onClick={() => setPollOptions([...pollOptions, ''])}
                      className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 pt-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Option</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-white/5 space-y-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Anonymous Voting
                  </span>
                  <input
                    type="checkbox"
                    checked={pollIsAnonymous}
                    onChange={e => setPollIsAnonymous(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600"
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
                    className="w-4 h-4 rounded text-blue-600"
                  />
                </label>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-white/5">
              <button
                type="button"
                onClick={() => setIsPollModalOpen(false)}
                className="px-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreatePoll}
                className="px-4 py-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer"
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
        onClose={() => setIsSettingsModalOpen(false)}
        tutorList={tutorList}
        onSelectTutor={tutorId => {
          setSelectedChatId(tutorId);
          setMobileScreen('chat');
        }}
        onOpenSavedMessages={() => {
          setSelectedChatId('saved_messages');
          setMobileScreen('chat');
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
          TELEGRAM FLOATING CONTEXT MENU
      ========================================================================= */}
      {contextMenu && (
        <div
          className="fixed inset-0 z-50 bg-black/10"
          onClick={() => setContextMenu(null)}
          onContextMenu={e => {
            e.preventDefault();
            setContextMenu(null);
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              left: Math.min(contextMenu.x, window.innerWidth - 240),
              top: Math.min(contextMenu.y, window.innerHeight - 340),
            }}
            className="fixed z-50 w-56 rounded-2xl bg-white dark:bg-[#182533] border border-slate-200 dark:border-white/10 shadow-2xl p-1.5 text-xs text-slate-800 dark:text-slate-200 animate-fadeIn space-y-1"
          >
            {/* Quick Telegram Reaction Bar */}
            <div className="flex items-center justify-between p-1.5 bg-slate-100 dark:bg-slate-800/60 rounded-xl overflow-x-auto">
              {['👍', '❤️', '🔥', '😂', '👏', '🙏', '🎉', '🕊️', '💯'].map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleAddReaction(contextMenu.msg.id, emoji)}
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

            {(isAdmin || contextMenu.msg.senderUid === currentUser?.id || selectedChatId !== 'community') && (
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
        canUnpin={isAdmin || selectedChatId !== 'community'}
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
          setSelectedChatId(tutorId);
          setMobileScreen('chat');
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
          TELEGRAM MESSAGE DELETION MODAL (DELETE FOR SELF VS DELETE FOR BOTH)
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

            {/* Checkbox for "Also delete for [User]" */}
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

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTargetMessage(null)}
                className="px-4 py-2 rounded-2xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                {isDeleting ? (
                  <span>Deleting...</span>
                ) : (
                  <span>{deleteForBoth ? 'Delete for Both' : 'Delete for Me'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          GROUP INFO & SETTINGS MODAL (TELEGRAM / WHATSAPP STYLE)
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
    </div>
  );
};
