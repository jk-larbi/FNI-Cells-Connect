import { collection, doc, setDoc, getDocs, query, where, orderBy, getDoc, updateDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { PrivateMessage, CommunityMessage, InvitationCode, UserRole } from '../types';

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
    };

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'privateMessages', id), msg);
      } catch (e) {
        console.warn('Firebase private message sync notice:', e);
      }
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
    if (isFirebaseConfigured && db) {
      try {
        const snap = await getDocs(
          query(collection(db, 'privateMessages'), orderBy('createdAt', 'asc'))
        );
        if (!snap.empty) {
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as PrivateMessage));
          const filtered = list.filter(
            m => m.senderUid === tutorUid || m.recipientUid === tutorUid
          );
          setStored(STORAGE_KEYS.PRIVATE, list);
          return filtered;
        }
      } catch (e) {
        console.warn('Firebase getPrivateConversation notice:', e);
      }
    }

    const all = getStored<PrivateMessage[]>(STORAGE_KEYS.PRIVATE, []);
    return all
      .filter(m => m.senderUid === tutorUid || m.recipientUid === tutorUid)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  static async getAdminConversations(): Promise<
    Array<{ tutorUid: string; tutorName: string; cellName?: string; lastMessage: string; lastTimestamp: string; unreadCount: number }>
  > {
    const all = getStored<PrivateMessage[]>(STORAGE_KEYS.PRIVATE, []);
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
        return { ...m, isRead: true, readAt: new Date().toISOString() };
      }
      return m;
    });

    if (modified) {
      setStored(STORAGE_KEYS.PRIVATE, updated);
      if (isFirebaseConfigured && db) {
        for (const m of updated) {
          if (m.isRead && !m.readAt) {
            updateDoc(doc(db, 'privateMessages', m.id), { isRead: true, readAt: new Date().toISOString() }).catch(() => {});
          }
        }
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
    };

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'communityMessages', id), msg);
      } catch (e) {
        console.warn('Firebase community message sync notice:', e);
      }
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
    if (isFirebaseConfigured && db) {
      try {
        const snap = await getDocs(
          query(collection(db, 'communityMessages'), orderBy('createdAt', 'asc'))
        );
        if (!snap.empty) {
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as CommunityMessage));
          setStored(STORAGE_KEYS.COMMUNITY, list);
          return list;
        }
      } catch (e) {
        console.warn('Firebase getCommunityMessages notice:', e);
      }
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

    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'invitationCodes', id), record);
      } catch (e) {
        console.warn('Firebase invite code save notice:', e);
      }
    }

    const all = getStored<InvitationCode[]>(STORAGE_KEYS.INVITES, []);
    all.unshift(record);
    setStored(STORAGE_KEYS.INVITES, all);

    return record;
  }

  static async getInvitationCodes(): Promise<InvitationCode[]> {
    if (isFirebaseConfigured && db) {
      try {
        const snap = await getDocs(
          query(collection(db, 'invitationCodes'), orderBy('createdAt', 'desc'))
        );
        if (!snap.empty) {
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as InvitationCode));
          setStored(STORAGE_KEYS.INVITES, list);
          return list;
        }
      } catch (e) {
        console.warn('Firebase getInvitationCodes notice:', e);
      }
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

    if (isFirebaseConfigured && db) {
      try {
        await updateDoc(doc(db, 'invitationCodes', matched.id), { usedCount: matched.usedCount });
        await setDoc(doc(db, 'communityMembers', tutorUid), {
          uid: tutorUid,
          joinedAt: new Date().toISOString(),
          codeUsed: matched.code,
        });
      } catch (e) {
        console.warn('Firebase redeem code notice:', e);
      }
    }

    return { valid: true };
  }

  static checkCommunityAccess(tutorUid: string, userRole?: UserRole): boolean {
    if (userRole === 'admin' || userRole === 'super_admin') return true;
    const authorizedUsers = getStored<string[]>(STORAGE_KEYS.COMMUNITY_ACCESS, []);
    return authorizedUsers.includes(tutorUid);
  }
}
