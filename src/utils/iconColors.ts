/**
 * FNI Cells Connect — Centralized Colorful Icon Design System
 * 
 * Provides purposeful, distinct, high-contrast semantic icon colors
 * inspired by modern Telegram / iOS icon styling.
 * 
 * Every icon communicates its functional category with intentionality
 * across Light and Dark themes, Android APK, iOS PWA, and Desktop.
 */

export interface IconStyleDef {
  text: string;
  bg: string;
  hoverBg: string;
  activeBg: string;
  badge: string;
  border: string;
  fill?: string;
}

export const ICON_STYLES = {
  // 1. Turquoise / Teal: Profiles, people, cell leaders, tutors, personal accounts
  teal: {
    text: 'text-[#00B4D8] dark:text-[#22D3EE]',
    bg: 'bg-[#00B4D8]/10 dark:bg-[#00B4D8]/20',
    hoverBg: 'hover:bg-[#00B4D8]/15 dark:hover:bg-[#00B4D8]/25',
    activeBg: 'bg-[#00B4D8]/20 dark:bg-[#00B4D8]/30',
    badge: 'bg-[#00B4D8]/15 text-[#008BA3] dark:text-[#67E8F9]',
    border: 'border-[#00B4D8]/30 dark:border-[#00B4D8]/40',
    fill: 'fill-[#00B4D8]/20',
  },

  // 2. Warm Orange / Coral: Theme, appearance, creativity, design, sun/moon
  orange: {
    text: 'text-[#FF8E25] dark:text-[#FDBA74]',
    bg: 'bg-[#FF8E25]/10 dark:bg-[#FF8E25]/20',
    hoverBg: 'hover:bg-[#FF8E25]/15 dark:hover:bg-[#FF8E25]/25',
    activeBg: 'bg-[#FF8E25]/20 dark:bg-[#FF8E25]/30',
    badge: 'bg-[#FF8E25]/15 text-[#C25E00] dark:text-[#FDBA74]',
    border: 'border-[#FF8E25]/30 dark:border-[#FF8E25]/40',
    fill: 'fill-[#FF8E25]/20',
  },

  // 3. Royal Blue: Security, passwords, locks, privacy policies, audit trails
  blue: {
    text: 'text-[#3B82F6] dark:text-[#60A5FA]',
    bg: 'bg-[#3B82F6]/10 dark:bg-[#3B82F6]/20',
    hoverBg: 'hover:bg-[#3B82F6]/15 dark:hover:bg-[#3B82F6]/25',
    activeBg: 'bg-[#3B82F6]/20 dark:bg-[#3B82F6]/30',
    badge: 'bg-[#3B82F6]/15 text-[#1D4ED8] dark:text-[#93C5FD]',
    border: 'border-[#3B82F6]/30 dark:border-[#3B82F6]/40',
    fill: 'fill-[#3B82F6]/20',
  },

  // 4. Bright Sky Blue: Notifications, alerts, chimes, bell, system pushes
  sky: {
    text: 'text-[#00A3E0] dark:text-[#38BDF8]',
    bg: 'bg-[#00A3E0]/10 dark:bg-[#00A3E0]/20',
    hoverBg: 'hover:bg-[#00A3E0]/15 dark:hover:bg-[#00A3E0]/25',
    activeBg: 'bg-[#00A3E0]/20 dark:bg-[#00A3E0]/30',
    badge: 'bg-[#00A3E0]/15 text-[#0077A3] dark:text-[#7DD3FC]',
    border: 'border-[#00A3E0]/30 dark:border-[#00A3E0]/40',
    fill: 'fill-[#00A3E0]/20',
  },

  // 5. Azure / Telegram Blue: Messages, community communication, broadcast channels
  azure: {
    text: 'text-[#2AABEE] dark:text-[#38BDF8]',
    bg: 'bg-[#2AABEE]/10 dark:bg-[#2AABEE]/20',
    hoverBg: 'hover:bg-[#2AABEE]/15 dark:hover:bg-[#2AABEE]/25',
    activeBg: 'bg-[#2AABEE]/20 dark:bg-[#2AABEE]/30',
    badge: 'bg-[#2AABEE]/15 text-[#1A7BA8] dark:text-[#7DD3FC]',
    border: 'border-[#2AABEE]/30 dark:border-[#2AABEE]/40',
    fill: 'fill-[#2AABEE]/20',
  },

  // 6. Emerald Green: Reports, meeting returns, approved status, finances & offering
  emerald: {
    text: 'text-[#10B981] dark:text-[#34D399]',
    bg: 'bg-[#10B981]/10 dark:bg-[#10B981]/20',
    hoverBg: 'hover:bg-[#10B981]/15 dark:hover:bg-[#10B981]/25',
    activeBg: 'bg-[#10B981]/20 dark:bg-[#10B981]/30',
    badge: 'bg-[#10B981]/15 text-[#047857] dark:text-[#6EE7B7]',
    border: 'border-[#10B981]/30 dark:border-[#10B981]/40',
    fill: 'fill-[#10B981]/20',
  },

  // 7. Warm Golden Amber: Folders, teaching materials, quizzes, study guides, terms
  amber: {
    text: 'text-[#F59E0B] dark:text-[#FBBF24]',
    bg: 'bg-[#F59E0B]/10 dark:bg-[#F59E0B]/20',
    hoverBg: 'hover:bg-[#F59E0B]/15 dark:hover:bg-[#F59E0B]/25',
    activeBg: 'bg-[#F59E0B]/20 dark:bg-[#F59E0B]/30',
    badge: 'bg-[#F59E0B]/15 text-[#B45309] dark:text-[#FDE68A]',
    border: 'border-[#F59E0B]/30 dark:border-[#F59E0B]/40',
    fill: 'fill-[#F59E0B]/20',
  },

  // 8. FNI Royal Gold: Main dashboard, leadership honors, kingdom vision, soul targets
  gold: {
    text: 'text-[#C6A45A] dark:text-[#E0BE73]',
    bg: 'bg-[#C6A45A]/12 dark:bg-[#C6A45A]/22',
    hoverBg: 'hover:bg-[#C6A45A]/18 dark:hover:bg-[#C6A45A]/28',
    activeBg: 'bg-[#C6A45A]/24 dark:bg-[#C6A45A]/35',
    badge: 'bg-[#C6A45A]/15 text-[#8A6D30] dark:text-[#E0BE73]',
    border: 'border-[#C6A45A]/35 dark:border-[#C6A45A]/45',
    fill: 'fill-[#C6A45A]/20',
  },

  // 9. Slate Blue / Indigo: Devices, APK updates, package installer, mobile platforms
  indigo: {
    text: 'text-[#6366F1] dark:text-[#818CF8]',
    bg: 'bg-[#6366F1]/10 dark:bg-[#6366F1]/20',
    hoverBg: 'hover:bg-[#6366F1]/15 dark:hover:bg-[#6366F1]/25',
    activeBg: 'bg-[#6366F1]/20 dark:bg-[#6366F1]/30',
    badge: 'bg-[#6366F1]/15 text-[#4338CA] dark:text-[#A5B4FC]',
    border: 'border-[#6366F1]/30 dark:border-[#6366F1]/40',
    fill: 'fill-[#6366F1]/20',
  },

  // 10. Cyan / Aqua: Time, Ghana UTC+0 clock, GPS location history, map pins
  cyan: {
    text: 'text-[#06B6D4] dark:text-[#22D3EE]',
    bg: 'bg-[#06B6D4]/10 dark:bg-[#06B6D4]/20',
    hoverBg: 'hover:bg-[#06B6D4]/15 dark:hover:bg-[#06B6D4]/25',
    activeBg: 'bg-[#06B6D4]/20 dark:bg-[#06B6D4]/30',
    badge: 'bg-[#06B6D4]/15 text-[#0E7490] dark:text-[#67E8F9]',
    border: 'border-[#06B6D4]/30 dark:border-[#06B6D4]/40',
    fill: 'fill-[#06B6D4]/20',
  },

  // 11. Refined Slate Grey: Settings, tools, sliders, advanced configuration
  slate: {
    text: 'text-[#64748B] dark:text-[#94A3B8]',
    bg: 'bg-[#64748B]/10 dark:bg-[#64748B]/20',
    hoverBg: 'hover:bg-[#64748B]/15 dark:hover:bg-[#64748B]/25',
    activeBg: 'bg-[#64748B]/20 dark:bg-[#64748B]/30',
    badge: 'bg-[#64748B]/15 text-[#334155] dark:text-[#CBD5E1]',
    border: 'border-[#64748B]/30 dark:border-[#64748B]/40',
    fill: 'fill-[#64748B]/20',
  },

  // 12. Vibrant Purple / Violet: Calls, video conferences, audio rooms, learning portal
  purple: {
    text: 'text-[#8B5CF6] dark:text-[#A78BFA]',
    bg: 'bg-[#8B5CF6]/10 dark:bg-[#8B5CF6]/20',
    hoverBg: 'hover:bg-[#8B5CF6]/15 dark:hover:bg-[#8B5CF6]/25',
    activeBg: 'bg-[#8B5CF6]/20 dark:bg-[#8B5CF6]/30',
    badge: 'bg-[#8B5CF6]/15 text-[#6D28D9] dark:text-[#C4B5FD]',
    border: 'border-[#8B5CF6]/30 dark:border-[#8B5CF6]/40',
    fill: 'fill-[#8B5CF6]/20',
  },

  // 13. Flame Red / Rose: Evangelism soul harvest, urgent deadlines, deactivation
  flame: {
    text: 'text-[#EF4444] dark:text-[#F87171]',
    bg: 'bg-[#EF4444]/10 dark:bg-[#EF4444]/20',
    hoverBg: 'hover:bg-[#EF4444]/15 dark:hover:bg-[#EF4444]/25',
    activeBg: 'bg-[#EF4444]/20 dark:bg-[#EF4444]/30',
    badge: 'bg-[#EF4444]/15 text-[#B91C1C] dark:text-[#FCA5A5]',
    border: 'border-[#EF4444]/30 dark:border-[#EF4444]/40',
    fill: 'fill-[#EF4444]/20',
  },

  // 14. Pink / Magenta: Custom wallpapers, creative aesthetics, gallery
  pink: {
    text: 'text-[#EC4899] dark:text-[#F472B6]',
    bg: 'bg-[#EC4899]/10 dark:bg-[#EC4899]/20',
    hoverBg: 'hover:bg-[#EC4899]/15 dark:hover:bg-[#EC4899]/25',
    activeBg: 'bg-[#EC4899]/20 dark:bg-[#EC4899]/30',
    badge: 'bg-[#EC4899]/15 text-[#BE185D] dark:text-[#FBCFE8]',
    border: 'border-[#EC4899]/30 dark:border-[#EC4899]/40',
    fill: 'fill-[#EC4899]/20',
  },
} as const;

export type IconColorKey = keyof typeof ICON_STYLES;

/**
 * Returns a standardized className string for wrapping icons with a colourful,
 * subtle background tile and matching icon text color.
 */
export function getIconBoxClass(colorKey: IconColorKey, size: 'sm' | 'md' | 'lg' = 'md'): string {
  const style = ICON_STYLES[colorKey] || ICON_STYLES.slate;
  const sizeClasses = {
    sm: 'w-7 h-7 rounded-lg text-xs',
    md: 'w-8 h-8 rounded-xl text-sm',
    lg: 'w-10 h-10 rounded-2xl text-base',
  };

  return `${sizeClasses[size]} ${style.bg} ${style.text} flex items-center justify-center shrink-0 transition-colors`;
}
