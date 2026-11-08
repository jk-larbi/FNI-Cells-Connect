import React, { createContext, useContext, useState, useEffect } from 'react';
import { Profile, TutorRegistrationInput, TutorLoginInput } from '../types';
import { AuthService } from '../services/authService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

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
  registerTutor: (input: TutorRegistrationInput) => Promise<{ success: boolean; error?: string; verificationNotice?: string }>;
  completeOnboarding: (input: any) => Promise<{ success: boolean; isExistingCellAssociated?: boolean; error?: string }>;
  changePassword: (newPass: string) => Promise<{ success: boolean; error?: string }>;
  updateAvatar: (avatarUrl: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  showLoginView: () => void;
  refreshProfile: () => void;
  isFirebaseActive: boolean;
  isSupabaseActive: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<Profile>(() => AuthService.getCurrentProfile());
  const [isLoggedOut, setIsLoggedOut] = useState<boolean>(() => {
    return !localStorage.getItem('fni_active_session_v6_strict');
  });

  // Listen to Supabase Auth state changes (native GoTrue session lifecycle)
  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          localStorage.setItem('fni_active_session_v6_strict', session.user.id);
          setIsLoggedOut(false);
          const profile = await AuthService.fetchProfileById(session.user.id);
          if (profile) setCurrentUser(profile);
        } else if (event === 'SIGNED_OUT') {
          localStorage.removeItem('fni_active_session_v6_strict');
          setIsLoggedOut(true);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  const refreshProfile = () => {
    const updated = AuthService.getCurrentProfile();
    setCurrentUser(updated);
  };

  const switchRole = (role: 'admin' | 'cell_leader') => {
    const updated = AuthService.switchDemoRole(role);
    localStorage.setItem('fni_active_session_v6_strict', updated.id);
    setCurrentUser(updated);
    setIsLoggedOut(false);
  };

  const showLoginView = () => {
    localStorage.removeItem('fni_active_session_v6_strict');
    setIsLoggedOut(true);
  };

  const loginAdmin = async (password: string) => {
    const result = await AuthService.signInAdmin(password);
    if (result.profile) {
      localStorage.setItem('fni_active_session_v6_strict', result.profile.id);
      setCurrentUser(result.profile);
      setIsLoggedOut(false);
      return { success: true };
    }
    return { success: false, error: result.error || 'Administrator login failed' };
  };

  const loginTutor = async (input: TutorLoginInput) => {
    const result = await AuthService.signInTutor(input);
    if (result.profile) {
      localStorage.setItem('fni_active_session_v6_strict', result.profile.id);
      setCurrentUser(result.profile);
      setIsLoggedOut(false);
      return { success: true };
    }
    return { success: false, error: result.error || 'Tutor login failed' };
  };

  const registerTutor = async (input: TutorRegistrationInput) => {
    const result = await AuthService.registerTutor(input);
    if (!result.error && result.profile) {
      localStorage.setItem('fni_active_session_v6_strict', result.profile.id);
      setCurrentUser(result.profile);
      setIsLoggedOut(false);
      return { success: true, verificationNotice: result.verificationNotice };
    }
    return { success: false, error: result.error || 'Tutor registration failed' };
  };

  const completeOnboarding = async (input: any) => {
    try {
      const result = await AuthService.completeCellLeaderOnboarding(input);
      localStorage.setItem('fni_active_session_v6_strict', result.profile.id);
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
    localStorage.removeItem('fni_active_session_v6_strict');
    setIsLoggedOut(true);
  };

  const updateAvatar = async (avatarUrl: string) => {
    try {
      const updated = await AuthService.updateUserAvatar(currentUser.id, avatarUrl);
      setCurrentUser(updated);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to update profile picture' };
    }
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
        updateAvatar,
        logout,
        showLoginView,
        refreshProfile,
        isFirebaseActive: false,
        isSupabaseActive: true,
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
