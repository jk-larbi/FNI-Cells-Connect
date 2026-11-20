import React from 'react';

/**
 * FNI Cells Connect — Exact Telegram Desktop & Mobile Icon System
 *
 * Implements the exact solid, colorful vector iconography from the reference:
 * - Vivid semantic color fills (gold, teal, emerald, royal blue, azure, violet, flame)
 * - Solid geometric silhouettes with crisp dual-tone accents
 * - Fully consistent across Settings, Navigation Bars (Sidebar & Mobile Nav), and Modals.
 */

export interface IconProps {
  className?: string;
}

// ==============================================================================
// 1. SETTINGS ICONS (Direct replicas of Telegram Desktop Settings)
// ==============================================================================

// Profile: teal/mint green (#2bb39c)
export const TelegramProfileIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="7.5" r="4" fill="#2bb39c" />
    <path d="M4.5 19.5c0-4 3.5-7 7.5-7s7.5 3 7.5 7" fill="#2bb39c" />
  </svg>
);

// Appearance: grey (#8898aa) handle & warm orange (#f2721c) paintbrush
export const TelegramAppearanceIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 3.5l4.5 4.5-9 9-4.5-4.5 9-9z" fill="#8898aa" />
    <path d="M7 12.5l4.5 4.5-3 3c-1.2 1.2-3 1.2-4.2 0s-1.2-3 0-4.2l2.7-3.3z" fill="#f2721c" />
  </svg>
);

// Privacy and Security: light blue (#3da0e3) body & grey (#8a99a8) shackle
export const TelegramPrivacyIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="10" width="14" height="11" rx="3" fill="#3da0e3" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="#8a99a8" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="12" cy="15" r="1.5" fill="#ffffff" />
    <path d="M12 16.5v2" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// Notifications: royal blue (#2d88e6) bell
export const TelegramNotificationsIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 16v-5a6 6 0 1 0-12 0v5l-2 2h16l-2-2z" fill="#2d88e6" />
    <path d="M10 20a2 2 0 0 0 4 0" fill="#2d88e6" />
  </svg>
);

// Data and Storage: blue shades stacked cylinders (#298ce6 / #4faaf5)
export const TelegramDataStorageIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="12" cy="6" rx="8" ry="3" fill="#4faaf5" />
    <path d="M4 6v4c0 1.66 3.58 3 8 3s8-1.34 8-3V6" fill="#298ce6" />
    <ellipse cx="12" cy="10" rx="8" ry="3" fill="#4faaf5" />
    <path d="M4 10v4c0 1.66 3.58 3 8 3s8-1.34 8-3v-4" fill="#298ce6" />
    <ellipse cx="12" cy="14" rx="8" ry="3" fill="#4faaf5" />
    <path d="M4 14v4c0 1.66 3.58 3 8 3s8-1.34 8-3v-4" fill="#298ce6" />
    <ellipse cx="12" cy="18" rx="8" ry="3" fill="#4faaf5" />
  </svg>
);

// Power Saving: green (#38b000) & yellow (#f9b208) battery with energy bolt
export const TelegramPowerSavingIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="7" width="15" height="10" rx="2.5" fill="#38b000" />
    <path d="M18 10.5h2v3h-2v-3z" fill="#38b000" />
    <path d="M11 7.5l-3.5 5.5h4l-2 3.5 5.5-5.5h-4l2-3.5h-2z" fill="#f9b208" />
  </svg>
);

// Folders: warm yellow/gold (#f2a900 / #d9992b) folder
export const TelegramFoldersIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 6a2 2 0 0 1 2-2h4.5a2 2 0 0 1 1.4.6L12.5 6H19a2 2 0 0 1 2 2v2H3V6z" fill="#d9992b" />
    <path d="M3 10h18l-1.5 9a2 2 0 0 1-2 1.8H6.5a2 2 0 0 1-2-1.8L3 10z" fill="#f2a900" />
  </svg>
);

// Devices: light blue (#4599df) phone & grey (#8898aa) monitor
export const TelegramDevicesIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="5" width="13" height="10" rx="1.5" stroke="#8898aa" strokeWidth="2" fill="#eef2f6" />
    <path d="M7 18h5M9.5 15v3" stroke="#8898aa" strokeWidth="2" strokeLinecap="round" />
    <rect x="13" y="9" width="7" height="11" rx="1.5" fill="#4599df" />
    <circle cx="16.5" cy="18" r="0.75" fill="#ffffff" />
  </svg>
);

