import { WeeklyReport, Cell } from '../types';
import { formatDate } from './storage';

/**
 * Clean phone number to international WhatsApp format (digits only)
 */
export function sanitizePhoneForWhatsApp(phone: string): string {
  return phone.replace(/[^\d]/g, '');
}

/**
 * Creates a prefilled WhatsApp deep link
 */
export function buildWhatsAppLink(phone: string, text: string): string {
  const clean = sanitizePhoneForWhatsApp(phone);
  const encoded = encodeURIComponent(text);
  if (!clean) {
    return `https://wa.me/?text=${encoded}`;
  }
  return `https://wa.me/${clean}?text=${encoded}`;
}

/**
 * Formats a weekly report summary for WhatsApp sharing
 */
export function formatReportWhatsAppMessage(cell: Cell, report: WeeklyReport): string {
  return `*FORERUNNERS NETWORK INTERNATIONAL (FNI)*\n` +
    `*Weekly Cell Report Summary*\n` +
    `-----------------------------------\n` +
    `*Cell:* ${cell.name} (${cell.area})\n` +
    `*Leader:* ${cell.leader}\n` +
    `*Week of:* ${formatDate(report.week)}\n` +
    `*Status:* ${report.status.toUpperCase()}\n\n` +
    `*NUMBERS*\n` +
    `• Total Attendance: ${report.att}\n` +
    `• First-Time Visitors: ${report.vis}\n` +
    `• Souls Won: ${report.souls}\n` +
    `• Follow-ups Conducted: ${report.fu}\n` +
    `• Evangelism Outreaches: ${report.evg}\n` +
    `• Cell Meetings: ${report.meet}\n\n` +
    (report.prayer ? `*PRAYER REQUESTS:*\n${report.prayer}\n\n` : '') +
    (report.test ? `*TESTIMONY:*\n${report.test}\n\n` : '') +
    (report.chal ? `*CHALLENGES:*\n${report.chal}\n\n` : '') +
    (report.note ? `*REVIEWER NOTE:*\n${report.note}\n\n` : '') +
    `_Submitted via FNI Digital Reporting System_`;
}

/**
 * Generates an overdue reminder message for WhatsApp
 */
export function formatOverdueWhatsAppReminder(cell: Cell, week: string): string {
  return `*FNI REPORTING REMINDER*\n\n` +
    `Dear ${cell.leader},\n\n` +
    `Grace and peace in Christ. This is a reminder from the Administrator that the weekly report for *${cell.name}* (${cell.area}) for the week of *${formatDate(week)}* is currently pending.\n\n` +
    `Kindly submit your report on the FNI Digital Reporting portal.\n\n` +
    `Thank you for your faithful service.\n` +
    `_FNI Administrator_`;
}

/**
 * Generates an email draft for report approval or submission
 */
export function generateReportEmailDraft(cell: Cell, report: WeeklyReport): { subject: string; body: string; mailto: string } {
  const subject = `[FNI Report] ${cell.name} — Week of ${formatDate(report.week)} (${report.status})`;
  const body = `FORERUNNERS NETWORK INTERNATIONAL
WEEKLY CELL REPORT
==========================================

Cell Name: ${cell.name}
Area: ${cell.area}
Cell Leader: ${cell.leader} (${cell.leaderEmail})
Reporting Week: ${formatDate(report.week)}
Status: ${report.status}

METRICS SUMMARY
------------------------------------------
Attendance: ${report.att}
Visitors: ${report.vis}
Souls Won: ${report.souls}
Follow-ups: ${report.fu}
Evangelism Activities: ${report.evg}
Cell Meetings: ${report.meet}

NARRATIVE REPORT
------------------------------------------
Prayer Requests:
${report.prayer || 'None submitted.'}

Testimonies:
${report.test || 'None submitted.'}

Challenges & Remarks:
${report.chal || 'None.'}

Reviewer Feedback:
${report.note || 'No notes.'}

==========================================
Forerunners Network International
Digital Reporting System`;

  const recipient = cell.leaderEmail || 'Joshua0278548636@gmail.com';
  const mailto = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return { subject, body, mailto };
}
