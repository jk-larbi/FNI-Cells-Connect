import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface ThemeToggleProps {
  placement?: 'inline' | 'floating';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ placement = 'floating' }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={isDark}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={placement === 'inline'
        ? 'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#E3E8EF] bg-[#F5F7FA] text-[#142B4A] transition-colors hover:bg-[#EAF0F8] dark:border-[#414958] dark:bg-[#252B37] dark:text-[#E7BD59] dark:hover:bg-[#30394A]'
        : 'fixed z-[45] top-2 right-3 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#C6A45A]/50 bg-white/95 text-[#142B4A] shadow-md backdrop-blur-sm transition-colors hover:bg-[#F5F7FA] dark:border-[#52647A] dark:bg-[#1C202A]/95 dark:text-[#E7BD59] dark:hover:bg-[#252B37]'}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span className="sr-only">{isDark ? 'Light mode' : 'Dark mode'}</span>
    </button>
  );
};
