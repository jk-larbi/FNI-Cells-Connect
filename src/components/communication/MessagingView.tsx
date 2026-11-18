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
import {
  PrivateMessage,
  CommunityMessage,
  MessageReply,
  ChatAttachment,
  ChatPoll,
  UserPinnedChat,
  CommunityGroup,
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
  Sparkles,
  Shield,
  Copy,
  Forward,
  Info,
  ArrowUp,
  ArrowDown,
  ShieldCheck,
  List,
} from 'lucide-react';
import { Button } from '../common/Button';
import { FniEmojiPicker } from './FniEmojiPicker';

export interface MessagingViewProps {
  initialConversationId?: string;
  initialTab?: 'private' | 'community';
  onBack?: () => void;
}

// Telegram-style quick stickers
const STICKER_PACK = [
  { emoji: '🙏', label: 'Praying' },
  { emoji: '❤️', label: 'Love' },
  { emoji: '🙌', label: 'Praise' },
  { emoji: '🔥', label: 'On Fire' },
  { emoji: '✨', label: 'Shining' },
  { emoji: '💪', label: 'Strength' },
  { emoji: '🕊️', label: 'Peace' },
  { emoji: '🎉', label: 'Celebrate' },
  { emoji: '👏', label: 'Well Done' },
  { emoji: '📖', label: 'Scripture' },
  { emoji: '🌱', label: 'Growing' },
  { emoji: '👑', label: 'Kingdom' },
];

