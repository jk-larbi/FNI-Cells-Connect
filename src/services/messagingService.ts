import { SupabaseService } from './supabaseService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  PrivateMessage,
  CommunityMessage,
  InvitationCode,
  UserRole,
  MessageReply,
  ChatAttachment,
  UserPinnedChat,
  MessageReactionParticipant,
  CommunityGroup,
  CommunityGroupMember,
  OfficialGroupHistoryRecord,
  UserGroupPreferences,
  CustomSticker,
} from '../types';
import { AuthService } from './authService';
import { CellService } from './cellService';

const STORAGE_KEYS = {
  PRIVATE: 'fni_private_messages_v1',
  COMMUNITY: 'fni_community_messages_v1',
  INVITES: 'fni_invitation_codes_v1',
  COMMUNITY_ACCESS: 'fni_community_authorized_users_v1',
  CUSTOM_STICKERS: 'fni_user_custom_stickers_v1',
  FAVORITE_STICKERS: 'fni_user_fav_stickers_v1',
  RECENT_STICKERS: 'fni_user_recent_stickers_v1',
  GROUP_PREFS: 'fni_user_group_prefs_v1',
};

function getStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function setStored<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.warn('Failed saving to localStorage', e);
  }
}

export class MessagingService {
  static async getMemberDirectory() {
    return SupabaseService.getMemberDirectory();
  }

  static async uploadChatAttachment(userUid: string, file: File): Promise<ChatAttachment> {
    return SupabaseService.uploadChatAttachment(userUid, file);
  }

  static async getChatAttachmentUrl(path: string): Promise<string | null> {
    return SupabaseService.getChatAttachmentUrl(path);
  }

  static getDeletedForSelfIds(userId: string): Set<string> {
    if (!userId) return new Set();
    const stored = getStored<string[]>(`fni_deleted_for_self_${userId}`, []);
    return new Set(stored);
  }

  static async deleteMessageForSelf(userId: string, messageId: string, scope: 'private' | 'community'): Promise<boolean> {
    if (!userId || !messageId) return false;
    // 1. Persist in local storage immediately
    const existing = this.getDeletedForSelfIds(userId);
    existing.add(messageId);
    setStored(`fni_deleted_for_self_${userId}`, Array.from(existing));

    // 2. Persist in Supabase hidden table
    if (scope === 'private') {
      await SupabaseService.hidePrivateMessageForUser(userId, messageId);
    } else {
      await SupabaseService.hideCommunityMessageForUser(userId, messageId);
    }
    return true;
  }

  static async deleteMessageForEveryone(messageId: string, scope: 'private' | 'community'): Promise<boolean> {
    const success = await SupabaseService.deleteMessageForEveryone(messageId, scope);
    // Also prune from local cache
    if (scope === 'private') {
      const msgs = getStored<PrivateMessage[]>(STORAGE_KEYS.PRIVATE, []);
      setStored(STORAGE_KEYS.PRIVATE, msgs.filter(m => m.id !== messageId));
    } else {
      const msgs = getStored<CommunityMessage[]>(STORAGE_KEYS.COMMUNITY, []);
      setStored(STORAGE_KEYS.COMMUNITY, msgs.filter(m => m.id !== messageId));
    }
    return success;
  }

