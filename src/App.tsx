import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { AppLayout } from './components/layout/AppLayout';
import { SimpleLandingView } from './components/landing/SimpleLandingView';
import { AuthView, AuthFlowView } from './components/auth/AuthView';
import { ForcePasswordChangeModal } from './components/auth/ForcePasswordChangeModal';

const MainContent: React.FC = () => {
  const { currentUser, mustChangePassword, isLoggedOut } = useAuth();

  // Navigation state for unauthenticated flow
  const [entryView, setEntryView] = useState<'landing' | AuthFlowView>('landing');

  // 1. Unauthenticated Visitor Flow
  if (isLoggedOut || !currentUser) {
    if (entryView === 'tutor-signup' || entryView === 'login-select' || entryView === 'tutor-login' || entryView === 'admin-login') {
      return (
        <AuthView
          initialView={entryView}
          onBackToLanding={() => setEntryView('landing')}
          onSuccess={() => {}}
        />
      );
    }

    // Landing Page: Displays ONLY logo, FNI CELLS CONNECT, tagline, SIGN UP and LOG IN
    return (
      <SimpleLandingView
        onSignUp={() => setEntryView('tutor-signup')}
        onLogIn={() => setEntryView('login-select')}
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
    <AuthProvider>
      <NotificationProvider>
        <MainContent />
      </NotificationProvider>
    </AuthProvider>
  );
};

export default App;