// Language: sky blue (#38a3d6) wireframe globe
export const TelegramLanguageIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" stroke="#38a3d6" strokeWidth="2" />
    <path d="M3.6 9h16.8M3.6 15h16.8" stroke="#38a3d6" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M12 3c3 3.5 4.5 6.5 4.5 9s-1.5 5.5-4.5 9c-3-3.5-4.5-6.5-4.5-9s1.5-5.5 4.5-9z" stroke="#38a3d6" strokeWidth="1.5" />
  </svg>
);

// Advanced: medium grey (#8e98a3) gear
export const TelegramAdvancedIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd" d="M19.4 13a7.8 7.8 0 0 0 .1-1 7.8 7.8 0 0 0-.1-1l2.1-1.6a.5.5 0 0 0 .1-.6l-2-3.5a.5.5 0 0 0-.6-.2l-2.5 1a7.5 7.5 0 0 0-1.7-1l-.4-2.6a.5.5 0 0 0-.5-.4h-4a.5.5 0 0 0-.5.4l-.4 2.6a7.5 7.5 0 0 0-1.7 1l-2.5-1a.5.5 0 0 0-.6.2l-2 3.5a.5.5 0 0 0 .1.6L4.6 11a7.8 7.8 0 0 0-.1 1c0 .3 0 .7.1 1l-2.1 1.6a.5.5 0 0 0-.1.6l2 3.5a.5.5 0 0 0 .6.2l2.5-1a7.5 7.5 0 0 0 1.7 1l.4 2.6c.1.2.3.4.5.4h4c.2 0 .4-.2.5-.4l.4-2.6a7.5 7.5 0 0 0 1.7-1l2.5 1a.5.5 0 0 0 .6-.2l2-3.5a.5.5 0 0 0-.1-.6L19.4 13zm-7.4 2.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" fill="#8e98a3" />
  </svg>
);

// Help & Support: soft violet/purple (#9b59b6)
export const TelegramHelpIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" stroke="#9b59b6" strokeWidth="2" />
    <path d="M10 9a2 2 0 1 1 3.5 1.3c-.8.8-1.5 1.2-1.5 2.2v.5M12 17h.01" stroke="#9b59b6" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Privacy Policy: teal shield (#16a085) with white checkmark
export const TelegramShieldPolicyIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 3L4 6.5v6c0 5 3.5 8.5 8 9.5 4.5-1 8-4.5 8-9.5v-6L12 3z" fill="#16a085" />
    <path d="M9 12l2 2 4-4" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Terms of Service: warm amber document (#e59b24)
export const TelegramTermsIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 3h8l5 5v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" fill="#e59b24" />
    <path d="M8 12h8M8 16h5" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// Request Deactivation / Warning: soft rose/coral (#e74c3c)
export const TelegramDeactivationIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 4l9 16H3L12 4z" fill="#e74c3c" />
    <path d="M12 10v4M12 17h.01" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Log Out: soft crimson/red (#e74c3c)
export const TelegramLogoutIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round" />
    <path d="M16 17l5-5-5-5M21 12H9" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ==============================================================================
// 2. NAVIGATION BAR ICONS (Sidebar & Mobile Navigation)
// Solid, high-contrast, dual-tone Telegram vector iconography
// ==============================================================================

// Dashboard / Home: Gold/Amber solid tiles (#d9992b / #f2a900)
export const TelegramDashboardIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="8" height="9" rx="2" fill="#d9992b" />
    <rect x="13" y="3" width="8" height="6" rx="2" fill="#f2a900" />
    <rect x="3" y="14" width="8" height="7" rx="2" fill="#f2a900" />
    <rect x="13" y="11" width="8" height="10" rx="2" fill="#d9992b" />
  </svg>
);

// Cells / Fellowship: Teal/Mint architectural columns & community roof (#2bb39c / #16a085)
export const TelegramCellsIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2.5L2 8v2h20V8L12 2.5z" fill="#2bb39c" />
    <rect x="4" y="11" width="3" height="8" rx="0.5" fill="#16a085" />
    <rect x="9" y="11" width="3" height="8" rx="0.5" fill="#2bb39c" />
    <rect x="14" y="11" width="3" height="8" rx="0.5" fill="#2bb39c" />
    <rect x="19" y="11" width="3" height="8" rx="0.5" fill="#16a085" />
    <path d="M2 20h20v2H2v-2z" fill="#16a085" />
  </svg>
);

// Reports: Solid Emerald clipboard & document with checkmark (#10b981 / #059669)
export const TelegramReportsIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="4" width="16" height="17" rx="3" fill="#10b981" />
    <rect x="8.5" y="2" width="7" height="3.5" rx="1.5" fill="#059669" />
    <path d="M8 12.5l2.5 2.5 5.5-5.5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Learning Portal: Solid Purple graduation cap with gold tassel (#8e44ad / #f39c12)
export const TelegramLearningIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 3L1 9l11 6 9-4.9V16h2V9L12 3z" fill="#8e44ad" />
    <path d="M5 13.18v4c0 2.5 3.13 4.5 7 4.5s7-2 7-4.5v-4L12 17l-7-3.82z" fill="#9b59b6" />
    <circle cx="21" cy="16.5" r="1.5" fill="#f39c12" />
  </svg>
);

