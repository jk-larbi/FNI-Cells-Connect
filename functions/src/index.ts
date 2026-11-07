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

  // 4. Save public profile (NEVER stores passwords)
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
  await db.collection('profiles').doc(uid).set(profileRecord);

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

    const batch = db.batch();
    const missingCells: any[] = [];

    cellsSnap.forEach((doc: admin.firestore.QueryDocumentSnapshot) => {
      const cell: any = { id: doc.id, ...doc.data() };
      if (!submittedCellIds.has(cell.id)) {
        missingCells.push(cell);

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
      }
    });

    if (missingCells.length > 0) {
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
          missingCount: missingCells.length,
          cells: missingCells.map(c => ({ id: c.id, name: c.name })),
        },
      });
    }

    await batch.commit();
  }
);

/**
 * Trigger on Cell Meeting Report Submission
 */
export const onCellMeetingReportCreated = onDocumentCreated(
  'cellMeetingReports/{reportId}',
  async (event: FirestoreEvent<QueryDocumentSnapshot | undefined>) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data();
    const submittedAt = data.submittedAt ? new Date(data.submittedAt).getTime() : Date.now();
    const deadline = getGhanaDeadlineTimestamp(new Date(submittedAt));
    const isLate = submittedAt > deadline;

    if (data.late !== isLate) {
      await snap.ref.update({
        late: isLate,
        validatedByCloudFunction: true,
      });
    }

    if (data.tutorUid) {
      await db.collection('notifications').add({
        user_id: data.tutorUid,
        title: isLate ? 'Meeting Return Filed (Late)' : 'Meeting Return Filed (On-Time)',
        message: `Your return for "${data.cellName}" was received on ${new Date(submittedAt).toLocaleString('en-GB')}. Status: Newly Submitted.`,
        type: 'report_submitted',
        channel: 'in_app',
        is_read: false,
        created_at: new Date().toISOString(),
      });
    }
  }
);

/**
 * Trigger on Evangelism Report Submission
 */
export const onEvangelismReportCreated = onDocumentCreated(
  'evangelismReports/{reportId}',
  async (event: FirestoreEvent<QueryDocumentSnapshot | undefined>) => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data();
    const submittedAt = data.submittedAt ? new Date(data.submittedAt).getTime() : Date.now();
    const deadline = getGhanaDeadlineTimestamp(new Date(submittedAt));
    const isLate = submittedAt > deadline;

    if (data.late !== isLate) {
      await snap.ref.update({
        late: isLate,
        validatedByCloudFunction: true,
      });
    }

    if (data.tutorUid) {
      await db.collection('notifications').add({
        user_id: data.tutorUid,
        title: isLate ? 'Evangelism Return Filed (Late)' : 'Evangelism Return Filed (On-Time)',
        message: `Your evangelism harvest return (${data.conversions || 0} souls won) for "${data.cellName}" has been filed and submitted for review.`,
        type: 'report_submitted',
        channel: 'in_app',
        is_read: false,
        created_at: new Date().toISOString(),
      });
    }
  }
);
