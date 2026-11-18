import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Camera,
  Edit2,
  Users,
  Search,
  Bell,
  BellOff,
  Phone,
  Video,
  Shield,
  ShieldCheck,
  Lock,
  Link as LinkIcon,
  Copy,
  Check,
  RefreshCw,
  Clock,
  MapPin,
  Calendar,
  AlertTriangle,
  LogOut,
  Trash2,
  FileText,
  Image as ImageIcon,
  Mic,
  ExternalLink,
  MessageSquare,
  Play,
  Pause,
  UserCheck,
  UserPlus,
  UserMinus,
  Info,
  Sliders,
  CheckSquare,
} from 'lucide-react';
import { useBackHandler } from '../../hooks/useBackHandler';
import { MessagingService } from '../../services/messagingService';
import {
  CommunityGroup,
  CommunityGroupMember,
  CommunityMessage,
  GroupPermissions,
  UserGroupPreferences,
} from '../../types';

export interface GroupInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  group: CommunityGroup | null;
  onGroupUpdated: (updatedGroup: CommunityGroup) => void;
  messages: CommunityMessage[];
  allMembers: any[];
  tutorList: any[];
  currentUser: any;
  isAdmin: boolean;
  onStartVoiceCall: () => void;
  onStartVideoCall: () => void;
  onOpenMessageSearch?: () => void;
  onSelectMemberProfile?: (member: any) => void;
  onExitGroup?: () => void;
  onDeleteGroup?: () => void;
}

type ActiveSubScreen =
  | 'overview'
  | 'edit_info'
  | 'members'
  | 'admins'
  | 'permissions'
  | 'messages_settings'
  | 'invite_link'
  | 'notifications'
  | 'privacy'
  | 'fni_settings'
  | 'shared_media';

