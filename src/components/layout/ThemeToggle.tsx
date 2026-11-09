import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={isDark}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="fixed z-[60] top-20 right-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#C6A45A]/50 bg-white text-[#142B4A] shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl dark:bg-[#142B4A] dark:text-[#E9D9B2]"
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
};