const STICKER_PREFIX = '[[FNI_STICKER:';
const POLL_PREFIX = '[[FNI_POLL:';

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
}) => {
  const { currentUser, isAdmin } = useAuth();
  const { startDirectCall, startGroupMeeting } = useCall();

  // Navigation State
  // When no conversation is selected (selectedChatId === null), the FNI Communication Home Page is shown
  const [selectedChatId, setSelectedChatId] = useState<string | null>(initialConversationId || null);
  const [mobileScreen, setMobileScreen] = useState<'list' | 'chat'>(initialConversationId ? 'chat' : 'list');
  const [activeFolder, setActiveFolder] = useState<'all' | 'community' | 'direct'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [homeTutorSearch, setHomeTutorSearch] = useState('');

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

  // Telegram Floating Context Menu
  const [contextMenu, setContextMenu] = useState<{
    msg: CommunityMessage | PrivateMessage;
    x: number;
    y: number;
  } | null>(null);

  // Top Audio Player Bar (Image 1 PC Mode)
  const [activeAudioPlayer, setActiveAudioPlayer] = useState<{
    title: string;
    url: string;
    isPlaying: boolean;
    duration: string;
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
  const [showChatOptionsMenu, setShowChatOptionsMenu] = useState(false);
  const [openMessageMenuId, setOpenMessageMenuId] = useState<string | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<MessageReply | null>(null);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);

  // DOM Refs
  const messageStreamRef = useRef<HTMLDivElement | null>(null);
  const composerInputRef = useRef<HTMLTextAreaElement | null>(null);

  // Back button handler
  useBackHandler(() => {
    if (contextMenu !== null) {
      setContextMenu(null);
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

  useEffect(() => {
    async function loadDirectory() {
      try {
        const [directory] = await Promise.all([
          MessagingService.getMemberDirectory(),
          loadPinnedChats(),
          loadOfficialGroup(),
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
  // Saved Messages is moved into Communication Settings per requirements
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
        : 'No messages yet',
      lastMessageTime: lastComm
        ? new Date(lastComm.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : 'Active',
      unreadCount: 0,
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
        
        type: 'direct',
        isPinned: isPeerPinned,
        lastMessage: 'No messages yet',
        lastMessageTime: '',
        unreadCount: 0,
      });
    });

    // Sort: pinned first (by order_index), then unpinned
    return list.sort((a, b) => {
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
  }, [communityMessages, tutorList, userPinnedChats, officialGroup]);

  // Filtered contacts based on folder and search query
  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = c.name.toLowerCase().includes(q);
        const matchesCell = c.cellName?.toLowerCase().includes(q);
        if (!matchesName && !matchesCell) return false;
      }
      if (activeFolder === 'community') return c.type === 'community';
      if (activeFolder === 'direct') return c.type === 'direct';
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

  // Swipe to Reply touch handlers
  const handleTouchStart = (msgId: string, e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    setSwipingMessageId(msgId);
    setSwipeOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swipingMessageId) return;
    const diffX = e.touches[0].clientX - touchStartXRef.current;
    const diffY = Math.abs(e.touches[0].clientY - touchStartYRef.current);
    if (diffY > 30) {
      setSwipeOffset(0);
      return;
    }
    if (diffX < 0) {
      setSwipeOffset(Math.max(-80, diffX));
    }
  };

  const handleTouchEnd = (msg: CommunityMessage | PrivateMessage) => {
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
  // 5. VOICE NOTE RECORDING & PLAYBACK
  // ---------------------------------------------------------------------------
  const startVoiceRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      alert('Voice recording is not supported on this device/browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const ext = mimeType.includes('mp4') ? 'm4a' : 'webm';
        const file = new File([new Blob(chunks, { type: mimeType })], `voice-note-${Date.now()}.${ext}`, {
          type: mimeType,
        });

        if (file.size > 0 && selectedChatId) {
          const att = await MessagingService.uploadChatAttachment(currentUser?.id || 'guest', file);
          if (att) {
            if (selectedChatId === 'community') {
              await MessagingService.sendCommunityMessage({
                senderUid: currentUser.id,
                senderName: currentUser.full_name || 'Leader',
                senderRole: currentUser.role,
                cellName: currentUser.cell_name,
                content: '🎤 Voice Note',
                attachments: [att],
              });
            } else {
              const recipientUid = selectedChatId === 'saved_messages' ? currentUser.id : selectedChatId;
              const recipient = allMembers.find(m => m.id === recipientUid);
              await MessagingService.sendPrivateMessage({
                senderUid: currentUser.id,
                senderName: currentUser.full_name || 'Leader',
                senderRole: currentUser.role,
                recipientUid,
                recipientName: recipient?.full_name || 'FNI Member',
                content: '🎤 Voice Note',
                attachments: [att],
              });
            }
            await loadActiveMessages();
          }
        }

        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecordingVoice(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(sec => sec + 1);
      }, 1000);
    } catch (e) {
      alert('Microphone access was denied or unavailable.');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecordingVoice) {
      mediaRecorderRef.current.stop();
      setIsRecordingVoice(false);
      clearInterval(recordingTimerRef.current);
    }
  };

  const handlePlayAudio = (url: string, title: string) => {
    if (activeAudioPlayer && activeAudioPlayer.url === url) {
      if (activeAudioPlayer.isPlaying) {
        audioRef.current?.pause();
        setActiveAudioPlayer({ ...activeAudioPlayer, isPlaying: false });
      } else {
        audioRef.current?.play();
        setActiveAudioPlayer({ ...activeAudioPlayer, isPlaying: true });
      }
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.play();
    setActiveAudioPlayer({
      title,
      url,
      isPlaying: true,
      duration: 'Live',
    });
    audio.onended = () => {
      setActiveAudioPlayer(null);
    };
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
    if (!att.path) return '';
    if (att.path.startsWith('http://') || att.path.startsWith('https://') || att.path.startsWith('blob:')) {
      return att.path;
    }
    return supabase?.storage.from('fni-chat-media').getPublicUrl(att.path).data.publicUrl || att.path;
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
    if (msg.content.startsWith(STICKER_PREFIX)) {
      const parts = msg.content.slice(STICKER_PREFIX.length, -2).split(':');
      return (
        <div className="text-center py-1">
          <span className="text-5xl block animate-bounce-short">{parts[0]}</span>
          {parts[1] && <span className="text-[10px] font-bold text-slate-500 mt-1 block">{parts[1]}</span>}
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
    <div className="h-[calc(100vh-4.5rem)] sm:h-[calc(100vh-5rem)] flex flex-col overflow-hidden bg-slate-50 dark:bg-[#0c1421] rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-card">
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

              {/* Action Icons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(true)}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors cursor-pointer"
                  title="Communication Settings & Tutor Directory"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(true)}
                  className="p-2 rounded-full bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors cursor-pointer"
                  title="Discover Registered Tutors"
                >
                  <Users className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search conversations & tutors..."
                className="w-full pl-9 pr-3 py-1.5 rounded-full bg-slate-100 dark:bg-[#182533] text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
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

            {/* Folder Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-0.5 text-xs">
              {[
                { id: 'all', label: 'All Chats', count: contacts.length },
                { id: 'community', label: 'Community', count: 1 },
                { id: 'direct', label: 'Tutors', count: tutorList.length },
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActiveFolder(f.id as any)}
                  className={`px-3 py-1 rounded-full font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeFolder === f.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-[#182533] text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <span>{f.label}</span>
                  {f.count > 0 && (
                    <span className={`text-[10px] px-1.5 rounded-full ${activeFolder === f.id ? 'bg-white/25' : 'bg-slate-200 dark:bg-slate-700'}`}>
                      {f.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-white/5">
            {filteredContacts.map(c => {
              const isSelected = selectedChatId === c.id;
              const isPinned = c.isPinned;
              const isOfficialCommunity = c.id === 'community';

              return (
                <div
                  key={c.id}
                  className={`group relative w-full flex items-center gap-3 p-3 text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/40 border-l-4 border-l-blue-600'
                      : 'hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                  onClick={() => {
                    setSelectedChatId(c.id);
                    setMobileScreen('chat');
                  }}
                >
                  {/* Avatar Circle */}
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-full bg-[#142B4A] text-[#C6A45A] font-black text-sm flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700 shadow-2xs">
                      {c.avatarUrl ? (
                        <img src={c.avatarUrl} alt={c.name} className="w-full h-full object-cover" />
                      ) : (
                        c.name.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    {c.isOnline && (
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
                      <div className="flex items-center gap-1 shrink-0">
                        {isPinned && (
                          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300">
                            <Pin className="w-2.5 h-2.5 fill-current" />
                          </span>
                        )}
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
            } flex-1 flex-col overflow-hidden relative bg-[#8da4b6] dark:bg-[#0c1421]`}
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

            {/* Chat Header Bar */}
            <div className="px-4 py-3 bg-white dark:bg-[#182533] border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between shrink-0 z-20 shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
                {/* Back Button that returns to Communication Hub Home Page (NOT dashboard) */}
                <button
                  type="button"
                  onClick={handleBackToHome}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 font-bold text-xs transition-colors cursor-pointer shrink-0"
                  title="Return to Communication Hub"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Back</span>
                </button>

                <div className="w-9 h-9 rounded-full bg-[#142B4A] text-[#C6A45A] font-bold text-xs flex items-center justify-center overflow-hidden shrink-0">
                  {activeContact?.avatarUrl ? (
                    <img src={activeContact.avatarUrl} alt={activeContact.name} className="w-full h-full object-cover" />
                  ) : (
                    activeContact?.name.slice(0, 2).toUpperCase() || 'FN'
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                      {activeContact?.name || 'FNI Chat'}
                    </h3>
                    {selectedChatId === 'community' && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold border border-amber-500/20" title="Official Ministerial Community">
                        <ShieldCheck className="w-3 h-3 text-amber-500" />
                        <span>Official</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
                    {activeContact?.type === 'community'
                      ? `${allMembers.length || 12} active tutors enrolled`
                      : activeContact?.cellName || 'last seen recently'}
                  </p>
                </div>
              </div>

              {/* Header Action Icons */}
              <div className="relative flex items-center gap-1 sm:gap-2 text-slate-600 dark:text-slate-300">
                <button
                  type="button"
                  onClick={handleStartVoiceCall}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-emerald-600 cursor-pointer transition-colors"
                  title="Voice Call"
                >
                  <Phone className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleStartVideoCall}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 cursor-pointer transition-colors"
                  title="Video Call"
                >
                  <Video className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowChatOptionsMenu(v => !v)}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                  title="Options"
                >
                  <MoreVertical className="w-4 h-4" />
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

            {/* Multi-Pinned Messages Bar */}
            {allPinnedMessages.length > 0 && currentPinnedBannerMessage && (
              <div
                onClick={handleCyclePinnedMessage}
                className="px-4 py-2 bg-white/90 dark:bg-[#182533]/95 backdrop-blur-xs border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-3 text-xs z-10 shadow-2xs cursor-pointer hover:bg-slate-50 dark:hover:bg-[#1a2938] transition-colors"
                title="Tap to cycle through pinned messages"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-1 self-stretch rounded-full bg-blue-600 shrink-0" />
                  <Pin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[11px] text-blue-600 dark:text-blue-400 block">
                        Pinned Message {allPinnedMessages.length > 1 ? `(${activePinnedIndex + 1}/${allPinnedMessages.length})` : ''}
                      </span>
                      {currentPinnedBannerMessage.pinnedByName && (
                        <span className="text-[10px] text-slate-400">
                          by {currentPinnedBannerMessage.pinnedByName}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-slate-700 dark:text-slate-300 text-[11px]">
                      {currentPinnedBannerMessage.content.slice(0, 65)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                  {allPinnedMessages.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setIsPinnedModalOpen(true)}
                      className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-blue-600 text-[10px] font-bold flex items-center gap-1 px-1.5"
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
              className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-4 space-y-3 telegram-doodle-light dark:telegram-doodle-dark"
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
                currentMessages.map(msg => {
                  const isMine = msg.senderUid === currentUser?.id;
                  const formattedTime = new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const isSwiping = swipingMessageId === msg.id;

                  return (
                    <div
                      key={msg.id}
                      id={`msg-${msg.id}`}
                      onTouchStart={e => handleTouchStart(msg.id, e)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={() => handleTouchEnd(msg)}
                      onContextMenu={e => handleMessageContextMenu(e, msg)}
                      className={`group relative flex items-end gap-2 select-none ${
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

                      {/* Chat Bubble */}
                      <div
                        className={`relative w-fit min-w-0 max-w-[85%] sm:max-w-[70%] p-3 text-left text-xs leading-relaxed [overflow-wrap:anywhere] transition-shadow ${
                          isMine ? 'telegram-bubble-outgoing' : 'telegram-bubble-incoming'
                        }`}
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
                            <span className="font-black text-xs text-blue-600 dark:text-blue-400 hover:underline">
                              {msg.senderName}
                            </span>
                            {msg.cellName && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-300">
                                {msg.cellName}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Reply Preview if this is replying to another message */}
                        {msg.replyTo && (
                          <div
                            onClick={() => scrollToMessageId(msg.replyTo!.id)}
                            className="mb-2 p-2 rounded-xl bg-black/5 dark:bg-black/20 border-l-4 border-blue-500 cursor-pointer text-[11px] hover:bg-black/10 transition-colors"
                          >
                            <span className="font-bold text-blue-600 dark:text-blue-400 block">
                              {msg.replyTo.senderName}
                            </span>
                            <span className="truncate block opacity-80">
                              {msg.replyTo.content}
                            </span>
                          </div>
                        )}

                        {/* Attachments if any */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="space-y-2 mb-2">
                            {msg.attachments.map((att, attIdx) => {
                              const isAudio = att.mimeType?.startsWith('audio') || att.name?.includes('voice-note');
                              const isImage = att.mimeType?.startsWith('image');
                              const fileUrl = getAttachmentUrl(att);

                              if (isAudio) {
                                return (
                                  <div
                                    key={attIdx}
                                    className="p-2.5 rounded-2xl bg-black/5 dark:bg-black/20 flex items-center justify-between gap-3 min-w-[200px]"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => handlePlayAudio(fileUrl, att.name || 'Voice Note')}
                                      className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 hover:scale-105 transition-transform cursor-pointer"
                                    >
                                      <Play className="w-4 h-4 ml-0.5" />
                                    </button>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-bold text-xs truncate">{att.name || 'Voice Message'}</p>
                                      <p className="text-[10px] opacity-70">Tap to listen</p>
                                    </div>
                                  </div>
                                );
                              }

                              if (isImage) {
                                return (
                                  <div key={attIdx} className="rounded-xl overflow-hidden max-h-60 bg-black/10">
                                    <img src={fileUrl} alt={att.name} className="w-full h-full object-cover" />
                                  </div>
                                );
                              }

                              return (
                                <a
                                  key={attIdx}
                                  href={fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 rounded-xl bg-black/5 dark:bg-black/20 flex items-center gap-2 hover:underline"
                                >
                                  <Paperclip className="w-4 h-4" />
                                  <span className="truncate">{att.name}</span>
                                </a>
                              );
                            })}
                          </div>
                        )}

                        {/* Message Text / Sticker / Poll */}
                        <div className="leading-relaxed">
                          {renderMessageContent(msg)}
                        </div>

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
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddReaction(msg.id, emoji);
                                  }}
                                  onDoubleClick={(e) => {
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
                              onClick={(e) => {
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

                        {/* Timestamp & Status info */}
                        <div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-70 select-none">
                          {msg.isPinned && <Pin className="w-2.5 h-2.5 mr-0.5" />}
                          <span>{formattedTime}</span>
                          {isMine && (
                            <span title={'isRead' in msg && (msg as any).isRead ? 'Read' : 'Delivered'}>
                              {'isRead' in msg && (msg as any).isRead ? (
                                <CheckCheck className="w-3.5 h-3.5 text-blue-500 dark:text-white" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Hover action menu trigger */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 text-white/80 shrink-0">
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

            {/* Full emoji and sticker picker; stays inside the mobile composer width. */}
            {showEmojiPicker && (
              <div className="absolute inset-x-2 bottom-[calc(100%+0.5rem)] z-40 max-w-[min(24rem,calc(100vw-1rem))] ml-auto rounded-2xl animate-fadeIn">
                <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#182533] shadow-2xl p-3 mb-2">
                  <span className="font-extrabold text-[10px] uppercase text-slate-400 block mb-2">FNI Stickers</span>
                  <div className="grid grid-cols-6 gap-1">
                    {STICKER_PACK.map(sticker => (
                      <button key={sticker.label} type="button" onClick={() => handleSendSticker(sticker)} aria-label={sticker.label} title={sticker.label} className="min-h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-2xl">
                        {sticker.emoji}
                      </button>
                    ))}
                  </div>
                </div>
                <FniEmojiPicker onSelect={emoji => {
                  setInputText(prev => prev + emoji);
                  setShowEmojiPicker(false);
                  requestAnimationFrame(() => composerInputRef.current?.focus());
                }} />
              </div>
            )}

            {/* =================================================================
                MESSAGE COMPOSER (Appears ONLY when conversation is open)
            ================================================================= */}
            <div className="p-3 bg-white dark:bg-[#182533] border-t border-slate-200/80 dark:border-white/10 shrink-0 z-20">
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

                  {/* Signature Telegram composer input row */}
                  <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAttachmentMenu(v => !v)}
                      className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer shrink-0"
                      title="Attach file, photo or poll"
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>

                    <div className="flex-1 rounded-full bg-slate-100 dark:bg-[#0c1421] border border-slate-200/80 dark:border-white/10 px-4 py-2 flex items-center gap-2">
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
                        placeholder="Message (type @ to mention a tutor)"
                        className="flex-1 bg-transparent text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none resize-none max-h-24"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker(v => !v)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-white shrink-0 cursor-pointer"
                      >
                        <Smile className="w-5 h-5" />
                      </button>
                    </div>

                  {inputText.trim() || stagedFiles.length > 0 ? (
                    <button
                      type="submit"
                      disabled={isSending}
                      className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shrink-0 shadow-xs transition-transform active:scale-95 cursor-pointer"
                    >
                      <Send className="w-4 h-4 ml-0.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={startVoiceRecording}
                      className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shrink-0 shadow-xs transition-transform active:scale-95 cursor-pointer"
                      title="Record voice note"
                    >
                      <Mic className="w-5 h-5" />
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
    </div>
  );
};