export const GroupInfoModal: React.FC<GroupInfoModalProps> = ({
  isOpen,
  onClose,
  groupId,
  group,
  onGroupUpdated,
  messages,
  allMembers,
  tutorList,
  currentUser,
  isAdmin,
  onStartVoiceCall,
  onStartVideoCall,
  onOpenMessageSearch,
  onSelectMemberProfile,
  onExitGroup,
  onDeleteGroup,
}) => {
  // Navigation stack
  const [currentScreen, setCurrentScreen] = useState<ActiveSubScreen>('overview');

  // Group Details Editing State
  const [groupName, setGroupName] = useState(group?.name || 'FNI Community');
  const [groupDesc, setGroupDesc] = useState(group?.description || '');
  const [groupAvatar, setGroupAvatar] = useState(group?.avatar_url || group?.avatarUrl || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Group Permissions State
  const defaultPermissions: GroupPermissions = {
    send_messages: 'all',
    send_media: 'all',
    send_docs: 'all',
    send_links: 'all',
    add_members: 'all',
    edit_group_info: 'admins',
    pin_messages: 'admins_mods',
    start_calls: 'all',
  };
  const [permissions, setPermissions] = useState<GroupPermissions>(
    group?.permissions || defaultPermissions
  );
  const [announcementMode, setAnnouncementMode] = useState<boolean>(
    Boolean(group?.announcement_mode)
  );
  const [disappearingDuration, setDisappearingDuration] = useState<string>(
    group?.disappearing_messages || 'off'
  );
  const [requireApproval, setRequireApproval] = useState<boolean>(
    Boolean(group?.require_approval)
  );
  const [meetingSchedule, setMeetingSchedule] = useState<string>(
    group?.meeting_schedule || 'Sunday 5:00 PM GMT • Midweek Wednesday 6:30 PM'
  );
  const [meetingLocation, setMeetingLocation] = useState<string>(
    group?.meeting_location || 'FNI Main Sanctuary & Online Fellowship'
  );
  const [oversightContact, setOversightContact] = useState<string>(
    group?.oversight_contact || 'FNI Leadership Directorate'
  );

  // Members & Roles State
  const [groupMembers, setGroupMembers] = useState<CommunityGroupMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [selectedMemberToAdd, setSelectedMemberToAdd] = useState('');
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  // Notifications / Mute State
  const [userPrefs, setUserPrefs] = useState<UserGroupPreferences>({
    userId: currentUser?.id || '',
    groupId,
    isMuted: false,
    mutedUntil: null,
    notifyMentions: true,
    notifyAnnouncements: true,
  });
  const [showMuteDurationSheet, setShowMuteDurationSheet] = useState(false);

  // Media & Links Extraction
  const [activeMediaTab, setActiveMediaTab] = useState<'media' | 'docs' | 'links' | 'audio'>('media');
  const [activeAudioPlaying, setActiveAudioPlaying] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const handlePlaySharedAudio = async (url: string) => {
    if (!url) return;
    if (activeAudioPlaying === url) {
      audioPlayerRef.current?.pause();
      setActiveAudioPlaying(null);
      return;
    }
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    const audio = new Audio(url);
    audioPlayerRef.current = audio;
    audio.onended = () => setActiveAudioPlaying(null);
    audio.onerror = () => setActiveAudioPlaying(null);
    setActiveAudioPlaying(url);
    try {
      await audio.play();
    } catch {
      setActiveAudioPlaying(null);
    }
  };

  // Invite Link State
  const [inviteCode, setInviteCode] = useState<string>(
    group?.invite_code || 'fni-community-fellowship'
  );
  const [copiedLink, setCopiedLink] = useState(false);

  // Danger Zone Prompts
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  // Sync state when group prop changes
  useEffect(() => {
    if (group) {
      setGroupName(group.name);
      setGroupDesc(group.description || '');
      setGroupAvatar(group.avatar_url || group.avatarUrl || '');
      if (group.permissions) setPermissions(group.permissions);
      setAnnouncementMode(Boolean(group.announcement_mode));
      setDisappearingDuration(group.disappearing_messages || 'off');
      setRequireApproval(Boolean(group.require_approval));
      setInviteCode(group.invite_code || 'fni-community-fellowship');
      if (group.meeting_schedule) setMeetingSchedule(group.meeting_schedule);
      if (group.meeting_location) setMeetingLocation(group.meeting_location);
      if (group.oversight_contact) setOversightContact(group.oversight_contact);
    }
  }, [group]);

  // Load members and preferences
  useEffect(() => {
    if (isOpen) {
      loadMembers();
      loadUserPreferences();
    } else {
      setCurrentScreen('overview');
    }
  }, [isOpen, groupId]);

  const loadMembers = async () => {
    try {
      setMembersLoading(true);
      const members = await MessagingService.getCommunityGroupMembers(groupId);
      setGroupMembers(members);
    } catch (err) {
      console.warn('Failed to load group members:', err);
    } finally {
      setMembersLoading(false);
    }
  };

  const loadUserPreferences = async () => {
    if (!currentUser?.id) return;
    try {
      const prefs = await MessagingService.getUserGroupPreferences(currentUser.id, groupId);
      setUserPrefs(prefs);
    } catch (_) {}
  };

  // Back handler support
  useBackHandler(() => {
    if (!isOpen) return false;
    if (currentScreen !== 'overview') {
      setCurrentScreen('overview');
      return true;
    }
    onClose();
    return true;
  }, isOpen);

  // Determine current user's role in this group
  const myMembership = groupMembers.find(m => m.user_id === currentUser?.id);
  const myRole = isAdmin
    ? 'admin'
    : myMembership?.role === 'admin'
    ? 'admin'
    : myMembership?.role === 'moderator'
    ? 'moderator'
    : 'member';

  const isGroupAdmin = myRole === 'admin';
  const isGroupModerator = myRole === 'moderator' || myRole === 'admin';

  // Extract shared media items from messages
  const sharedMediaItems = useMemo(() => {
    const media: { url: string; name: string; date: string }[] = [];
    const docs: { url: string; name: string; size?: string; date: string }[] = [];
    const audio: { url: string; name: string; duration: string; sender: string; date: string }[] = [];
    const links: { url: string; text: string; date: string }[] = [];

    const urlRegex = /(https?:\/\/[^\s]+)/g;

    messages.forEach(msg => {
      const msgDate = new Date(msg.createdAt).toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
      });

      // Extract links in content
      const matches = msg.content?.match(urlRegex);
      if (matches) {
        matches.forEach(url => {
          links.push({ url, text: msg.content, date: msgDate });
        });
      }

      // Extract attachments
      if (msg.attachments && msg.attachments.length > 0) {
        msg.attachments.forEach(att => {
          const isImgOrVid = att.mimeType?.startsWith('image') || att.mimeType?.startsWith('video');
          const isAud = att.mimeType?.startsWith('audio') || att.name?.includes('voice-note');
          const fileUrl = att.path;

          if (isImgOrVid) {
            media.push({ url: fileUrl, name: att.name, date: msgDate });
          } else if (isAud) {
            audio.push({
              url: fileUrl,
              name: att.name,
              duration: '0:25',
              sender: msg.senderName,
              date: msgDate,
            });
          } else {
            docs.push({
              url: fileUrl,
              name: att.name,
              date: msgDate,
            });
          }
        });
      }
    });

    return { media, docs, audio, links };
  }, [messages]);

  // Save Group Info Updates
  const handleSaveGroupInfo = async () => {
    if (!isGroupAdmin && !isGroupModerator) return;
    try {
      setIsSaving(true);
      const updates: Partial<CommunityGroup> = {
        name: groupName.trim(),
        description: groupDesc.trim(),
        avatar_url: groupAvatar,
        permissions,
        announcement_mode: announcementMode,
        invite_code: inviteCode,
        require_approval: requireApproval,
        disappearing_messages: disappearingDuration,
        meeting_schedule: meetingSchedule.trim(),
        meeting_location: meetingLocation.trim(),
        oversight_contact: oversightContact.trim(),
      };

      const res = await MessagingService.updateCommunityGroup(groupId, updates);
      if (res.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
        if (group) {
          onGroupUpdated({ ...group, ...updates });
        }
      } else {
        alert(res.error || 'Failed to save group settings.');
      }
    } catch (e: any) {
      alert(e?.message || 'Error updating group');
    } finally {
      setIsSaving(false);
    }
  };

  // Avatar upload handler
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Photo must be smaller than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setGroupAvatar(dataUrl);
      if (group) {
        MessagingService.updateCommunityGroup(groupId, { avatar_url: dataUrl });
        onGroupUpdated({ ...group, avatar_url: dataUrl, avatarUrl: dataUrl });
      }
    };
    reader.readAsDataURL(file);
  };

  // Toggle Mute
  const handleSetMute = async (duration: '8h' | '1w' | 'always' | 'unmute') => {
    let isMuted = true;
    let mutedUntil: string | null = null;

    if (duration === 'unmute') {
      isMuted = false;
      mutedUntil = null;
    } else if (duration === '8h') {
      const d = new Date();
      d.setHours(d.getHours() + 8);
      mutedUntil = d.toISOString();
    } else if (duration === '1w') {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      mutedUntil = d.toISOString();
    }

    const nextPrefs: UserGroupPreferences = {
      ...userPrefs,
      isMuted,
      mutedUntil,
    };
    setUserPrefs(nextPrefs);
    setShowMuteDurationSheet(false);
    await MessagingService.saveUserGroupPreferences(nextPrefs);
  };

  // Member management actions
  const handleChangeMemberRole = async (userId: string, newRole: 'admin' | 'moderator' | 'member') => {
    if (!isGroupAdmin) return;
    try {
      const res = await MessagingService.updateGroupMemberRole(groupId, userId, newRole);
      if (res.success) {
        setGroupMembers(prev =>
          prev.map(m => (m.user_id === userId ? { ...m, role: newRole } : m))
        );
      } else {
        alert(res.error || 'Failed to update member role');
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to update role');
    }
  };

  const handleRemoveMember = async (userId: string, name: string) => {
    if (!isGroupAdmin) return;
    if (!confirm(`Are you sure you want to remove ${name} from this fellowship group?`)) return;
    try {
      const res = await MessagingService.removeGroupMember(groupId, userId);
      if (res.success) {
        setGroupMembers(prev => prev.filter(m => m.user_id !== userId));
      } else {
        alert(res.error || 'Failed to remove member');
      }
    } catch (err: any) {
      alert(err?.message || 'Error removing member');
    }
  };

  const handleAddMember = async (userId: string) => {
    if (!isGroupAdmin) return;
    try {
      const res = await MessagingService.addGroupMember(groupId, userId, 'member');
      if (res.success) {
        await loadMembers();
        setShowAddMemberModal(false);
        setSelectedMemberToAdd('');
      } else {
        alert(res.error || 'Failed to add member');
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to add member');
    }
  };

  // Full invite URL
  const fullInviteUrl = `https://jk-larbi.github.io/FNI-Cells-Connect/?join=${inviteCode}`;

  const handleCopyInviteLink = () => {
    navigator.clipboard.writeText(fullInviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleRevokeInviteLink = async () => {
    if (!isGroupAdmin) return;
    if (!confirm('Revoking this link will prevent anyone from joining with the old link. Generate new link?')) return;
    const newCode = `fni-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    setInviteCode(newCode);
    await MessagingService.updateCommunityGroup(groupId, { invite_code: newCode });
    if (group) onGroupUpdated({ ...group, invite_code: newCode });
  };

  // Danger actions
  const handleExitGroup = () => {
    if (onExitGroup) onExitGroup();
    onClose();
  };

  const handleDeleteGroup = () => {
    if (deleteConfirmationText.trim().toLowerCase() !== groupName.trim().toLowerCase()) {
      alert('Please type the exact group name to confirm deletion.');
      return;
    }
    if (onDeleteGroup) onDeleteGroup();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs animate-fadeIn">
      {/* Modal Container: Fullscreen on mobile, centered card on desktop */}
      <div className="relative w-full h-[100dvh] md:h-[88vh] md:max-w-2xl bg-white dark:bg-[#0c1421] md:rounded-3xl shadow-2xl border-0 md:border border-slate-200/80 dark:border-white/10 flex flex-col overflow-hidden">
        {/* =========================================================================
            HEADER BAR (FNI Official style)
        ========================================================================= */}
        <div className="flex items-center justify-between px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] bg-white dark:bg-[#182533] border-b border-slate-200/80 dark:border-white/10 shrink-0 z-20">
          <div className="flex items-center gap-2">
            {currentScreen !== 'overview' ? (
              <button
                type="button"
                onClick={() => setCurrentScreen('overview')}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-white transition-colors cursor-pointer"
                title="Back to group info"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-white transition-colors cursor-pointer"
                title="Close"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}
            <h2 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">
              {currentScreen === 'overview' && 'Group Information'}
              {currentScreen === 'edit_info' && 'Edit Group Info'}
              {currentScreen === 'members' && `Members (${groupMembers.length})`}
              {currentScreen === 'admins' && 'Administrators & Moderators'}
              {currentScreen === 'permissions' && 'Group Permissions'}
              {currentScreen === 'messages_settings' && 'Message Settings'}
              {currentScreen === 'invite_link' && 'Group Invite Link'}
              {currentScreen === 'notifications' && 'Notification Settings'}
              {currentScreen === 'privacy' && 'Privacy & Security'}
              {currentScreen === 'fni_settings' && 'FNI Cell Fellowship Details'}
              {currentScreen === 'shared_media' && 'Shared Media & Files'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {currentScreen !== 'overview' && (isGroupAdmin || isGroupModerator) && (
              <button
                type="button"
                onClick={handleSaveGroupInfo}
                disabled={isSaving}
                className="px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-transform active:scale-95 cursor-pointer flex items-center gap-1"
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Saved</span>
                  </>
                ) : isSaving ? (
                  <span>Saving...</span>
                ) : (
                  <span>Save</span>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* =========================================================================
            SUB-SCREEN CONTENT VIEWS
        ========================================================================= */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* =====================================================================
              1. OVERVIEW SCREEN (PRIMARY VIEW)
          ===================================================================== */}
          {currentScreen === 'overview' && (
            <div className="space-y-4 pb-12">
              {/* Group Hero Profile Card */}
              <div className="p-6 bg-gradient-to-b from-slate-50 to-white dark:from-[#182533] dark:to-[#0c1421] border-b border-slate-200/80 dark:border-white/10 flex flex-col items-center text-center relative select-none">
                <div className="relative mb-3 group">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-[#142B4A] to-[#873ce0] text-[#C6A45A] font-black text-2xl flex items-center justify-center overflow-hidden shadow-xl border-4 border-white dark:border-[#182533]">
                    {groupAvatar ? (
                      <img src={groupAvatar} alt={groupName} className="w-full h-full object-cover" />
                    ) : (
                      <Users className="w-12 h-12 stroke-[1.8]" />
                    )}
                  </div>
                  {isGroupAdmin && (
                    <>
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarChange}
                      />
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-lg border-2 border-white dark:border-[#182533] transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                        title="Change group photo"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2 justify-center max-w-full">
                  <h1 className="font-extrabold text-lg sm:text-xl text-slate-900 dark:text-white truncate">
                    {groupName}
                  </h1>
                  {group?.is_official && (
                    <span className="p-1 rounded-full bg-amber-500/10 text-amber-500" title="Official Ministerial Group">
                      <ShieldCheck className="w-4 h-4" />
                    </span>
                  )}
                  {isGroupAdmin && (
                    <button
                      type="button"
                      onClick={() => setCurrentScreen('edit_info')}
                      className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-blue-500 transition-colors"
                      title="Edit group name and description"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md line-clamp-2">
                  {groupDesc || 'Official ministerial fellowship for active FNI tutors and leaders.'}
                </p>

                <div className="flex items-center gap-2 mt-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <span>{groupMembers.length || allMembers.length || 1} members</span>
                  <span>•</span>
                  <span className="text-emerald-500 font-bold">
                    {tutorList.filter(t => t.isOnline).length || 3} online
                  </span>
                </div>

                <div className="text-[10px] text-slate-400 mt-1">
                  Created by FNI Leadership Directorate on Nov 7, 2026
                </div>

                {/* Quick Actions Row (FNI Actions) */}
                <div className="grid grid-cols-5 gap-2 w-full max-w-md mt-5 pt-4 border-t border-slate-200/60 dark:border-white/10">
                  {/* Add Members */}
                  <button
                    type="button"
                    onClick={() => {
                      if (isGroupAdmin || permissions.add_members === 'all') {
                        setShowAddMemberModal(true);
                      } else {
                        alert('Only group administrators can add members.');
                      }
                    }}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
                      <UserPlus className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-semibold">Add</span>
                  </button>

                  {/* Search in Chat */}
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      if (onOpenMessageSearch) onOpenMessageSearch();
                    }}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 flex items-center justify-center shadow-xs">
                      <Search className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-semibold">Search</span>
                  </button>

                  {/* Mute */}
                  <button
                    type="button"
                    onClick={() => setShowMuteDurationSheet(true)}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-xs ${
                      userPrefs.isMuted
                        ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                        : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300'
                    }`}>
                      {userPrefs.isMuted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                    </div>
                    <span className="text-[10px] font-semibold">
                      {userPrefs.isMuted ? 'Muted' : 'Mute'}
                    </span>
                  </button>

                  {/* Voice Call */}
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onStartVoiceCall();
                    }}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                      <Phone className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-semibold">Voice</span>
                  </button>

                  {/* Video Call */}
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onStartVideoCall();
                    }}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
                      <Video className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-semibold">Video</span>
                  </button>
                </div>
              </div>

              {/* Shared Media, Links & Docs Banner */}
              <div className="px-4">
                <button
                  type="button"
                  onClick={() => setCurrentScreen('shared_media')}
                  className="w-full p-4 rounded-3xl bg-slate-50 dark:bg-[#182533] hover:bg-slate-100 dark:hover:bg-[#1f2f42] border border-slate-200/80 dark:border-white/10 flex items-center justify-between transition-all cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-[#C6A45A] flex items-center justify-center">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">Media, Links and Documents</h4>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        <span>{sharedMediaItems.media.length} photos</span>
                        <span>•</span>
                        <span>{sharedMediaItems.docs.length} docs</span>
                        <span>•</span>
                        <span>{sharedMediaItems.links.length} links</span>
                        <span>•</span>
                        <span>{sharedMediaItems.audio.length} audio</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* FNI Fellowship Details Card */}
              <div className="px-4">
                <button
                  type="button"
                  onClick={() => setCurrentScreen('fni_settings')}
                  className="w-full p-4 rounded-3xl bg-slate-50 dark:bg-[#182533] hover:bg-slate-100 dark:hover:bg-[#1f2f42] border border-slate-200/80 dark:border-white/10 flex items-center justify-between transition-all cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">Cell Fellowship & Meeting Schedule</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs mt-0.5">
                        {meetingSchedule} • {meetingLocation}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* Group Settings Hub List */}
              <div className="px-4 space-y-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 px-2 block">
                  Settings & Permissions
                </span>

                <div className="rounded-3xl bg-slate-50 dark:bg-[#182533] border border-slate-200/80 dark:border-white/10 divide-y divide-slate-100 dark:divide-white/5 overflow-hidden">
                  {/* Group Info Editing */}
                  <button
                    type="button"
                    onClick={() => setCurrentScreen('edit_info')}
                    className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Info className="w-4 h-4 text-blue-500" />
                      <div>
                        <span className="text-xs font-bold text-slate-800 dark:text-white block">Group Information</span>
                        <span className="text-[10px] text-slate-400">Name, description, avatar and edit controls</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>

                  {/* Members */}
                  <button
                    type="button"
                    onClick={() => setCurrentScreen('members')}
                    className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Users className="w-4 h-4 text-indigo-500" />
                      <div>
                        <span className="text-xs font-bold text-slate-800 dark:text-white block">Members</span>
                        <span className="text-[10px] text-slate-400">{groupMembers.length} active tutors and fellowship ministers</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>

                  {/* Administrators and Moderators */}
                  <button
                    type="button"
                    onClick={() => setCurrentScreen('admins')}
                    className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-4 h-4 text-amber-500" />
                      <div>
                        <span className="text-xs font-bold text-slate-800 dark:text-white block">Administrators & Moderators</span>
                        <span className="text-[10px] text-slate-400">Appoint leaders, moderators, and view roles</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>

                  {/* Group Permissions */}
                  <button
                    type="button"
                    onClick={() => {
                      if (isGroupAdmin) {
                        setCurrentScreen('permissions');
                      } else {
                        alert('Only group administrators can modify group permissions.');
                      }
                    }}
                    className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Sliders className="w-4 h-4 text-emerald-500" />
                      <div>
                        <span className="text-xs font-bold text-slate-800 dark:text-white block">Group Permissions</span>
                        <span className="text-[10px] text-slate-400">Control who can send media, messages, pin or start calls</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {!isGroupAdmin && <Lock className="w-3.5 h-3.5 text-slate-400" />}
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </button>

                  {/* Message Settings */}
                  <button
                    type="button"
                    onClick={() => setCurrentScreen('messages_settings')}
                    className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-4 h-4 text-purple-500" />
                      <div>
                        <span className="text-xs font-bold text-slate-800 dark:text-white block">Message Settings</span>
                        <span className="text-[10px] text-slate-400">Pinned messages, announcement mode & retention</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>

                  {/* Invite Link */}
                  <button
                    type="button"
                    onClick={() => setCurrentScreen('invite_link')}
                    className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <LinkIcon className="w-4 h-4 text-sky-500" />
                      <div>
                        <span className="text-xs font-bold text-slate-800 dark:text-white block">Invite Link</span>
                        <span className="text-[10px] text-slate-400">Shareable join link and approval requirements</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>

                  {/* Notifications */}
                  <button
                    type="button"
                    onClick={() => setCurrentScreen('notifications')}
                    className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Bell className="w-4 h-4 text-teal-500" />
                      <div>
                        <span className="text-xs font-bold text-slate-800 dark:text-white block">Notification Preferences</span>
                        <span className="text-[10px] text-slate-400">Personal mute, @mention alerts, announcements</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>

                  {/* Privacy & Security */}
                  <button
                    type="button"
                    onClick={() => setCurrentScreen('privacy')}
                    className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Lock className="w-4 h-4 text-amber-500" />
                      <div>
                        <span className="text-xs font-bold text-slate-800 dark:text-white block">Privacy & Security</span>
                        <span className="text-[10px] text-slate-400">Join approval, member directory privacy</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="px-4 pt-2 space-y-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-500 px-2 block">
                  Danger Zone
                </span>

                <div className="rounded-3xl bg-rose-500/5 border border-rose-500/20 divide-y divide-rose-500/10 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowExitConfirm(true)}
                    className="w-full px-4 py-3.5 flex items-center gap-3 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors text-left font-bold text-xs cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Exit Group</span>
                  </button>

                  {isGroupAdmin && (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full px-4 py-3.5 flex items-center gap-3 text-rose-700 dark:text-rose-500 hover:bg-rose-500/15 transition-colors text-left font-bold text-xs cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete Group for Everyone</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* =====================================================================
              2. EDIT GROUP INFO SUB-SCREEN
          ===================================================================== */}
          {currentScreen === 'edit_info' && (
            <div className="p-4 space-y-4">
              <div className="p-4 rounded-3xl bg-slate-50 dark:bg-[#182533] border border-slate-200/80 dark:border-white/10 space-y-3">
                <label className="block text-xs font-bold text-slate-800 dark:text-white">Group Name</label>
                <input
                  type="text"
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                  disabled={!isGroupAdmin && !isGroupModerator}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <label className="block text-xs font-bold text-slate-800 dark:text-white pt-2">Group Description</label>
                <textarea
                  rows={3}
                  value={groupDesc}
                  onChange={e => setGroupDesc(e.target.value)}
                  disabled={!isGroupAdmin && !isGroupModerator}
                  placeholder="Provide spiritual oversight objectives, cell guidance, or announcements..."
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="p-4 rounded-3xl bg-slate-50 dark:bg-[#182533] border border-slate-200/80 dark:border-white/10 space-y-3">
                <label className="block text-xs font-bold text-slate-800 dark:text-white">Who can edit group info?</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPermissions(p => ({ ...p, edit_group_info: 'all' }))}
                    disabled={!isGroupAdmin}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      permissions.edit_group_info === 'all'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white dark:bg-black/20 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10'
                    }`}
                  >
                    Everyone
                  </button>
                  <button
                    type="button"
                    onClick={() => setPermissions(p => ({ ...p, edit_group_info: 'admins' }))}
                    disabled={!isGroupAdmin}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      permissions.edit_group_info === 'admins'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white dark:bg-black/20 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10'
                    }`}
                  >
                    Only Admins
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =====================================================================
              3. MEMBERS SUB-SCREEN
          ===================================================================== */}
          {currentScreen === 'members' && (
            <div className="p-4 space-y-3">
              {/* Search Bar & Add Button */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={memberSearchQuery}
                    onChange={e => setMemberSearchQuery(e.target.value)}
                    placeholder="Search members by name or cell..."
                    className="w-full pl-8 pr-3 py-2 rounded-2xl bg-slate-100 dark:bg-[#182533] border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                  />
                </div>
                {isGroupAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowAddMemberModal(true)}
                    className="px-3 py-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                )}
              </div>

              {/* Members List */}
              <div className="rounded-3xl bg-slate-50 dark:bg-[#182533] border border-slate-200/80 dark:border-white/10 divide-y divide-slate-100 dark:divide-white/5 overflow-hidden">
                {tutorList
                  .filter(m => {
                    if (!memberSearchQuery.trim()) return true;
                    const q = memberSearchQuery.toLowerCase();
                    const name = (m.full_name || m.name || '').toLowerCase();
                    const cell = (m.cell_name || '').toLowerCase();
                    return name.includes(q) || cell.includes(q);
                  })
                  .map(member => {
                    const groupMemberRecord = groupMembers.find(gm => gm.user_id === member.id);
                    const memberRole = member.role === 'admin' || member.role === 'super_admin'
                      ? 'admin'
                      : groupMemberRecord?.role || 'member';

                    return (
                      <div
                        key={member.id}
                        onClick={() => onSelectMemberProfile && onSelectMemberProfile(member)}
                        className="px-4 py-3 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-[#142B4A] text-[#C6A45A] font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden">
                            {member.avatar_url || member.photo_url ? (
                              <img src={member.avatar_url || member.photo_url} alt={member.name} className="w-full h-full object-cover" />
                            ) : (
                              (member.full_name || member.name || 'FN').slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                                {member.full_name || member.name}
                              </span>
                              {member.id === currentUser?.id && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 font-bold">
                                  You
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 truncate">
                              {member.cell_name || 'Active Fellowship'} • {member.phone_number || member.phone || 'Online'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {memberRole === 'admin' && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-bold border border-amber-500/20">
                              Admin
                            </span>
                          )}
                          {memberRole === 'moderator' && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20">
                              Mod
                            </span>
                          )}

                          {isGroupAdmin && member.id !== currentUser?.id && (
                            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                              {memberRole !== 'moderator' && memberRole !== 'admin' && (
                                <button
                                  type="button"
                                  onClick={() => handleChangeMemberRole(member.id, 'moderator')}
                                  className="p-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-400 hover:text-indigo-500 transition-colors"
                                  title="Promote to Moderator"
                                >
                                  <Shield className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {memberRole === 'moderator' && (
                                <button
                                  type="button"
                                  onClick={() => handleChangeMemberRole(member.id, 'member')}
                                  className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-rose-500 transition-colors"
                                  title="Dismiss Moderator"
                                >
                                  <UserMinus className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveMember(member.id, member.full_name || member.name)}
                                className="p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500 transition-colors"
                                title="Remove from Group"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* =====================================================================
              4. ADMINISTRATORS & MODERATORS SUB-SCREEN
          ===================================================================== */}
          {currentScreen === 'admins' && (
            <div className="p-4 space-y-4">
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300">
                <span className="font-bold">Role Hierarchy:</span> Group Administrators hold full oversight including permissions, invitation links and member management. Moderators assist in monitoring chat content, pinning messages and managing announcements.
              </div>

              <div className="rounded-3xl bg-slate-50 dark:bg-[#182533] border border-slate-200/80 dark:border-white/10 divide-y divide-slate-100 dark:divide-white/5 overflow-hidden">
                {tutorList
                  .filter(m => m.role === 'admin' || m.role === 'super_admin' || groupMembers.some(gm => gm.user_id === m.id && (gm.role === 'admin' || gm.role === 'moderator')))
                  .map(leader => (
                    <div key={leader.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#142B4A] text-[#C6A45A] font-bold text-xs flex items-center justify-center shrink-0">
                          {(leader.full_name || leader.name || 'FN').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                            {leader.full_name || leader.name}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {leader.role === 'admin' || leader.role === 'super_admin' ? 'National System Admin' : 'Appointed Moderator'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-bold">
                        {leader.role === 'admin' || leader.role === 'super_admin' ? 'Admin' : 'Moderator'}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* =====================================================================
              5. GROUP PERMISSIONS SUB-SCREEN
          ===================================================================== */}
          {currentScreen === 'permissions' && (
            <div className="p-4 space-y-4">
              <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-300">
                Configure what actions regular members can perform in this fellowship group.
              </div>

              <div className="rounded-3xl bg-slate-50 dark:bg-[#182533] border border-slate-200/80 dark:border-white/10 divide-y divide-slate-100 dark:divide-white/5 overflow-hidden">
                {[
                  { key: 'send_messages', title: 'Send text messages', desc: 'Allow members to chat' },
                  { key: 'send_media', title: 'Send photos and videos', desc: 'Allow media attachments' },
                  { key: 'send_docs', title: 'Send documents and files', desc: 'Allow PDF and file uploads' },
                  { key: 'send_links', title: 'Share web links', desc: 'Allow links and previews' },
                  { key: 'add_members', title: 'Add other members', desc: 'Allow adding fellowship peers' },
                  { key: 'pin_messages', title: 'Pin messages to top', desc: 'Allow pinning important notes' },
                  { key: 'start_calls', title: 'Start group voice / video calls', desc: 'Allow initiating calls' },
                ].map(item => {
                  const currentValue = (permissions as any)[item.key] || 'all';
                  return (
                    <div key={item.key} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-white">{item.title}</p>
                        <p className="text-[10px] text-slate-400">{item.desc}</p>
                      </div>
                      <select
                        value={currentValue}
                        onChange={e =>
                          setPermissions(p => ({
                            ...p,
                            [item.key]: e.target.value as any,
                          }))
                        }
                        className="px-2.5 py-1 rounded-xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-white focus:outline-none"
                      >
                        <option value="all">Everyone</option>
                        <option value="admins">Admins Only</option>
                        {item.key === 'pin_messages' && <option value="admins_mods">Admins & Mods</option>}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* =====================================================================
              6. MESSAGE SETTINGS SUB-SCREEN
          ===================================================================== */}
          {currentScreen === 'messages_settings' && (
            <div className="p-4 space-y-4">
              {/* Announcement Mode Toggle */}
              <div className="p-4 rounded-3xl bg-slate-50 dark:bg-[#182533] border border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Announcement-Only Mode</h4>
                  <p className="text-[10px] text-slate-400">Only administrators and moderators can send messages</p>
                </div>
                <input
                  type="checkbox"
                  checked={announcementMode}
                  onChange={e => {
                    if (isGroupAdmin) setAnnouncementMode(e.target.checked);
                    else alert('Only administrators can toggle announcement mode.');
                  }}
                  className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </div>

              {/* Disappearing Messages */}
              <div className="p-4 rounded-3xl bg-slate-50 dark:bg-[#182533] border border-slate-200/80 dark:border-white/10 space-y-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Disappearing Messages / Retention</h4>
                <p className="text-[10px] text-slate-400">Automatically prune older fellowship chatter to conserve storage</p>
                <div className="grid grid-cols-4 gap-2 pt-2">
                  {['off', '24h', '7d', '90d'].map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => isGroupAdmin && setDisappearingDuration(d)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        disappearingDuration === d
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-black/20 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10'
                      }`}
                    >
                      {d === 'off' ? 'Off' : d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* =====================================================================
              7. INVITE LINK SUB-SCREEN
          ===================================================================== */}
          {currentScreen === 'invite_link' && (
            <div className="p-4 space-y-4">
              <div className="p-5 rounded-3xl bg-slate-50 dark:bg-[#182533] border border-slate-200/80 dark:border-white/10 space-y-3">
                <span className="text-xs font-bold text-slate-800 dark:text-white block">Group Invitation Link</span>
                <div className="p-3 rounded-2xl bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 flex items-center justify-between gap-2">
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-mono truncate">
                    {fullInviteUrl}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyInviteLink}
                    className="p-1.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors shrink-0 cursor-pointer"
                    title="Copy invite link"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleCopyInviteLink}
                    className="flex-1 py-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedLink ? 'Copied to Clipboard!' : 'Copy Link'}</span>
                  </button>
                  {isGroupAdmin && (
                    <button
                      type="button"
                      onClick={handleRevokeInviteLink}
                      className="px-3 py-2 rounded-2xl bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-white/20 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                      title="Revoke & generate new link"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Revoke</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Admin Approval Toggle */}
              <div className="p-4 rounded-3xl bg-slate-50 dark:bg-[#182533] border border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Admin Approval Required</h4>
                  <p className="text-[10px] text-slate-400">An administrator must approve join requests from invite links</p>
                </div>
                <input
                  type="checkbox"
                  checked={requireApproval}
                  onChange={e => {
                    if (isGroupAdmin) setRequireApproval(e.target.checked);
                    else alert('Only administrators can configure approval settings.');
                  }}
                  className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* =====================================================================
              8. NOTIFICATIONS SUB-SCREEN
          ===================================================================== */}
          {currentScreen === 'notifications' && (
            <div className="p-4 space-y-4">
              <div className="rounded-3xl bg-slate-50 dark:bg-[#182533] border border-slate-200/80 dark:border-white/10 divide-y divide-slate-100 dark:divide-white/5 overflow-hidden">
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Mute Notifications</h4>
                    <p className="text-[10px] text-slate-400">
                      {userPrefs.isMuted
                        ? userPrefs.mutedUntil
                          ? `Muted until ${new Date(userPrefs.mutedUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                          : 'Muted indefinitely'
                        : 'Currently receiving all group alerts'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMuteDurationSheet(true)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer ${
                      userPrefs.isMuted
                        ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 border border-rose-200 dark:border-rose-900'
                        : 'bg-blue-600 text-white'
                    }`}
                  >
                    {userPrefs.isMuted ? 'Muted' : 'Unmuted'}
                  </button>
                </div>

                <div className="p-4 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Notify on @Mentions</h4>
                    <p className="text-[10px] text-slate-400">Always notify me when my name is mentioned in this group</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={userPrefs.notifyMentions}
                    onChange={e => {
                      const next = { ...userPrefs, notifyMentions: e.target.checked };
                      setUserPrefs(next);
                      MessagingService.saveUserGroupPreferences(next);
                    }}
                    className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </div>

                <div className="p-4 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Announcement Alerts</h4>
                    <p className="text-[10px] text-slate-400">Receive high-priority sound alerts for official directives</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={userPrefs.notifyAnnouncements}
                    onChange={e => {
                      const next = { ...userPrefs, notifyAnnouncements: e.target.checked };
                      setUserPrefs(next);
                      MessagingService.saveUserGroupPreferences(next);
                    }}
                    className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* =====================================================================
              9. FNI CELL FELLOWSHIP SETTINGS SUB-SCREEN
          ===================================================================== */}
          {currentScreen === 'fni_settings' && (
            <div className="p-4 space-y-4">
              <div className="p-4 rounded-3xl bg-slate-50 dark:bg-[#182533] border border-slate-200/80 dark:border-white/10 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  <Calendar className="w-4 h-4" />
                  <span>Cell Meeting Schedule</span>
                </div>
                <input
                  type="text"
                  value={meetingSchedule}
                  onChange={e => setMeetingSchedule(e.target.value)}
                  disabled={!isGroupAdmin}
                  placeholder="e.g. Wednesday 6:30 PM • Sunday 5:00 PM GMT"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none"
                />

                <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 pt-2">
                  <MapPin className="w-4 h-4" />
                  <span>Cell Meeting Location</span>
                </div>
                <input
                  type="text"
                  value={meetingLocation}
                  onChange={e => setMeetingLocation(e.target.value)}
                  disabled={!isGroupAdmin}
                  placeholder="e.g. FNI Main Sanctuary & Online Fellowship Link"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none"
                />

                <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 pt-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Ministry Oversight Contact</span>
                </div>
                <input
                  type="text"
                  value={oversightContact}
                  onChange={e => setOversightContact(e.target.value)}
                  disabled={!isGroupAdmin}
                  placeholder="e.g. FNI Leadership Directorate"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* =====================================================================
              10. SHARED MEDIA, LINKS & DOCS SUB-SCREEN
          ===================================================================== */}
          {currentScreen === 'shared_media' && (
            <div className="p-4 space-y-4">
              {/* Media Sub-tabs */}
              <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-black/25">
                {[
                  { id: 'media', label: `Media (${sharedMediaItems.media.length})`, icon: ImageIcon },
                  { id: 'docs', label: `Docs (${sharedMediaItems.docs.length})`, icon: FileText },
                  { id: 'links', label: `Links (${sharedMediaItems.links.length})`, icon: ExternalLink },
                  { id: 'audio', label: `Voice (${sharedMediaItems.audio.length})`, icon: Mic },
                ].map(t => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActiveMediaTab(t.id as any)}
                      className={`flex flex-col items-center justify-center gap-1 py-2 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                        activeMediaTab === t.id
                          ? 'bg-white dark:bg-[#182533] text-blue-600 dark:text-blue-400 shadow-xs'
                          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="truncate">{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Media Grid */}
              {activeMediaTab === 'media' && (
                <div className="grid grid-cols-3 gap-2">
                  {sharedMediaItems.media.map((m, idx) => (
                    <div key={idx} className="aspect-square rounded-2xl overflow-hidden bg-black/10 border border-slate-200 dark:border-white/10 group relative">
                      <img src={m.url} alt={m.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <span className="absolute bottom-1 right-1 text-[9px] px-1.5 py-0.2 rounded bg-black/50 text-white font-mono">
                        {m.date}
                      </span>
                    </div>
                  ))}
                  {sharedMediaItems.media.length === 0 && (
                    <div className="col-span-3 text-center py-10 text-slate-400 text-xs">
                      No photos or videos shared in this fellowship chat yet.
                    </div>
                  )}
                </div>
              )}

              {/* Docs List */}
              {activeMediaTab === 'docs' && (
                <div className="rounded-3xl bg-slate-50 dark:bg-[#182533] border border-slate-200/80 dark:border-white/10 divide-y divide-slate-100 dark:divide-white/5 overflow-hidden">
                  {sharedMediaItems.docs.map((doc, idx) => (
                    <a
                      key={idx}
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3.5 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-slate-800 dark:text-white truncate">{doc.name}</p>
                          <p className="text-[10px] text-slate-400">{doc.date}</p>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-slate-400" />
                    </a>
                  ))}
                  {sharedMediaItems.docs.length === 0 && (
                    <div className="text-center py-10 text-slate-400 text-xs">
                      No documents shared in this conversation yet.
                    </div>
                  )}
                </div>
              )}

              {/* Links List */}
              {activeMediaTab === 'links' && (
                <div className="rounded-3xl bg-slate-50 dark:bg-[#182533] border border-slate-200/80 dark:border-white/10 divide-y divide-slate-100 dark:divide-white/5 overflow-hidden">
                  {sharedMediaItems.links.map((link, idx) => (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3.5 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center shrink-0">
                          <ExternalLink className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-blue-600 dark:text-blue-400 truncate">{link.url}</p>
                          <p className="text-[10px] text-slate-400">{link.date}</p>
                        </div>
                      </div>
                    </a>
                  ))}
                  {sharedMediaItems.links.length === 0 && (
                    <div className="text-center py-10 text-slate-400 text-xs">
                      No web links shared in this conversation yet.
                    </div>
                  )}
                </div>
              )}

              {/* Voice / Audio List */}
              {activeMediaTab === 'audio' && (
                <div className="rounded-3xl bg-slate-50 dark:bg-[#182533] border border-slate-200/80 dark:border-white/10 divide-y divide-slate-100 dark:divide-white/5 overflow-hidden">
                  {sharedMediaItems.audio.map((aud, idx) => (
                    <div key={idx} className="p-3.5 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={() => handlePlaySharedAudio(aud.url)}
                          className="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                        >
                          {activeAudioPlaying === aud.url ? (
                            <Pause className="w-4 h-4 fill-current" />
                          ) : (
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          )}
                        </button>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-slate-800 dark:text-white truncate">
                            Voice note from {aud.sender}
                          </p>
                          <p className="text-[10px] text-slate-400">Duration {aud.duration} • {aud.date}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {sharedMediaItems.audio.length === 0 && (
                    <div className="text-center py-10 text-slate-400 text-xs">
                      No voice notes in this conversation yet.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* =========================================================================
            MUTE DURATION BOTTOM SHEET
        ========================================================================= */}
        {showMuteDurationSheet && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
            <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#182533] border border-slate-200 dark:border-white/10 p-5 shadow-2xl space-y-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white text-center">
                Mute Notifications
              </h3>
              <p className="text-xs text-slate-400 text-center">
                Other fellowship members will not know you muted this conversation.
              </p>

              <div className="space-y-1.5 pt-2">
                <button
                  type="button"
                  onClick={() => handleSetMute('8h')}
                  className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-bold text-slate-800 dark:text-white text-left cursor-pointer transition-colors"
                >
                  8 Hours
                </button>
                <button
                  type="button"
                  onClick={() => handleSetMute('1w')}
                  className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-bold text-slate-800 dark:text-white text-left cursor-pointer transition-colors"
                >
                  1 Week
                </button>
                <button
                  type="button"
                  onClick={() => handleSetMute('always')}
                  className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-bold text-slate-800 dark:text-white text-left cursor-pointer transition-colors"
                >
                  Always (Until turned back on)
                </button>
                {userPrefs.isMuted && (
                  <button
                    type="button"
                    onClick={() => handleSetMute('unmute')}
                    className="w-full py-2.5 px-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-bold text-left cursor-pointer transition-colors"
                  >
                    Unmute Notifications
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowMuteDurationSheet(false)}
                className="w-full py-2 text-center text-xs text-slate-400 hover:text-white pt-2 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            ADD MEMBER MODAL
        ========================================================================= */}
        {showAddMemberModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
            <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#182533] border border-slate-200 dark:border-white/10 p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/10">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Add Fellowship Tutor</h3>
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Select Tutor</label>
                <select
                  value={selectedMemberToAdd}
                  onChange={e => setSelectedMemberToAdd(e.target.value)}
                  className="w-full px-3 py-2 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="">-- Choose registered tutor --</option>
                  {tutorList
                    .filter(t => !groupMembers.some(gm => gm.user_id === t.id))
                    .map(t => (
                      <option key={t.id} value={t.id}>
                        {t.full_name || t.name} ({t.cell_name || 'Tutor'})
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!selectedMemberToAdd}
                  onClick={() => handleAddMember(selectedMemberToAdd)}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  Add Member
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            CONFIRM EXIT MODAL
        ========================================================================= */}
        {showExitConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
            <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#182533] border border-slate-200 dark:border-white/10 p-5 shadow-2xl space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Exit Fellowship Group?</h3>
                <p className="text-xs text-slate-400">
                  You will no longer receive announcements, calls, or fellowship notifications from this group.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 py-2 rounded-2xl bg-slate-100 dark:bg-white/10 font-bold text-xs text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExitGroup}
                  className="flex-1 py-2 rounded-2xl bg-rose-600 hover:bg-rose-700 font-bold text-xs text-white"
                >
                  Exit Group
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            CONFIRM DELETE GROUP MODAL
        ========================================================================= */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
            <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#182533] border border-rose-500/30 p-5 shadow-2xl space-y-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="font-bold text-base text-rose-600 dark:text-rose-400">Delete Group Permanently</h3>
                <p className="text-xs text-slate-400">
                  This action CANNOT be undone. All group metadata, attachments, and settings will be permanently removed.
                </p>
              </div>
              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-bold text-slate-400 block">
                  Type <span className="text-white select-all">{groupName}</span> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmationText}
                  onChange={e => setDeleteConfirmationText(e.target.value)}
                  placeholder={groupName}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2 rounded-2xl bg-slate-100 dark:bg-white/10 font-bold text-xs text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteConfirmationText.trim().toLowerCase() !== groupName.trim().toLowerCase()}
                  onClick={handleDeleteGroup}
                  className="flex-1 py-2 rounded-2xl bg-rose-600 hover:bg-rose-700 font-bold text-xs text-white disabled:opacity-40"
                >
                  Delete Group
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
