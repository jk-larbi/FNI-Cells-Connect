import React, { createContext, useContext, useState, useEffect } from 'react';
import { Profile, TutorRegistrationInput, TutorLoginInput } from '../types';
import { AuthService } from '../services/authService';
import { auth, isFirebaseConfigured } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface AuthContextType {
  currentUser: Profile;
  currentRole: 'admin' | 'tutor';
  isAdmin: boolean;
  isTutor: boolean;
  isCellLeader: boolean;
  isOnboarded: boolean;
  mustChangePassword: boolean;
  isLoggedOut: boolean;
  switchRole: (role: 'admin' | 'cell_leader') => void;
  canReviewReports: boolean;
  canManageCells: boolean;
  canManageUsers: boolean;
  canSubmitReport: boolean;
  loginAdmin: (password: string) => Promise<{ success: boolean; error?: string }>;
  loginTutor: (input: TutorLoginInput) => Promise<{ success: boolean; error?: string }>;
  registerTutor: (input: TutorRegistrationInput) => Promise<{ success: boolean; error?: string }>;
  completeOnboarding: (input: any) => Promise<{ success: boolean; isExistingCellAssociated?: boolean; error?: string }>;
  changePassword: (newPass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  showLoginView: () => void;
  refreshProfile: () => void;
  isFirebaseActive: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<Profile>(() => AuthService.getCurrentProfile());
  const [isLoggedOut, setIsLoggedOut] = useState<boolean>(() => {
    return !localStorage.getItem('fni_active_session_v5_clean_prod');
  });

  // Listen to Firebase Auth state changes if active
  useEffect(() => {
    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser) {
          localStorage.setItem('fni_active_session_v5_clean_prod', fbUser.uid);
          setIsLoggedOut(false);
        }
      });
      return () => unsubscribe();
    }
  }, []);

  const refreshProfile = () => {
    const updated = AuthService.getCurrentProfile();
    setCurrentUser(updated);
  };

  const switchRole = (role: 'admin' | 'cell_leader') => {
    const updated = AuthService.switchDemoRole(role);
    localStorage.setItem('fni_active_session_v5_clean_prod', updated.id);
    setCurrentUser(updated);
    setIsLoggedOut(false);
  };

  const showLoginView = () => {
    localStorage.removeItem('fni_active_session_v5_clean_prod');
    setIsLoggedOut(true);
  };

  const loginAdmin = async (password: string) => {
    const result = await AuthService.signInAdmin(password);
    if (result.profile) {
      localStorage.setItem('fni_active_session_v5_clean_prod', result.profile.id);
      setCurrentUser(result.profile);
      setIsLoggedOut(false);
      return { success: true };
    }
    return { success: false, error: result.error || 'Administrator login failed' };
  };

  const loginTutor = async (input: TutorLoginInput) => {
    const result = await AuthService.signInTutor(input);
    if (result.profile) {
      localStorage.setItem('fni_active_session_v5_clean_prod', result.profile.id);
      setCurrentUser(result.profile);
      setIsLoggedOut(false);
      return { success: true };
    }
    return { success: false, error: result.error || 'Tutor login failed' };
  };

  const registerTutor = async (input: TutorRegistrationInput) => {
    const result = await AuthService.registerTutor(input);
    if (!result.error && result.profile) {
      localStorage.setItem('fni_active_session_v5_clean_prod', result.profile.id);
      setCurrentUser(result.profile);
      setIsLoggedOut(false);
      return { success: true };
    }
    return { success: false, error: result.error || 'Tutor registration failed' };
  };

  const completeOnboarding = async (input: any) => {
    try {
      const result = await AuthService.completeCellLeaderOnboarding(input);
      localStorage.setItem('fni_active_session_v5_clean_prod', result.profile.id);
      setCurrentUser(result.profile);
      setIsLoggedOut(false);
      return { success: true, isExistingCellAssociated: result.isExistingCellAssociated };
    } catch (err: any) {
      return { success: false, error: err.message || 'Onboarding failed' };
    }
  };

  const changePassword = async (newPass: string) => {
    if (isAdmin) {
      const result = await AuthService.changeAdminPassword(newPass);
      if (result.success) {
        refreshProfile();
        return { success: true };
      }
      return { success: false, error: result.error };
    } else {
      const result = await AuthService.changeTutorPassword(newPass);
      if (result.success) {
        refreshProfile();
        return { success: true };
      }
      return { success: false, error: result.error };
    }
  };

  const logout = async () => {
    await AuthService.signOut();
    localStorage.removeItem('fni_active_session_v5_clean_prod');
    setIsLoggedOut(true);
  };

  const role = currentUser?.role;
  const isAdmin = role === 'admin' || role === 'super_admin' || role === 'national_admin';
  const isTutor = !isAdmin;
  const effectiveRole: 'admin' | 'tutor' = isAdmin ? 'admin' : 'tutor';
  const isOnboarded = currentUser?.is_onboarded ?? true;
  const mustChangePassword = Boolean(currentUser?.must_change_password);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole: effectiveRole,
        isAdmin,
        isTutor,
        isCellLeader: isTutor,
        isOnboarded,
        mustChangePassword,
        isLoggedOut,
        switchRole,
        canReviewReports: isAdmin,
        canManageCells: isAdmin,
        canManageUsers: isAdmin,
        canSubmitReport: true,
        loginAdmin,
        loginTutor,
        registerTutor,
        completeOnboarding,
        changePassword,
        logout,
        showLoginView,
        refreshProfile,
        isFirebaseActive: isFirebaseConfigured,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
