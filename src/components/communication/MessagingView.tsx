import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { MessagingService } from '../../services/messagingService';
import { supabase } from '../../lib/supabase';
import { CellService } from '../../services/cellService';
import { CallService, FniCallKind, FniCallSignal } from '../../services/callService';
import { PrivateMessage, CommunityMessage, InvitationCode, MessageReply, ChatAttachment } from '../../types';
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
  MoreVertical,
  Pin,
  Paperclip,
  FileAudio,
  Search,
  UserRound,
  Palette,
  Mic,
  Square,
  Phone,
  Video,
} from 'lucide-react';
import { Button } from '../common/Button';

export interface MessagingViewProps {
  initialConversationId?: string;
  initialTab?: 'private' | 'community';
  onBack?: () => void;
}

// Standard general quick emojis (WhatsApp / Telegram / social media style)
const STICKER_PACK = [
  { emoji: '🙏', label: 'Praying for you' }, { emoji: '❤️', label: 'Love' },
  { emoji: '🙌', label: 'Praise' }, { emoji: '🔥', label: 'On fire' },
  { emoji: '✨', label: 'Shining' }, { emoji: '💪', label: 'Stay strong' },
  { emoji: '🕊️', label: 'Peace' }, { emoji: '🎉', label: 'Celebrate' },
  { emoji: '👏', label: 'Well done' }, { emoji: '🌱', label: 'Growing' },
  { emoji: '👑', label: 'Kingdom' }, { emoji: '📖', label: 'Word of God' },
];
const STICKER_PREFIX = '[[FNI_STICKER:';

const CHAT_WALLPAPERS = [
  { id: 'default', name: 'Classic', color: '#F5F7FA', image: 'none' },
  { id: 'blue', name: 'Ocean', color: '#EAF2FB', image: 'radial-gradient(circle at 15% 20%, rgba(91,145,205,.16) 0 2px, transparent 3px), radial-gradient(circle at 80% 70%, rgba(91,145,205,.12) 0 2px, transparent 3px)' },
  { id: 'lavender', name: 'Lavender', color: '#F1EEFA', image: 'radial-gradient(circle at 20% 25%, rgba(137,112,190,.16), transparent 34%), radial-gradient(circle at 80% 75%, rgba(137,112,190,.12), transparent 30%)' },
  { id: 'sage', name: 'Sage', color: '#EDF4EF', image: 'radial-gradient(circle at 80% 20%, rgba(91,145,108,.15), transparent 32%), radial-gradient(circle at 15% 80%, rgba(91,145,108,.12), transparent 30%)' },
  { id: 'sand', name: 'Warm sand', color: '#F7F0E5', image: 'radial-gradient(circle at 18% 18%, rgba(198,164,90,.18), transparent 34%), radial-gradient(circle at 82% 82%, rgba(198,164,90,.13), transparent 30%)' },
  { id: 'night', name: 'Midnight', color: '#E8ECF3', image: 'radial-gradient(circle at 20% 20%, rgba(20,43,74,.15), transparent 34%), radial-gradient(circle at 80% 80%, rgba(20,43,74,.12), transparent 30%)' },
];

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


const SelectedChatFilePreview: React.FC<{ file: File; onRemove: () => void }> = ({ file, onRemove }) => {
  const [previewUrl, setPreviewUrl] = useState('');
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return (
    <div className="flex max-w-[180px] items-center gap-2 rounded-xl border border-[#DCE3EC] bg-white p-2">
      {previewUrl && file.type.startsWith('image/') ? <img src={previewUrl} alt={file.name} className="h-10 w-10 rounded-lg object-cover" /> :
       previewUrl && file.type.startsWith('video/') ? <video src={previewUrl} muted className="h-10 w-10 rounded-lg object-cover" /> :
       <FileAudio className="h-6 w-6 shrink-0 text-[#229ED9]" />}
      <span className="min-w-0 truncate text-[11px] text-[#182230]">{file.name}</span>
      <button type="button" onClick={onRemove} aria-label="Remove attachment" className="shrink-0 rounded-full p-1 text-[#667085] hover:bg-rose-50 hover:text-rose-600"><X className="h-3.5 w-3.5" /></button>
    </div>
  );
};

const ChatAttachmentPreview: React.FC<{ attachment: ChatAttachment }> = ({ attachment }) => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    MessagingService.getChatAttachmentUrl(attachment.path).then(value => { if (active) setUrl(value); });
    return () => { active = false; };
  }, [attachment.path]);
  if (!url) return <div className="mt-2 rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-500">Loading attachment…</div>;
  if (attachment.mimeType.startsWith('image/')) return <a href={url} target="_blank" rel="noreferrer" className="mt-2 block"><img src={url} alt={attachment.name} loading="lazy" className="max-h-72 max-w-full rounded-xl object-contain" /></a>;
  if (attachment.mimeType.startsWith('video/')) return <video controls preload="metadata" src={url} className="mt-2 max-h-72 w-full rounded-xl" />;
  if (attachment.mimeType.startsWith('audio/')) return <div className="mt-2 flex items-center gap-2 rounded-xl bg-black/5 p-2"><FileAudio className="h-5 w-5 shrink-0" /><audio controls preload="metadata" src={url} className="min-w-0 max-w-full" /></div>;
  return <a href={url} target="_blank" rel="noreferrer" className="mt-2 block truncate text-xs underline">{attachment.name}</a>;
};

