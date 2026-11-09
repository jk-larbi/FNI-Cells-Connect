import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { AppLayout } from './components/layout/AppLayout';
import { MinistryVisionView } from './components/landing/MinistryVisionView';
import { SimpleLandingView } from './components/landing/SimpleLandingView';
import { LandingPageView } from './components/landing/LandingPageView';
import { AuthView, AuthFlowView } from './components/auth/AuthView';
import { ForcePasswordChangeModal } from './components/auth/ForcePasswordChangeModal';

const MainContent: React.FC = () => {
  const { currentUser, mustChangePassword, isLoggedOut } = useAuth();

  // Navigation state for unauthenticated visitor flow:
  // Screen 1: 'vision-mission' (strictly Vision, Mission statements, and 5,000 Soul-Winning Target)
  // Screen 2: 'landing' (Signup and Login portal with logo and platform name)
  const [entryView, setEntryView] = useState<'vision-mission' | 'landing' | 'overview-landing' | AuthFlowView>('vision-mission');

  // 1. Unauthenticated Visitor Flow
  if (isLoggedOut || !currentUser || !currentUser.id) {
    if (entryView === 'tutor-signup' || entryView === 'login-select' || entryView === 'tutor-login' || entryView === 'admin-login') {
      return (
        <AuthView
          initialView={entryView}
          onBackToLanding={() => setEntryView('landing')}
          onSuccess={() => {}}
        />
      );
    }

    if (entryView === 'overview-landing') {
      return (
        <LandingPageView
          onOpenAuth={(mode, tab) => {
            if (mode === 'admin') setEntryView('admin-login');
            else if (tab === 'login') setEntryView('tutor-login');
            else setEntryView('tutor-signup');
          }}
          onNavigateToLandingA={() => setEntryView('landing')}
        />
      );
    }

    // Screen 2: Dedicated Sign Up and Log In page with Logo and Name
    if (entryView === 'landing') {
      return (
        <SimpleLandingView
          onSignUp={() => setEntryView('tutor-signup')}
          onLogIn={() => setEntryView('login-select')}
          onBackToVision={() => setEntryView('vision-mission')}
        />
      );
    }

    // Screen 1: Strictly Vision Statement, Mission Statement, and Soul-Winning Target (Nothing else)
    return (
      <MinistryVisionView
        onProceed={() => setEntryView('landing')}
      />
    );
  }

  // 2. Mandatory First-Time Admin Password Change (Cannot be skipped)
  if (mustChangePassword) {
    return (
      <div className="relative min-h-screen">
        <AuthView initialView="admin-login" onSuccess={() => {}} />
        <ForcePasswordChangeModal />
      </div>
    );
  }

  // 3. Authenticated: Full Portal Access (Tutor or Admin based on role)
  return <AppLayout />;
};

export const App: React.FC = () => {
  const [isDark, setIsDark] = useState(() => {
    try {
      return window.localStorage.getItem('fni-theme') === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    try {
      window.localStorage.setItem('fni-theme', isDark ? 'dark' : 'light');
    } catch {
      // The theme still works for this session when storage is unavailable.
    }
  }, [isDark]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsDark(value => !value)}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-pressed={isDark}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        className="fixed bottom-20 md:bottom-6 right-4 z-[100] h-11 w-11 rounded-full bg-[#142B4A] text-[#C6A45A] border border-[#C6A45A]/60 shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform focus:outline-none focus:ring-2 focus:ring-[#C6A45A]"
      >
        {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>
      <AuthProvider>
        <NotificationProvider>
          <MainContent />
        </NotificationProvider>
      </AuthProvider>
    </>
  );
};

export default App;
