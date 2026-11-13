import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { MessagingService } from '../../services/messagingService';
import { supabase } from '../../lib/supabase';
import { CellService } from '../../services/cellService';
import { PrivateMessage, CommunityMessage, InvitationCode, MessageReply } from '../../types';
import {
  MessageSquare,
  Users,
  Send,
  Lock,
  KeyRound,
  Clock,
  CheckCheck,
  Check,
  AlertCircle,
  Plus,
  ShieldCheck,
  ArrowLeft,
  Reply,
  Smile,
  AtSign,
  X,
  CornerDownRight,
  Heart,
} from 'lucide-react';
import { Button } from '../common/Button';

export interface MessagingViewProps {
  initialConversationId?: string;
  initialTab?: 'private' | 'community';
  onBack?: () => void;
}

// Standard general quick emojis (WhatsApp / Telegram / social media style)
const QUICK_EMOJIS = ['😀', '😂', '😍', '👍', '🙏', '❤️', '🔥', '🎉', '🙌', '👏', '✨', '💯'];

// Standard general emoji categories (just like WhatsApp, Telegram & modern keyboards)
const STANDARD_EMOJI_CATEGORIES: Record<string, string[]> = {
  'Smileys & Faces': [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊',
    '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😋', '😛', '😜', '🤪', '😝',
    '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄',
    '😬', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧',
    '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟',
    '🙁', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢',
    '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠',
    '🤬', '😈', '👿', '💀', '💩', '🤡', '👻', '👽', '🤖',
  ],
  'Gestures & People': [
    '👍', '👎', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💪', '👋', '🤚',
    '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙',
    '👈', '👉', '👆', '🖕', '👇', '☝️', '✊', '👊', '🤛', '🤜', '🫂', '🏃',
    '🚶', '🧍', '🧎', '🧑‍🤝‍🧑', '👫', '👭', '👬', '💃', '🕺', '🧘',
  ],
  'Hearts & Symbols': [
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹',
    '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '🕊️', '✝️', '☮️',
    '💯', '🔥', '✨', '🌟', '⭐', '💫', '💥', '💢', '💬', '💭', '💤', '👑',
    '🛡️', '⚡', '☀️', '🌈', '💎', '🔔', '🏷️', '🎯', '📍', '💡',
  ],
  'Celebration & Objects': [
    '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🎫', '🎟️',
    '📱', '💻', '🖥️', '📷', '📹', '📖', '📚', '📝', '✏️', '✉️', '📦', '🔑',
    '🔒', '🔓', '🚀', '✈️', '🚗', '🏠', '⛪', '🕯️', '🎤', '🎧', '🎵', '🎶',
    '⚽', '🏀', '🏈', '⚾', '🎾', '🎮', '🎲',
  ],
  'Food & Nature': [
    '🌸', '🌹', '🌺', '🌻', '🌼', '🌷', '🌱', '🌲', '🌳', '🌴', '🌿', '☘️',
    '🍀', '🍁', '🍂', '🍃', '🍎', '🍏', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓',
    '🍒', '🍑', '🍍', '🥥', '🥑', '🍔', '🍟', '🍕', '🥪', '🍞', '🍦', '🍩',
    '🍪', '🎂', '🍰', '🍫', '🍬', '🍭', '☕', '🍵', '🧃', '🥤', '💧', '🌊',
  ],
};

