import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';

admin.initializeApp();
const db = admin.firestore();

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
 * 1. Scans all active cells.
 * 2. Identifies cells missing weekly reports for the current cycle.
 * 3. Dispatches automated overdue notices to leaders & administrators.
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

    // Retrieve reports submitted for current cycle
    const oneWeekAgoIso = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const reportsSnap = await db
      .collection('cellMeetingReports')
      .where('submittedAt', '>=', oneWeekAgoIso)
      .get();

    const submittedCellIds = new Set<string>();
    reportsSnap.forEach(doc => {
      const data = doc.data();
      if (data.cellId) submittedCellIds.add(data.cellId);
    });

    const batch = db.batch();
    const missingCells: any[] = [];

    cellsSnap.forEach(doc => {
      const cell = { id: doc.id, ...doc.data() };
      if (!submittedCellIds.has(cell.id)) {
        missingCells.push(cell);

        // Leader reminder notification
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

    // Central Admin summary notification
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
 * Validates server timestamp against the Sunday 6:00 PM Ghana Time deadline.
 * Sets late flag and sends confirmation notification.
 */
export const onCellMeetingReportCreated = onDocumentCreated(
  'cellMeetingReports/{reportId}',
  async event => {
    const snap = event.data;
    if (!snap) return;

    const data = snap.data();
    const submittedAt = data.submittedAt ? new Date(data.submittedAt).getTime() : Date.now();
    const deadline = getGhanaDeadlineTimestamp(new Date(submittedAt));
    const isLate = submittedAt > deadline;

    // Update late status if not already set accurately
    if (data.late !== isLate) {
      await snap.ref.update({
        late: isLate,
        validatedByCloudFunction: true,
      });
    }

    // Dispatch confirmation notification to tutor
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
 * Flags late submissions after the Sunday 6:00 PM cutoff and notifies tutor.
 */
export const onEvangelismReportCreated = onDocumentCreated(
  'evangelismReports/{reportId}',
  async event => {
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