  static async editMessage(messageId: string, scope: 'private' | 'community', content: string): Promise<boolean> {
    if (!content.trim()) return false;
    if (supabase && isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.rpc('fni_edit_chat_message', {
          p_message_id: messageId, p_scope: scope, p_content: content.trim(),
        });
        if (!error && data === true) return true;
      } catch {}

      try {
        const table = scope === 'private' ? 'private_messages' : 'community_messages';
        const { error: directError } = await supabase
          .from(table)
          .update({ content: content.trim(), edited_at: new Date().toISOString() })
          .eq('id', messageId);
        if (!directError) return true;
      } catch {}
    }
    // Update local storage fallback
    const key = scope === 'private' ? STORAGE_KEYS.PRIVATE : STORAGE_KEYS.COMMUNITY;
    const local = getStored<any[]>(key, []);
    const idx = local.findIndex(m => m.id === messageId);
    if (idx !== -1) {
      local[idx].content = content.trim();
      local[idx].editedAt = new Date().toISOString();
      setStored(key, local);
      return true;
    }
    return false;
  }

  static async votePoll(
    messageId: string,
    scope: 'private' | 'community',
    optionId: string,
    userId: string,
    currentContent: string
  ): Promise<string | null> {
    const POLL_PREFIX = '[[FNI_POLL:';
    if (!currentContent.startsWith(POLL_PREFIX)) return null;
    try {
      const jsonStr = currentContent.slice(POLL_PREFIX.length, -2);
      const poll: any = JSON.parse(jsonStr);
      if (poll.isClosed) return null;

      let changed = false;
      const updatedOptions = (poll.options || []).map((opt: any) => {
        const voters = new Set(opt.voterUids || []);
        if (opt.id === optionId) {
          if (voters.has(userId)) {
            voters.delete(userId);
            changed = true;
          } else {
            voters.add(userId);
            changed = true;
          }
        } else if (!poll.allowsMultipleAnswers) {
          if (voters.has(userId)) {
            voters.delete(userId);
            changed = true;
          }
        }
        return {
          ...opt,
          votes: voters.size,
          voterUids: Array.from(voters),
        };
      });

      if (!changed) return null;

      const totalVotes = updatedOptions.reduce((acc: number, opt: any) => acc + opt.votes, 0);
      const updatedPoll = {
        ...poll,
        options: updatedOptions,
        totalVotes,
      };

      const newContent = `${POLL_PREFIX}${JSON.stringify(updatedPoll)}]]`;
      await this.editMessage(messageId, scope, newContent);
      return newContent;
    } catch (e) {
      console.warn('Poll voting exception:', e);
      return null;
    }
  }

  static async clearAllPrivateChats(viewerUid: string): Promise<boolean> {
    return SupabaseService.savePrivateChatPreference(viewerUid, '*', { clearedAt: new Date().toISOString(), deletedAt: null });
  }

  static async clearCommunityHistory(viewerUid: string): Promise<boolean> {
    if (!supabase || !isSupabaseConfigured) return false;
    const { error } = await supabase.from('community_chat_preferences').upsert(
      { user_id: viewerUid, cleared_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
    if (error) { console.warn('Community history clear failed:', error.message); return false; }
    return true;
  }

  static async hideCommunityMessageForUser(viewerUid: string, messageId: string): Promise<boolean> {
    if (!supabase || !isSupabaseConfigured) return false;
    const { error } = await supabase.from('community_message_hidden_for_user')
      .upsert({ user_id: viewerUid, message_id: messageId }, { onConflict: 'user_id,message_id' });
    if (error) { console.warn('Community message hide failed:', error.message); return false; }
    return true;
  }

  // =========================================================================
  // 1. PRIVATE TUTOR-ADMIN MESSAGING
  // =========================================================================

  static async sendPrivateMessage(data: {
    senderUid: string;
    senderName: string;
    senderRole: UserRole;
    recipientUid: string;
    recipientName: string;
    cellId?: string;
    cellName?: string;
    content: string;
    replyTo?: MessageReply;
    mentions?: string[];
    attachments?: ChatAttachment[];
  }): Promise<PrivateMessage> {
    if (data.recipientUid === 'admin' && data.senderRole !== 'tutor') {
      throw new Error('Only tutors can send to the shared FNI Leadership inbox.');
    }
    if (data.recipientUid !== 'admin') {
      const directory = await SupabaseService.getMemberDirectory();
      const recipient = directory?.find(member => member.id === data.recipientUid);
      const allowedRoles = ['tutor', 'cell_leader', 'admin', 'super_admin', 'national_admin'];
      if (!recipient || !allowedRoles.includes(recipient.role)) {
        throw new Error('This member account is no longer active. Refresh the member list and select an active member.');
      }
    }

    const id = `pmsg-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const nowIso = new Date().toISOString();

    const msg: PrivateMessage = {
      id,
      senderUid: data.senderUid,
      senderName: data.senderName,
      senderRole: data.senderRole,
      recipientUid: data.recipientUid,
      recipientName: data.recipientName,
      cellId: data.cellId,
      cellName: data.cellName,
      content: data.content.trim(),
      createdAt: nowIso,
      isRead: false,
      replyTo: data.replyTo,
      mentions: data.mentions || [],
      attachments: data.attachments || [],
    };

    // A message is only considered sent after the authoritative Supabase write succeeds.
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Messaging is temporarily unavailable. Please reconnect and try again.');
    }
    const saved = await SupabaseService.sendPrivateMessage(msg);
    if (!saved) {
      throw new Error('Your message could not be delivered. Please try again.');
    }

    const all = getStored<PrivateMessage[]>(STORAGE_KEYS.PRIVATE, []);
    all.push(msg);
    setStored(STORAGE_KEYS.PRIVATE, all);

    // Real-time notification dispatch
    try {
      const { NotificationService } = await import('./notificationService');
      await NotificationService.notifyPrivateMessage({
        messageId: msg.id,
        senderUid: msg.senderUid,
        senderName: msg.senderName,
        senderRole: msg.senderRole,
        recipientUid: msg.recipientUid,
        cellName: msg.cellName,
        content: msg.content,
      });

      // Reply notification
      if (data.replyTo?.senderUid && data.replyTo.senderUid !== data.senderUid) {
        await NotificationService.notifyMessageReply({
          messageId: msg.id,
          senderUid: msg.senderUid,
          senderName: msg.senderName,
          recipientUid: data.replyTo.senderUid,
          content: msg.content,
          conversationTitle: 'Private Chat',
        });
      }

      // Mention notifications
      if (data.mentions && data.mentions.length > 0) {
        for (const mentionUid of data.mentions) {
          if (mentionUid !== data.senderUid) {
            await NotificationService.notifyMention({
              messageId: msg.id,
              senderUid: msg.senderUid,
              senderName: msg.senderName,
              recipientUid: mentionUid,
              content: msg.content,
              conversationTitle: 'Private Chat',
            });
          }
        }
      }
    } catch (e) {
      console.warn('Private message notification dispatch notice:', e);
    }

    return msg;
  }

  static async getPrivateConversation(tutorUid: string, viewerUid: string, conversationId: string, isAdmin = false): Promise<PrivateMessage[]> {
    try {
      const [supaMsgs, preference, hiddenIds, allChatsPreference] = await Promise.all([
        SupabaseService.getPrivateMessages(isAdmin ? '' : tutorUid, viewerUid),
        SupabaseService.getPrivateChatPreference(viewerUid, conversationId),
        SupabaseService.getHiddenPrivateMessageIds(viewerUid),
        SupabaseService.getPrivateChatPreference(viewerUid, '*'),
      ]);
      if (supaMsgs === null) {
        throw new Error('The private conversation could not be loaded. Check your connection and try again.');
      }
      setStored(STORAGE_KEYS.PRIVATE, supaMsgs);

      // Chat history must not disappear when a member changes cell or a cell is
      // archived. A direct conversation is scoped by its two participant IDs,
      // while RLS remains the authoritative privacy boundary.
      const hidden = new Set(hiddenIds || []);
      const cutoffs = [preference?.clearedAt, preference?.deletedAt, allChatsPreference?.clearedAt]
        .filter((value): value is string => Boolean(value))
        .map(value => new Date(value).getTime())
        .filter(Number.isFinite);
      const cutoff = cutoffs.length ? Math.max(...cutoffs) : 0;
      const isLeadershipRole = (role: UserRole) => ['admin', 'super_admin', 'national_admin'].includes(role);
      const belongsToConversation = (message: PrivateMessage) => {
        if (isAdmin) {
          return (
            (message.senderUid === tutorUid &&
              (message.recipientUid === 'admin' || message.recipientUid === viewerUid)) ||
            (message.senderUid === viewerUid && message.recipientUid === tutorUid)
          );
        }
        if (conversationId === 'admin') {
          return (
            (message.senderUid === viewerUid && message.recipientUid === 'admin') ||
            (message.recipientUid === viewerUid && isLeadershipRole(message.senderRole))
          );
        }
        return (message.senderUid === viewerUid && message.recipientUid === conversationId) ||
          (message.senderUid === conversationId && message.recipientUid === viewerUid);
      };

      const deletedForSelf = this.getDeletedForSelfIds(viewerUid);
      const visible = supaMsgs.filter(message =>
        belongsToConversation(message) &&
        !message.deletedForEveryoneAt &&
        !hidden.has(message.id) &&
        !deletedForSelf.has(message.id) &&
        new Date(message.createdAt).getTime() > cutoff
      );
      return visible.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } catch (error) {
      console.warn('Private conversation load failed:', error);
      throw error;
    }
  }

  static async reactToPrivateMessage(
    messageId: string,
    emoji: string,
    userId: string,
    userName: string
  ): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Reactions are temporarily unavailable. Please reconnect and try again.');
    }
    const saved = await SupabaseService.togglePrivateMessageReaction(messageId, userId, userName, emoji);
    if (!saved) throw new Error('Your reaction could not be saved. Please try again.');
    return true;
  }

  static async setPrivateMessagePin(
    messageId: string,
    userId: string,
    pinned: boolean,
    notifyMembers = false,
    pinnerDetails?: { uid: string; name: string; content?: string; recipientUid?: string }
  ): Promise<{ success: boolean; error?: string }> {
    const res = await SupabaseService.setPrivateMessagePin(messageId, userId, pinned);
    if (res.success && pinned && notifyMembers && pinnerDetails?.recipientUid) {
      try {
        const { NotificationService } = await import('./notificationService');
        await NotificationService.notifyPinnedMessage({
          messageId,
          pinnerUid: pinnerDetails.uid,
          pinnerName: pinnerDetails.name,
          content: pinnerDetails.content || 'Pinned message',
          conversationTitle: 'Private Chat',
          targetUserId: pinnerDetails.recipientUid,
        });
      } catch (err) {
        console.warn('Pinned notification dispatch notice:', err);
      }
    }
    return res;
  }

  static async clearPrivateConversation(viewerUid: string, conversationId: string): Promise<boolean> {
    return SupabaseService.savePrivateChatPreference(viewerUid, conversationId, {
      clearedAt: new Date().toISOString(),
      deletedAt: null,
    });
  }

  static async deletePrivateConversation(viewerUid: string, conversationId: string): Promise<boolean> {
    return SupabaseService.savePrivateChatPreference(viewerUid, conversationId, {
      deletedAt: new Date().toISOString(),
    });
  }

  static async hidePrivateMessageForUser(viewerUid: string, messageId: string): Promise<boolean> {
    return SupabaseService.hidePrivateMessageForUser(viewerUid, messageId);
  }

  static async getAdminConversations(): Promise<
    Array<{ tutorUid: string; tutorName: string; cellName?: string; lastMessage: string; lastTimestamp: string; unreadCount: number }>
  > {
    let all = getStored<PrivateMessage[]>(STORAGE_KEYS.PRIVATE, []);

    try {
      // Refresh messages from Supabase if possible
      const supaMsgs = await SupabaseService.getPrivateMessages('', AuthService.getCurrentProfile()?.id || '');
      if (supaMsgs !== null) {
        all = supaMsgs;
        setStored(STORAGE_KEYS.PRIVATE, all);
      }
    } catch (e) {
      // Local fallback
    }

    const [directory, activeCells] = await Promise.all([
      SupabaseService.getMemberDirectory(),
      CellService.getActiveCells(),
    ]);
    const allowedMemberIds = new Set((directory || AuthService.getAllProfiles().filter(profile => profile.is_active).map(profile => ({ id: profile.id }))).map(member => member.id));
    const currentProfile = AuthService.getCurrentProfile();
    if (currentProfile?.id) allowedMemberIds.add(currentProfile.id);
    const activeCellIds = new Set(activeCells.flatMap(cell => [cell.id, cell.firebase_id].filter((id): id is string => Boolean(id))));
    all = all.filter(msg => {
      const senderAllowed = allowedMemberIds.has(msg.senderUid);
      const recipientAllowed = msg.recipientUid === 'admin' || allowedMemberIds.has(msg.recipientUid);
      return senderAllowed && recipientAllowed && (!msg.cellId || activeCellIds.has(msg.cellId));
    });

    const groups = new Map<string, PrivateMessage[]>();

    for (const msg of all) {
      const tutorUid = (msg.senderRole === 'admin' || msg.senderRole === 'super_admin' || msg.senderRole === 'national_admin')
        ? (msg.recipientUid === 'admin' ? msg.senderUid : msg.recipientUid)
        : msg.senderUid;
      if (!groups.has(tutorUid)) groups.set(tutorUid, []);
      groups.get(tutorUid)!.push(msg);
    }

    const summaries = [];
    for (const [tutorUid, messages] of groups.entries()) {
      messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const last = messages[messages.length - 1];
      const isLeadershipRole = (role: UserRole) => ['admin', 'super_admin', 'national_admin'].includes(role);
      const unreadCount = messages.filter(m => !isLeadershipRole(m.senderRole) && !m.isRead).length;
      const tutorName = !isLeadershipRole(last.senderRole) ? last.senderName : last.recipientName;
      summaries.push({
        tutorUid,
        tutorName,
        cellName: last.cellName,
        lastMessage: last.content,
        lastTimestamp: last.createdAt,
        unreadCount,
      });
    }

    return summaries.sort((a, b) => new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime());
  }

  static async markPrivateMessagesRead(tutorUid: string, readerUid: string, conversationId = 'admin', isAdmin = false): Promise<void> {
    const all = getStored<PrivateMessage[]>(STORAGE_KEYS.PRIVATE, []);
    const readAt = new Date().toISOString();
    const readIds: string[] = [];
    const isLeadershipRole = (role: UserRole) => ['admin', 'super_admin', 'national_admin'].includes(role);
    const belongsToConversation = (message: PrivateMessage) => {
      if (isAdmin) {
        return (
          (message.senderUid === tutorUid &&
            (message.recipientUid === 'admin' || message.recipientUid === readerUid)) ||
          (message.senderUid === readerUid && message.recipientUid === tutorUid)
        );
      }
      if (conversationId === 'admin') {
        return (
          (message.senderUid === tutorUid && message.recipientUid === 'admin') ||
          (message.recipientUid === tutorUid && isLeadershipRole(message.senderRole))
        );
      }
      return (message.senderUid === tutorUid && message.recipientUid === conversationId) ||
        (message.senderUid === conversationId && message.recipientUid === tutorUid);
    };

    const updated = all.map(message => {
      if (belongsToConversation(message) && message.senderUid !== readerUid && !message.isRead) {
        readIds.push(message.id);
        return { ...message, isRead: true, readAt };
      }
      return message;
    });

    if (readIds.length > 0) {
      setStored(STORAGE_KEYS.PRIVATE, updated);
      if (supabase) {
        const results = await Promise.all(
          readIds.map(id => supabase!.from('private_messages').update({ is_read: true, read_at: readAt }).eq('id', id))
        );
        results.forEach(({ error }) => {
          if (error) console.warn('Private message read receipt could not sync:', error.message);
        });
      }
    }
  }

  // =========================================================================
  // 2. TUTOR COMMUNITY
  // =========================================================================

  static async sendCommunityMessage(data: {
    senderUid: string;
    senderName: string;
    senderRole: UserRole;
    cellName?: string;
    content: string;
    category?: 'general' | 'announcement' | 'prayer_request' | 'testimony';
    replyTo?: MessageReply;
    mentions?: string[];
    groupId?: string;
    attachments?: ChatAttachment[];
  }): Promise<CommunityMessage> {
    const id = `cmsg-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const nowIso = new Date().toISOString();

    const msg: CommunityMessage = {
      id,
      senderUid: data.senderUid,
      senderName: data.senderName,
      senderRole: data.senderRole,
      cellName: data.cellName,
      content: data.content.trim(),
      category: data.category || 'general',
      createdAt: nowIso,
      replyTo: data.replyTo,
      mentions: data.mentions || [],
      reactions: {},
      attachments: data.attachments || [],
      groupId: data.groupId,
    };

    // A community post is only considered sent after the authoritative Supabase write succeeds.
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Community chat is temporarily unavailable. Please reconnect and try again.');
    }
    const saved = await SupabaseService.sendCommunityMessage(msg);
    if (!saved) {
      throw new Error('Your message could not be delivered. Please try again.');
    }

    const all = getStored<CommunityMessage[]>(STORAGE_KEYS.COMMUNITY, []);
    all.push(msg);
    setStored(STORAGE_KEYS.COMMUNITY, all);

    // Real-time notification dispatch to other tutors
    try {
      const { NotificationService } = await import('./notificationService');
      await NotificationService.notifyCommunityMessage({
        messageId: msg.id,
        senderUid: msg.senderUid,
        senderName: msg.senderName,
        cellName: msg.cellName,
        content: msg.content,
        category: msg.category,
      });

      if (data.replyTo?.senderUid && data.replyTo.senderUid !== data.senderUid) {
        await NotificationService.notifyMessageReply({
          messageId: msg.id,
          senderUid: msg.senderUid,
          senderName: msg.senderName,
          recipientUid: data.replyTo.senderUid,
          content: msg.content,
          conversationTitle: 'FNI Community',
        });
      }

      if (data.mentions && data.mentions.length > 0) {
        for (const mentionUid of data.mentions) {
          if (mentionUid !== data.senderUid) {
            await NotificationService.notifyMention({
              messageId: msg.id,
              senderUid: msg.senderUid,
              senderName: msg.senderName,
              recipientUid: mentionUid,
              content: msg.content,
              conversationTitle: 'FNI Community',
            });
          }
        }
      }

      if (msg.category === 'announcement' && msg.senderRole !== 'tutor') {
        const { EmailNotificationService } = await import('./emailNotificationService');
        await EmailNotificationService.announcementPublished(msg.id);
      }
    } catch (e) {
      console.warn('Community message notification dispatch notice:', e);
    }

    return msg;
  }

  static async setCommunityMessagePin(
    messageId: string,
    pinned: boolean,
    notifyMembers = false,
    pinnerDetails?: { uid: string; name: string; content?: string }
  ): Promise<{ success: boolean; error?: string }> {
    const res = await SupabaseService.setCommunityMessagePin(messageId, pinned, notifyMembers, pinnerDetails);
    if (res.success && pinned && notifyMembers && pinnerDetails) {
      try {
        const { NotificationService } = await import('./notificationService');
        await NotificationService.notifyPinnedMessage({
          messageId,
          pinnerUid: pinnerDetails.uid,
          pinnerName: pinnerDetails.name,
          content: pinnerDetails.content || 'Pinned message',
          conversationTitle: 'FNI Community',
        });
      } catch (err) {
        console.warn('Pinned notification dispatch notice:', err);
      }
    }
    return res;
  }

  static async getCommunityMessages(viewerUid?: string): Promise<CommunityMessage[]> {
    try {
      const [supaMsgs, directory, activeCells] = await Promise.all([
        SupabaseService.getCommunityMessages(),
        SupabaseService.getMemberDirectory(),
        CellService.getActiveCells(),
      ]);
      if (supaMsgs !== null) {
        const allowedMemberIds = new Set((directory || []).map(member => member.id));
        const currentProfile = AuthService.getCurrentProfile();
        if (currentProfile?.id) allowedMemberIds.add(currentProfile.id);
        const activeCellNames = new Set(activeCells.map(cell => cell.name.trim().toLowerCase()));
        const deletedForSelf = viewerUid ? this.getDeletedForSelfIds(viewerUid) : new Set<string>();
        const memberMap = new Map((directory || []).map(m => [m.id, m.full_name]));
        let visibleMessages = supaMsgs.map(msg => ({
          ...msg,
          pinnedByName: msg.pinnedByName || (msg.pinnedBy ? memberMap.get(msg.pinnedBy) : undefined),
        })).filter(message =>
          allowedMemberIds.has(message.senderUid) &&
          !message.deletedForEveryoneAt &&
          !deletedForSelf.has(message.id) &&
          (!message.cellName?.trim() || activeCellNames.has(message.cellName.trim().toLowerCase()))
        );
        if (viewerUid && supabase) {
          const [preferenceResult, hiddenResult] = await Promise.all([
            supabase.from('community_chat_preferences').select('cleared_at').eq('user_id', viewerUid).maybeSingle(),
            supabase.from('community_message_hidden_for_user').select('message_id').eq('user_id', viewerUid),
          ]);
          if (preferenceResult.error || hiddenResult.error) return [];
          const cutoff = preferenceResult.data?.cleared_at ? new Date(preferenceResult.data.cleared_at).getTime() : 0;
          const hiddenIds = new Set((hiddenResult.data || []).map(row => row.message_id));
          visibleMessages = visibleMessages.filter(message =>
            !message.deletedForEveryoneAt &&
            !deletedForSelf.has(message.id) &&
            (message.isPinned || (new Date(message.createdAt).getTime() > cutoff && !hiddenIds.has(message.id)))
          );
        }
        setStored(STORAGE_KEYS.COMMUNITY, visibleMessages);
        return visibleMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      }
    } catch (e) {
      console.warn('Notice querying Supabase community messages:', e);
    }

    // Never fall back to a shared local cache when personal visibility controls
    // could not be loaded; fail closed so cleared/hidden messages stay hidden.
    if (viewerUid) return [];

    const [activeCells, directory] = await Promise.all([
      CellService.getActiveCells(),
      SupabaseService.getMemberDirectory(),
    ]);
    const allowedMemberIds = new Set((directory || AuthService.getAllProfiles().filter(profile => profile.is_active).map(profile => ({ id: profile.id }))).map(member => member.id));
    const currentProfile = AuthService.getCurrentProfile();
    if (currentProfile?.id) allowedMemberIds.add(currentProfile.id);
    const activeCellNames = new Set(activeCells.map(cell => cell.name.trim().toLowerCase()));
    const all = getStored<CommunityMessage[]>(STORAGE_KEYS.COMMUNITY, []);
    return all
      .filter(message =>
        allowedMemberIds.has(message.senderUid) &&
        (!message.cellName?.trim() || activeCellNames.has(message.cellName.trim().toLowerCase()))
      )
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  // =========================================================================
  // 3. SECURE COMMUNITY INVITATION CODES
  // =========================================================================

  /**
   * Administrator creates an invitation code with configurable expiry in minutes.
   */
  static async generateInvitationCode(
    adminUid: string,
    adminName: string,
    expiryMinutes = 60,
    maxUses = 20
  ): Promise<InvitationCode> {
    const raw = Math.random().toString(36).substring(2, 8).toUpperCase();
    const code = `FNI-COMM-${raw}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiryMinutes * 60 * 1000).toISOString();
    const id = `inv-${Date.now()}`;

    const record: InvitationCode = {
      id,
      code,
      createdBy: adminUid,
      createdByName: adminName,
      createdAt: now.toISOString(),
      expiresAt,
      expiryMinutes,
      maxUses,
      usedCount: 0,
      isRevoked: false,
    };

    // Primary write to Supabase
    try {
      await SupabaseService.upsertInvitationCode(record);
    } catch (e) {
      console.warn('Supabase invite code save notice:', e);
    }

    const all = getStored<InvitationCode[]>(STORAGE_KEYS.INVITES, []);
    all.unshift(record);
    setStored(STORAGE_KEYS.INVITES, all);

    return record;
  }

  static async getInvitationCodes(): Promise<InvitationCode[]> {
    try {
      const supaCodes = await SupabaseService.getInvitationCodes();
      if (supaCodes && supaCodes.length > 0) {
        setStored(STORAGE_KEYS.INVITES, supaCodes);
        return supaCodes;
      }
    } catch (e) {
      console.warn('Notice querying Supabase invitation codes:', e);
    }

    return getStored<InvitationCode[]>(STORAGE_KEYS.INVITES, []);
  }

  /**
   * Validates and redeems an invitation code.
   * Expired codes must no longer work.
   */
  static async validateAndRedeemInvitationCode(
    codeAttempt: string,
    tutorUid: string
  ): Promise<{ valid: boolean; error?: string }> {
    const cleanCode = codeAttempt.trim().toUpperCase();
    if (!cleanCode || !isSupabaseConfigured || !supabase) {
      return { valid: false, error: 'Invitation verification is unavailable. Please try again.' };
    }

    // The server derives the user identity from the verified JWT; never trust the supplied UID.
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user || userData.user.id !== tutorUid) {
      return { valid: false, error: 'Please sign in again before redeeming an invitation code.' };
    }

    // Atomic server-side validation and use-count increment prevents code enumeration and race conditions.
    const { data: redeemed, error } = await supabase.rpc('redeem_invitation_code', {
      p_code: cleanCode,
    });
    if (error) {
      console.error('Invitation redemption failed:', error.message);
      return { valid: false, error: 'Could not verify the invitation code. Please try again.' };
    }
    if (redeemed !== true) {
      return { valid: false, error: 'Invalid, expired, revoked, or fully used invitation code.' };
    }

    const authorizedUsers = getStored<string[]>(STORAGE_KEYS.COMMUNITY_ACCESS, []);
    if (!authorizedUsers.includes(userData.user.id)) {
      authorizedUsers.push(userData.user.id);
      setStored(STORAGE_KEYS.COMMUNITY_ACCESS, authorizedUsers);
    }
    return { valid: true };
  }

  static async reactToCommunityMessage(
    messageId: string,
    emoji: string,
    userId: string,
    userName: string
  ): Promise<CommunityMessage | null> {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Reactions are temporarily unavailable. Please reconnect and try again.');
    }

    const saved = await SupabaseService.toggleCommunityMessageReaction(messageId, userId, userName, emoji);
    if (!saved) {
      throw new Error('Your reaction could not be saved. Please try again.');
    }

    const refreshed = await this.getCommunityMessages();
    setStored(STORAGE_KEYS.COMMUNITY, refreshed);
    return refreshed.find(message => message.id === messageId) || null;
  }

  static checkCommunityAccess(_tutorUid?: string, _userRole?: UserRole): boolean {
    // Open access for all authenticated fellowship tutors, leaders and users
    return true;
  }

  // --- Reaction Participants ---
  static async getMessageReactionParticipants(
    messageId: string,
    isCommunity: boolean
  ): Promise<MessageReactionParticipant[]> {
    return SupabaseService.getMessageReactionParticipants(messageId, isCommunity);
  }

  // --- User Pinned Chats ---
  static async getUserPinnedChats(userId: string): Promise<UserPinnedChat[]> {
    return SupabaseService.getUserPinnedChats(userId);
  }

  static async pinChat(userId: string, chatId: string, orderIndex?: number): Promise<boolean> {
    return SupabaseService.pinChat(userId, chatId, orderIndex);
  }

  static async unpinChat(userId: string, chatId: string): Promise<boolean> {
    return SupabaseService.unpinChat(userId, chatId);
  }

  static async reorderPinnedChats(userId: string, orderedChatIds: string[]): Promise<boolean> {
    return SupabaseService.reorderPinnedChats(userId, orderedChatIds);
  }

  // --- Official Community Groups ---
  static async getCommunityGroups(): Promise<CommunityGroup[]> {
    return SupabaseService.getCommunityGroups();
  }

  static async getOfficialCommunityGroup(): Promise<CommunityGroup | null> {
    return SupabaseService.getOfficialCommunityGroup();
  }

  static async getCommunityGroupMembers(groupId: string): Promise<CommunityGroupMember[]> {
    return SupabaseService.getCommunityGroupMembers(groupId);
  }

  static async designateOfficialCommunityGroup(
    newGroupId: string,
    reason?: string,
    adminName = 'System Administrator'
  ): Promise<{ success: boolean; enrolledCount?: number; error?: string }> {
    const res = await SupabaseService.designateOfficialCommunityGroup(newGroupId, reason);
    if (res.success) {
      try {
        const groups = await this.getCommunityGroups();
        const target = groups.find(g => g.id === newGroupId);
        const { NotificationService } = await import('./notificationService');
        await NotificationService.notifyOfficialGroupChange({
          groupName: target?.name || 'New Official Group',
          adminName,
          reason,
        });
      } catch (err) {
        console.warn('Failed to dispatch official group change notification:', err);
      }
    }
    return res;
  }

  static async getOfficialGroupHistory(): Promise<OfficialGroupHistoryRecord[]> {
    return SupabaseService.getOfficialGroupHistory();
  }

  // --- Group Settings & Member Management ---
  static async updateCommunityGroup(
    groupId: string,
    updates: Partial<CommunityGroup>
  ): Promise<{ success: boolean; error?: string }> {
    return SupabaseService.updateCommunityGroup(groupId, updates);
  }

  static async updateGroupMemberRole(
    groupId: string,
    userId: string,
    role: string
  ): Promise<{ success: boolean; error?: string }> {
    return SupabaseService.updateGroupMemberRole(groupId, userId, role);
  }

  static async removeGroupMember(
    groupId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    return SupabaseService.removeGroupMember(groupId, userId);
  }

  static async addGroupMember(
    groupId: string,
    userId: string,
    role: string = 'member'
  ): Promise<{ success: boolean; error?: string }> {
    return SupabaseService.addGroupMember(groupId, userId, role);
  }

  // --- User Group Preferences (Mute, Mentions, Announcements) ---
  static async getUserGroupPreferences(
    userId: string,
    groupId: string
  ): Promise<UserGroupPreferences> {
    const defaultPrefs: UserGroupPreferences = {
      userId,
      groupId,
      isMuted: false,
      mutedUntil: null,
      notifyMentions: true,
      notifyAnnouncements: true,
    };
    try {
      const fromDb = await SupabaseService.getUserGroupPreferences(userId, groupId);
      if (fromDb) return fromDb;
    } catch (_) {}

    // Local storage fallback
    const localMap = getStored<Record<string, UserGroupPreferences>>(STORAGE_KEYS.GROUP_PREFS, {});
    const key = `${userId}_${groupId}`;
    return localMap[key] || defaultPrefs;
  }

  static async saveUserGroupPreferences(
    prefs: UserGroupPreferences
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await SupabaseService.saveUserGroupPreferences(prefs);
    } catch (_) {}

    // Always update local storage
    const localMap = getStored<Record<string, UserGroupPreferences>>(STORAGE_KEYS.GROUP_PREFS, {});
    const key = `${prefs.userId}_${prefs.groupId}`;
    localMap[key] = prefs;
    setStored(STORAGE_KEYS.GROUP_PREFS, localMap);
    return { success: true };
  }

  // --- Custom Stickers, Favorites & Frequently Used ---
  static async getUserCustomStickers(userId: string): Promise<CustomSticker[]> {
    try {
      const dbStickers = await SupabaseService.getUserCustomStickers(userId);
      if (dbStickers && dbStickers.length > 0) return dbStickers;
    } catch (_) {}

    const localStickers = getStored<CustomSticker[]>(`${STORAGE_KEYS.CUSTOM_STICKERS}_${userId}`, []);
    return localStickers;
  }

  static async saveUserCustomSticker(
    userId: string,
    sticker: Omit<CustomSticker, 'id'> & { id?: string }
  ): Promise<{ success: boolean; sticker?: CustomSticker; error?: string }> {
    const id = sticker.id || `stk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullSticker: CustomSticker = {
      ...sticker,
      id,
      userId,
      createdAt: new Date().toISOString(),
      usageCount: sticker.usageCount || 1,
    };

    try {
      const res = await SupabaseService.saveUserCustomSticker(userId, fullSticker);
      if (res.success && res.sticker) return res;
    } catch (_) {}

    // Fallback local storage
    const list = getStored<CustomSticker[]>(`${STORAGE_KEYS.CUSTOM_STICKERS}_${userId}`, []);
    const updated = [fullSticker, ...list.filter(s => s.id !== id)];
    setStored(`${STORAGE_KEYS.CUSTOM_STICKERS}_${userId}`, updated);
    return { success: true, sticker: fullSticker };
  }

  static async deleteUserCustomSticker(
    userId: string,
    stickerId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await SupabaseService.deleteUserCustomSticker(userId, stickerId);
    } catch (_) {}

    const list = getStored<CustomSticker[]>(`${STORAGE_KEYS.CUSTOM_STICKERS}_${userId}`, []);
    const filtered = list.filter(s => s.id !== stickerId);
    setStored(`${STORAGE_KEYS.CUSTOM_STICKERS}_${userId}`, filtered);

    // Also remove from favorites if present
    const favs = getStored<CustomSticker[]>(`${STORAGE_KEYS.FAVORITE_STICKERS}_${userId}`, []);
    setStored(`${STORAGE_KEYS.FAVORITE_STICKERS}_${userId}`, favs.filter(s => s.id !== stickerId));

    return { success: true };
  }

  static getFavoriteStickers(userId: string): CustomSticker[] {
    return getStored<CustomSticker[]>(`${STORAGE_KEYS.FAVORITE_STICKERS}_${userId}`, []);
  }

  static toggleFavoriteSticker(userId: string, sticker: CustomSticker): boolean {
    const favs = this.getFavoriteStickers(userId);
    const exists = favs.some(f => (f.imageUrl && f.imageUrl === sticker.imageUrl) || (f.emoji && f.emoji === sticker.emoji && f.label === sticker.label));
    let next: CustomSticker[];
    if (exists) {
      next = favs.filter(f => !((f.imageUrl && f.imageUrl === sticker.imageUrl) || (f.emoji && f.emoji === sticker.emoji && f.label === sticker.label)));
    } else {
      next = [{ ...sticker, id: sticker.id || `fav_${Date.now()}` }, ...favs];
    }
    setStored(`${STORAGE_KEYS.FAVORITE_STICKERS}_${userId}`, next);
    return !exists;
  }

  static getFrequentlyUsedStickers(userId: string): CustomSticker[] {
    return getStored<CustomSticker[]>(`${STORAGE_KEYS.RECENT_STICKERS}_${userId}`, []);
  }

  static recordStickerUsage(userId: string, sticker: { emoji?: string; imageUrl?: string; label: string }): void {
    const list = this.getFrequentlyUsedStickers(userId);
    const key = sticker.imageUrl || sticker.emoji || sticker.label;
    const existing = list.find(s => (s.imageUrl || s.emoji || s.label) === key);
    const usage = (existing?.usageCount || 0) + 1;
    const updatedItem: CustomSticker = {
      id: existing?.id || `rec_${Date.now()}`,
      userId,
      stickerType: 'recent',
      emoji: sticker.emoji,
      imageUrl: sticker.imageUrl,
      label: sticker.label,
      usageCount: usage,
      createdAt: new Date().toISOString(),
    };
    const next = [updatedItem, ...list.filter(s => (s.imageUrl || s.emoji || s.label) !== key)].slice(0, 32);
    setStored(`${STORAGE_KEYS.RECENT_STICKERS}_${userId}`, next);
  }
}
