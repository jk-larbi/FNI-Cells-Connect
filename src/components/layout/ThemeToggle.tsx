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
        ? 'fni-theme-toggle inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors hover:opacity-90'
        : 'fni-theme-toggle fixed z-[45] top-2 right-3 inline-flex h-9 w-9 items-center justify-center rounded-xl border shadow-sm transition-colors hover:opacity-90'}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span className="sr-only">{isDark ? 'Light mode' : 'Dark mode'}</span>
    </button>
  );
};
