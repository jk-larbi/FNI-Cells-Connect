import { SupabaseService } from './supabaseService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { PrivateMessage, CommunityMessage, InvitationCode, UserRole, MessageReply } from '../types';

const STORAGE_KEYS = {
  PRIVATE: 'fni_private_messages_v1',
  COMMUNITY: 'fni_community_messages_v1',
  INVITES: 'fni_invitation_codes_v1',
  COMMUNITY_ACCESS: 'fni_community_authorized_users_v1',
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
  }): Promise<PrivateMessage> {
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
    } catch (e) {
      console.warn('Private message notification dispatch notice:', e);
    }

    return msg;
  }

  static async getPrivateConversation(tutorUid: string): Promise<PrivateMessage[]> {
    try {
      const supaMsgs = await SupabaseService.getPrivateMessages(tutorUid);
      if (supaMsgs !== null) {
        setStored(STORAGE_KEYS.PRIVATE, supaMsgs);
        return supaMsgs
          .filter(m => m.senderUid === tutorUid || m.recipientUid === tutorUid)
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      }
    } catch (e) {
      console.warn('Notice querying Supabase private conversation:', e);
    }

    const all = getStored<PrivateMessage[]>(STORAGE_KEYS.PRIVATE, []);
    return all
      .filter(m => m.senderUid === tutorUid || m.recipientUid === tutorUid)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  static async getAdminConversations(): Promise<
    Array<{ tutorUid: string; tutorName: string; cellName?: string; lastMessage: string; lastTimestamp: string; unreadCount: number }>
  > {
    let all = getStored<PrivateMessage[]>(STORAGE_KEYS.PRIVATE, []);

    try {
      // Refresh messages from Supabase if possible
      const supaMsgs = await SupabaseService.getPrivateMessages('');
      if (supaMsgs !== null) {
        all = supaMsgs;
        setStored(STORAGE_KEYS.PRIVATE, all);
      }
    } catch (e) {
      // Local fallback
    }

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

  static async markPrivateMessagesRead(tutorUid: string, readerUid: string): Promise<void> {
    const all = getStored<PrivateMessage[]>(STORAGE_KEYS.PRIVATE, []);
    const readAt = new Date().toISOString();
    const readIds: string[] = [];

    const updated = all.map(m => {
      if ((m.senderUid === tutorUid || m.recipientUid === tutorUid) && m.senderUid !== readerUid && !m.isRead) {
        readIds.push(m.id);
        return { ...m, isRead: true, readAt };
      }
      return m;
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
      mentions: data.mentions,
      reactions: {},
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
      if (msg.category === 'announcement' && msg.senderRole !== 'tutor') {
        const { EmailNotificationService } = await import('./emailNotificationService');
        await EmailNotificationService.announcementPublished(msg.id);
      }
    } catch (e) {
      console.warn('Community message notification dispatch notice:', e);
    }

    return msg;
  }

  static async getCommunityMessages(): Promise<CommunityMessage[]> {
    try {
      const supaMsgs = await SupabaseService.getCommunityMessages();
      if (supaMsgs !== null) {
        setStored(STORAGE_KEYS.COMMUNITY, supaMsgs);
        return supaMsgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      }
    } catch (e) {
      console.warn('Notice querying Supabase community messages:', e);
    }

    const all = getStored<CommunityMessage[]>(STORAGE_KEYS.COMMUNITY, []);
    return all.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
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
}
