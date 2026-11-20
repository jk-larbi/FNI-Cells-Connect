import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
export type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  themePreference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>(() => {
    try {
      const saved = localStorage.getItem('fni-theme-preference');
      if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
      const legacy = localStorage.getItem('fni-theme');
      if (legacy === 'dark' || legacy === 'light') return legacy;
      return 'system';
    } catch {
      return 'system';
    }
  });

  const [systemIsDark, setSystemIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Apply theme changes delivered from the signed-in account's Supabase settings.
  useEffect(() => {
    const handleRemoteSettings = (event: Event) => {
      const settings = (event as CustomEvent).detail;
      const preference = settings?.themePreference;
      if (preference === 'light' || preference === 'dark' || preference === 'system') {
        setThemePreferenceState(preference);
      }
    };
    window.addEventListener('fni:user-settings-updated', handleRemoteSettings);
    return () => window.removeEventListener('fni:user-settings-updated', handleRemoteSettings);
  }, []);

  // Listen to system theme changes dynamically
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemIsDark(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const activeTheme: Theme =
    themePreference === 'system' ? (systemIsDark ? 'dark' : 'light') : themePreference;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', activeTheme === 'dark');
    document.documentElement.style.colorScheme = activeTheme;
    document.documentElement.dataset.theme = activeTheme;
    try {
      localStorage.setItem('fni-theme-preference', themePreference);
      localStorage.setItem('fni-theme', activeTheme);
    } catch {
      /* Storage may be unavailable */
    }
  }, [themePreference, activeTheme]);

  const setThemePreference = (pref: ThemePreference) => {
    setThemePreferenceState(pref);
    window.dispatchEvent(new CustomEvent('fni:theme-preference-changed', { detail: pref }));
  };

  const toggleTheme = () => {
    const effective = themePreference === 'system' ? (systemIsDark ? 'dark' : 'light') : themePreference;
    setThemePreference(effective === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider
      value={{
        theme: activeTheme,
        themePreference,
        setThemePreference,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