export const MessagingView: React.FC<MessagingViewProps> = ({
  initialConversationId,
  initialTab,
  onBack,
}) => {
  const { currentUser, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'private' | 'community'>(() => initialTab || 'community');
  const [wallpapers, setWallpapers] = useState<Record<string, string>>({});
  const [wallpaperImages, setWallpaperImages] = useState<Record<string, string>>({});
  const [wallpaperMenu, setWallpaperMenu] = useState<'community' | 'private' | null>(null);
  const wallpaperStorageKey = `fni-chat-wallpapers:${currentUser?.id || 'guest'}`;
  const saveWallpaper = (key: string, id: string) => {
    setWallpapers(previous => {
      const next = { ...previous, [key]: id };
      try { window.localStorage.setItem(wallpaperStorageKey, JSON.stringify(next)); } catch { /* Keep this choice for the current session. */ }
      return next;
    });
    setWallpaperMenu(null);
  };

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(wallpaperStorageKey);
      setWallpapers(saved ? JSON.parse(saved) as Record<string, string> : {});
      const savedImages = window.localStorage.getItem(`${wallpaperStorageKey}:images`);
      setWallpaperImages(savedImages ? JSON.parse(savedImages) as Record<string, string> : {});
    } catch { setWallpapers({}); }
  }, [wallpaperStorageKey]);

  // Private Messaging State
  const [privateMessages, setPrivateMessages] = useState<PrivateMessage[]>([]);
  const [privateText, setPrivateText] = useState('');
  const [privateFiles, setPrivateFiles] = useState<File[]>([]);
  const [selectedTutorId, setSelectedTutorId] = useState<string>(() => initialConversationId || (isAdmin ? '' : 'admin'));
  const [callUi, setCallUi] = useState<'idle' | 'calling' | 'ringing' | 'connected'>('idle');
  const [callChannelReady, setCallChannelReady] = useState(false);
  const [incomingCall, setIncomingCall] = useState<FniCallSignal | null>(null);
  const [activeCallKind, setActiveCallKind] = useState<FniCallKind>('voice');
  const [callError, setCallError] = useState<string | null>(null);
  const [localCallStream, setLocalCallStream] = useState<MediaStream | null>(null);
  const [remoteCallStream, setRemoteCallStream] = useState<MediaStream | null>(null);
  const callChannelRef = useRef<import('@supabase/supabase-js').RealtimeChannel | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localCallStreamRef = useRef<MediaStream | null>(null);
  const queuedIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const localCallVideoRef = useRef<HTMLVideoElement>(null);
  const remoteCallVideoRef = useRef<HTMLVideoElement>(null);

  const sendCallSignal = async (signal: FniCallSignal) => {
    const channel = callChannelRef.current;
    if (!channel) throw new Error('The secure call connection is not ready. Keep this private chat open and try again.');
    await CallService.send(channel, signal);
  };

  const finishCall = async (notifyPeer = true) => {
    const peer = peerConnectionRef.current;
    if (notifyPeer && peer) {
      try {
        await sendCallSignal({ callId: activeCallIdRef.current || '', fromProfileId: currentUser?.id || '', type: 'hangup', sentAt: new Date().toISOString() });
      } catch (error) { console.warn('Call end signal could not be sent:', error); }
    }
    peer?.close();
    peerConnectionRef.current = null;
    localCallStreamRef.current?.getTracks().forEach(track => track.stop());
    localCallStreamRef.current = null;
    setLocalCallStream(null);
    setRemoteCallStream(null);
    setIncomingCall(null);
    setCallUi('idle');
    setCallError(null);
    activeCallIdRef.current = null;
    queuedIceCandidatesRef.current = [];
  };
  const activeCallIdRef = useRef<string | null>(null);

  const createPeerConnection = (callId: string, kind: FniCallKind) => {
    const peer = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }],
    });
    peerConnectionRef.current = peer;
    peer.onicecandidate = event => {
      if (event.candidate) {
        void sendCallSignal({ callId, fromProfileId: currentUser?.id || '', type: 'ice-candidate', payload: event.candidate.toJSON(), sentAt: new Date().toISOString() }).catch(error => console.warn('ICE signal failed:', error));
      }
    };
    peer.ontrack = event => {
      const stream = event.streams[0];
      if (stream) setRemoteCallStream(stream);
    };
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === 'connected') setCallUi('connected');
      if (peer.connectionState === 'failed' || peer.connectionState === 'disconnected') {
        setCallError('The connection was interrupted. Check your network and try again.');
      }
    };
    return peer;
  };

  useEffect(() => {
    if (activeTab !== 'private' || !currentUser?.id || !selectedTutorId || selectedTutorId === 'admin' || selectedTutorId === currentUser.id) {
      callChannelRef.current = null;
      setCallChannelReady(false);
      return;
    }
    let disposed = false;
    setCallChannelReady(false);
    const channel = CallService.createChannel('direct', currentUser.id, selectedTutorId);
    CallService.listen(channel, signal => {
      if (disposed || signal.fromProfileId !== selectedTutorId) return;
      if (signal.type === 'offer') {
        if (activeCallIdRef.current) return;
        activeCallIdRef.current = signal.callId;
        setActiveCallKind(signal.kind || 'voice');
        setIncomingCall(signal);
        setCallUi('ringing');
      } else if (signal.type === 'answer' && peerConnectionRef.current && signal.callId === activeCallIdRef.current && signal.payload) {
        void peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signal.payload as RTCSessionDescriptionInit)).then(async () => {
          for (const candidate of queuedIceCandidatesRef.current) await peerConnectionRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
          queuedIceCandidatesRef.current = [];
        }).catch(error => setCallError(error instanceof Error ? error.message : 'Could not connect the call.'));
      } else if (signal.type === 'ice-candidate' && signal.callId === activeCallIdRef.current && signal.payload) {
        const candidate = signal.payload as RTCIceCandidateInit;
        if (peerConnectionRef.current?.remoteDescription) void peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(error => console.warn('ICE candidate rejected:', error));
        else queuedIceCandidatesRef.current.push(candidate);
      } else if ((signal.type === 'hangup' || signal.type === 'decline') && signal.callId === activeCallIdRef.current) {
        void finishCall(false);
      }
    });
    callChannelRef.current = channel;
    void CallService.connect(channel).then(() => {
      if (!disposed) setCallChannelReady(true);
    }).catch(error => {
      if (!disposed) setCallError(error instanceof Error ? error.message : 'Secure calling is unavailable.');
    });
    return () => {
      disposed = true;
      if (callChannelRef.current === channel) callChannelRef.current = null;
      setCallChannelReady(false);
      void CallService.disconnect(channel);
    };
  }, [activeTab, currentUser?.id, selectedTutorId]);

  useEffect(() => {
    if (localCallVideoRef.current && localCallStream) localCallVideoRef.current.srcObject = localCallStream;
  }, [localCallStream, callUi]);
  useEffect(() => {
    if (remoteCallVideoRef.current && remoteCallStream) remoteCallVideoRef.current.srcObject = remoteCallStream;
  }, [remoteCallStream, callUi]);

  const acceptIncomingCall = async () => {
    if (!incomingCall || !currentUser?.id) return;
    try {
      const kind = incomingCall.kind || 'voice';
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: kind === 'video' });
      localCallStreamRef.current = stream;
      setLocalCallStream(stream);
      const peer = createPeerConnection(incomingCall.callId, kind);
      stream.getTracks().forEach(track => peer.addTrack(track, stream));
      await peer.setRemoteDescription(new RTCSessionDescription(incomingCall.payload as RTCSessionDescriptionInit));
      for (const candidate of queuedIceCandidatesRef.current) await peer.addIceCandidate(new RTCIceCandidate(candidate));
      queuedIceCandidatesRef.current = [];
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      await sendCallSignal({ callId: incomingCall.callId, fromProfileId: currentUser.id, type: 'answer', payload: answer, sentAt: new Date().toISOString() });
      setIncomingCall(null);
      setCallUi('calling');
    } catch (error) {
      setCallError(error instanceof Error ? error.message : 'Could not accept the call. Check microphone and camera permissions.');
      try { await sendCallSignal({ callId: incomingCall.callId, fromProfileId: currentUser.id, type: 'decline', sentAt: new Date().toISOString() }); } catch { /* Peer may already be offline. */ }
      await finishCall(false);
    }
  };

  const communityWallpaperKey = 'community';
  const privateWallpaperKey = `private:${selectedTutorId || 'admin'}`;
  const communityWallpaper = CHAT_WALLPAPERS.find(item => item.id === wallpapers[communityWallpaperKey]) || CHAT_WALLPAPERS[0];
  const privateWallpaper = CHAT_WALLPAPERS.find(item => item.id === wallpapers[privateWallpaperKey]) || CHAT_WALLPAPERS[0];
  const setCustomWallpaper = (key: string, file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > 3 * 1024 * 1024) {
      window.alert('Please choose an image smaller than 3 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) return;
      setWallpaperImages(previous => {
        const next = { ...previous, [key]: dataUrl };
        try { window.localStorage.setItem(`${wallpaperStorageKey}:images`, JSON.stringify(next)); }
        catch { window.alert('This image could not be saved in this browser. Try a smaller image.'); }
        return next;
      });
      setWallpapers(previous => {
        const next = { ...previous, [key]: 'custom' };
        try { window.localStorage.setItem(wallpaperStorageKey, JSON.stringify(next)); } catch { /* Session choice remains active. */ }
        return next;
      });
      setWallpaperMenu(null);
    };
    reader.readAsDataURL(file);
  };
  const communityWallpaperStyle = wallpaperImages[communityWallpaperKey]
    ? { backgroundColor: '#08090f', backgroundImage: `url(${wallpaperImages[communityWallpaperKey]})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : communityWallpaper.id === 'default'
      ? { backgroundColor: '#08090f', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180' viewBox='0 0 180 180'%3E%3Cg fill='none' stroke='%238b72b5' stroke-opacity='.19' stroke-width='1.1'%3E%3Cpath d='M20 24c8-9 17-6 18 2s-8 13-16 8-7-7-2-10zm6 1 4 3m-7 2 6 1M98 18c8 0 12 7 8 13l-8 7-8-7c-4-6 0-13 8-13zm-5 7 5 5 5-5M143 73c-9-7-17 1-13 9l9 8 10-8c5-8-1-16-6-9zm-7 4 7 6 6-6M35 116c0-8 13-8 13 0v13H35zm4-8v-5h5v5m-9 21 14-9M104 113l8-9 8 9-8 9zm8-9v18m-9-9h18M23 158c4-9 12-9 16 0m-8-10v19m-9-9h18M151 148c-8-8-16 0-8 8l8 7 8-7c8-8 0-16-8-8z'/%3E%3C/g%3E%3C/svg%3E")`, backgroundSize: '180px 180px', backgroundPosition: 'center' }
      : { backgroundColor: communityWallpaper.color, backgroundImage: communityWallpaper.image };
  const privateWallpaperStyle = wallpaperImages[privateWallpaperKey]
    ? { backgroundColor: '#E9EEF5', backgroundImage: `url(${wallpaperImages[privateWallpaperKey]})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { backgroundColor: privateWallpaper.color, backgroundImage: privateWallpaper.image };
  const [tutorList, setTutorList] = useState<{ id: string; name: string; cellName: string }[]>([]);
  const [allMembers, setAllMembers] = useState<Array<{ id: string; full_name: string; username?: string; role: string; cell_name?: string; region_name?: string; avatar_url?: string; created_at?: string }>>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [profileMember, setProfileMember] = useState<(typeof allMembers)[number] | null>(null);
  const openMemberProfile = (memberId: string) => {
    const member = allMembers.find(item => item.id === memberId);
    if (member) setProfileMember(member);
  };
  const [isSendingPrivate, setIsSendingPrivate] = useState(false);
  const [privateSendError, setPrivateSendError] = useState<string | null>(null);
  const [privateReplyTo, setPrivateReplyTo] = useState<MessageReply | null>(null);
  const [showPrivateEmoji, setShowPrivateEmoji] = useState(false);
  const [showPrivateStickers, setShowPrivateStickers] = useState(false);
  const [privateSticker, setPrivateSticker] = useState<{ emoji: string; label: string } | null>(null);
  const [openMessageMenu, setOpenMessageMenu] = useState<string | null>(null);
  const [openChatMenu, setOpenChatMenu] = useState(false);
  const [openCommunityChatMenu, setOpenCommunityChatMenu] = useState(false);
  const privateLongPressTimer = useRef<number | null>(null);
  const privateLongPressTriggered = useRef(false);
  const communityLongPressTimer = useRef<number | null>(null);
  const communityLongPressTriggered = useRef(false);
  const [privateEmojiCategory, setPrivateEmojiCategory] = useState<string>('Smileys & Faces');

  // Community Messaging State
  const [communityMessages, setCommunityMessages] = useState<CommunityMessage[]>([]);
  const [communityText, setCommunityText] = useState('');
  const [communityFiles, setCommunityFiles] = useState<File[]>([]);
  const [communityCategory, setCommunityCategory] = useState<'general' | 'announcement' | 'prayer_request' | 'testimony'>('general');
  const [isSendingCommunity, setIsSendingCommunity] = useState(false);
  const [communitySendError, setCommunitySendError] = useState<string | null>(null);
  const [communityReplyTo, setCommunityReplyTo] = useState<MessageReply | null>(null);
  const [showCommunityEmoji, setShowCommunityEmoji] = useState(false);
  const [showCommunityStickers, setShowCommunityStickers] = useState(false);
  const [communitySticker, setCommunitySticker] = useState<{ emoji: string; label: string } | null>(null);
  const [communityEmojiCategory, setCommunityEmojiCategory] = useState<string>('Smileys & Faces');
  const customStickerStorageKey = `fni-custom-stickers:${currentUser?.id || 'guest'}`;
  const [customStickers, setCustomStickers] = useState<Array<{ id: string; name: string; dataUrl: string; mimeType: string }>>([]);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(customStickerStorageKey);
      setCustomStickers(saved ? JSON.parse(saved) : []);
    } catch { setCustomStickers([]); }
  }, [customStickerStorageKey]);

  const saveCustomSticker = (file: File) => {
    if (!file.type.startsWith('image/')) { window.alert('Choose an image to create a sticker.'); return; }
    if (file.size > 1500 * 1024) { window.alert('Choose an image smaller than 1.5 MB.'); return; }
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 256 / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) { URL.revokeObjectURL(objectUrl); window.alert('This image could not be prepared as a sticker.'); return; }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/webp', 0.78);
      URL.revokeObjectURL(objectUrl);
      const mimeType = dataUrl.slice(5, dataUrl.indexOf(';')) || 'image/png';
      const estimatedBytes = Math.ceil((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);
      if (estimatedBytes > 80 * 1024) { window.alert('This image is too detailed for a sticker. Try a simpler or smaller image.'); return; }
      setCustomStickers(previous => {
        if (previous.length >= 12) { window.alert('You can save up to 12 personal stickers on this device.'); return previous; }
        const next = [...previous, { id: `sticker-${Date.now()}`, name: file.name.replace(/\.[^.]+$/, '').slice(0, 32) || 'My sticker', dataUrl, mimeType }];
        try { window.localStorage.setItem(customStickerStorageKey, JSON.stringify(next)); }
        catch { window.alert('Your device storage is full. Remove a chat wallpaper or sticker and try again.'); return previous; }
        return next;
      });
    };
    image.onerror = () => { URL.revokeObjectURL(objectUrl); window.alert('This image could not be opened.'); };
    image.src = objectUrl;
  };

  const attachCustomSticker = async (sticker: { id: string; name: string; dataUrl: string; mimeType: string }, target: 'community' | 'private') => {
    try {
      const blob = await (await fetch(sticker.dataUrl)).blob();
      const extension = (sticker.mimeType.split('/')[1] || 'png').replace('jpeg', 'jpg');
      const file = new File([blob], `${sticker.name.replace(/[^a-z0-9-_]/gi, '-') || 'FNI-sticker'}.${extension}`, { type: sticker.mimeType || 'image/png' });
      if (target === 'community') { setCommunityFiles(previous => [...previous, file]); setShowCommunityStickers(false); }
      else { setPrivateFiles(previous => [...previous, file]); setShowPrivateStickers(false); }
    } catch { window.alert('This saved sticker could not be opened. Please add it again.'); }
  };

  const [recordingTarget, setRecordingTarget] = useState<'community' | 'private' | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);

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
  const communityInputRef = useRef<HTMLTextAreaElement>(null);
  const privateInputRef = useRef<HTMLTextAreaElement>(null);
  const communityEndRef = useRef<HTMLDivElement>(null);
  const communityStreamRef = useRef<HTMLDivElement>(null);
  const [showCommunityJumpToLatest, setShowCommunityJumpToLatest] = useState(false);
  const [showPrivateJumpToLatest, setShowPrivateJumpToLatest] = useState(false);
  const privateEndRef = useRef<HTMLDivElement>(null);
  const privateStreamRef = useRef<HTMLDivElement>(null);
  const previousCommunityCountRef = useRef<number | null>(null);
  const previousPrivateCountRef = useRef<number | null>(null);
  const previousPrivateConversationRef = useRef<string | null>(null);
  const touchStartX = useRef<number | null>(null);

  // Community chat follows the document's native page scroll; private chats retain their own viewport.
  useEffect(() => {
    if (activeTab === 'community') {
      const isFirstLoad = previousCommunityCountRef.current === null;
      const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 180;
      if (isFirstLoad || nearBottom) {
        requestAnimationFrame(() => {
          window.scrollTo({ top: document.documentElement.scrollHeight, behavior: isFirstLoad ? 'auto' : 'smooth' });
          setShowCommunityJumpToLatest(false);
        });
      }
      previousCommunityCountRef.current = communityMessages.length;
      return;
    }
    const stream = privateStreamRef.current;
    if (!stream) return;
    const conversationChanged = previousPrivateConversationRef.current !== selectedTutorId;
    const isFirstLoad = previousPrivateCountRef.current === null || conversationChanged;
    const nearBottom = stream.scrollHeight - stream.scrollTop - stream.clientHeight < 140;
    if (isFirstLoad || nearBottom) {
      requestAnimationFrame(() => {
        stream.scrollTop = stream.scrollHeight;
        setShowPrivateJumpToLatest(false);
      });
    }
    previousPrivateCountRef.current = privateMessages.length;
    previousPrivateConversationRef.current = selectedTutorId;
  }, [activeTab, communityMessages.length, privateMessages.length, selectedTutorId]);
  useEffect(() => {
    if (activeTab !== 'community') return;
    const updateLatestVisibility = () => {
      const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 180;
      setShowCommunityJumpToLatest(!nearBottom);
    };
    window.addEventListener('scroll', updateLatestVisibility, { passive: true });
    updateLatestVisibility();
    return () => window.removeEventListener('scroll', updateLatestVisibility);
  }, [activeTab]);

  const privateSendLock = useRef(false);
  const communitySendLock = useRef(false);

  const beginMessageSwipe = (event: React.TouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const finishMessageSwipe = (event: React.TouchEvent, message: MessageReply, target: 'community' | 'private') => {
    if (touchStartX.current === null) return;
    const endX = event.changedTouches[0]?.clientX;
    const startX = touchStartX.current;
    touchStartX.current = null;
    if (endX === undefined || startX === null) return;
    const deltaX = endX - startX;
    // Telegram-style swipe right to reply; ignore vertical scrolling and short gestures.
    if (deltaX >= 64) {
      if (target === 'community') {
        setCommunityReplyTo(message);
        communityInputRef.current?.focus();
      } else {
        setPrivateReplyTo(message);
        privateInputRef.current?.focus();
      }
    }
  };

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
      // @mentions come only from real, registered FNI profiles.
      // Tutors and the official FNI Admin account are eligible; never synthesize
      // people from cell leader names or placeholder leadership entries.
      const publicMembers = await MessagingService.getMemberDirectory();
      const eligibleMembers = (publicMembers || []).filter(member =>
        member.role === 'tutor' || member.role === 'admin' || member.role === 'super_admin'
      );
      const directory = eligibleMembers.map(member => ({
        id: member.id,
        name: member.role === 'admin' || member.role === 'super_admin' ? 'FNI Admin' : member.full_name,
        cellName: member.cell_name,
      }));

      // Include the signed-in member only when their real profile is eligible.
      if (
        currentUser?.full_name &&
        ['tutor', 'admin', 'super_admin'].includes(currentUser.role) &&
        !directory.some(member => member.id === currentUser.id)
      ) {
        directory.push({
          id: currentUser.id,
          name: currentUser.role === 'admin' || currentUser.role === 'super_admin' ? 'FNI Admin' : currentUser.full_name,
          cellName: currentUser.cell_name,
        });
      }

      setMemberDirectory(directory);
      setAllMembers(eligibleMembers);

      const tutorMap = new Map<string, { id: string; name: string; cellName: string }>();

      // Direct-message recipients must also be real, active registered tutors
      // or the official FNI Admin account. Never derive recipients from cell
      // leader names or stale conversation records.
      eligibleMembers.forEach(member => {
        if (member.id === currentUser.id) return;
        tutorMap.set(member.id, {
          id: member.id,
          name: member.role === 'admin' || member.role === 'super_admin'
            ? 'FNI Admin'
            : member.full_name,
          cellName: member.cell_name || 'FNI Member',
        });
      });

      const tList = Array.from(tutorMap.values());
      setTutorList(tList);
      if (isAdmin && tList.length > 0 && !selectedTutorId) {
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
    const conversationId = isAdmin ? selectedTutorId : (selectedTutorId || 'admin');
    if (!tutorId || !conversationId) { setPrivateMessages([]); return; }
    const msgs = await MessagingService.getPrivateConversation(tutorId, currentUser.id, conversationId, isAdmin);
    setPrivateMessages(msgs);
    await MessagingService.markPrivateMessagesRead(tutorId, currentUser.id, conversationId, isAdmin);
  };

  const handlePrivateChatAction = async (action: 'clear' | 'delete') => {
    setOpenChatMenu(false);
    const confirmed = window.confirm(
      action === 'clear'
        ? 'Clear this personal chat from your account? The other participant will keep their messages.'
        : 'Delete this personal chat from your account? The other participant will keep their messages. New messages can make the chat appear again.'
    );
    if (!confirmed) return;

    const conversationId = isAdmin ? selectedTutorId : (selectedTutorId || 'admin');
    const saved = action === 'clear'
      ? await MessagingService.clearPrivateConversation(currentUser.id, conversationId)
      : await MessagingService.deletePrivateConversation(currentUser.id, conversationId);

    if (!saved) {
      setPrivateSendError('We could not update this chat. Check your connection and try again.');
      return;
    }
    setPrivateMessages([]);
    setPrivateReplyTo(null);
    setOpenChatMenu(false);
    setPrivateSendError(null);
  };

  const handleClearAllPrivateChats = async () => {
    setOpenChatMenu(false);
    if (!window.confirm('Clear every private conversation from your account only? Other members will keep their messages.')) return;
    const saved = await MessagingService.clearAllPrivateChats(currentUser.id);
    if (!saved) { setPrivateSendError('Your private chats could not be cleared. Please try again.'); return; }
    setPrivateMessages([]);
    setPrivateReplyTo(null);
    setOpenChatMenu(false);
  };

  const handleToggleCommunityPin = async (message: CommunityMessage) => {
    setOpenMessageMenu(null);
    const saved = await MessagingService.setCommunityMessagePin(message.id, !message.isPinned);
    if (!saved) { setCommunitySendError('This message could not be pinned. Please try again.'); return; }
    await loadCommunity();
  };

  const handleClearCommunityHistory = async () => {
    setOpenCommunityChatMenu(false);
    if (!window.confirm('Clear the Community Hub history from your account only? Other members will still see all messages.')) return;
    const saved = await MessagingService.clearCommunityHistory(currentUser.id);
    if (!saved) { setCommunitySendError('Community history could not be cleared. Please try again.'); return; }
    setCommunityMessages([]);
    setCommunityReplyTo(null);
    setOpenCommunityChatMenu(false);
  };

  const handleHideCommunityMessage = async (messageId: string) => {
    setOpenMessageMenu(null);
    if (!window.confirm('Delete this message from your account only? Everyone else will still see it.')) return;
    const saved = await MessagingService.hideCommunityMessageForUser(currentUser.id, messageId);
    if (!saved) { setCommunitySendError('This message could not be hidden. Please try again.'); return; }
    setCommunityMessages(previous => previous.filter(message => message.id !== messageId));
    setOpenMessageMenu(null);
  };

  const handleEditMessage = async (messageId: string, scope: 'private' | 'community', currentContent: string) => {
    setOpenMessageMenu(null);
    const edited = window.prompt('Edit your message:', currentContent);
    if (edited === null || edited.trim() === currentContent.trim()) return;
    if (!edited.trim()) { window.alert('A message cannot be empty.'); return; }
    const saved = await MessagingService.editMessage(messageId, scope, edited);
    if (!saved) { window.alert('This message could not be edited. Only the original sender can edit their message.'); return; }
    if (scope === 'private') await loadPrivateMessages();
    else await loadCommunity();
    setOpenMessageMenu(null);
  };

  const handleDeleteMessageForEveryone = async (messageId: string, scope: 'private' | 'community') => {
    setOpenMessageMenu(null);
    const confirmed = window.confirm('Delete this message and its attachments for everyone in this conversation?');
    if (!confirmed) return;
    const saved = await MessagingService.deleteMessageForEveryone(messageId, scope);
    if (!saved) {
      setPrivateSendError('The message could not be deleted for everyone. Please try again.');
      return;
    }
    if (scope === 'private') {
      setPrivateMessages(previous => previous.filter(message => message.id !== messageId));
      await loadPrivateMessages();
    } else {
      setCommunityMessages(previous => previous.filter(message => message.id !== messageId));
      await loadCommunity();
    }
    setOpenMessageMenu(null);
  };

  const handleHidePrivateMessage = async (messageId: string) => {
    setOpenMessageMenu(null);
    const confirmed = window.confirm('Hide this message from your account only? The other participant will still see it.');
    if (!confirmed) return;
    const saved = await MessagingService.hidePrivateMessageForUser(currentUser.id, messageId);
    if (!saved) {
      setPrivateSendError('This message could not be hidden. Please try again.');
      return;
    }
    setPrivateMessages(previous => previous.filter(message => message.id !== messageId));
    setOpenMessageMenu(null);
  };

  const beginCommunityMessageTouch = (event: React.TouchEvent<HTMLDivElement>, messageId: string) => {
    beginMessageSwipe(event);
    communityLongPressTriggered.current = false;
    if (communityLongPressTimer.current) window.clearTimeout(communityLongPressTimer.current);
    communityLongPressTimer.current = window.setTimeout(() => {
      communityLongPressTriggered.current = true;
      touchStartX.current = null;
      setOpenMessageMenu(`community:${messageId}`);
    }, 550);
  };

  const finishCommunityMessageTouch = (event: React.TouchEvent<HTMLDivElement>, message: MessageReply) => {
    if (communityLongPressTimer.current) {
      window.clearTimeout(communityLongPressTimer.current);
      communityLongPressTimer.current = null;
    }
    if (communityLongPressTriggered.current) {
      communityLongPressTriggered.current = false;
      return;
    }
    finishMessageSwipe(event, message, 'community');
  };

  const cancelCommunityMessageLongPress = () => {
    if (communityLongPressTimer.current) {
      window.clearTimeout(communityLongPressTimer.current);
      communityLongPressTimer.current = null;
    }
  };

  const beginPrivateMessageTouch = (event: React.TouchEvent<HTMLDivElement>, messageId: string) => {
    beginMessageSwipe(event);
    privateLongPressTriggered.current = false;
    if (privateLongPressTimer.current) window.clearTimeout(privateLongPressTimer.current);
    privateLongPressTimer.current = window.setTimeout(() => {
      privateLongPressTriggered.current = true;
      setOpenMessageMenu(`private:${messageId}`);
    }, 550);
  };

  const finishPrivateMessageTouch = (event: React.TouchEvent<HTMLDivElement>, message: MessageReply) => {
    if (privateLongPressTimer.current) {
      window.clearTimeout(privateLongPressTimer.current);
      privateLongPressTimer.current = null;
    }
    if (privateLongPressTriggered.current) {
      privateLongPressTriggered.current = false;
      return;
    }
    finishMessageSwipe(event, message, 'private');
  };

  const cancelPrivateMessageLongPress = () => {
    if (privateLongPressTimer.current) {
      window.clearTimeout(privateLongPressTimer.current);
      privateLongPressTimer.current = null;
    }
  };

  const loadCommunity = async () => {
    const msgs = await MessagingService.getCommunityMessages(currentUser.id);
    setCommunityMessages(msgs);
  };

  const loadInviteCodes = async () => {
    const codes = await MessagingService.getInvitationCodes();
    setGeneratedCodes(codes);
  };

  // Scroll to a quoted message
  const scrollToMessage = (msgId: string) => {
    const el = document.getElementById(`msg-${msgId}`);
    const stream = el?.closest('.fni-chat-stream') as HTMLElement | null;
    if (el && stream) {
      const messageRect = el.getBoundingClientRect();
      if (stream.classList.contains('fni-community-stream')) {
        window.scrollTo({ top: window.scrollY + messageRect.top - window.innerHeight / 2, behavior: 'smooth' });
      } else {
        const streamRect = stream.getBoundingClientRect();
        const targetTop = stream.scrollTop + messageRect.top - streamRect.top - (stream.clientHeight - messageRect.height) / 2;
        stream.scrollTo({ top: targetTop, behavior: 'smooth' });
      }
      el.classList.add('ring-2', 'ring-[#C6A45A]', 'bg-amber-50/60');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-[#C6A45A]', 'bg-amber-50/60');
      }, 2500);
    }
  };

  // Handle typing in Community chat to detect @mentions
  const handleCommunityInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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

  // Voice notes use the same protected attachment upload path as other chat media.
  const startVoiceNote = async (target: 'community' | 'private') => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      window.alert('Voice recording is not supported in this browser or device.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = event => { if (event.data.size > 0) chunks.push(event.data); };
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const extension = mimeType.includes('mp4') ? 'm4a' : mimeType.includes('ogg') ? 'ogg' : 'webm';
        const voiceFile = new File([new Blob(chunks, { type: mimeType })], `FNI-voice-note-${Date.now()}.${extension}`, { type: mimeType });
        if (voiceFile.size > 0) {
          if (target === 'community') setCommunityFiles(previous => [...previous, voiceFile]);
          else setPrivateFiles(previous => [...previous, voiceFile]);
        }
        stream.getTracks().forEach(track => track.stop());
        recordingStreamRef.current = null;
        mediaRecorderRef.current = null;
        setRecordingTarget(null);
      };
      recordingStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      setRecordingTarget(target);
      recorder.start();
    } catch (error) {
      console.error('Voice note recording could not start:', error);
      window.alert('Microphone access was not granted. Please allow microphone access and try again.');
    }
  };

  const stopVoiceNote = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  useEffect(() => () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') mediaRecorderRef.current.stop();
    recordingStreamRef.current?.getTracks().forEach(track => track.stop());
  }, []);

  // Private one-to-one calls use WebRTC directly. Community room calls remain Jitsi links.
  const startChatCall = async (kind: 'voice' | 'video', target: 'community' | 'private') => {
    if (target === 'community') {
      const callWindow = window.open('about:blank', '_blank');
      const room = `FNI-Cells-${crypto.randomUUID()}`;
      const callUrl = `https://meet.jit.si/${room}${kind === 'voice' ? '#config.startWithVideoMuted=true&config.startAudioOnly=true' : ''}`;
      try {
        await MessagingService.sendCommunityMessage({ senderUid: currentUser.id, senderName: currentUser.full_name, senderRole: currentUser.role, cellName: currentUser.cell_name, content: `${kind === 'video' ? 'Video' : 'Voice'} call invitation: ${callUrl}`, category: 'general', mentions: [], attachments: [] });
        await loadCommunity();
        if (callWindow) callWindow.location.href = callUrl;
        else window.location.href = callUrl;
      } catch (error) {
        callWindow?.close();
        console.error('Could not create community call invitation:', error);
        window.alert('The community call invitation could not be sent. Please try again.');
      }
      return;
    }

    const recipientId = isAdmin ? selectedTutorId : (selectedTutorId || 'admin');
    if (!recipientId || recipientId === 'admin' || !callChannelRef.current || !callChannelReady) {
      window.alert('Open a registered member’s private conversation and wait for the secure call connection before calling.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === 'undefined') {
      window.alert('Live calling is not supported by this browser or device. Open FNI Cells Connect over HTTPS or use the installed Android app.');
      return;
    }
    try {
      setCallError(null);
      const callId = CallService.createSessionId();
      activeCallIdRef.current = callId;
      setActiveCallKind(kind);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: kind === 'video' });
      localCallStreamRef.current = stream;
      setLocalCallStream(stream);
      const peer = createPeerConnection(callId, kind);
      stream.getTracks().forEach(track => peer.addTrack(track, stream));
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      await sendCallSignal({ callId, fromProfileId: currentUser.id, type: 'offer', kind, payload: offer, sentAt: new Date().toISOString() });
      setCallUi('calling');
    } catch (error) {
      console.error('Could not start FNI call:', error);
      setCallError(error instanceof Error ? error.message : 'Could not start the call. Check your microphone and camera permissions.');
      await finishCall(false);
    }
  };

  // Send Private Message
  const handleSendPrivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!privateText.trim() && privateFiles.length === 0 && !privateSticker) || privateSendLock.current) return;
    privateSendLock.current = true;

    const recipientId = isAdmin ? selectedTutorId : (selectedTutorId || 'admin');
    const recipientName = isAdmin
      ? tutorList.find(t => t.id === selectedTutorId)?.name || 'Tutor'
      : recipientId === 'admin' ? 'Administrator / Leadership' : tutorList.find(t => t.id === recipientId)?.name || 'FNI Tutor';

    setIsSendingPrivate(true);
    setPrivateSendError(null);
    try {
      const uploadedAttachments = await Promise.all(privateFiles.map(file => MessagingService.uploadChatAttachment(currentUser.id, file)));
      await MessagingService.sendPrivateMessage({
        senderUid: currentUser.id,
        senderName: currentUser.full_name,
        senderRole: currentUser.role,
        recipientUid: recipientId,
        recipientName,
        cellId: currentUser.cell_id,
        cellName: currentUser.cell_name,
        content: [privateText.trim(), privateSticker ? `${STICKER_PREFIX}${privateSticker.emoji}]]` : ''].filter(Boolean).join('\n'),
        replyTo: privateReplyTo || undefined,
        attachments: uploadedAttachments,
      });
      setPrivateText('');
      setPrivateSticker(null);
      setShowPrivateStickers(false);
      setPrivateFiles([]);
      if (privateInputRef.current) privateInputRef.current.style.height = '40px';
      setPrivateReplyTo(null);
      setShowPrivateEmoji(false);
      await loadPrivateMessages();
      requestAnimationFrame(() => {
        const stream = privateStreamRef.current;
        if (stream) stream.scrollTo({ top: stream.scrollHeight, behavior: 'smooth' });
      });
    } catch (error) {
      console.error('Private message send failed:', error);
      setPrivateSendError(error instanceof Error ? error.message : 'Message could not be sent. Please try again.');
    } finally {
      privateSendLock.current = false;
      setIsSendingPrivate(false);
    }
  };

  // Send Community Message
  const handleSendCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!communityText.trim() && communityFiles.length === 0 && !communitySticker) || communitySendLock.current) return;
    communitySendLock.current = true;

    // Detect mentioned names
    const mentionsFound = memberDirectory
      .filter(m => communityText.toLowerCase().includes(`@${m.name.toLowerCase()}`))
      .map(m => m.name);

    setIsSendingCommunity(true);
    setCommunitySendError(null);
    try {
      const uploadedAttachments = await Promise.all(communityFiles.map(file => MessagingService.uploadChatAttachment(currentUser.id, file)));
      await MessagingService.sendCommunityMessage({
        senderUid: currentUser.id,
        senderName: currentUser.full_name,
        senderRole: currentUser.role,
        cellName: currentUser.cell_name,
        content: [communityText.trim(), communitySticker ? `${STICKER_PREFIX}${communitySticker.emoji}]]` : ''].filter(Boolean).join('\n'),
        category: communityCategory,
        replyTo: communityReplyTo || undefined,
        mentions: mentionsFound,
        attachments: uploadedAttachments,
      });
      setCommunityText('');
      setCommunitySticker(null);
      setShowCommunityStickers(false);
      setCommunityFiles([]);
      if (communityInputRef.current) communityInputRef.current.style.height = '40px';
      setCommunityReplyTo(null);
      setShowCommunityEmoji(false);
      setShowMentionMenu(false);
      await loadCommunity();
      requestAnimationFrame(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' }));
    } catch (error) {
      console.error('Community message send failed:', error);
      setCommunitySendError(error instanceof Error ? error.message : 'Message could not be sent. Please try again.');
    } finally {
      communitySendLock.current = false;
      setIsSendingCommunity(false);
    }
  };

  // Copy the complete message body without trimming line breaks.
  const copyMessage = async (content: string) => {
    setOpenMessageMenu(null);
    try {
      await navigator.clipboard.writeText(content);
      setOpenMessageMenu(null);
    } catch (error) {
      console.warn('Clipboard copy unavailable:', error);
      window.prompt('Copy this message:', content);
    }
  };

  // Handle reaction on community message
  const handleReaction = async (messageId: string, emoji: string) => {
    setOpenMessageMenu(null);
    try {
      await MessagingService.reactToCommunityMessage(messageId, emoji, currentUser.id, currentUser.full_name);
      await loadCommunity();
    } catch (error) {
      console.warn('Community reaction failed:', error);
      setCommunitySendError('Your reaction could not be saved. Please try again.');
    }
  };

  // Render sticker tokens, clickable website links and member mentions.
  const renderFormattedMessage = (content: string) => {
    const segments = content.split(/(\[\[FNI_STICKER:[^\]]+\]\])/g);
    return segments.map((segment, idx) => {
      const stickerMatch = segment.match(/^\[\[FNI_STICKER:(.+)\]\]$/);
      if (stickerMatch) {
        const sticker = STICKER_PACK.find(item => item.emoji === stickerMatch[1]);
        return <span key={idx} role="img" aria-label={sticker?.label || 'FNI sticker'} title={sticker?.label || 'FNI sticker'} className="inline-flex items-center justify-center align-middle rounded-2xl bg-white/10 px-3 py-1.5 text-5xl leading-none my-1">{stickerMatch[1]}</span>;
      }
      const urlParts = segment.split(/((?:https?:\/\/|www\.)[^\s]+)/gi);
      return <React.Fragment key={idx}>{urlParts.map((urlPart, urlIdx) => {
        if (/^(https?:\/\/|www\.)/i.test(urlPart)) {
          const cleanUrl = urlPart.replace(/[),.!?;:]+$/, '');
          const trailing = urlPart.slice(cleanUrl.length);
          const href = /^www\./i.test(cleanUrl) ? `https://${cleanUrl}` : cleanUrl;
          return <React.Fragment key={urlIdx}><a href={href} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2 decoration-current break-all cursor-pointer">{cleanUrl}</a>{trailing}</React.Fragment>;
        }
        return <React.Fragment key={urlIdx}>{urlPart.split(/(@[A-Za-z0-9_\-\s]+?(?=\s|[.,!?]|$))/g).map((part, partIdx) => part.startsWith('@') && part.length > 1 ? (
          <span key={partIdx} className="inline-block px-1.5 py-0.5 rounded-md bg-[#142B4A]/10 text-[#142B4A] font-bold text-xs mx-0.5" title="Tagged member">{part}</span>
        ) : <React.Fragment key={partIdx}>{part}</React.Fragment>)}</React.Fragment>;
      })}</React.Fragment>;
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

  // Telegram-style deletion: tombstones stay in the database for audit/sync,
  // but deleted-for-everyone messages never render in either conversation.
  const visibleCommunityMessages = communityMessages.filter(message => !message.deletedForEveryoneAt);
  const visiblePrivateMessages = privateMessages.filter(message => !message.deletedForEveryoneAt);

  // Filter mention directory
  const filteredMentions = memberDirectory.filter(m => {
    if (!mentionQuery) return true;
    return m.name.toLowerCase().includes(mentionQuery.toLowerCase());
  });

  return (
    <div className={`fni-messaging-view min-w-0 ${activeTab === 'community' ? 'fni-community-mode' : 'space-y-4 sm:space-y-6'}`}>
      {/* Keep the standard communications navigation for private messages.
          Community opens directly into its dedicated full-screen chat experience. */}
      {activeTab === 'private' && (
        <>
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
            className="flex-1 sm:flex-none justify-center px-2.5 sm:px-4 py-2.5 rounded-xl text-[11px] sm:text-sm font-bold transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer text-[#667085] hover:text-[#142B4A]"
          >
            <Users className="w-4 h-4 text-[#C6A45A]" />
            <span>Community</span>
          </button>
          <button
            onClick={() => setActiveTab('private')}
            className="flex-1 sm:flex-none justify-center px-2.5 sm:px-4 py-2.5 rounded-xl text-[11px] sm:text-sm font-bold transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer bg-[#142B4A] text-white shadow-xs"
          >
            <Lock className="w-4 h-4 text-[#C6A45A]" />
            <span>Private Chat</span>
          </button>
        </div>
      </div>
        </>
      )}
      
      {/* TAB 1: TUTOR COMMUNITY FORUM (Open Access, Emojis, Tagging & Telegram/WhatsApp Replies) */}
      {activeTab === 'community' && (
        <div className="fni-community-panel relative overflow-hidden flex flex-col min-h-0">
          {/* Forum Header */}
          <div className="fni-community-topbar relative z-20 shrink-0 px-3.5 py-3 sm:px-5 sm:py-4 text-white flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-[#F1C96B]">
                <Users className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate font-bold text-base sm:text-lg text-white">FNI Community</h2>
                <p className="truncate text-xs text-white/65">Tutor Community & Fellowship</p>
              </div>
            </div>

            <div className="relative flex shrink-0 items-center gap-1.5">
              <button type="button" onClick={() => setActiveTab('private')} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/20" aria-label="Open private chats" title="Private chats"><Lock className="h-4 w-4" /></button>
              <button type="button" onClick={() => startChatCall('voice', 'community')} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/20" aria-label="Start community voice call" title="Voice call"><Phone className="h-4 w-4" /></button>
              <button type="button" onClick={() => startChatCall('video', 'community')} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/20" aria-label="Start community video call" title="Video call"><Video className="h-4 w-4" /></button>
              <div className="relative"><button type="button" onClick={() => setOpenCommunityChatMenu(value => !value)} aria-label="Community chat options" className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/20"><MoreVertical className="h-4 w-4" /></button>{openCommunityChatMenu && <div className="absolute right-0 top-full z-50 mt-1 min-w-44 rounded-xl border border-[#E3E8EF] bg-white p-1.5 text-[#182230] shadow-xl"><button type="button" onClick={handleClearCommunityHistory} className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold hover:bg-[#F5F7FA]">Clear community history</button></div>}</div>

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

          {/* Pinned community message */}
          {visibleCommunityMessages.find(message => message.isPinned) && (() => {
            const pinned = visibleCommunityMessages.find(message => message.isPinned)!;
            return <div className="fni-community-pinned-strip flex items-center gap-2 px-3 py-2 text-white border-b border-white/10" role="status">
              <Pin className="h-4 w-4 shrink-0 text-[#F1C96B]" />
              <div className="min-w-0 flex-1"><div className="text-[10px] font-bold uppercase tracking-wide text-[#F1C96B]">Pinned message</div><button type="button" onClick={() => document.getElementById(`msg-${pinned.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="block w-full truncate text-left text-xs text-white/90">{pinned.senderName}: {pinned.content}</button></div>
              {isAdmin && <button type="button" onClick={() => handleToggleCommunityPin(pinned)} className="shrink-0 rounded-lg p-1.5 text-white/70 hover:bg-white/10" aria-label="Unpin community message" title="Unpin message"><X className="h-4 w-4" /></button>}
            </div>;
          })()}

          {/* Forum Messages Stream */}
          <div ref={communityStreamRef} className="fni-community-stream fni-chat-stream relative w-full min-h-0 px-3 py-4 sm:p-6 space-y-3 sm:space-y-4" style={communityWallpaperStyle}>
            {visibleCommunityMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-[#667085]">
                <Users className="w-12 h-12 text-[#667085]/40 mb-3" />
                <p className="text-sm font-bold text-[#182230]">The community board is fresh</p>
                <p className="text-xs text-[#667085] max-w-sm mt-1 leading-relaxed">
                  Share an encouraging scripture, prayer need, outreach victory, or praise report with fellow tutors!
                </p>
              </div>
            ) : (
              visibleCommunityMessages.map(msg => {
                const isMine = msg.senderUid === currentUser.id;
                const reactions = msg.reactions || {};

                return (
                  <div
                    key={msg.id}
                    id={`msg-${msg.id}`}
                    className={isMine ? "fni-swipe-message w-fit max-w-[88%] sm:max-w-[70%] ml-auto p-2.5 rounded-[18px] rounded-tr-sm border border-[#142B4A] bg-[#142B4A] text-white shadow-sm space-y-1 transition-all" : "fni-swipe-message w-fit max-w-[88%] sm:max-w-[70%] mr-auto p-2.5 rounded-[18px] rounded-tl-sm border border-[#E3E8EF] bg-white text-[#182230] shadow-sm space-y-1 transition-all"}
                    onTouchStart={event => beginCommunityMessageTouch(event, msg.id)}
                    onTouchMove={cancelCommunityMessageLongPress}
                    onTouchEnd={event => finishCommunityMessageTouch(event, { id: msg.id, senderName: msg.senderName, content: msg.content })}
                    onTouchCancel={cancelCommunityMessageLongPress}
                  >
                    {/* Header Row: Sender, Tag Badge & Time */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => openMemberProfile(msg.senderUid)} disabled={!allMembers.some(member => member.id === msg.senderUid)} aria-label={`View ${msg.senderName}'s profile`} className="w-7 h-7 rounded-full bg-[#142B4A] text-[#C6A45A] font-black text-[10px] flex items-center justify-center shrink-0 disabled:cursor-default">
                          {msg.senderName.slice(0, 2).toUpperCase()}
                        </button>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <button type="button" onClick={() => openMemberProfile(msg.senderUid)} disabled={!allMembers.some(member => member.id === msg.senderUid)} className={`font-bold text-xs sm:text-sm text-left ${isMine ? 'text-white' : 'text-[#142B4A]'} disabled:cursor-default`} title="View member profile">
                              {msg.senderName}
                            </button>
                            {msg.senderRole === 'admin' && (
                              <span className="px-2 py-0.5 rounded-full bg-[#C6A45A] text-[#142B4A] text-[10px] font-black uppercase">
                                Leadership
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${
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
                        <span className={isMine ? "text-xs text-white/70" : "text-xs text-[#667085]"}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{msg.editedAt && <span className="ml-1 italic">edited</span>}
                        </span>
                        <div className="relative">
                          <button type="button" onClick={() => setOpenMessageMenu(openMessageMenu === ("community:" + msg.id) ? null : ("community:" + msg.id))} className={isMine ? "p-1 rounded-lg text-white/80 hover:bg-white/10" : "p-1 rounded-lg text-[#667085] hover:bg-[#F5F7FA]"} aria-label="Message options">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {openMessageMenu === ("community:" + msg.id) && (
                            <div className="absolute right-0 top-full z-40 mt-1 min-w-28 rounded-xl border border-[#E3E8EF] bg-white p-1.5 shadow-xl">
                              {isAdmin && <button type="button" onClick={() => handleToggleCommunityPin(msg)} className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#182230] hover:bg-[#F5F7FA]">{msg.isPinned ? 'Unpin message' : 'Pin message'}</button>}
                              {isMine && <button type="button" onClick={() => handleEditMessage(msg.id, 'community', msg.content)} className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#182230] hover:bg-[#F5F7FA]">Edit message</button>}
                              <button type="button" onClick={() => handleHideCommunityMessage(msg.id)} className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-700 hover:bg-rose-50">Delete for me</button>
                              {(isMine || isAdmin) && <button type="button" onClick={() => handleDeleteMessageForEveryone(msg.id, 'community')} className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-700 hover:bg-rose-50">Delete for everyone</button>}
                              {allMembers.find(member => member.id === msg.senderUid) && <button type="button" onClick={() => { openMemberProfile(msg.senderUid); setOpenMessageMenu(null); }} className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#182230] hover:bg-[#F5F7FA]">View profile</button>}
                          <button type="button" onClick={() => copyMessage(msg.content)} className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#182230] hover:bg-[#F5F7FA]">Copy message</button>
                              <button type="button" onClick={() => handleReaction(msg.id, "❤️")} className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#182230] hover:bg-[#F5F7FA]">React ❤️</button>
                              <button type="button" onClick={() => handleReaction(msg.id, "🙏")} className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#182230] hover:bg-[#F5F7FA]">React 🙏</button>
                              <button type="button" onClick={() => { setCommunityReplyTo({ id: msg.id, senderName: msg.senderName, content: msg.content }); setOpenMessageMenu(null); communityInputRef.current?.focus(); }} className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#182230] hover:bg-[#F5F7FA]">Reply</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* TELEGRAM / WHATSAPP STYLE QUOTED REPLY PREVIEW */}
                    {msg.replyTo && (
                      <div
                        onClick={() => scrollToMessage(msg.replyTo!.id)}
                        className="p-2 rounded-lg bg-[#142B4A]/5 border-l-2 border-[#C6A45A] text-xs cursor-pointer hover:bg-[#142B4A]/10 transition-colors"
                        title="Click to view original message"
                      >
                        <div className={isMine ? "flex items-center gap-1.5 font-bold text-white" : "flex items-center gap-1.5 font-bold text-[#142B4A]"}>
                          <CornerDownRight className="w-3.5 h-3.5 text-[#C6A45A]" />
                          <span>Replying to {msg.replyTo.senderName}</span>
                        </div>
                        <p className={isMine ? "text-white/70 truncate mt-0.5 text-xs" : "text-[#667085] truncate mt-0.5 text-xs"}>
                          {msg.replyTo.content}
                        </p>
                      </div>
                    )}

                    {/* Message Body with Highlighted Mentions */}
                    <div className={isMine ? "text-[13px] sm:text-sm text-white leading-[1.4] whitespace-pre-wrap break-words [overflow-wrap:anywhere]" : "text-[13px] sm:text-sm text-[#182230] leading-[1.4] whitespace-pre-wrap break-words [overflow-wrap:anywhere]"}>
                      {msg.deletedForEveryoneAt ? <span className="italic opacity-70">This message was deleted</span> : renderFormattedMessage(msg.content)}
                      {msg.editedAt && !msg.deletedForEveryoneAt && <span className={`ml-1 text-[10px] italic ${isMine ? 'text-white/60' : 'text-[#98A2B3]'}`}>edited</span>}
                      {!msg.deletedForEveryoneAt && (msg.attachments || []).map(attachment => <ChatAttachmentPreview key={attachment.path} attachment={attachment} />)}
                    </div>

                    {/* Footer Actions: Emoji Reactions & Reply Button */}
                    <div className="flex items-center justify-between pt-0.5 flex-wrap gap-1.5">
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
                        className="px-2 py-1 rounded-lg bg-transparent hover:bg-[#142B4A]/10 text-[#142B4A] text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer ml-auto"
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
            {showCommunityJumpToLatest && <div className="sticky bottom-2 z-20 ml-auto flex justify-end"><button type="button" onClick={() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })} className="rounded-full border border-[#DCE3EC] bg-white px-3.5 py-2 text-xs font-bold text-[#142B4A] shadow-lg hover:bg-[#F5F7FA]">↓ Latest messages</button></div>}
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
            <div className="absolute bottom-[118px] left-2 right-2 z-30 rounded-2xl border border-[#E3E8EF] bg-white p-3 shadow-xl space-y-2.5">
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
          <form onSubmit={handleSendCommunity} className="fni-chat-composer relative z-20 shrink-0 p-2.5 sm:p-4 bg-white border-t border-[#E3E8EF] space-y-2.5 sm:space-y-3 min-w-0">
            {showCommunityStickers && <div className="absolute bottom-full left-2 z-40 mb-2 w-[min(340px,calc(100%-16px))] rounded-2xl border border-[#E3E8EF] bg-white p-3 shadow-2xl"><div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold text-[#142B4A]">FNI Stickers</span><button type="button" onClick={() => setShowCommunityStickers(false)} aria-label="Close stickers" className="rounded-lg p-1 text-[#667085] hover:bg-[#F5F7FA]"><X className="h-4 w-4" /></button></div><div className="grid grid-cols-4 gap-2">{STICKER_PACK.map(sticker => <button key={sticker.label} type="button" onClick={() => { setCommunitySticker(sticker); setShowCommunityStickers(false); }} className="flex min-h-20 flex-col items-center justify-center rounded-xl border border-[#E3E8EF] bg-[#F8FAFC] p-2 hover:border-[#C6A45A] hover:bg-amber-50"><span className="text-3xl">{sticker.emoji}</span><span className="mt-1 text-[10px] font-semibold text-[#667085]">{sticker.label}</span></button>)}</div><label className="mt-3 flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-[#9AAFC8] px-3 py-2 text-xs font-semibold text-[#142B4A]">Create sticker from photo<input type="file" accept="image/*" className="hidden" onChange={event => { const file = event.target.files?.[0]; if (file) saveCustomSticker(file); event.currentTarget.value = ''; }} /></label>{customStickers.length > 0 && <div className="mt-3 border-t border-[#E3E8EF] pt-3"><p className="mb-2 text-[11px] font-bold text-[#667085]">My stickers · tap to attach</p><div className="grid grid-cols-4 gap-2">{customStickers.map(sticker => <button key={sticker.id} type="button" onClick={() => attachCustomSticker(sticker, 'community')} className="rounded-xl border border-[#E3E8EF] bg-[#F8FAFC] p-1.5"><img src={sticker.dataUrl} alt={sticker.name} className="mx-auto h-12 w-12 rounded-lg object-contain" /><span className="mt-1 block truncate text-[9px] text-[#667085]">{sticker.name}</span></button>)}</div></div>}</div>}
            {communitySticker && <div className="flex items-center gap-2 rounded-xl bg-[#F5F7FA] px-3 py-2"><span className="text-2xl">{communitySticker.emoji}</span><span className="text-xs font-semibold text-[#142B4A]">{communitySticker.label} sticker ready</span><button type="button" onClick={() => setCommunitySticker(null)} className="ml-auto text-xs text-rose-600">Remove</button></div>}
            {communitySendError && (
              <p role="alert" className="text-xs font-semibold text-rose-600">{communitySendError}</p>
            )}
            {/* Message category stays compact and separate from the typing controls. */}
            <div className="flex items-center justify-end">
              <label className="sr-only" htmlFor="community-message-category">Message category</label>
              <select id="community-message-category" value={communityCategory} onChange={event => setCommunityCategory(event.target.value as typeof communityCategory)} className="max-w-36 rounded-lg border border-[#E3E8EF] bg-[#F8FAFC] px-2 py-1.5 text-[11px] font-semibold text-[#667085] outline-none focus:border-[#9AAFC8]">
                <option value="general">General</option>
                <option value="announcement">Announcement</option>
                <option value="prayer_request">Prayer request</option>
                <option value="testimony">Testimony</option>
              </select>
            </div>

            {communityFiles.length > 0 && <div className="flex flex-wrap gap-2 pb-1">{communityFiles.map((file,index) => <SelectedChatFilePreview key={file.name + index} file={file} onRemove={() => setCommunityFiles(files => files.filter((_,i) => i !== index))} />)}</div>}
            {/* Compact Telegram-style single-row composer. */}
            <div className="fni-chat-composer-row flex min-w-0 items-center gap-1.5">
              <input type="file" accept="image/*,video/*,audio/*" multiple className="hidden" id="community-chat-files" onChange={e => setCommunityFiles(previous => [...previous, ...Array.from(e.target.files || []).filter(file => file.type.startsWith('image/') || file.type.startsWith('video/') || file.type.startsWith('audio/'))])} />
              <button type="button" onClick={() => document.getElementById('community-chat-files')?.click()} className="fni-composer-icon h-9 w-8 shrink-0 rounded-full flex items-center justify-center text-[#667085] hover:bg-[#F5F7FA]" aria-label="Attach photos, videos or audio"><Paperclip className="w-[18px] h-[18px]" /></button>
              <button type="button" onClick={() => recordingTarget === 'community' ? stopVoiceNote() : startVoiceNote('community')} disabled={recordingTarget !== null && recordingTarget !== 'community'} className={`fni-composer-icon h-9 w-8 shrink-0 rounded-full flex items-center justify-center ${recordingTarget === 'community' ? 'bg-rose-50 text-rose-600' : 'text-[#667085] hover:bg-[#F5F7FA]'}`} aria-label={recordingTarget === 'community' ? 'Stop voice note recording' : 'Record voice note'} title={recordingTarget === 'community' ? 'Stop recording' : 'Record voice note'}>{recordingTarget === 'community' ? <Square className="h-4 w-4" /> : <Mic className="h-[18px] w-[18px]" />}</button>
              <div className="fni-composer-input flex min-w-0 flex-1 items-center gap-0.5 rounded-full border border-[#DCE3EC] bg-[#F5F7FA] px-1.5 py-1 focus-within:border-[#9AAFC8] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#142B4A]/10">
                <button type="button" onClick={() => setShowCommunityEmoji(prev => !prev)} className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center transition-colors ${showCommunityEmoji ? 'bg-[#142B4A] text-[#C6A45A]' : 'text-[#667085] hover:bg-white'}`} title="Open emoji palette" aria-label="Open emoji palette"><Smile className="h-[18px] w-[18px]" /></button>
                <button type="button" onClick={() => { setShowCommunityStickers(v => !v); setShowCommunityEmoji(false); }} className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-[#667085] hover:bg-white" aria-label="Open FNI stickers" title="Stickers"><span className="text-base">✨</span></button>
                <textarea ref={communityInputRef} rows={1} value={communityText} onChange={handleCommunityInputChange} onInput={e => { e.currentTarget.style.height = "auto"; e.currentTarget.style.height = Math.min(e.currentTarget.scrollHeight, Math.floor(window.innerHeight * 0.35)) + "px"; }} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} placeholder="Message the community" className="min-w-0 w-0 flex-1 max-h-[35vh] overflow-y-auto resize-none border-0 bg-transparent px-1 py-2 text-sm text-[#182230] outline-none ring-0 focus:border-0 focus:bg-transparent focus:outline-none focus:ring-0" />
                <button type="button" onClick={() => { setCommunityText(prev => prev + '@'); setMentionQuery(''); setShowMentionMenu(true); communityInputRef.current?.focus(); }} className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-[#667085] hover:bg-white hover:text-[#142B4A]" title="Tag a member" aria-label="Tag a member"><AtSign className="h-4 w-4" /></button>
              </div>
              <Button type="submit" variant="primary" size="md" isLoading={isSendingCommunity} className="h-10 w-10 min-w-[40px] !p-0 rounded-full shrink-0 flex items-center justify-center" aria-label="Send message"><Send className="w-4 h-4 text-[#C6A45A]" /></Button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: PRIVATE MESSAGING (Leadership Line with Replies & Emojis) */}
      {activeTab === 'private' && (
        <div className="fni-chat-panel relative bg-white rounded-2xl sm:rounded-3xl border border-[#E3E8EF] shadow-xs overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-[#142B4A] via-[#1A365D] to-[#203D63] text-white border-b border-[#142B4A] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#C6A45A]/20 text-[#C6A45A] border border-[#C6A45A]/30 flex items-center justify-center font-bold shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                {selectedTutorId !== 'admin' && allMembers.some(member => member.id === selectedTutorId) ? (
                  <button type="button" onClick={() => openMemberProfile(selectedTutorId)} className="text-left rounded-lg hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#C6A45A]">
                    <h3 className="font-bold text-sm sm:text-base text-white">{allMembers.find(member => member.id === selectedTutorId)?.full_name || 'Private Conversation'}</h3>
                    <span className="text-[10px] text-[#E8D6A8]">View member profile</span>
                  </button>
                ) : (
                  <h3 className="font-bold text-sm sm:text-base text-white">
                    {selectedTutorId === 'admin' ? 'Confidential Leadership Line' : tutorList.find(tutor => tutor.id === selectedTutorId)?.name || 'Private Conversation'}
                  </h3>
                )}
                <p className="text-xs text-slate-200 mt-0.5">
                  {selectedTutorId === 'admin'
                    ? 'Private, direct communication with ministry leadership.'
                    : [allMembers.find(member => member.id === selectedTutorId)?.cell_name, 'Private one-to-one conversation'].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {selectedTutorId !== 'admin' && selectedTutorId && <><button type="button" disabled={!callChannelReady} onClick={() => startChatCall('voice', 'private')} className="rounded-xl border border-white/20 p-2 text-white hover:bg-white/10 disabled:cursor-wait disabled:opacity-40" aria-label="Start private voice call" title={callChannelReady ? "Voice call" : "Connecting secure calling…"}><Phone className="h-4 w-4" /></button><button type="button" disabled={!callChannelReady} onClick={() => startChatCall('video', 'private')} className="rounded-xl border border-white/20 p-2 text-white hover:bg-white/10 disabled:cursor-wait disabled:opacity-40" aria-label="Start private video call" title={callChannelReady ? "Video call" : "Connecting secure calling…"}><Video className="h-4 w-4" /></button></>}
              {(isAdmin ? tutorList.length > 0 : true) && (
                <>
                  <span className="text-xs text-slate-200 font-medium">{isAdmin ? 'Select Tutor:' : 'Chat with:'}</span>
                  <select
                    value={isAdmin ? selectedTutorId : (selectedTutorId || 'admin')}
                    onChange={e => { setSelectedTutorId(e.target.value); setPrivateMessages([]); setPrivateReplyTo(null); setOpenChatMenu(false); }}
                    className="bg-[#142B4A] border border-[#E3E8EF]/30 text-white text-xs rounded-xl px-3 py-2 font-bold focus:outline-none max-w-[210px]"
                  >
                    {!isAdmin && <option value="admin" className="text-slate-900 bg-white">FNI Leadership</option>}
                    {tutorList.map(t => (
                      <option key={t.id} value={t.id} className="text-slate-900 bg-white">
                        {t.name}{t.cellName ? ` · ${t.cellName}` : ''}
                      </option>
                    ))}
                  </select>
                </>
              )}
              <div className="relative">
                <button type="button" onClick={() => setWallpaperMenu(wallpaperMenu === 'private' ? null : 'private')} aria-label="Change private chat wallpaper" className="p-2 rounded-xl border border-white/15 text-white hover:bg-white/10"><Palette className="w-4 h-4" /></button>
                {wallpaperMenu === 'private' && <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-[#E3E8EF] bg-white p-3 text-[#182230] shadow-2xl"><div className="mb-2 text-xs font-bold text-[#142B4A]">This conversation's wallpaper</div><div className="grid grid-cols-3 gap-2">{CHAT_WALLPAPERS.map(item => <button key={item.id} type="button" onClick={() => saveWallpaper(privateWallpaperKey, item.id)} className={`rounded-xl border p-1.5 text-[10px] font-semibold ${privateWallpaper.id === item.id ? 'border-[#C6A45A] ring-1 ring-[#C6A45A]' : 'border-[#E3E8EF]'}`}><span className="mb-1 block h-9 rounded-lg" style={{ backgroundColor: item.color, backgroundImage: item.image }} />{item.name}</button>)}</div><label className="mt-3 flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-[#9AAFC8] px-3 py-2.5 text-xs font-semibold text-[#142B4A] hover:bg-[#F5F7FA]">Upload your own photo<input type="file" accept="image/*" className="hidden" onChange={event => { const file = event.target.files?.[0]; if (file) setCustomWallpaper(privateWallpaperKey, file); event.currentTarget.value = ''; }} /></label>{wallpaperImages[privateWallpaperKey] && <button type="button" onClick={() => { setWallpaperImages(previous => { const next = { ...previous }; delete next[privateWallpaperKey]; try { window.localStorage.setItem(`${wallpaperStorageKey}:images`, JSON.stringify(next)); } catch {} return next; }); saveWallpaper(privateWallpaperKey, 'default'); }} className="mt-2 w-full text-left text-xs text-rose-600">Remove custom photo</button>}</div>}
              </div>
              <div className="relative">
                <button type="button" onClick={() => setOpenChatMenu(value => !value)} aria-label="Personal chat options" aria-expanded={openChatMenu} className="p-2 rounded-xl border border-white/15 text-white hover:bg-white/10">
                  <MoreVertical className="w-4 h-4" />
                </button>
                {openChatMenu && (
                  <div className="absolute right-0 top-full z-40 mt-1 min-w-40 rounded-xl border border-[#E3E8EF] bg-white p-1.5 shadow-xl">
                    <button type="button" onClick={() => handlePrivateChatAction('clear')} className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#182230] hover:bg-[#F5F7FA]">Clear chat</button>
                    <button type="button" onClick={handleClearAllPrivateChats} className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#182230] hover:bg-[#F5F7FA]">Clear all chats</button>
                    <button type="button" onClick={() => handlePrivateChatAction('delete')} className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-700 hover:bg-rose-50">Delete chat</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Search registered members and start a one-to-one conversation. */}
          <div className="relative z-20 border-b border-[#E3E8EF] bg-white px-3 py-3 sm:px-4">
            <div className="flex items-center gap-2 rounded-xl border border-[#DCE3EC] bg-[#F8FAFC] px-3 py-2 focus-within:border-[#9AAFC8] focus-within:ring-2 focus-within:ring-[#142B4A]/10">
              <Search className="h-4 w-4 shrink-0 text-[#667085]" />
              <input
                value={memberSearch}
                onChange={event => setMemberSearch(event.target.value)}
                placeholder="Search members by name, username or cell…"
                aria-label="Search FNI members"
                className="min-w-0 flex-1 bg-transparent text-sm text-[#182230] outline-none placeholder:text-[#98A2B3]"
              />
              {memberSearch && <button type="button" onClick={() => setMemberSearch('')} className="rounded-full p-1 text-[#667085] hover:bg-[#E9EEF5]" aria-label="Clear member search"><X className="h-4 w-4" /></button>}
            </div>
            {memberSearch.trim() && (
              <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-[#E3E8EF] bg-white shadow-lg">
                {allMembers.filter(member => {
                  const query = memberSearch.trim().toLowerCase();
                  return member.full_name.toLowerCase().includes(query) ||
                    (member.username || '').toLowerCase().includes(query) ||
                    (member.cell_name || '').toLowerCase().includes(query);
                }).slice(0, 12).map(member => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => {
                      setSelectedTutorId(member.id);
                      setPrivateMessages([]);
                      setPrivateReplyTo(null);
                      setMemberSearch('');
                      setOpenChatMenu(false);
                    }}
                    className={`flex w-full items-center gap-3 border-b border-[#F0F2F5] px-3 py-2.5 text-left last:border-b-0 hover:bg-[#F5F7FA] ${selectedTutorId === member.id ? 'bg-[#EEF3F8]' : ''}`}
                  >
                    {member.avatar_url
                      ? <img src={member.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                      : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EAF0F7] text-[#142B4A]"><UserRound className="h-4 w-4" /></span>}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-[#182230]">{member.full_name}</span>
                      <span className="block truncate text-xs text-[#667085]">{[member.username ? `@${member.username}` : '', member.cell_name || 'FNI Member'].filter(Boolean).join(' · ')}</span>
                    </span>
                    <span className="text-[11px] font-semibold text-[#142B4A]">Message</span>
                  </button>
                ))}
                {allMembers.filter(member => {
                  const query = memberSearch.trim().toLowerCase();
                  return member.full_name.toLowerCase().includes(query) ||
                    (member.username || '').toLowerCase().includes(query) ||
                    (member.cell_name || '').toLowerCase().includes(query);
                }).length === 0 && <p className="px-3 py-4 text-center text-xs text-[#667085]">No active members found.</p>}
              </div>
            )}
          </div>

          {/* Messages Stream */}
          <div ref={privateStreamRef} onScroll={event => { const el = event.currentTarget; setShowPrivateJumpToLatest(el.scrollHeight - el.scrollTop - el.clientHeight > 180); }} className="fni-chat-stream relative flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-4 sm:p-6 space-y-3 sm:space-y-4" style={privateWallpaperStyle}>
            {visiblePrivateMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-[#667085]">
                <Lock className="w-12 h-12 text-[#667085]/40 mb-3" />
                <p className="text-sm font-bold text-[#182230]">No private messages yet</p>
                <p className="text-xs text-[#667085] max-w-sm mt-1 leading-relaxed">
                  Start a confidential discussion regarding cell leadership, discipleship guidance, or pastoral support.
                </p>
              </div>
            ) : (
              visiblePrivateMessages.map(msg => {
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
                      onTouchStart={event => beginPrivateMessageTouch(event, msg.id)}
                      onTouchMove={cancelPrivateMessageLongPress}
                      onTouchEnd={event => finishPrivateMessageTouch(event, { id: msg.id, senderName: msg.senderName, content: msg.content })}
                      onTouchCancel={cancelPrivateMessageLongPress}
                      onContextMenu={event => { event.preventDefault(); setOpenMessageMenu("private:" + msg.id); }}
                      className={`fni-swipe-message max-w-[94%] sm:max-w-md p-3 sm:p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] group relative select-text ${
                        isMine
                          ? 'bg-[#142B4A] text-white rounded-tr-none shadow-2xs'
                          : 'bg-white text-[#182230] border border-[#E3E8EF] rounded-tl-none shadow-2xs'
                      }`}
                    >
                      <button type="button" onClick={() => setOpenMessageMenu(openMessageMenu === ("private:" + msg.id) ? null : ("private:" + msg.id))} className={`absolute top-1 right-1 z-10 rounded-lg p-1 ${isMine ? 'text-white/80 hover:bg-white/10' : 'text-[#667085] hover:bg-[#F5F7FA]'}`} aria-label="Message options">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {openMessageMenu === ("private:" + msg.id) && (
                        <div className="absolute right-1 top-8 z-40 min-w-28 rounded-xl border border-[#E3E8EF] bg-white p-1.5 shadow-xl">
                          {isMine && <button type="button" onClick={() => handleEditMessage(msg.id, 'private', msg.content)} className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#182230] hover:bg-[#F5F7FA]">Edit message</button>}
                          <button type="button" onClick={() => copyMessage(msg.content)} className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#182230] hover:bg-[#F5F7FA]">Copy message</button>
                          <button type="button" onClick={() => { setPrivateReplyTo({ id: msg.id, senderName: msg.senderName, content: msg.content }); setOpenMessageMenu(null); privateInputRef.current?.focus(); }} className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#182230] hover:bg-[#F5F7FA]">Reply</button>
                          {(isMine || isAdmin) && <button type="button" onClick={() => handleDeleteMessageForEveryone(msg.id, 'private')} className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-700 hover:bg-rose-50">Delete for everyone</button>}
                          <button type="button" onClick={() => handleHidePrivateMessage(msg.id)} className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-700 hover:bg-rose-50">Delete for me</button>
                        </div>
                      )}
                      {msg.deletedForEveryoneAt ? <span className="italic opacity-70">This message was deleted</span> : renderFormattedMessage(msg.content)}
                      {msg.editedAt && !msg.deletedForEveryoneAt && <span className={`ml-1 text-[10px] italic ${isMine ? 'text-white/60' : 'text-[#98A2B3]'}`}>edited</span>}
                      {!msg.deletedForEveryoneAt && (msg.attachments || []).map(attachment => <ChatAttachmentPreview key={attachment.path} attachment={attachment} />)}

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
            {showPrivateJumpToLatest && <div className="sticky bottom-2 z-20 ml-auto flex justify-end"><button type="button" onClick={() => privateStreamRef.current?.scrollTo({ top: privateStreamRef.current.scrollHeight, behavior: 'smooth' })} className="rounded-full border border-[#DCE3EC] bg-white px-3.5 py-2 text-xs font-bold text-[#142B4A] shadow-lg hover:bg-[#F5F7FA]">↓ Latest messages</button></div>}
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
            <div className="absolute bottom-[68px] left-2 right-2 z-30 rounded-2xl border border-[#E3E8EF] bg-white p-3 shadow-xl space-y-2.5">
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
          <form onSubmit={handleSendPrivate} className="fni-chat-composer relative p-2.5 sm:p-3 bg-white border-t border-[#E3E8EF] flex flex-col gap-2 min-w-0">
            {showPrivateStickers && <div className="absolute bottom-full left-2 z-40 mb-2 w-[min(340px,calc(100%-16px))] rounded-2xl border border-[#E3E8EF] bg-white p-3 shadow-2xl"><div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold text-[#142B4A]">FNI Stickers</span><button type="button" onClick={() => setShowPrivateStickers(false)} aria-label="Close stickers" className="rounded-lg p-1 text-[#667085] hover:bg-[#F5F7FA]"><X className="h-4 w-4" /></button></div><div className="grid grid-cols-4 gap-2">{STICKER_PACK.map(sticker => <button key={sticker.label} type="button" onClick={() => { setPrivateSticker(sticker); setShowPrivateStickers(false); }} className="flex min-h-20 flex-col items-center justify-center rounded-xl border border-[#E3E8EF] bg-[#F8FAFC] p-2 hover:border-[#C6A45A] hover:bg-amber-50"><span className="text-3xl">{sticker.emoji}</span><span className="mt-1 text-[10px] font-semibold text-[#667085]">{sticker.label}</span></button>)}</div><label className="mt-3 flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-[#9AAFC8] px-3 py-2 text-xs font-semibold text-[#142B4A]">Create sticker from photo<input type="file" accept="image/*" className="hidden" onChange={event => { const file = event.target.files?.[0]; if (file) saveCustomSticker(file); event.currentTarget.value = ''; }} /></label>{customStickers.length > 0 && <div className="mt-3 border-t border-[#E3E8EF] pt-3"><p className="mb-2 text-[11px] font-bold text-[#667085]">My stickers · tap to attach</p><div className="grid grid-cols-4 gap-2">{customStickers.map(sticker => <button key={sticker.id} type="button" onClick={() => attachCustomSticker(sticker, 'private')} className="rounded-xl border border-[#E3E8EF] bg-[#F8FAFC] p-1.5"><img src={sticker.dataUrl} alt={sticker.name} className="mx-auto h-12 w-12 rounded-lg object-contain" /><span className="mt-1 block truncate text-[9px] text-[#667085]">{sticker.name}</span></button>)}</div></div>}</div>}
            {privateSticker && <div className="flex items-center gap-2 rounded-xl bg-[#F5F7FA] px-3 py-2"><span className="text-2xl">{privateSticker.emoji}</span><span className="text-xs font-semibold text-[#142B4A]">{privateSticker.label} sticker ready</span><button type="button" onClick={() => setPrivateSticker(null)} className="ml-auto text-xs text-rose-600">Remove</button></div>}
            {privateSendError && <p role="alert" className="text-xs font-semibold text-rose-600">{privateSendError}</p>}
            {privateFiles.length > 0 && <div className="flex flex-wrap gap-2 pb-1">{privateFiles.map((file,index) => <SelectedChatFilePreview key={file.name + index} file={file} onRemove={() => setPrivateFiles(files => files.filter((_,i) => i !== index))} />)}</div>}
            <input type="file" accept="image/*,video/*,audio/*" multiple className="hidden" id="private-chat-files" onChange={e => setPrivateFiles(previous => [...previous, ...Array.from(e.target.files || []).filter(file => file.type.startsWith('image/') || file.type.startsWith('video/') || file.type.startsWith('audio/'))])} />
            <div className="fni-chat-composer-row flex min-w-0 items-center gap-1.5">
              <button type="button" onClick={() => document.getElementById('private-chat-files')?.click()} className="fni-composer-icon h-9 w-8 shrink-0 rounded-full flex items-center justify-center text-[#667085] hover:bg-[#F5F7FA]" aria-label="Attach photos, videos or audio"><Paperclip className="h-[18px] w-[18px]" /></button>
              <button type="button" onClick={() => recordingTarget === 'private' ? stopVoiceNote() : startVoiceNote('private')} disabled={recordingTarget !== null && recordingTarget !== 'private'} className={`fni-composer-icon h-9 w-8 shrink-0 rounded-full flex items-center justify-center ${recordingTarget === 'private' ? 'bg-rose-50 text-rose-600' : 'text-[#667085] hover:bg-[#F5F7FA]'}`} aria-label={recordingTarget === 'private' ? 'Stop voice note recording' : 'Record voice note'} title={recordingTarget === 'private' ? 'Stop recording' : 'Record voice note'}>{recordingTarget === 'private' ? <Square className="h-4 w-4" /> : <Mic className="h-[18px] w-[18px]" />}</button>
              <div className="fni-composer-input flex min-w-0 flex-1 items-center gap-0.5 rounded-full border border-[#DCE3EC] bg-[#F5F7FA] px-1.5 py-1 focus-within:border-[#9AAFC8] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#142B4A]/10">
                <button type="button" onClick={() => setShowPrivateEmoji(prev => !prev)} className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center transition-colors ${showPrivateEmoji ? 'bg-[#142B4A] text-[#C6A45A]' : 'text-[#667085] hover:bg-white'}`} title="Insert emoji" aria-label="Open emoji palette"><Smile className="h-[18px] w-[18px]" /></button>
                <button type="button" onClick={() => { setShowPrivateStickers(v => !v); setShowPrivateEmoji(false); }} className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-[#667085] hover:bg-white" aria-label="Open FNI stickers" title="Stickers"><span className="text-base">✨</span></button>
                <textarea ref={privateInputRef} rows={1} value={privateText} onChange={e => setPrivateText(e.target.value)} onInput={e => { e.currentTarget.style.height = "auto"; e.currentTarget.style.height = Math.min(e.currentTarget.scrollHeight, 112) + "px"; }} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} placeholder={selectedTutorId === "admin" ? "Message FNI Leadership" : "Write a private message…"} className="min-w-0 w-0 flex-1 max-h-28 resize-none border-0 bg-transparent px-1 py-2 text-sm text-[#182230] outline-none ring-0 focus:border-0 focus:bg-transparent focus:outline-none focus:ring-0" />
                <button type="button" onClick={() => { setPrivateText(prev => prev + '@'); setMentionQuery(''); setShowMentionMenu(true); privateInputRef.current?.focus(); }} className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-[#667085] hover:bg-white hover:text-[#142B4A]" title="Tag a member" aria-label="Tag a member"><AtSign className="h-4 w-4" /></button>
              </div>
              <Button type="submit" variant="primary" size="md" isLoading={isSendingPrivate} className="h-10 w-10 min-w-[40px] !p-0 rounded-full shrink-0 flex items-center justify-center" aria-label="Send message"><Send className="w-4 h-4 text-[#C6A45A]" /></Button>
            </div>
          </form>
        </div>
      )}

      {(incomingCall || callUi !== 'idle') && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="FNI call">
          <section className="w-full max-w-3xl overflow-hidden rounded-3xl border border-white/15 bg-[#101C2D] text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
              <div><p className="text-sm font-bold">{incomingCall ? 'Incoming FNI call' : activeCallKind === 'video' ? 'FNI video call' : 'FNI voice call'}</p><p className="text-xs text-white/60">{callUi === 'connected' ? 'Connected' : incomingCall ? 'A member is calling you' : 'Connecting securely…'}</p></div>
              <button type="button" onClick={() => { if (incomingCall) { void sendCallSignal({ callId: incomingCall.callId, fromProfileId: currentUser.id, type: 'decline', sentAt: new Date().toISOString() }).catch(() => undefined); void finishCall(false); } else void finishCall(true); }} className="rounded-full bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20">End</button>
            </div>
            {incomingCall && callUi === 'ringing' ? (
              <div className="space-y-4 px-6 py-12 text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#C6A45A]/20 text-3xl text-[#E8D6A8]">{incomingCall.kind === 'video' ? '▣' : '☎'}</div>
                <div><h3 className="text-xl font-bold">{allMembers.find(member => member.id === incomingCall.fromProfileId)?.full_name || 'FNI Member'}</h3><p className="mt-1 text-sm text-white/60">{incomingCall.kind === 'video' ? 'Video call' : 'Voice call'}</p></div>
                <div className="flex justify-center gap-3"><button type="button" onClick={() => { void sendCallSignal({ callId: incomingCall.callId, fromProfileId: currentUser.id, type: 'decline', sentAt: new Date().toISOString() }).catch(() => undefined); void finishCall(false); }} className="rounded-full bg-rose-600 px-6 py-3 text-sm font-bold">Decline</button><button type="button" onClick={() => void acceptIncomingCall()} className="rounded-full bg-emerald-600 px-6 py-3 text-sm font-bold">Accept</button></div>
              </div>
            ) : (
              <div className="relative min-h-[280px] bg-black sm:min-h-[440px]">
                {remoteCallStream ? <video ref={remoteCallVideoRef} autoPlay playsInline className="h-full min-h-[280px] w-full object-contain sm:min-h-[440px]" /> : <div className="flex min-h-[280px] items-center justify-center text-center text-sm text-white/65 sm:min-h-[440px]">{callError || 'Waiting for the other person to connect…'}</div>}
                {activeCallKind === 'video' && localCallStream && <video ref={localCallVideoRef} autoPlay muted playsInline className="absolute bottom-4 right-4 h-24 w-32 rounded-xl border border-white/30 bg-black object-cover sm:h-36 sm:w-48" />}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2"><button type="button" onClick={() => void finishCall(true)} className="rounded-full bg-rose-600 px-7 py-3 text-sm font-bold shadow-lg">End call</button></div>
              </div>
            )}
            {callError && <p className="border-t border-white/10 px-4 py-3 text-xs text-rose-300">{callError}</p>}
            <p className="px-4 py-3 text-center text-[10px] text-white/45">Direct peer-to-peer calling. Connection depends on both devices, network compatibility and permissions.</p>
          </section>
        </div>
      )}

      {profileMember && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-labelledby="member-profile-title" onClick={() => setProfileMember(null)}>
          <section className="w-full max-w-sm overflow-hidden rounded-2xl border border-[#E3E8EF] bg-white shadow-2xl" onClick={event => event.stopPropagation()}>
            <div className="relative bg-gradient-to-r from-[#142B4A] to-[#203D63] px-5 pb-6 pt-5 text-center text-white">
              <button type="button" onClick={() => setProfileMember(null)} className="absolute right-3 top-3 rounded-full p-2 text-white/80 hover:bg-white/10" aria-label="Close member profile"><X className="h-4 w-4" /></button>
              {profileMember.avatar_url
                ? <img src={profileMember.avatar_url} alt="" className="mx-auto h-20 w-20 rounded-full border-4 border-white/20 object-cover" />
                : <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/20 bg-white/10"><UserRound className="h-9 w-9 text-[#E8D6A8]" /></div>}
              <h2 id="member-profile-title" className="mt-3 text-lg font-bold">{profileMember.role === 'admin' || profileMember.role === 'super_admin' ? 'FNI Admin' : profileMember.full_name}</h2>
              <p className="mt-1 text-xs text-white/75">{profileMember.username ? `@${profileMember.username}` : 'FNI Member'}</p>
            </div>
            <div className="space-y-3 p-5">
              <div className="flex items-center justify-between gap-3 rounded-xl bg-[#F5F7FA] px-3 py-3"><span className="text-xs text-[#667085]">Ministry role</span><span className="text-sm font-bold capitalize text-[#142B4A]">{profileMember.role === 'admin' || profileMember.role === 'super_admin' ? 'FNI Admin' : profileMember.role === 'tutor' ? 'Tutor' : profileMember.role.replace(/_/g, ' ')}</span></div>
              <div className="flex items-center justify-between gap-3 rounded-xl bg-[#F5F7FA] px-3 py-3"><span className="text-xs text-[#667085]">Cell</span><span className="text-sm font-semibold text-[#182230]">{profileMember.cell_name || 'Not assigned'}</span></div>
              <div className="flex items-center justify-between gap-3 rounded-xl bg-[#F5F7FA] px-3 py-3"><span className="text-xs text-[#667085]">Region</span><span className="text-sm font-semibold text-[#182230]">{profileMember.region_name || 'Not assigned'}</span></div>
              {profileMember.created_at && <div className="flex items-center justify-between gap-3 rounded-xl bg-[#F5F7FA] px-3 py-3"><span className="text-xs text-[#667085]">Member since</span><span className="text-sm font-semibold text-[#182230]">{new Date(profileMember.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span></div>}
              <Button type="button" variant="primary" size="md" className="w-full" onClick={() => { setSelectedTutorId(profileMember.id); setPrivateMessages([]); setPrivateReplyTo(null); setProfileMember(null); }}>
                <MessageSquare className="mr-2 h-4 w-4" /> Message member
              </Button>
            </div>
          </section>
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
