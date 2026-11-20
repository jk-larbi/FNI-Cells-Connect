import React from 'react';

/**
 * FNI Cells Connect — Exact Telegram Desktop Settings Icon Replica
 *
 * Implements the exact vector icon shapes and colors from the reference:
 * - Profile: teal/mint green
 * - Appearance: grey and orange paintbrush
 * - Privacy and security: light blue and grey padlock
 * - Notifications: vibrant royal blue bell
 * - Data and storage: blue shades stacked cylinders
 * - Power saving: green and yellow battery/leaf
 * - Folders: warm yellow/gold folder
 * - Devices: light blue and grey monitor & phone
 * - Language: sky blue wireframe globe
 * - Advanced: medium grey mechanical gear
 * - Help: violet/blue help circle
 * - Policies: teal/blue shield & amber document
 * - Danger: muted coral alert & logout
 */

interface IconProps {
  className?: string;
}

// 1. Profile: teal/mint green (#2bb39c)
export const TelegramProfileIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="7.5" r="4" fill="#2bb39c" />
    <path d="M4.5 19.5c0-4 3.5-7 7.5-7s7.5 3 7.5 7" fill="#2bb39c" />
  </svg>
);

// 2. Appearance: grey (#8898aa) handle & warm orange (#f2721c) paintbrush
export const TelegramAppearanceIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 3.5l4.5 4.5-9 9-4.5-4.5 9-9z" fill="#8898aa" />
    <path d="M7 12.5l4.5 4.5-3 3c-1.2 1.2-3 1.2-4.2 0s-1.2-3 0-4.2l2.7-3.3z" fill="#f2721c" />
  </svg>
);

// 3. Privacy and Security: light blue (#3da0e3) body & grey (#8a99a8) shackle
export const TelegramPrivacyIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="10" width="14" height="11" rx="3" fill="#3da0e3" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="#8a99a8" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="12" cy="15" r="1.5" fill="#ffffff" />
    <path d="M12 16.5v2" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// 4. Notifications: royal blue (#2d88e6) bell
export const TelegramNotificationsIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 16v-5a6 6 0 1 0-12 0v5l-2 2h16l-2-2z" fill="#2d88e6" />
    <path d="M10 20a2 2 0 0 0 4 0" fill="#2d88e6" />
  </svg>
);

// 5. Data and Storage: blue shades stacked cylinders (#298ce6 / #4faaf5)
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

// 6. Power Saving: green (#38b000) & yellow (#f9b208) battery with energy bolt
export const TelegramPowerSavingIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="7" width="15" height="10" rx="2.5" fill="#38b000" />
    <path d="M18 10.5h2v3h-2v-3z" fill="#38b000" />
    <path d="M11 7.5l-3.5 5.5h4l-2 3.5 5.5-5.5h-4l2-3.5h-2z" fill="#f9b208" />
  </svg>
);

// 7. Folders: warm yellow/gold (#f2a900 / #d9992b) folder
export const TelegramFoldersIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 6a2 2 0 0 1 2-2h4.5a2 2 0 0 1 1.4.6L12.5 6H19a2 2 0 0 1 2 2v2H3V6z" fill="#d9992b" />
    <path d="M3 10h18l-1.5 9a2 2 0 0 1-2 1.8H6.5a2 2 0 0 1-2-1.8L3 10z" fill="#f2a900" />
  </svg>
);

// 8. Devices: light blue (#4599df) phone & grey (#8898aa) monitor
export const TelegramDevicesIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="5" width="13" height="10" rx="1.5" stroke="#8898aa" strokeWidth="2" fill="#eef2f6" />
    <path d="M7 18h5M9.5 15v3" stroke="#8898aa" strokeWidth="2" strokeLinecap="round" />
    <rect x="13" y="9" width="7" height="11" rx="1.5" fill="#4599df" />
    <circle cx="16.5" cy="18" r="0.75" fill="#ffffff" />
  </svg>
);

// 9. Language: sky blue (#38a3d6) wireframe globe
export const TelegramLanguageIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" stroke="#38a3d6" strokeWidth="2" />
    <path d="M3.6 9h16.8M3.6 15h16.8" stroke="#38a3d6" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M12 3c3 3.5 4.5 6.5 4.5 9s-1.5 5.5-4.5 9c-3-3.5-4.5-6.5-4.5-9s1.5-5.5 4.5-9z" stroke="#38a3d6" strokeWidth="1.5" />
  </svg>
);

// 10. Advanced: medium grey (#8e98a3) gear
export const TelegramAdvancedIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd" d="M19.4 13a7.8 7.8 0 0 0 .1-1 7.8 7.8 0 0 0-.1-1l2.1-1.6a.5.5 0 0 0 .1-.6l-2-3.5a.5.5 0 0 0-.6-.2l-2.5 1a7.5 7.5 0 0 0-1.7-1l-.4-2.6a.5.5 0 0 0-.5-.4h-4a.5.5 0 0 0-.5.4l-.4 2.6a7.5 7.5 0 0 0-1.7 1l-2.5-1a.5.5 0 0 0-.6.2l-2 3.5a.5.5 0 0 0 .1.6L4.6 11a7.8 7.8 0 0 0-.1 1c0 .3 0 .7.1 1l-2.1 1.6a.5.5 0 0 0-.1.6l2 3.5a.5.5 0 0 0 .6.2l2.5-1a7.5 7.5 0 0 0 1.7 1l.4 2.6c.1.2.3.4.5.4h4c.2 0 .4-.2.5-.4l.4-2.6a7.5 7.5 0 0 0 1.7-1l2.5 1a.5.5 0 0 0 .6-.2l2-3.5a.5.5 0 0 0-.1-.6L19.4 13zm-7.4 2.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" fill="#8e98a3" />
  </svg>
);

// 11. Help & Support: soft violet/purple (#8e44ad)
export const TelegramHelpIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" stroke="#9b59b6" strokeWidth="2" />
    <path d="M10 9a2 2 0 1 1 3.5 1.3c-.8.8-1.5 1.2-1.5 2.2v.5M12 17h.01" stroke="#9b59b6" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// 12. Privacy Policy: teal shield (#16a085)
export const TelegramShieldPolicyIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 3L4 6.5v6c0 5 3.5 8.5 8 9.5 4.5-1 8-4.5 8-9.5v-6L12 3z" fill="#16a085" />
    <path d="M9 12l2 2 4-4" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// 13. Terms of Service: warm amber document (#e59b24)
export const TelegramTermsIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 3h8l5 5v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" fill="#e59b24" />
    <path d="M8 12h8M8 16h5" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// 14. Request Deactivation / Warning: soft rose/coral (#e74c3c)
export const TelegramDeactivationIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 4l9 16H3L12 4z" fill="#e74c3c" />
    <path d="M12 10v4M12 17h.01" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// 15. Log Out: soft crimson/red (#e74c3c)
export const TelegramLogoutIcon: React.FC<IconProps> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round" />
    <path d="M16 17l5-5-5-5M21 12H9" stroke="#e74c3c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