// Evangelism: Vibrant red flame with inner golden fire (#e74c3c / #f39c12)
export const TelegramEvangelismIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C9.5 5.5 6 9.5 6 14a6 6 0 0 0 12 0c0-4.5-3.5-8.5-6-12z" fill="#e74c3c" />
    <path d="M12 9c-1.5 2-3 4-3 6a3 3 0 0 0 6 0c0-2-1.5-4-3-6z" fill="#f39c12" />
  </svg>
);

// Follow-ups: Teal person with green verified checkmark (#2bb39c / #38b000)
export const TelegramFollowUpsIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="9" cy="8" r="3.5" fill="#2bb39c" />
    <path d="M2.5 19c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6" fill="#2bb39c" />
    <circle cx="17.5" cy="15.5" r="4.5" fill="#38b000" />
    <path d="M15.5 15.5l1.5 1.5 2.5-2.5" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Offering / Finance: Solid emerald currency bill with gold emblem (#27ae60 / #f1c40f)
export const TelegramFinanceIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2.5" y="6" width="19" height="12" rx="2.5" fill="#27ae60" />
    <circle cx="12" cy="12" r="3.5" fill="#2ecc71" />
    <circle cx="12" cy="12" r="2.2" fill="#f1c40f" />
    <circle cx="6" cy="12" r="1.5" fill="#2ecc71" />
    <circle cx="18" cy="12" r="1.5" fill="#2ecc71" />
  </svg>
);

// Communications Hub / Messages: Telegram signature cyan/blue airplane (#2aabee / #ffffff)
export const TelegramMessagesIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" fill="#2aabee" />
    <path d="M5.8 11.8l10.8-4.2c.5-.2 1 .2.8.7l-2 9.5c-.1.5-.7.7-1.1.4l-3-2.2-1.5 1.4c-.2.2-.6.1-.6-.2v-2.3l6.5-5.9-8.1 5.1-1.8-.6c-.5-.1-.5-.8 0-1z" fill="#ffffff" />
  </svg>
);

// Calls & Meetings: Solid violet phone handset & live broadcast waves (#8e44ad / #a569bd)
export const TelegramCallsIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="18" height="18" rx="5" fill="#8e44ad" />
    <path d="M15.5 13.5c-.8 0-1.5-.4-2-.9l-1.1 1.1c.8.8 1.9 1.3 3.1 1.3.4 0 .7-.3.7-.7v-1.5c0-.4-.3-.7-.7-.7zm-7-3c0 1.2.5 2.3 1.3 3.1l1.1-1.1c-.5-.5-.9-1.2-.9-2 0-.4-.3-.7-.7-.7H7.8c-.4 0-.7.3-.7.7zm7.5-2.5c-.3 0-.5.2-.5.5 0 2.2-1.8 4-4 4-.3 0-.5.2-.5.5s.2.5.5.5c2.8 0 5-2.2 5-5 0-.3-.2-.5-.5-.5z" fill="#ffffff" />
    <path d="M8.2 7h2c.4 0 .7.3.7.7v1.8c0 .4-.3.7-.7.7-.8 0-1.5.3-2.1.8l-1.3-1.3c.7-.7 1.6-1.1 2.6-1.1zm7.6 7.6l-1.3-1.3c.5-.6.8-1.3.8-2.1 0-.4.3-.7.7-.7h1.8c.4 0 .7.3.7.7 0 1-.4 1.9-1.1 2.6z" fill="#ffffff" />
  </svg>
);