export const MessagingView: React.FC<MessagingViewProps> = ({
  initialConversationId,
  initialTab,
  onBack,
}) => {
  const { currentUser, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'private' | 'community'>(() => initialTab || 'community');

  // Private Messaging State
  const [privateMessages, setPrivateMessages] = useState<PrivateMessage[]>([]);
  const [privateText, setPrivateText] = useState('');
  const [selectedTutorId, setSelectedTutorId] = useState<string>(() => initialConversationId || '');
  const [tutorList, setTutorList] = useState<{ id: string; name: string; cellName: string }[]>([]);
  const [isSendingPrivate, setIsSendingPrivate] = useState(false);
  const [privateSendError, setPrivateSendError] = useState<string | null>(null);
  const [privateReplyTo, setPrivateReplyTo] = useState<MessageReply | null>(null);
  const [showPrivateEmoji, setShowPrivateEmoji] = useState(false);
  const [privateEmojiCategory, setPrivateEmojiCategory] = useState<string>('Smileys & Faces');

  // Community Messaging State
  const [communityMessages, setCommunityMessages] = useState<CommunityMessage[]>([]);
  const [communityText, setCommunityText] = useState('');
  const [communityCategory, setCommunityCategory] = useState<'general' | 'announcement' | 'prayer_request' | 'testimony'>('general');
  const [isSendingCommunity, setIsSendingCommunity] = useState(false);
  const [communitySendError, setCommunitySendError] = useState<string | null>(null);
  const [communityReplyTo, setCommunityReplyTo] = useState<MessageReply | null>(null);
  const [showCommunityEmoji, setShowCommunityEmoji] = useState(false);
  const [communityEmojiCategory, setCommunityEmojiCategory] = useState<string>('Smileys & Faces');

  // Registered members / tutors directory for @mention tagging
  const [memberDirectory, setMemberDirectory] = useState<{ id: string; name: string; cellName?: string }[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [showMentionMenu, setShowMentionMenu] = useState(false);

  // Admin Invite Code Generator Modal (Optional management tool)
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [expiryMinutes, setExpiryMinutes] = useState(60);
  const [maxUses, setMaxUses] = useState(10);
  const [generatedCodes, setGeneratedCodes] = useState<InvitationCode[]>([]);
  const [newCodeSuccess, setNewCodeSuccess] = useState<string | null>(null);

  // Input refs
  const communityInputRef = useRef<HTMLInputElement>(null);
  const privateInputRef = useRef<HTMLInputElement>(null);
  const communityEndRef = useRef<HTMLDivElement>(null);
  const privateEndRef = useRef<HTMLDivElement>(null);

  // Sync when initialConversationId changes externally (e.g. notification click)
  useEffect(() => {
    if (initialConversationId) {
      if (initialConversationId === 'community') {
        setActiveTab('community');
      } else {
        setActiveTab('private');
        setSelectedTutorId(initialConversationId);
      }
    }
  }, [initialConversationId]);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    async function init() {
      // Load all cells and tutors to populate member directory and admin tutor selector
      const cells = await CellService.getCells();
      const directory: { id: string; name: string; cellName?: string }[] = [];

      cells.forEach(c => {
        if (c.leader_name) {
          directory.push({
            id: c.tutorUid || c.leader_name || c.id,
            name: c.leader_name,
            cellName: c.name,
          });
        }
      });

      // Add leadership team
      directory.push({ id: 'admin-1', name: 'Pastor & Leadership', cellName: 'National Admin' });
      directory.push({ id: 'admin-2', name: 'Overseer', cellName: 'FNI Secretariat' });

      // Add current user if not in directory
      if (currentUser?.full_name && !directory.some(d => d.name.toLowerCase() === currentUser.full_name.toLowerCase())) {
        directory.push({
          id: currentUser.id,
          name: currentUser.full_name,
          cellName: currentUser.cell_name,
        });
      }

      setMemberDirectory(directory);

      const adminConvs = await MessagingService.getAdminConversations();
      const tutorMap = new Map<string, { id: string; name: string; cellName: string }>();

      cells.forEach(c => {
        const id = c.tutorUid || c.id;
        tutorMap.set(id, {
          id,
          name: c.leader_name || 'Cell Leader',
          cellName: c.name,
        });
      });

      adminConvs.forEach(conv => {
        if (!tutorMap.has(conv.tutorUid) && conv.tutorUid !== 'admin') {
          tutorMap.set(conv.tutorUid, {
            id: conv.tutorUid,
            name: conv.tutorName,
            cellName: conv.cellName || 'Fellowship Cell',
          });
        }
      });

      const tList = Array.from(tutorMap.values());
      setTutorList(tList);
      if (tList.length > 0 && !selectedTutorId) {
        setSelectedTutorId(tList[0].id);
      }

      await loadCommunity();
      if (isAdmin) {
        await loadInviteCodes();
      }
    }
    init();
  }, [currentUser, isAdmin]);

  // Realtime subscription + auto-sync for messaging (Zero manual refresh required)
  useEffect(() => {
    loadPrivateMessages();

    // 1. Subscribe to Supabase Realtime for instant push updates
    const channel = supabase
      .channel(`realtime:messages:${currentUser.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'private_messages' },
        () => {
          loadPrivateMessages();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'community_messages' },
        () => {
          loadCommunity();
        }
      )
      .subscribe();

    // 2. High-reliability polling fallback every 3 seconds for guaranteed message delivery
    const pollTimer = setInterval(() => {
      loadPrivateMessages();
      loadCommunity();
    }, 3000);

    return () => {
      clearInterval(pollTimer);
      supabase.removeChannel(channel);
    };
  }, [currentUser, isAdmin, selectedTutorId]);

  const loadPrivateMessages = async () => {
    const tutorId = isAdmin ? selectedTutorId : currentUser.id;
    if (!tutorId) return;
    const msgs = await MessagingService.getPrivateConversation(tutorId);
    setPrivateMessages(msgs);
    await MessagingService.markPrivateMessagesRead(tutorId, currentUser.id);
  };

  const loadCommunity = async () => {
    const msgs = await MessagingService.getCommunityMessages();
    setCommunityMessages(msgs);
  };

  const loadInviteCodes = async () => {
    const codes = await MessagingService.getInvitationCodes();
    setGeneratedCodes(codes);
  };

  // Scroll to a quoted message
  const scrollToMessage = (msgId: string) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-[#C6A45A]', 'bg-amber-50/60');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-[#C6A45A]', 'bg-amber-50/60');
      }, 2500);
    }
  };

  // Handle typing in Community chat to detect @mentions
  const handleCommunityInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCommunityText(val);

    const cursorPos = e.target.selectionStart || val.length;
    const textBeforeCursor = val.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@([a-zA-Z0-9_\s]*)$/);

    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setShowMentionMenu(true);
    } else {
      setShowMentionMenu(false);
      setMentionQuery(null);
    }
  };

  // Select a user from @mention menu
  const handleSelectMention = (memberName: string) => {
    if (activeTab === 'community') {
      const input = communityInputRef.current;
      const cursorPos = input?.selectionStart || communityText.length;
      const textBefore = communityText.slice(0, cursorPos);
      const textAfter = communityText.slice(cursorPos);
      const replacedBefore = textBefore.replace(/@([a-zA-Z0-9_\s]*)$/, `@${memberName} `);
      setCommunityText(replacedBefore + textAfter);
      setShowMentionMenu(false);
      setMentionQuery(null);
      setTimeout(() => input?.focus(), 50);
    } else {
      setPrivateText(prev => `${prev}@${memberName} `);
      privateInputRef.current?.focus();
    }
  };

  // Send Private Message
  const handleSendPrivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!privateText.trim()) return;

    const targetTutorId = isAdmin ? selectedTutorId : currentUser.id;
    const targetTutorName = isAdmin
      ? tutorList.find(t => t.id === selectedTutorId)?.name || 'Tutor'
      : currentUser.full_name;

    setIsSendingPrivate(true);
    setPrivateSendError(null);
    try {
      await MessagingService.sendPrivateMessage({
        senderUid: currentUser.id,
        senderName: currentUser.full_name,
        senderRole: currentUser.role,
        recipientUid: isAdmin ? targetTutorId : 'admin',
        recipientName: isAdmin ? targetTutorName : 'Administrator / Leadership',
        cellId: currentUser.cell_id,
        cellName: currentUser.cell_name,
        content: privateText.trim(),
        replyTo: privateReplyTo || undefined,
      });
      setPrivateText('');
      setPrivateReplyTo(null);
      setShowPrivateEmoji(false);
      await loadPrivateMessages();
      privateEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      console.error('Private message send failed:', error);
      setPrivateSendError(error instanceof Error ? error.message : 'Message could not be sent. Please try again.');
    } finally {
      setIsSendingPrivate(false);
    }
  };

  // Send Community Message
  const handleSendCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!communityText.trim()) return;

    // Detect mentioned names
    const mentionsFound = memberDirectory
      .filter(m => communityText.toLowerCase().includes(`@${m.name.toLowerCase()}`))
      .map(m => m.name);

    setIsSendingCommunity(true);
    setCommunitySendError(null);
    try {
      await MessagingService.sendCommunityMessage({
        senderUid: currentUser.id,
        senderName: currentUser.full_name,
        senderRole: currentUser.role,
        cellName: currentUser.cell_name,
        content: communityText.trim(),
        category: communityCategory,
        replyTo: communityReplyTo || undefined,
        mentions: mentionsFound,
      });
      setCommunityText('');
      setCommunityReplyTo(null);
      setShowCommunityEmoji(false);
      setShowMentionMenu(false);
      await loadCommunity();
      communityEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      console.error('Community message send failed:', error);
      setCommunitySendError(error instanceof Error ? error.message : 'Message could not be sent. Please try again.');
    } finally {
      setIsSendingCommunity(false);
    }
  };

  // Handle reaction on community message
  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      await MessagingService.reactToCommunityMessage(messageId, emoji, currentUser.id, currentUser.full_name);
      await loadCommunity();
    } catch (error) {
      console.warn('Community reaction failed:', error);
      setCommunitySendError('Your reaction could not be saved. Please try again.');
    }
  };

  // Format message text with highlighted @mentions and authentic standard iPhone emojis
  const renderFormattedMessage = (content: string) => {
    // Regex matches @Name patterns
    const parts = content.split(/(@[A-Za-z0-9_\-\s]+?(?=\s|[.,!?]|$))/g);
    return parts.map((part, idx) => {
      if (part.startsWith('@') && part.length > 1) {
        return (
          <span
            key={idx}
            className="inline-block px-1.5 py-0.5 rounded-md bg-[#142B4A]/10 text-[#142B4A] font-bold text-xs mx-0.5 cursor-pointer hover:bg-[#142B4A]/20 transition-colors"
            title="Tagged member"
          >
            {part}
          </span>
        );
      }
      return <React.Fragment key={idx}>{part}</React.Fragment>;
    });
  };

  const handleGenerateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = await MessagingService.generateInvitationCode(
      currentUser.id,
      currentUser.full_name,
      expiryMinutes,
      maxUses
    );
    setNewCodeSuccess(code.code);
    await loadInviteCodes();
  };

  // Filter mention directory
  const filteredMentions = memberDirectory.filter(m => {
    if (!mentionQuery) return true;
    return m.name.toLowerCase().includes(mentionQuery.toLowerCase());
  });

  return (
    <div className="fni-messaging-view min-w-0 space-y-4 sm:space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#667085] hover:text-[#142B4A] mb-2 cursor-pointer group"
            >
              <ArrowLeft className="w-4 h-4 text-[#C6A45A] group-hover:-translate-x-1 transition-transform" />
              <span>Back to Previous</span>
            </button>
          )}
          <div className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#142B4A]/10 text-[#142B4A] border border-[#142B4A]/20 mb-1.5">
            <span>FNI Fellowship Exchange & Leadership Hub</span>
          </div>
          <h1 className="text-lg sm:text-2xl font-black text-[#142B4A] tracking-tight">
            Communications & Fellowship Chat
          </h1>
          <p className="hidden sm:block text-xs sm:text-sm text-[#667085] mt-1">
            Open fellowship exchange for all tutors, prayer sharing, testimonies & direct pastoral oversight.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex w-full sm:w-auto items-center p-1 bg-[#F5F7FA] rounded-2xl border border-[#E3E8EF]">
          <button
            onClick={() => setActiveTab('community')}
            className={`flex-1 sm:flex-none justify-center px-2.5 sm:px-4 py-2.5 rounded-xl text-[11px] sm:text-sm font-bold transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer ${
              activeTab === 'community'
                ? 'bg-[#142B4A] text-white shadow-xs'
                : 'text-[#667085] hover:text-[#142B4A]'
            }`}
          >
            <Users className="w-4 h-4 text-[#C6A45A]" />
            <span>Community</span>
          </button>
          <button
            onClick={() => setActiveTab('private')}
            className={`flex-1 sm:flex-none justify-center px-2.5 sm:px-4 py-2.5 rounded-xl text-[11px] sm:text-sm font-bold transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer ${
              activeTab === 'private'
                ? 'bg-[#142B4A] text-white shadow-xs'
                : 'text-[#667085] hover:text-[#142B4A]'
            }`}
          >
            <Lock className="w-4 h-4 text-[#C6A45A]" />
            <span>Leadership</span>
          </button>
        </div>
      </div>

      {/* TAB 1: TUTOR COMMUNITY FORUM (Open Access, Emojis, Tagging & Telegram/WhatsApp Replies) */}
      {activeTab === 'community' && (
        <div className="fni-chat-panel bg-white rounded-2xl sm:rounded-3xl border border-[#E3E8EF] shadow-xs overflow-hidden flex flex-col">
          {/* Forum Header */}
          <div className="px-3.5 py-3 sm:p-5 bg-gradient-to-r from-[#142B4A] via-[#1A365D] to-[#203D63] text-white border-b border-[#142B4A] flex flex-wrap items-center justify-between gap-2 sm:gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#C6A45A] uppercase tracking-wider mb-1">
                <Users className="w-4 h-4" /> Fellowship Exchange Forum
              </div>
              <h2 className="font-black text-base sm:text-lg text-white">
                Tutor Community & Fellowship Sharing
              </h2>
              <p className="hidden sm:block text-xs text-slate-200 mt-0.5">
                Open to all fellowship tutors. Mention leaders with <span className="text-[#C6A45A] font-bold">@Name</span>, send emojis & reply to messages.
              </p>
            </div>

            {isAdmin && (
              <button
                onClick={() => {
                  setShowInviteModal(true);
                  setNewCodeSuccess(null);
                }}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-[#C6A45A] border border-white/20 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
                <span>Manage Community Access</span>
              </button>
            )}
          </div>

          {/* Forum Messages Stream */}
          <div className="fni-chat-stream px-3 py-4 sm:p-6 h-[min(54dvh,460px)] min-h-[300px] sm:h-[460px] overflow-y-auto space-y-3 sm:space-y-4 bg-[#F5F7FA]">
            {communityMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-[#667085]">
                <Users className="w-12 h-12 text-[#667085]/40 mb-3" />
                <p className="text-sm font-bold text-[#182230]">The community board is fresh</p>
                <p className="text-xs text-[#667085] max-w-sm mt-1 leading-relaxed">
                  Share an encouraging scripture, prayer need, outreach victory, or praise report with fellow tutors!
                </p>
              </div>
            ) : (
              communityMessages.map(msg => {
                const isMine = msg.senderUid === currentUser.id;
                const reactions = msg.reactions || {};

                return (
                  <div
                    key={msg.id}
                    id={`msg-${msg.id}`}
                    className="p-4 bg-white rounded-2xl border border-[#E3E8EF] shadow-2xs space-y-2.5 transition-all"
                  >
                    {/* Header Row: Sender, Tag Badge & Time */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-[#142B4A] text-[#C6A45A] font-black text-xs flex items-center justify-center shrink-0">
                          {msg.senderName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs sm:text-sm text-[#142B4A]">
                              {msg.senderName}
                            </span>
                            {msg.senderRole === 'admin' && (
                              <span className="px-2 py-0.5 rounded-full bg-[#C6A45A] text-[#142B4A] text-[10px] font-black uppercase">
                                Leadership
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[#667085]">
                            {msg.cellName || 'FNI Ministry'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                          msg.category === 'announcement'
                            ? 'bg-amber-100 text-amber-800'
                            : msg.category === 'prayer_request'
                            ? 'bg-purple-100 text-purple-800'
                            : msg.category === 'testimony'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-[#F5F7FA] text-[#142B4A] border border-[#E3E8EF]'
                        }`}>
                          {(msg.category || 'general').replace('_', ' ')}
                        </span>
                        <span className="text-xs text-[#667085]">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* TELEGRAM / WHATSAPP STYLE QUOTED REPLY PREVIEW */}
                    {msg.replyTo && (
                      <div
                        onClick={() => scrollToMessage(msg.replyTo!.id)}
                        className="p-2.5 rounded-xl bg-[#142B4A]/5 border-l-4 border-[#C6A45A] text-xs cursor-pointer hover:bg-[#142B4A]/10 transition-colors ml-11"
                        title="Click to view original message"
                      >
                        <div className="flex items-center gap-1.5 font-bold text-[#142B4A]">
                          <CornerDownRight className="w-3.5 h-3.5 text-[#C6A45A]" />
                          <span>Replying to {msg.replyTo.senderName}</span>
                        </div>
                        <p className="text-[#667085] truncate mt-0.5 text-xs">
                          {msg.replyTo.content}
                        </p>
                      </div>
                    )}

                    {/* Message Body with Highlighted Mentions */}
                    <div className="text-xs sm:text-sm text-[#182230] leading-relaxed pl-11">
                      {renderFormattedMessage(msg.content)}
                    </div>

                    {/* Footer Actions: Emoji Reactions & Reply Button */}
                    <div className="flex items-center justify-between pt-2 border-t border-[#E3E8EF]/60 pl-11 flex-wrap gap-2">
                      {/* Active Reaction Pills */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {Object.entries(reactions).map(([emoji, reactors]) => {
                          if (!reactors || reactors.length === 0) return null;
                          const hasReacted = reactors.includes(currentUser.full_name);
                          return (
                            <button
                              key={emoji}
                              onClick={() => handleReaction(msg.id, emoji)}
                              className={`px-2 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                                hasReacted
                                  ? 'bg-amber-50 border-[#C6A45A] text-[#142B4A]'
                                  : 'bg-white border-[#E3E8EF] text-[#667085] hover:bg-[#F5F7FA]'
                              }`}
                              title={reactors.join(', ')}
                            >
                              <span className="text-sm leading-none">{emoji}</span>
                              <span>{reactors.length}</span>
                            </button>
                          );
                        })}

                        {/* Quick Reaction Tray (1-tap reaction) */}
                        <div className="flex items-center gap-1.5 bg-[#F5F7FA] px-2 py-1 rounded-xl border border-[#E3E8EF]">
                          {['🙏', '❤️', '🔥', '👏', '🙌'].map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => handleReaction(msg.id, emoji)}
                              className="hover:scale-125 transition-transform p-0.5 cursor-pointer flex items-center justify-center text-sm"
                              title={`React with ${emoji}`}
                            >
                              <span>{emoji}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Reply Button (Telegram/WhatsApp style) */}
                      <button
                        onClick={() => {
                          setCommunityReplyTo({
                            id: msg.id,
                            senderName: msg.senderName,
                            content: msg.content,
                          });
                          communityInputRef.current?.focus();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#F5F7FA] hover:bg-[#142B4A] hover:text-white text-[#142B4A] text-xs font-bold transition-all border border-[#E3E8EF] flex items-center gap-1.5 cursor-pointer ml-auto"
                      >
                        <Reply className="w-3.5 h-3.5" />
                        <span>Reply</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={communityEndRef} />
          </div>

          {/* ACTIVE REPLY PREVIEW BANNER (WhatsApp / Telegram style) */}
          {communityReplyTo && (
            <div className="p-3 bg-amber-50/80 border-t-2 border-l-4 border-l-[#C6A45A] border-amber-200 flex items-center justify-between gap-3 text-xs sm:text-sm">
              <div className="flex items-center gap-2.5 min-w-0">
                <Reply className="w-4 h-4 text-[#C6A45A] shrink-0" />
                <div className="min-w-0">
                  <div className="font-bold text-[#142B4A]">
                    Replying to {communityReplyTo.senderName}
                  </div>
                  <div className="text-xs text-[#667085] truncate max-w-xl">
                    {communityReplyTo.content}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCommunityReplyTo(null)}
                className="p-1 rounded-lg hover:bg-amber-100 text-[#667085] hover:text-[#142B4A] transition-colors shrink-0 cursor-pointer"
                title="Cancel reply"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* FLOATING @MENTION AUTOCOMPLETE MENU */}
          {showMentionMenu && filteredMentions.length > 0 && (
            <div className="border-t border-[#E3E8EF] bg-white p-2 max-h-48 overflow-y-auto shadow-md space-y-1">
              <div className="px-2 py-1 text-[11px] font-bold text-[#667085] uppercase tracking-wider">
                Select a member to tag (@mention):
              </div>
              {filteredMentions.slice(0, 6).map(m => (
                <div
                  key={m.id}
                  onClick={() => handleSelectMention(m.name)}
                  className="p-2 rounded-xl hover:bg-[#F5F7FA] flex items-center justify-between cursor-pointer text-xs transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#142B4A] text-[#C6A45A] text-[10px] font-bold flex items-center justify-center">
                      {m.name.slice(0, 1).toUpperCase()}
                    </div>
                    <span className="font-bold text-[#142B4A]">{m.name}</span>
                  </div>
                  {m.cellName && (
                    <span className="text-[11px] text-[#667085]">{m.cellName}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Standard Social Media / WhatsApp Emoji Drawer */}
          {showCommunityEmoji && (
            <div className="border-t border-[#E3E8EF] bg-white p-3 shadow-md space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-[#E3E8EF] gap-2">
                {/* Category Navigation Bar (WhatsApp / Telegram style) */}
                <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar py-0.5">
                  {Object.keys(STANDARD_EMOJI_CATEGORIES).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCommunityEmojiCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                        communityEmojiCategory === cat
                          ? 'bg-[#142B4A] text-white shadow-xs'
                          : 'bg-[#F5F7FA] text-[#667085] hover:bg-[#E3E8EF] hover:text-[#182230]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setShowCommunityEmoji(false)}
                  className="p-1 rounded-lg hover:bg-[#F5F7FA] text-[#667085] hover:text-[#182230] cursor-pointer shrink-0"
                  title="Close emoji picker"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Standard General Emojis Grid */}
              <div className="max-h-52 overflow-y-auto p-1 custom-scrollbar">
                <div className="grid grid-cols-8 sm:grid-cols-12 md:grid-cols-14 gap-1.5">
                  {STANDARD_EMOJI_CATEGORIES[communityEmojiCategory]?.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setCommunityText(prev => prev + emoji);
                        communityInputRef.current?.focus();
                      }}
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl hover:bg-[#F5F7FA] flex items-center justify-center hover:scale-125 transition-all cursor-pointer text-xl sm:text-2xl"
                      title={emoji}
                    >
                      <span>{emoji}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Forum Compose Bar */}
          <form onSubmit={handleSendCommunity} className="fni-chat-composer p-2.5 sm:p-4 bg-white border-t border-[#E3E8EF] space-y-2.5 sm:space-y-3 min-w-0">
            {communitySendError && (
              <p role="alert" className="text-xs font-semibold text-rose-600">{communitySendError}</p>
            )}
            {/* Category Selector + Quick Emojis Row */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-[#667085]">Category:</span>
                {(['general', 'announcement', 'prayer_request', 'testimony'] as const).map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCommunityCategory(cat)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      communityCategory === cat
                        ? 'bg-[#142B4A] text-white shadow-2xs'
                        : 'bg-[#F5F7FA] text-[#667085] hover:bg-[#E3E8EF]'
                    }`}
                  >
                    {cat === 'general' ? 'General' : cat === 'announcement' ? 'Announcement' : cat === 'prayer_request' ? 'Prayer' : 'Testimony'}
                  </button>
                ))}
              </div>

              {/* Quick Emojis Bar */}
              <div className="hidden sm:flex items-center gap-1.5 bg-[#F5F7FA] px-2.5 py-1 rounded-xl border border-[#E3E8EF]">
                {QUICK_EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      setCommunityText(prev => prev + emoji);
                      communityInputRef.current?.focus();
                    }}
                    className="hover:scale-125 transition-transform p-0.5 cursor-pointer flex items-center justify-center text-base"
                    title={`Insert ${emoji}`}
                  >
                    <span>{emoji}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Input Row */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-full border border-[#DCE3EC] bg-[#F5F7FA] px-2 py-1 shadow-inner focus-within:border-[#9AAFC8] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#142B4A]/10">
                <button type="button" onClick={() => setShowCommunityEmoji(prev => !prev)} className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer ${showCommunityEmoji ? 'bg-[#142B4A] text-[#C6A45A]' : 'text-[#667085] hover:bg-white'}`} title="Open emoji palette" aria-label="Open emoji palette">
                  <Smile className="w-5 h-5" />
                </button>
                <input ref={communityInputRef} type="text" value={communityText} onChange={handleCommunityInputChange} placeholder="Message the community" className="flex-1 min-w-0 w-0 border-0 bg-transparent px-1 py-2.5 text-sm text-[#182230] outline-none ring-0 focus:border-0 focus:bg-transparent focus:outline-none focus:ring-0" />
                <button type="button" onClick={() => { setCommunityText(prev => prev + '@'); setMentionQuery(''); setShowMentionMenu(true); communityInputRef.current?.focus(); }} className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-[#667085] hover:bg-white hover:text-[#142B4A] transition-colors cursor-pointer" title="Tag a member" aria-label="Tag a member">
                  <AtSign className="w-4 h-4" />
                </button>
              </div>
              <Button type="submit" variant="primary" size="md" isLoading={isSendingCommunity} className="h-11 w-11 min-w-[44px] !p-0 rounded-full shrink-0 flex items-center justify-center" aria-label="Send message">
                <Send className="w-4 h-4 text-[#C6A45A]" />
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: PRIVATE MESSAGING (Leadership Line with Replies & Emojis) */}
      {activeTab === 'private' && (
        <div className="fni-chat-panel bg-white rounded-2xl sm:rounded-3xl border border-[#E3E8EF] shadow-xs overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-[#142B4A] via-[#1A365D] to-[#203D63] text-white border-b border-[#142B4A] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#C6A45A]/20 text-[#C6A45A] border border-[#C6A45A]/30 flex items-center justify-center font-bold shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-white">
                  {isAdmin
                    ? 'Confidential Pastoral Oversight Line'
                    : 'Confidential Leadership Line (Tutor ↔ Leadership)'}
                </h3>
                <p className="text-xs text-slate-200 mt-0.5">
                  {isAdmin
                    ? 'Select a tutor to inspect their private communication channel'
                    : 'Private, direct communication with ministry leadership. Not shared in the community forum.'}
                </p>
              </div>
            </div>

            {isAdmin && tutorList.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-200 font-medium">Select Tutor:</span>
                <select
                  value={selectedTutorId}
                  onChange={e => setSelectedTutorId(e.target.value)}
                  className="bg-[#142B4A] border border-[#E3E8EF]/30 text-white text-xs rounded-xl px-3 py-2 font-bold focus:outline-none"
                >
                  {tutorList.map(t => (
                    <option key={t.id} value={t.id} className="text-slate-900 bg-white">
                      {t.name} ({t.cellName})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Messages Stream */}
          <div className="fni-chat-stream px-3 py-4 sm:p-6 h-[min(54dvh,440px)] min-h-[300px] sm:h-[440px] overflow-y-auto space-y-3 sm:space-y-4 bg-[#F5F7FA]">
            {privateMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-[#667085]">
                <Lock className="w-12 h-12 text-[#667085]/40 mb-3" />
                <p className="text-sm font-bold text-[#182230]">No private messages yet</p>
                <p className="text-xs text-[#667085] max-w-sm mt-1 leading-relaxed">
                  Start a confidential discussion regarding cell leadership, discipleship guidance, or pastoral support.
                </p>
              </div>
            ) : (
              privateMessages.map(msg => {
                const isMine = msg.senderUid === currentUser.id;
                return (
                  <div
                    key={msg.id}
                    id={`msg-${msg.id}`}
                    className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} transition-all`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      <span className="text-xs font-bold text-[#142B4A]">
                        {msg.senderName}
                      </span>
                      <span className="text-[11px] text-[#667085]">
                        ({['admin', 'super_admin', 'national_admin'].includes(msg.senderRole) ? 'Leadership' : 'Tutor'})
                      </span>
                    </div>

                    {/* Quoted Reply Preview in Private Bubble */}
                    {msg.replyTo && (
                      <div
                        onClick={() => scrollToMessage(msg.replyTo!.id)}
                        className={`max-w-md p-2 rounded-xl text-xs mb-1 border-l-4 border-[#C6A45A] cursor-pointer ${
                          isMine
                            ? 'bg-[#203D63] text-slate-200'
                            : 'bg-slate-200/80 text-slate-700'
                        }`}
                      >
                        <div className="font-bold flex items-center gap-1">
                          <CornerDownRight className="w-3.5 h-3.5 text-[#C6A45A]" />
                          <span>{msg.replyTo.senderName}</span>
                        </div>
                        <p className="truncate opacity-80 mt-0.5">{msg.replyTo.content}</p>
                      </div>
                    )}

                    <div
                      className={`max-w-md p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm leading-relaxed group relative ${
                        isMine
                          ? 'bg-[#142B4A] text-white rounded-tr-none shadow-2xs'
                          : 'bg-white text-[#182230] border border-[#E3E8EF] rounded-tl-none shadow-2xs'
                      }`}
                    >
                      {renderFormattedMessage(msg.content)}

                      {/* Floating Reply Button on Hover */}
                      <button
                        type="button"
                        onClick={() => {
                          setPrivateReplyTo({
                            id: msg.id,
                            senderName: msg.senderName,
                            content: msg.content,
                          });
                          privateInputRef.current?.focus();
                        }}
                        className={`opacity-0 group-hover:opacity-100 transition-opacity absolute -top-3 ${
                          isMine ? '-left-8' : '-right-8'
                        } p-1.5 rounded-full bg-white border border-[#E3E8EF] text-[#142B4A] shadow-xs hover:bg-[#F5F7FA] cursor-pointer`}
                        title="Reply to message"
                      >
                        <Reply className="w-3.5 h-3.5 text-[#C6A45A]" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 mt-1 px-1 text-xs text-[#667085]">
                      <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {isMine && (
                        msg.isRead ? (
                          <span title="Read"><CheckCheck className="w-3.5 h-3.5 text-sky-500" /></span>
                        ) : (
                          <span title="Sent"><Check className="w-3.5 h-3.5 text-[#667085]" /></span>
                        )
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={privateEndRef} />
          </div>

          {/* Private Reply Preview */}
          {privateReplyTo && (
            <div className="p-3 bg-amber-50/80 border-t-2 border-l-4 border-l-[#C6A45A] border-amber-200 flex items-center justify-between gap-3 text-xs sm:text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <Reply className="w-4 h-4 text-[#C6A45A] shrink-0" />
                <div className="min-w-0">
                  <div className="font-bold text-[#142B4A]">
                    Replying to {privateReplyTo.senderName}
                  </div>
                  <div className="text-xs text-[#667085] truncate max-w-xl">
                    {privateReplyTo.content}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPrivateReplyTo(null)}
                className="p-1 rounded-lg hover:bg-amber-100 text-[#667085] hover:text-[#142B4A] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Standard Social Media / WhatsApp Emoji Drawer for Private Chat */}
          {showPrivateEmoji && (
            <div className="border-t border-[#E3E8EF] bg-white p-3 shadow-md space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-[#E3E8EF] gap-2">
                {/* Category Navigation Bar (WhatsApp / Telegram style) */}
                <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar py-0.5">
                  {Object.keys(STANDARD_EMOJI_CATEGORIES).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setPrivateEmojiCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                        privateEmojiCategory === cat
                          ? 'bg-[#142B4A] text-white shadow-xs'
                          : 'bg-[#F5F7FA] text-[#667085] hover:bg-[#E3E8EF] hover:text-[#182230]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setShowPrivateEmoji(false)}
                  className="p-1 rounded-lg hover:bg-[#F5F7FA] text-[#667085] hover:text-[#182230] cursor-pointer shrink-0"
                  title="Close emoji picker"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Standard General Emojis Grid */}
              <div className="max-h-52 overflow-y-auto p-1 custom-scrollbar">
                <div className="grid grid-cols-8 sm:grid-cols-12 md:grid-cols-14 gap-1.5">
                  {STANDARD_EMOJI_CATEGORIES[privateEmojiCategory]?.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setPrivateText(prev => prev + emoji);
                        privateInputRef.current?.focus();
                      }}
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl hover:bg-[#F5F7FA] flex items-center justify-center hover:scale-125 transition-all cursor-pointer text-xl sm:text-2xl"
                      title={emoji}
                    >
                      <span>{emoji}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Private Input Box */}
          <form onSubmit={handleSendPrivate} className="fni-chat-composer p-2.5 sm:p-4 bg-white border-t border-[#E3E8EF] flex items-center gap-2 min-w-0 flex-wrap">
            {privateSendError && (
              <p role="alert" className="basis-full text-xs font-semibold text-rose-600">{privateSendError}</p>
            )}
            <button
              type="button"
              onClick={() => setShowPrivateEmoji(prev => !prev)}
              className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-colors border shrink-0 cursor-pointer ${
                showPrivateEmoji
                  ? 'bg-[#142B4A] text-[#C6A45A] border-[#142B4A]'
                  : 'bg-[#F5F7FA] hover:bg-[#E3E8EF] text-[#667085] border-[#E3E8EF]'
              }`}
              title="Insert Emoji"
            >
              <Smile className="w-5 h-5" />
            </button>

            <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-full border border-[#DCE3EC] bg-[#F5F7FA] px-2 py-1 shadow-inner focus-within:border-[#9AAFC8] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#142B4A]/10">
              <input ref={privateInputRef} type="text" value={privateText} onChange={e => setPrivateText(e.target.value)} placeholder="Message leadership" className="flex-1 min-w-0 w-0 border-0 bg-transparent px-1 py-2.5 text-sm text-[#182230] outline-none ring-0 focus:border-0 focus:bg-transparent focus:outline-none focus:ring-0" />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSendingPrivate}
              leftIcon={<Send className="w-4 h-4 text-[#C6A45A]" />}
              className="h-11 w-11 min-w-[44px] !p-0 rounded-full shrink-0 flex items-center justify-center"
            >
              <Send className="w-4 h-4 text-[#C6A45A]" />
            </Button>
          </form>
        </div>
      )}

      {/* Admin Invite Code Management Modal (Optional Leadership Tool) */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-[#142B4A]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-[#E3E8EF] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3E8EF]">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[#C6A45A]" />
                <h3 className="text-base font-black text-[#142B4A]">Community Access Codes</h3>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-xs text-[#667085] hover:text-[#142B4A] cursor-pointer"
              >
                Close
              </button>
            </div>

            <p className="text-xs text-[#667085]">
              Note: The Tutor Community is currently open to all logged-in tutors. You can also generate formal verification passcodes if needed.
            </p>

            {newCodeSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-1">
                <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  Generated Code:
                </div>
                <div className="text-2xl font-mono font-black text-emerald-900 tracking-wider">
                  {newCodeSuccess}
                </div>
                <div className="text-xs text-emerald-700">
                  Valid for {expiryMinutes} minutes
                </div>
              </div>
            )}

            <form onSubmit={handleGenerateCode} className="space-y-3 text-xs sm:text-sm">
              <div>
                <label className="block font-bold text-[#142B4A] mb-1">
                  Expiry Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  max="1440"
                  value={expiryMinutes}
                  onChange={e => setExpiryMinutes(parseInt(e.target.value) || 60)}
                  className="w-full p-2.5 rounded-xl border border-[#E3E8EF] text-[#182230]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#142B4A] mb-1">
                  Maximum Allowed Uses
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={maxUses}
                  onChange={e => setMaxUses(parseInt(e.target.value) || 10)}
                  className="w-full p-2.5 rounded-xl border border-[#E3E8EF] text-[#182230]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  className="rounded-xl px-4"
                >
                  Generate Passcode
                </Button>
              </div>
            </form>

            {generatedCodes.length > 0 && (
              <div className="pt-3 border-t border-[#E3E8EF]">
                <span className="text-xs font-bold text-[#142B4A] block mb-2">Recent Codes</span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {generatedCodes.map(c => {
                    const isExpired = new Date(c.expiresAt).getTime() < Date.now();
                    return (
                      <div key={c.id} className="flex items-center justify-between p-2 rounded-xl bg-[#F5F7FA] text-xs">
                        <span className="font-mono font-bold text-[#142B4A]">{c.code}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          isExpired ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {isExpired ? 'Expired' : `Uses: ${c.usedCount}/${c.maxUses}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
