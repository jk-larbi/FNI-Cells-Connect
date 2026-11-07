import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { AppLayout } from './components/layout/AppLayout';
import { AuthView } from './components/auth/AuthView';
import { ForcePasswordChangeModal } from './components/auth/ForcePasswordChangeModal';
import { CellLeaderOnboardingModal } from './components/auth/CellLeaderOnboardingModal';

const MainContent: React.FC = () => {
  const { currentUser, mustChangePassword, isOnboarded, isCellLeader, isLoggedOut } = useAuth();

  // 1. Unauthenticated or explicitly viewing login portal
  if (isLoggedOut || !currentUser) {
    return <AuthView onSuccess={() => {}} />;
  }

  // 2. Mandatory First-Time Admin Password Change (Cannot be skipped)
  if (mustChangePassword) {
    return (
      <div className="relative min-h-screen">
        <AuthView onSuccess={() => {}} />
        <ForcePasswordChangeModal />
      </div>
    );
  }

  // 3. Mandatory First-Time Cell Leader Onboarding (Collects Name, Cell Name, Phone, etc.)
  if (isCellLeader && !isOnboarded) {
    return (
      <div className="relative min-h-screen">
        <AuthView onSuccess={() => {}} />
        <CellLeaderOnboardingModal />
      </div>
    );
  }

  // 4. Authenticated & Onboarded: Full Platform Access
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