// Analytics: Royal blue ascending statistics bars (#298ce6 / #4faaf5)
export const TelegramAnalyticsIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="14" width="4" height="7" rx="1.5" fill="#4faaf5" />
    <rect x="10" y="8" width="4" height="13" rx="1.5" fill="#298ce6" />
    <rect x="17" y="3" width="4" height="18" rx="1.5" fill="#1e88e5" />
  </svg>
);

// History: Blue clockwise history dial (#3da0e3 / #8a99a8)
export const TelegramHistoryIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" stroke="#3da0e3" strokeWidth="2.5" />
    <path d="M12 7v5l3.5 2" stroke="#3da0e3" strokeWidth="2" strokeLinecap="round" />
    <path d="M7 4.5l-3.5 2 1.5 3.5" fill="#3da0e3" />
  </svg>
);

// Map Pin / GPS Location History: Solid cyan location marker (#06b6d4 / #ffffff)
export const TelegramLocationIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C7.5 2 4 5.5 4 10c0 5.2 6.5 11.3 7.4 12.1.3.3.9.3 1.2 0 .9-.8 7.4-6.9 7.4-12.1 0-4.5-3.5-8-8-8z" fill="#06b6d4" />
    <circle cx="12" cy="9.5" r="3" fill="#ffffff" />
  </svg>
);

// Deadlines / Time Limit: Flame red clock with alert marker (#e74c3c / #ffffff)
export const TelegramDeadlinesIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" fill="#e74c3c" />
    <path d="M12 6.5v5.5l3.5 2" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Assignments / Book: Warm amber open scripture / textbook (#f2a900 / #d9992b)
export const TelegramAssignmentsIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 4.5C4 3.7 4.7 3 5.5 3H11v16H5.5C4.7 19 4 18.3 4 17.5V4.5z" fill="#d9992b" />
    <path d="M13 3h5.5c.8 0 1.5.7 1.5 1.5v13c0 .8-.7 1.5-1.5 1.5H13V3z" fill="#f2a900" />
    <path d="M6 7h3M6 10h3M15 7h3M15 10h3" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

// Quizzes: Warm orange quiz checkmark sheet (#f2721c / #ffffff)
export const TelegramQuizzesIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="3" width="16" height="18" rx="2.5" fill="#f2721c" />
    <path d="M7.5 8l2 2 4.5-4.5M7.5 14l2 2 4.5-4.5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Events / Calendar: Sky blue tear-off calendar sheet (#38a3d6 / #eef2f6)
export const TelegramEventsIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="5" width="18" height="16" rx="3" fill="#eef2f6" />
    <path d="M3 8a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v2H3V8z" fill="#38a3d6" />
    <rect x="7" y="2" width="2" height="4" rx="1" fill="#38a3d6" />
    <rect x="15" y="2" width="2" height="4" rx="1" fill="#38a3d6" />
    <circle cx="8" cy="14" r="1.5" fill="#8898aa" />
    <circle cx="12" cy="14" r="1.5" fill="#8898aa" />
    <circle cx="16" cy="14" r="1.5" fill="#8898aa" />
  </svg>
);

// Materials / Library: Golden binder stacks (#f2a900 / #d9992b)
export const TelegramMaterialsIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="4" width="5" height="16" rx="1" fill="#d9992b" />
    <rect x="9.5" y="4" width="5" height="16" rx="1" fill="#f2a900" />
    <path d="M16 5.5l4 1.5-4.5 13-4-1.5 4.5-13z" fill="#d9992b" />
  </svg>
);

// Mobile Quick Submit Plus Report: Emerald button (#10b981 / #ffffff)
export const TelegramPlusReportIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" fill="#10b981" />
    <path d="M12 7v10M7 12h10" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

// Community / Multi-User Group: Teal people silhouette (#2bb39c / #16a085)
export const TelegramUsersIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="9" cy="8" r="3.5" fill="#2bb39c" />
    <path d="M3 18c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" fill="#2bb39c" />
    <circle cx="16.5" cy="9.5" r="2.8" fill="#16a085" />
    <path d="M15.5 17.5c.3-1.8 1.8-3.2 3.8-3.2 1.2 0 2.2.5 2.8 1.4.6.9.9 2 .9 2.8" fill="#16a085" />
  </svg>
);
