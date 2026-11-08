import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onDocumentCreated, FirestoreEvent, QueryDocumentSnapshot } from 'firebase-functions/v2/firestore';
import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';

admin.initializeApp();
const db = admin.firestore();

/**
 * Cryptographic helper: Password hashing with PBKDF2 (SHA-256) and unique salt
 */
function hashPassword(password: string, existingSalt?: string): { salt: string; hash: string } {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256').toString('hex');
  return { salt, hash };
}

function verifyPassword(password: string, salt: string, storedHash: string): boolean {
  const { hash } = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
}

function normalize(str: string): string {
  return str.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Backend Callable: Register Tutor (Full Name, Cell Name, Password)
 * Enforces cell duplicate prevention, hashes password, assigns tutor role, issues custom token
 */
export const registerTutor = onCall(async (request: CallableRequest<any>) => {
  const { fullName, cellName, password, confirmPassword } = request.data || {};

  if (!fullName || !cellName || !password) {
    throw new HttpsError('invalid-argument', 'Full name, cell name, and password are required.');
  }

  if (password.length < 6) {
    throw new HttpsError('invalid-argument', 'Password must be at least 6 characters long.');
  }

  if (confirmPassword && password !== confirmPassword) {
    throw new HttpsError('invalid-argument', 'Passwords do not match.');
  }

  const cleanFullName = String(fullName).trim();
  const cleanCellName = String(cellName).trim();
  const normalizedCell = normalize(cleanCellName);

  // 1. Check duplicate cell registration
  const existingCellSnap = await db.collection('cells').get();
  let duplicateCell: any = null;
  existingCellSnap.forEach((doc: admin.firestore.QueryDocumentSnapshot) => {
    const data = doc.data();
    if (normalize(data.name || '') === normalizedCell) {
      duplicateCell = { id: doc.id, ...data };
    }
  });

  if (duplicateCell) {
    throw new HttpsError('already-exists', `Cell "${cleanCellName}" is already registered. Please login to your account.`);
  }

  // 2. Hash password securely
  const { salt, hash } = hashPassword(password);
  const uid = `tutor-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const cellId = `cell-${Date.now()}`;
  const nowIso = new Date().toISOString();

  // 3. Save cell
  const cellRecord = {
    id: cellId,
    name: cleanCellName,
    normalized_name: normalizedCell,
    tutorUid: uid,
    leader_name: cleanFullName,
    is_active: true,
    created_at: nowIso,
  };
  await db.collection('cells').doc(cellId).set(cellRecord);

  // 4. Save public profile and user record (NEVER stores passwords)
  const profileRecord = {
    id: uid,
    full_name: cleanFullName,
    cell_id: cellId,
    cell_name: cleanCellName,
    role: 'tutor',
    is_active: true,
    is_onboarded: true,
    created_at: nowIso,
  };
  await Promise.all([
    db.collection('profiles').doc(uid).set(profileRecord),
    db.collection('users').doc(uid).set(profileRecord),
  ]);

  // 5. Save secure credentials in private internal auth collection (not accessible by clients)
  await db.collection('internal_tutor_auth').doc(uid).set({
    uid,
    fullName: cleanFullName,
    cellName: cleanCellName,
    normalizedCell,
    salt,
    hash,
    createdAt: nowIso,
  });

  // 6. Generate Firebase custom authentication token with role claims
  const customToken = await admin.auth().createCustomToken(uid, {
    role: 'tutor',
    cellId,
    cellName: cleanCellName,
  });

  return {
    customToken,
    profile: profileRecord,
    cell: cellRecord,
  };
});

/**
 * Backend Callable: Login Tutor (Full Name and Password, optional Cell Name)
 */
export const loginTutor = onCall(async (request: CallableRequest<any>) => {
  const { fullName, password, cellName } = request.data || {};

  if (!fullName || !password) {
    throw new HttpsError('invalid-argument', 'Full name and password are required.');
  }

  const cleanFullName = String(fullName).trim().toLowerCase();

  // Find matching tutor credentials
  let query: admin.firestore.Query = db.collection('internal_tutor_auth');
  if (cellName) {
    query = query.where('normalizedCell', '==', normalize(String(cellName)));
  }

  const snap = await query.get();
  if (snap.empty) {
    throw new HttpsError('not-found', 'No tutor account found matching the provided name.');
  }

  const candidates: any[] = [];
  snap.forEach((doc: admin.firestore.QueryDocumentSnapshot) => {
    const data = doc.data();
    if (data.fullName && data.fullName.toLowerCase() === cleanFullName) {
      candidates.push(data);
    }
  });

  if (candidates.length === 0) {
    throw new HttpsError('not-found', `No account found matching tutor name "${fullName}".`);
  }

  let matchedAuthDoc: any = null;
  for (const candidate of candidates) {
    if (verifyPassword(password, candidate.salt, candidate.hash)) {
      matchedAuthDoc = candidate;
      break;
    }
  }

  if (!matchedAuthDoc) {
    throw new HttpsError('unauthenticated', 'Invalid password. Please check your credentials.');
  }

  // Fetch profile
  const profileSnap = await db.collection('profiles').doc(matchedAuthDoc.uid).get();
  const profile = profileSnap.exists ? profileSnap.data() : {
    id: matchedAuthDoc.uid,
    full_name: matchedAuthDoc.fullName,
    cell_name: matchedAuthDoc.cellName,
    role: 'tutor',
  };

  const customToken = await admin.auth().createCustomToken(matchedAuthDoc.uid, {
    role: 'tutor',
    cellId: matchedAuthDoc.cellId || matchedAuthDoc.normalizedCell,
    cellName: matchedAuthDoc.cellName,
  });

  return {
    customToken,
    profile,
  };
});

/**
 * Backend Callable: Login Administrator
 * Verifies default admin123 on first login, forces change, or validates custom password
 */
export const loginAdmin = onCall(async (request: CallableRequest<any>) => {
  const { password } = request.data || {};
  if (!password) {
    throw new HttpsError('invalid-argument', 'Password is required.');
  }

  const secDocRef = db.collection('systemSecurity').doc('admin_config');
  const secSnap = await secDocRef.get();

  const secData = secSnap.exists ? secSnap.data() : null;
  const isConfigured = Boolean(secData && secData.initialConfigured);

  if (!isConfigured) {
    // Initial setup: accepts default password 'admin123'
    if (password !== 'admin123') {
      throw new HttpsError('unauthenticated', 'Invalid password. Initial administrator password is required.');
    }

    const customToken = await admin.auth().createCustomToken('admin-usr-01', { role: 'admin' });
    return {
      customToken,
      mustChangePassword: true,
      profile: {
        id: 'admin-usr-01',
        full_name: 'System Administrator',
        role: 'admin',
        must_change_password: true,
      },
    };
  } else {
    // Already configured: admin123 is permanently disabled
    if (password === 'admin123') {
      throw new HttpsError('unauthenticated', 'The initial temporary password (admin123) is permanently disabled. Please use your newly configured password.');
    }

    const isValid = verifyPassword(password, secData!.salt, secData!.hash);
    if (!isValid) {
      throw new HttpsError('unauthenticated', 'Incorrect administrator password.');
    }

    const customToken = await admin.auth().createCustomToken('admin-usr-01', { role: 'admin' });
    return {
      customToken,
      mustChangePassword: false,
      profile: {
        id: 'admin-usr-01',
        full_name: 'System Administrator',
        role: 'admin',
        must_change_password: false,
      },
    };
  }
});

/**
 * Backend Callable: Change Administrator Password
 * Updates admin hash and invalidates temporary credentials
 */
export const changeAdminPassword = onCall(async (request: CallableRequest<any>) => {
  const { newPassword } = request.data || {};
  if (!newPassword || newPassword.length < 8) {
    throw new HttpsError('invalid-argument', 'Password must be at least 8 characters long.');
  }

  if (newPassword === 'admin123') {
    throw new HttpsError('invalid-argument', 'Cannot reuse the default temporary password (admin123).');
  }

  const { salt, hash } = hashPassword(newPassword);
  await db.collection('systemSecurity').doc('admin_config').set({
    initialConfigured: true,
    salt,
    hash,
    updatedAt: new Date().toISOString(),
  });

  return { success: true };
});

/**
 * Calculates current Sunday 18:00:00 Africa/Accra deadline.
 * Ghana time is UTC+0 (GMT) year-round.
 */
function getGhanaDeadlineTimestamp(date = new Date()): number {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0 is Sunday
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  const targetSunday = new Date(d);
  targetSunday.setUTCDate(d.getUTCDate() + daysUntilSunday);
  targetSunday.setUTCHours(18, 0, 0, 0);
  return targetSunday.getTime();
}

/**
 * Scheduled Cloud Function
 * Fires automatically every Sunday at exactly 6:00 PM Africa/Accra (18:00 UTC).
 */
export const checkWeeklyReportsDeadline = onSchedule(
  {
    schedule: '0 18 * * 0',
    timeZone: 'Africa/Accra',
  },
  async () => {
    const now = new Date();
    const cellsSnap = await db.collection('cells').where('is_active', '==', true).get();
    if (cellsSnap.empty) return;

    const oneWeekAgoIso = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const reportsSnap = await db
      .collection('cellMeetingReports')
      .where('submittedAt', '>=', oneWeekAgoIso)
      .get();

    const submittedCellIds = new Set<string>();
    reportsSnap.forEach((doc: admin.firestore.QueryDocumentSnapshot) => {
      const data = doc.data();
      if (data.cellId) submittedCellIds.add(data.cellId);
    });

    // Deduplication check: fetch overdue notices dispatched within the last 24 hours
    const recentNotifsSnap = await db
      .collection('notifications')
      .where('type', '==', 'overdue_notice')
      .where('created_at', '>=', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
      .get();

    const alreadyNotifiedCellIds = new Set<string>();
    let adminSummaryDispatched = false;
    recentNotifsSnap.forEach((doc: admin.firestore.QueryDocumentSnapshot) => {
      const data = doc.data();
      if (data.metadata?.cellId) alreadyNotifiedCellIds.add(data.metadata.cellId);
      if (data.user_id === 'all' || data.metadata?.target === 'admin_summary') {
        adminSummaryDispatched = true;
      }
    });

    const batch = db.batch();
    const missingCells: any[] = [];
    let writesCount = 0;

    cellsSnap.forEach((doc: admin.firestore.QueryDocumentSnapshot) => {
      const cell: any = { id: doc.id, ...doc.data() };
      if (!submittedCellIds.has(cell.id)) {
        missingCells.push(cell);

        // Only send if not already notified in this cycle
        if (!alreadyNotifiedCellIds.has(cell.id)) {
          const leaderNotifRef = db.collection('notifications').doc();
          batch.set(leaderNotifRef, {
            user_id: cell.tutorUid || cell.leader_id || 'unassigned',
            title: 'Weekly Return Overdue',
            message: `The Sunday 6:00 PM deadline for cell "${cell.name}" has passed. Please file your return immediately.`,
            type: 'overdue_notice',
            channel: 'in_app',
            is_read: false,
            created_at: now.toISOString(),
            metadata: { cellId: cell.id, cellName: cell.name },
          });
          writesCount++;
        }
      }
    });

    if (missingCells.length > 0 && !adminSummaryDispatched) {
      const adminNotifRef = db.collection('notifications').doc();
      batch.set(adminNotifRef, {
        user_id: 'all',
        title: `${missingCells.length} Cells Missing Weekly Returns`,
        message: `Sunday 6:00 PM Ghana Time deadline cutoff reached. ${missingCells.length} cells have not yet submitted reports.`,
        type: 'overdue_notice',
        channel: 'in_app',
        is_read: false,
        created_at: now.toISOString(),
        metadata: {
          target: 'admin_summary',
          missingCount: missingCells.length,
          cells: missingCells.map(c => ({ id: c.id, name: c.name })),
        },
      });
      writesCount++;
    }

    if (writesCount > 0) {
      await batch.commit();
    }
  }
);

/**
 * Helper: Send Push Notifications via Firebase Cloud Messaging (FCM)
 * Resolves user IDs, checks roles, multicasts to active device tokens, and prunes stale tokens
 */
async function sendFcmNotification(
  targetUserIds: string[],
  notification: { title: string; body: string },
  data?: Record<string, string>,
  excludeUserId?: string
): Promise<{ successCount: number; failureCount: number }> {
  try {
    const tokensSnap = await db.collection('deviceTokens').get();
    if (tokensSnap.empty) return { successCount: 0, failureCount: 0 };

    const isAdminTarget = targetUserIds.includes('admin') || targetUserIds.includes('all');
    const isTutorCommunity = targetUserIds.includes('tutor_community');

    const targetTokens: { id: string; token: string; userId: string }[] = [];

    tokensSnap.forEach((doc: admin.firestore.QueryDocumentSnapshot) => {
      const d = doc.data();
      if (!d.token) return;
      if (excludeUserId && d.userId === excludeUserId) return;

      if (
        targetUserIds.includes(d.userId) ||
        (isAdminTarget && d.role === 'admin') ||
        (isTutorCommunity && d.role === 'tutor') ||
        targetUserIds.includes('all')
      ) {
        targetTokens.push({ id: doc.id, token: d.token, userId: d.userId });
      }
    });

    if (targetTokens.length === 0) return { successCount: 0, failureCount: 0 };

    // Deduplicate tokens
    const uniqueTokensMap = new Map<string, string>();
    targetTokens.forEach(t => uniqueTokensMap.set(t.token, t.id));
    const tokens = Array.from(uniqueTokensMap.keys());

    const stringData: Record<string, string> = {};
    if (data) {
      for (const [k, v] of Object.entries(data)) {
        stringData[k] = String(v);
      }
    }

    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification,
      data: stringData,
    });

    // Prune invalid / unregistered tokens
    const tokensToDelete: string[] = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success && resp.error) {
        const errCode = resp.error.code;
        if (
          errCode === 'messaging/registration-token-not-registered' ||
          errCode === 'messaging/invalid-registration-token'
        ) {
          const docId = uniqueTokensMap.get(tokens[idx]);
          if (docId) tokensToDelete.push(docId);
        }
      }
    });

    if (tokensToDelete.length > 0) {
      const batch = db.batch();
      tokensToDelete.forEach(id => batch.delete(db.collection('deviceTokens').doc(id)));
      await batch.commit().catch(err => console.warn('Failed cleaning invalid tokens', err));
    }

    return { successCount: response.successCount, failureCount: response.failureCount };
  } catch (err) {
    console.warn('sendFcmNotification error:', err);
    return { successCount: 0, failureCount: 0 };
  }
}

/**
 * Callable: Register FCM Device Token securely
 */
export const registerDeviceToken = onCall(async (request: CallableRequest<any>) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated to register device token.');
  }

  const { token, role, device, platform } = request.data || {};
  if (!token) {
    throw new HttpsError('invalid-argument', 'FCM device token is required.');
  }

  const userId = request.auth.uid;
  const tokenId = `dt_${userId}_${String(token).slice(-12)}`;
  const nowIso = new Date().toISOString();

  await db.collection('deviceTokens').doc(tokenId).set(
    {
      id: tokenId,
      userId,
      token: String(token),
      role: role || (request.auth.token.role === 'admin' ? 'admin' : 'tutor'),
      device: device || 'Web Browser',
      platform: platform || 'Web',
      updatedAt: nowIso,
      createdAt: nowIso,
    },
    { merge: true }
  );

  return { success: true, tokenId };
});

/**
 * Callable: Unregister FCM Device Token
 */
export const unregisterDeviceToken = onCall(async (request: CallableRequest<any>) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const { token } = request.data || {};
  if (!token) return { success: true };

  const userId = request.auth.uid;
  const tokenId = `dt_${userId}_${String(token).slice(-12)}`;

  await db.collection('deviceTokens').doc(tokenId).delete().catch(() => {});
  return { success: true };
});

/**
 * Trigger 1: Cell Meeting Report Submission → Notifies ADMINISTRATORS & TUTOR
 */
export const onCellMeetingReportCreated = onDocumentCreated(
  'cellMeetingReports/{reportId}',
  async (event: FirestoreEvent<QueryDocumentSnapshot | undefined>) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data();
    const reportId = snap.id;
    const submittedAt = data.submittedAt ? new Date(data.submittedAt).getTime() : Date.now();
    const deadline = getGhanaDeadlineTimestamp(new Date(submittedAt));
    const isLate = submittedAt > deadline;

    if (data.late !== isLate) {
      await snap.ref.update({
        late: isLate,
        validatedByCloudFunction: true,
      });
    }

    const nowIso = new Date().toISOString();

    // 1. In-App Notification for ADMINISTRATORS (Idempotent)
    const adminNotifId = `notif-cmr-admin-${reportId}`;
    const adminNotifRef = db.collection('notifications').doc(adminNotifId);
    const existingAdminNotif = await adminNotifRef.get();

    if (!existingAdminNotif.exists) {
      const adminTitle = `New Cell Meeting Report (${data.cellName || 'Cell'})`;
      const adminMsg = `${data.tutorName || 'Tutor'} submitted weekly return for "${data.cellName || 'Cell'}". Attendance: ${data.attendance || 0}${isLate ? ' (Late Return)' : ''}.`;

      await adminNotifRef.set({
        id: adminNotifId,
        user_id: 'admin',
        title: adminTitle,
        message: adminMsg,
        type: 'report_submitted',
        channel: 'in_app',
        is_read: false,
        created_at: nowIso,
        metadata: {
          reportId,
          reportType: 'meeting',
          cellId: data.cellId,
          cellName: data.cellName,
          tutorUid: data.tutorUid,
          tutorName: data.tutorName,
          submittedAt: data.submittedAt || nowIso,
          targetTab: 'report-review',
          category: 'reports',
          idempotencyKey: adminNotifId,
        },
      });

      // Send FCM push to all admin devices
      await sendFcmNotification(
        ['admin'],
        {
          title: adminTitle,
          body: adminMsg,
        },
        {
          targetTab: 'report-review',
          reportId,
          reportType: 'meeting',
        }
      );
    }

    // 2. Confirmation notification for authoring TUTOR (Idempotent)
    if (data.tutorUid) {
      const tutorNotifId = `notif-cmr-tutor-${reportId}`;
      const tutorNotifRef = db.collection('notifications').doc(tutorNotifId);
      const existingTutorNotif = await tutorNotifRef.get();

      if (!existingTutorNotif.exists) {
        const tutorTitle = isLate ? 'Meeting Return Filed (Late)' : 'Meeting Return Filed (On-Time)';
        const tutorMsg = `Your return for "${data.cellName}" was received on ${new Date(submittedAt).toLocaleString('en-GB')}. Status: Newly Submitted.`;

        await tutorNotifRef.set({
          id: tutorNotifId,
          user_id: data.tutorUid,
          title: tutorTitle,
          message: tutorMsg,
          type: 'report_submitted',
          channel: 'in_app',
          is_read: false,
          created_at: nowIso,
          metadata: {
            reportId,
            reportType: 'meeting',
            cellId: data.cellId,
            cellName: data.cellName,
            targetTab: 'my-reports',
            category: 'reports',
            idempotencyKey: tutorNotifId,
          },
        });

        // Send FCM push to authoring tutor device
        await sendFcmNotification(
          [data.tutorUid],
          {
            title: tutorTitle,
            body: tutorMsg,
          },
          {
            targetTab: 'my-reports',
            reportId,
            reportType: 'meeting',
          }
        );
      }
    }
  }
);

/**
 * Trigger 2: Evangelism Report Submission → Notifies ADMINISTRATORS & TUTOR
 */
export const onEvangelismReportCreated = onDocumentCreated(
  'evangelismReports/{reportId}',
  async (event: FirestoreEvent<QueryDocumentSnapshot | undefined>) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data();
    const reportId = snap.id;
    const submittedAt = data.submittedAt ? new Date(data.submittedAt).getTime() : Date.now();
    const deadline = getGhanaDeadlineTimestamp(new Date(submittedAt));
    const isLate = submittedAt > deadline;

    if (data.late !== isLate) {
      await snap.ref.update({
        late: isLate,
        validatedByCloudFunction: true,
      });
    }

    const nowIso = new Date().toISOString();

    // 1. In-App Notification for ADMINISTRATORS (Idempotent)
    const adminNotifId = `notif-evr-admin-${reportId}`;
    const adminNotifRef = db.collection('notifications').doc(adminNotifId);
    const existingAdminNotif = await adminNotifRef.get();

    if (!existingAdminNotif.exists) {
      const adminTitle = `New Evangelism Harvest Return (${data.cellName || 'Cell'})`;
      const adminMsg = `${data.tutorName || 'Tutor'} (${data.cellName || 'Cell'}) reported ${data.conversions || 0} souls won and ${data.contactsCaptured || 0} contacts.`;

      await adminNotifRef.set({
        id: adminNotifId,
        user_id: 'admin',
        title: adminTitle,
        message: adminMsg,
        type: 'report_submitted',
        channel: 'in_app',
        is_read: false,
        created_at: nowIso,
        metadata: {
          reportId,
          reportType: 'evangelism',
          cellId: data.cellId,
          cellName: data.cellName,
          tutorUid: data.tutorUid,
          tutorName: data.tutorName,
          submittedAt: data.submittedAt || nowIso,
          targetTab: 'report-review',
          category: 'reports',
          idempotencyKey: adminNotifId,
        },
      });

      // Send FCM push to administrators
      await sendFcmNotification(
        ['admin'],
        {
          title: adminTitle,
          body: adminMsg,
        },
        {
          targetTab: 'report-review',
          reportId,
          reportType: 'evangelism',
        }
      );
    }

    // 2. Confirmation notification for authoring TUTOR (Idempotent)
    if (data.tutorUid) {
      const tutorNotifId = `notif-evr-tutor-${reportId}`;
      const tutorNotifRef = db.collection('notifications').doc(tutorNotifId);
      const existingTutorNotif = await tutorNotifRef.get();

      if (!existingTutorNotif.exists) {
        const tutorTitle = isLate ? 'Evangelism Return Filed (Late)' : 'Evangelism Return Filed (On-Time)';
        const tutorMsg = `Your evangelism harvest return (${data.conversions || 0} souls won) for "${data.cellName}" has been filed and submitted for review.`;

        await tutorNotifRef.set({
          id: tutorNotifId,
          user_id: data.tutorUid,
          title: tutorTitle,
          message: tutorMsg,
          type: 'report_submitted',
          channel: 'in_app',
          is_read: false,
          created_at: nowIso,
          metadata: {
            reportId,
            reportType: 'evangelism',
            cellId: data.cellId,
            cellName: data.cellName,
            targetTab: 'my-reports',
            category: 'reports',
            idempotencyKey: tutorNotifId,
          },
        });

        // Send FCM push to tutor
        await sendFcmNotification(
          [data.tutorUid],
          {
            title: tutorTitle,
            body: tutorMsg,
          },
          {
            targetTab: 'my-reports',
            reportId,
            reportType: 'evangelism',
          }
        );
      }
    }
  }
);

/**
 * Trigger 3: Private Message Created → Notifies Recipient (Admin or Tutor)
 */
export const onPrivateMessageCreated = onDocumentCreated(
  'privateMessages/{messageId}',
  async (event: FirestoreEvent<QueryDocumentSnapshot | undefined>) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data();
    const messageId = snap.id;
    const isFromTutor = data.senderRole !== 'admin';
    const targetUserId = isFromTutor ? 'admin' : data.recipientUid;

    const notifId = `notif-pmsg-${messageId}`;
    const notifRef = db.collection('notifications').doc(notifId);
    const existing = await notifRef.get();
    if (existing.exists) return;

    const title = isFromTutor
      ? `Message from ${data.senderName} (${data.cellName || 'Cell Leader'})`
      : `Leadership Message from ${data.senderName}`;

    const preview = String(data.content || '').substring(0, 90);

    await notifRef.set({
      id: notifId,
      user_id: targetUserId,
      title,
      message: preview,
      type: 'direct_message',
      channel: 'in_app',
      is_read: false,
      created_at: new Date().toISOString(),
      metadata: {
        messageId,
        conversationId: isFromTutor ? data.senderUid : data.recipientUid,
        senderUid: data.senderUid,
        senderName: data.senderName,
        category: 'messages',
        targetTab: 'messages',
        idempotencyKey: notifId,
      },
    });

    await sendFcmNotification(
      [targetUserId],
      { title, body: preview },
      { targetTab: 'messages', conversationId: isFromTutor ? data.senderUid : data.recipientUid }
    );
  }
);

/**
 * Trigger 4: Community Message Created → Notifies other Tutors
 */
export const onCommunityMessageCreated = onDocumentCreated(
  'communityMessages/{messageId}',
  async (event: FirestoreEvent<QueryDocumentSnapshot | undefined>) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data();
    const messageId = snap.id;
    const notifId = `notif-cmsg-${messageId}`;
    const notifRef = db.collection('notifications').doc(notifId);
    const existing = await notifRef.get();
    if (existing.exists) return;

    const title = `Community Chat: ${data.senderName} (${data.cellName || 'Leader'})`;
    const preview = String(data.content || '').substring(0, 90);

    await notifRef.set({
      id: notifId,
      user_id: 'tutor_community',
      title,
      message: preview,
      type: 'community_message',
      channel: 'in_app',
      is_read: false,
      created_at: new Date().toISOString(),
      metadata: {
        messageId,
        senderUid: data.senderUid,
        senderName: data.senderName,
        category: 'messages',
        targetTab: 'messages',
        idempotencyKey: notifId,
      },
    });

    // Multicast to all tutors excluding the author
    await sendFcmNotification(
      ['tutor_community'],
      { title, body: preview },
      { targetTab: 'messages', tab: 'community' },
      data.senderUid
    );
  }
);

/**
 * Trigger 5: Teaching Material Created / Published → Notifies all Tutors
 */
export const onTeachingMaterialCreated = onDocumentCreated(
  'teachingMaterials/{materialId}',
  async (event: FirestoreEvent<QueryDocumentSnapshot | undefined>) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data();
    if (data.status !== 'published') return;

    const materialId = snap.id;
    const notifId = `notif-material-${materialId}`;
    const notifRef = db.collection('notifications').doc(notifId);
    const existing = await notifRef.get();
    if (existing.exists) return;

    const title = `New Teaching Outline: ${data.title}`;
    const body = `Pastoral leadership published the weekly teaching outline for ${data.weekLabel || 'this week'}. Prepare ahead of fellowship.`;

    await notifRef.set({
      id: notifId,
      user_id: 'all',
      title,
      message: body,
      type: 'teaching_notes',
      channel: 'in_app',
      is_read: false,
      created_at: new Date().toISOString(),
      metadata: {
        materialId,
        category: 'materials',
        targetTab: 'materials',
        idempotencyKey: notifId,
      },
    });

    await sendFcmNotification(
      ['all'],
      { title, body },
      { targetTab: 'materials', materialId }
    );
  }
);

/**
 * Trigger 6: Review Log Created → Notifies authoring Tutor of Approval or Revision
 */
export const onReviewLogCreated = onDocumentCreated(
  'reviewLogs/{logId}',
  async (event: FirestoreEvent<QueryDocumentSnapshot | undefined>) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data();
    const logId = snap.id;
    const reportId = data.reportId;
    const isApproved = data.status === 'Approved' || data.status === 'approved';
    const isCorrection = data.status === 'Needs Correction' || data.status === 'needs_revision';

    // Retrieve report to find authoring tutor
    const colName = data.reportType === 'evangelism' ? 'evangelismReports' : 'cellMeetingReports';
    const repSnap = await db.collection(colName).doc(reportId).get();
    if (!repSnap.exists) return;
    const repData = repSnap.data() || {};
    const tutorUid = repData.tutorUid;
    if (!tutorUid) return;

    const notifId = `notif-review-${logId}`;
    const notifRef = db.collection('notifications').doc(notifId);
    const existing = await notifRef.get();
    if (existing.exists) return;

    const title = isApproved
      ? `Report Approved: ${repData.cellName || 'Cell'}`
      : isCorrection
      ? `Corrections Requested: ${repData.cellName || 'Cell'}`
      : `Report Status: ${data.status}`;

    const message = isApproved
      ? `Your ${data.reportType || 'weekly'} report for "${repData.cellName || 'Cell'}" was officially approved by ${data.reviewerName || 'Administration'}.`
      : isCorrection
      ? `Administration requested corrections for "${repData.cellName || 'Cell'}": "${data.comment || 'Please update your submission.'}"`
      : `Report status updated to ${data.status}.`;

    await notifRef.set({
      id: notifId,
      user_id: tutorUid,
      title,
      message,
      type: isApproved ? 'report_approved' : isCorrection ? 'revision_requested' : 'report_rejected',
      channel: 'in_app',
      is_read: false,
      created_at: new Date().toISOString(),
      metadata: {
        reportId,
        reportType: data.reportType,
        status: data.status,
        comment: data.comment,
        reviewerName: data.reviewerName,
        category: 'reports',
        targetTab: 'my-reports',
        idempotencyKey: notifId,
      },
    });

    await sendFcmNotification(
      [tutorUid],
      { title, body: message },
      { targetTab: 'my-reports', reportId }
    );
  }
);

