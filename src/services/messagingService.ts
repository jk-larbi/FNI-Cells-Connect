import { SupabaseService } from './supabaseService';
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

    // Primary write to Supabase
    try {
      await SupabaseService.sendPrivateMessage(msg);
    } catch (err) {
      console.warn('Supabase private message notice:', err);
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
      if (supaMsgs && supaMsgs.length > 0) {
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
      if (supaMsgs && supaMsgs.length > 0) {
        all = supaMsgs;
        setStored(STORAGE_KEYS.PRIVATE, all);
      }
    } catch (e) {
      // Local fallback
    }

    const groups = new Map<string, PrivateMessage[]>();

    for (const msg of all) {
      const tutorUid = msg.senderRole === 'admin' ? msg.recipientUid : msg.senderUid;
      if (!groups.has(tutorUid)) groups.set(tutorUid, []);
      groups.get(tutorUid)!.push(msg);
    }

    const summaries = [];
    for (const [tutorUid, messages] of groups.entries()) {
      messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const last = messages[messages.length - 1];
      const unreadCount = messages.filter(m => m.senderRole !== 'admin' && !m.isRead).length;
      const tutorName = last.senderRole !== 'admin' ? last.senderName : last.recipientName;
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
    let modified = false;

    const updated = all.map(m => {
      if ((m.senderUid === tutorUid || m.recipientUid === tutorUid) && m.senderUid !== readerUid && !m.isRead) {
        modified = true;
        const readMsg = { ...m, isRead: true, readAt: new Date().toISOString() };
        // Sync read status to Supabase
        SupabaseService.sendPrivateMessage(readMsg).catch(() => {});
        return readMsg;
      }
      return m;
    });

    if (modified) {
      setStored(STORAGE_KEYS.PRIVATE, updated);
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

    // Primary write to Supabase
    try {
      await SupabaseService.sendCommunityMessage(msg);
    } catch (err) {
      console.warn('Supabase community message notice:', err);
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
    } catch (e) {
      console.warn('Community message notification dispatch notice:', e);
    }

    return msg;
  }

  static async getCommunityMessages(): Promise<CommunityMessage[]> {
    try {
      const supaMsgs = await SupabaseService.getCommunityMessages();
      if (supaMsgs && supaMsgs.length > 0) {
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
    const all = await this.getInvitationCodes();
    const matched = all.find(c => c.code.toUpperCase() === cleanCode);

    if (!matched) {
      return { valid: false, error: 'Invalid invitation code. Please check with an administrator.' };
    }

    if (matched.isRevoked) {
      return { valid: false, error: 'This invitation code has been revoked by leadership.' };
    }

    const now = Date.now();
    const expiryTime = new Date(matched.expiresAt).getTime();
    if (now > expiryTime) {
      return { valid: false, error: 'This invitation code has expired. Expired codes can no longer be used.' };
    }

    if (matched.maxUses && matched.usedCount >= matched.maxUses) {
      return { valid: false, error: 'This invitation code has reached its maximum authorized usage limit.' };
    }

    // Increment usage
    matched.usedCount += 1;
    setStored(STORAGE_KEYS.INVITES, all);

    // Grant access
    const authorizedUsers = getStored<string[]>(STORAGE_KEYS.COMMUNITY_ACCESS, []);
    if (!authorizedUsers.includes(tutorUid)) {
      authorizedUsers.push(tutorUid);
      setStored(STORAGE_KEYS.COMMUNITY_ACCESS, authorizedUsers);
    }

    // Primary write to Supabase
    try {
      await SupabaseService.upsertInvitationCode(matched);
    } catch (e) {
      console.warn('Supabase redeem code notice:', e);
    }

    return { valid: true };
  }

  static async reactToCommunityMessage(
    messageId: string,
    emoji: string,
    userName: string
  ): Promise<CommunityMessage | null> {
    const all = getStored<CommunityMessage[]>(STORAGE_KEYS.COMMUNITY, []);
    const target = all.find(m => m.id === messageId);
    if (!target) return null;

    if (!target.reactions) {
      target.reactions = {};
    }

    const currentReactors = target.reactions[emoji] || [];
    if (currentReactors.includes(userName)) {
      // Remove reaction
      target.reactions[emoji] = currentReactors.filter(u => u !== userName);
      if (target.reactions[emoji].length === 0) {
        delete target.reactions[emoji];
      }
    } else {
      // Add reaction
      target.reactions[emoji] = [...currentReactors, userName];
    }

    setStored(STORAGE_KEYS.COMMUNITY, all);
    // Sync to Supabase
    try {
      await SupabaseService.sendCommunityMessage(target);
    } catch (e) {
      console.warn('Supabase react notice:', e);
    }

    return target;
  }

  static checkCommunityAccess(_tutorUid?: string, _userRole?: UserRole): boolean {
    // Open access for all authenticated fellowship tutors, leaders and users
    return true;
  }
}
