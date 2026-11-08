/**
 * FNI Digital Reporting System - Ghana Time & Weekly Reporting Deadline Utility
 *
 * Mandatory System Rule:
 * Every weekly cell report is due Sunday at exactly 6:00 PM Ghana time (Africa/Accra, UTC+0 / GMT).
 *
 * Ghana (Africa/Accra) is permanently in Greenwich Mean Time (GMT, UTC+0) and does not observe Daylight Saving Time.
 * Therefore, Sunday 6:00 PM Ghana Time is ALWAYS Sunday 18:00:00Z (UTC).
 */

export interface DeadlineInfo {
  periodId: string;
  periodName: string;
  year: number;
  weekNumber: number;
  startDateIso: string;
  endDateIso: string;
  deadlineIso: string;
  deadlineFormatted: string;
  isPastDeadline: boolean;
  timeRemainingMs: number;
  timeRemainingText: string;
}

/**
 * Returns current timestamp in UTC (equivalent to Africa/Accra / Ghana time)
 */
export function getGhanaCurrentDate(): Date {
  return new Date();
}

/**
 * Returns the ISO 8601 week number for a given date (UTC based)
 */
export function getIsoWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Calculate the exact deadline (Sunday 18:00:00Z) for a specific year and week number
 */
export function getGhanaDeadlineForWeek(year: number, weekNumber: number): {
  startDate: string;
  endDate: string;
  deadlineIso: string;
} {
  // Approximate the target week's Monday
  const simple = new Date(Date.UTC(year, 0, 1 + (weekNumber - 1) * 7));
  const dayOfWeek = simple.getUTCDay();
  const ISOweekStart = new Date(simple);
  if (dayOfWeek <= 4) {
    ISOweekStart.setUTCDate(simple.getUTCDate() - simple.getUTCDay() + 1);
  } else {
    ISOweekStart.setUTCDate(simple.getUTCDate() + 8 - simple.getUTCDay());
  }

  // Sunday of that week
  const sunday = new Date(ISOweekStart);
  sunday.setUTCDate(ISOweekStart.getUTCDate() + 6);
  sunday.setUTCHours(18, 0, 0, 0); // Exactly 6:00 PM Ghana time (18:00 UTC)

  const startDateStr = ISOweekStart.toISOString().split('T')[0];
  const endDateStr = sunday.toISOString().split('T')[0];
  const deadlineIso = sunday.toISOString();

  return {
    startDate: startDateStr,
    endDate: endDateStr,
    deadlineIso,
  };
}

/**
 * Get active deadline info for the current cycle
 */
export function getCurrentDeadlineInfo(activeWeekNumber = 45, year = 2026): DeadlineInfo {
  const { startDate, endDate, deadlineIso } = getGhanaDeadlineForWeek(year, activeWeekNumber);
  const deadlineDate = new Date(deadlineIso);
  const now = new Date();
  const timeRemainingMs = deadlineDate.getTime() - now.getTime();
  const isPastDeadline = timeRemainingMs < 0;

  let timeRemainingText = '';
  if (isPastDeadline) {
    const hoursOver = Math.abs(Math.floor(timeRemainingMs / (1000 * 60 * 60)));
    const minsOver = Math.abs(Math.floor((timeRemainingMs % (1000 * 60 * 60)) / (1000 * 60)));
    timeRemainingText = `Overdue by ${hoursOver}h ${minsOver}m (Late submission applies)`;
  } else {
    const days = Math.floor(timeRemainingMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeRemainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeRemainingMs % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) {
      timeRemainingText = `${days}d ${hours}h left before cutoff`;
    } else {
      timeRemainingText = `${hours}h ${minutes}m remaining`;
    }
  }

  // Human friendly deadline description
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Africa/Accra',
    timeZoneName: 'short',
  };
  const deadlineFormatted = new Intl.DateTimeFormat('en-GB', options).format(deadlineDate);

  return {
    periodId: `prd-w${activeWeekNumber}`,
    periodName: `${year} - Week ${activeWeekNumber}`,
    year,
    weekNumber: activeWeekNumber,
    startDateIso: startDate,
    endDateIso: endDate,
    deadlineIso,
    deadlineFormatted: `Sunday 6:00 PM Ghana Time (${deadlineFormatted})`,
    isPastDeadline,
    timeRemainingMs,
    timeRemainingText,
  };
}

/**
 * Determines whether a submitted report is on-time or late based on server/trusted timestamp
 * compared against the Sunday 6:00 PM Ghana time deadline.
 */
export function evaluateSubmissionTiming(
  submittedAtIso: string,
  deadlineIso: string
): { isLate: boolean; timing: 'on_time' | 'late'; label: string } {
  const submitTime = new Date(submittedAtIso).getTime();
  const deadlineTime = new Date(deadlineIso).getTime();

  // If submitTime > deadlineTime, it is marked as late!
  const isLate = submitTime > deadlineTime;

  return {
    isLate,
    timing: isLate ? 'late' : 'on_time',
    label: isLate ? 'Late Submission' : 'On-Time Submission',
  };
}

export interface LiveSubmissionTracking {
  exactTime: string;
  timeFormatted: string;
  dateFormatted: string;
  relativeTime: string;
  isJustNow: boolean;
  minutesAgo: number;
}

/**
 * Computes live real-time submission tracking relative to Ghana time (GMT).
 * Evaluates live relative time ("Just now", "4m ago", "2h ago") and exact submission timestamp.
 */
export function formatLiveSubmissionTracking(
  submittedAtIso?: string,
  nowTimestamp: number = Date.now()
): LiveSubmissionTracking {
  if (!submittedAtIso) {
    return {
      exactTime: 'Time unknown',
      timeFormatted: '—',
      dateFormatted: '—',
      relativeTime: 'N/A',
      isJustNow: false,
      minutesAgo: 0,
    };
  }

  const submittedDate = new Date(submittedAtIso);
  const diffMs = Math.max(0, nowTimestamp - submittedDate.getTime());
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  let relativeTime = '';
  let isJustNow = false;
  if (diffSecs < 45) {
    relativeTime = 'Just now';
    isJustNow = true;
  } else if (diffMins < 60) {
    relativeTime = `${diffMins}m ago`;
  } else if (diffHours < 24) {
    relativeTime = `${diffHours}h ${diffMins % 60}m ago`;
  } else {
    relativeTime = `${diffDays}d ago`;
  }

  const timeFormatted = submittedDate.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Africa/Accra',
  });

  const dateFormatted = submittedDate.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    timeZone: 'Africa/Accra',
  });

  const exactTime = `${dateFormatted} at ${timeFormatted} GMT`;

  return {
    exactTime,
    timeFormatted,
    dateFormatted,
    relativeTime,
    isJustNow,
    minutesAgo: diffMins,
  };
}
