import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { AppLayout } from './components/layout/AppLayout';
import { MinistryVisionView } from './components/landing/MinistryVisionView';
import { SimpleLandingView } from './components/landing/SimpleLandingView';
import { LandingPageView } from './components/landing/LandingPageView';
import { AuthView, AuthFlowView } from './components/auth/AuthView';
import { ForcePasswordChangeModal } from './components/auth/ForcePasswordChangeModal';
import { PasswordRecoveryView } from './components/auth/PasswordRecoveryView';
import { supabase } from './lib/supabase';
import { ThemeProvider } from './context/ThemeContext';
import { ThemeToggle } from './components/layout/ThemeToggle';

const MainContent: React.FC = () => {
  const { currentUser, mustChangePassword, isLoggedOut } = useAuth();

  // Navigation state for unauthenticated visitor flow:
  // Screen 1: 'vision-mission' (strictly Vision, Mission statements, and 5,000 Soul-Winning Target)
  // Screen 2: 'landing' (Signup and Login portal with logo and platform name)
  const [entryView, setEntryView] = useState<'vision-mission' | 'landing' | 'overview-landing' | AuthFlowView>('vision-mission');
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (isPasswordRecovery) {
    return <PasswordRecoveryView onComplete={() => {
      setIsPasswordRecovery(false);
      setEntryView('login-select');
    }} />;
  }

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
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <ThemeToggle />
          <MainContent />
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
