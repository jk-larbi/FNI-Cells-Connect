import React, { createContext, useContext, useState, useEffect } from 'react';
import { Profile, TutorRegistrationInput, TutorLoginInput, AdminLoginInput } from '../types';
import { AuthService } from '../services/authService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const GUEST_PROFILE: Profile = {
  id: '',
  email: '',
  full_name: 'Guest User',
  role: 'tutor',
  is_active: false,
  is_onboarded: false,
  must_change_password: false,
  created_at: '',
};

interface AuthContextType {
  currentUser: Profile;
  currentRole: 'admin' | 'tutor';
  isAdmin: boolean;
  isTutor: boolean;
  isCellLeader: boolean;
  isOnboarded: boolean;
  mustChangePassword: boolean;
  isLoggedOut: boolean;
  canReviewReports: boolean;
  canManageCells: boolean;
  canManageUsers: boolean;
  canSubmitReport: boolean;
  loginAdmin: (input: AdminLoginInput) => Promise<{ success: boolean; error?: string }>;
  loginTutor: (input: TutorLoginInput) => Promise<{ success: boolean; error?: string }>;
  registerTutor: (input: TutorRegistrationInput) => Promise<{
    success: boolean;
    error?: string;
    needsEmailVerification?: boolean;
    verificationNotice?: string;
  }>;
  completeOnboarding: (input: any) => Promise<{ success: boolean; isExistingCellAssociated?: boolean; error?: string }>;
  changePassword: (newPass: string) => Promise<{ success: boolean; error?: string }>;
  updateAvatar: (avatarUrl: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  showLoginView: () => void;
  refreshProfile: () => Promise<void>;
  isFirebaseActive: boolean;
  isSupabaseActive: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<Profile>(() => {
    const cached = AuthService.getCurrentProfile();
    return cached || GUEST_PROFILE;
  });
  const [isLoggedOut, setIsLoggedOut] = useState<boolean>(() => {
    return !AuthService.getCurrentProfile()?.id;
  });

  // Validate session on initial application mount
  useEffect(() => {
    let isMounted = true;

    async function checkActiveSession() {
      if (isSupabaseConfigured && supabase) {
        try {
          const verified = await AuthService.getVerifiedSessionProfile();
          if (isMounted) {
            if (verified) {
              setCurrentUser(verified);
              setIsLoggedOut(false);
            } else {
              setCurrentUser(GUEST_PROFILE);
              setIsLoggedOut(true);
            }
          }
        } catch {
          if (isMounted) {
            setCurrentUser(GUEST_PROFILE);
            setIsLoggedOut(true);
          }
        }
      } else {
        if (isMounted) {
          setCurrentUser(GUEST_PROFILE);
          setIsLoggedOut(true);
        }
      }
    }

    checkActiveSession();

    // Listen to native Supabase GoTrue Auth state transitions
    if (isSupabaseConfigured && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!isMounted) return;

        if (session?.user) {
          const profile = await AuthService.fetchProfileById(session.user.id);
          if (profile && profile.is_active) {
            setCurrentUser(profile);
            setIsLoggedOut(false);
          } else if (profile && !profile.is_active) {
            await supabase.auth.signOut();
            setCurrentUser(GUEST_PROFILE);
            setIsLoggedOut(true);
          }
        } else if (event === 'SIGNED_OUT' || !session) {
          setCurrentUser(GUEST_PROFILE);
          setIsLoggedOut(true);
          AuthService.setCurrentProfile(null);
        }
      });

      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    }
  }, []);

  const refreshProfile = async () => {
    if (currentUser?.id) {
      const updated = await AuthService.fetchProfileById(currentUser.id);
      if (updated) setCurrentUser(updated);
    }
  };

  const showLoginView = () => {
    setIsLoggedOut(true);
  };

  const loginAdmin = async (input: AdminLoginInput) => {
    const result = await AuthService.signInAdmin(input);
    if (result.profile) {
      setCurrentUser(result.profile);
      setIsLoggedOut(false);
      return { success: true };
    }
    return { success: false, error: result.error || 'Administrator login failed' };
  };

  const loginTutor = async (input: TutorLoginInput) => {
    const result = await AuthService.signInTutor(input);
    if (result.profile) {
      setCurrentUser(result.profile);
      setIsLoggedOut(false);
      return { success: true };
    }
    return { success: false, error: result.error || 'Tutor login failed' };
  };

  const registerTutor = async (input: TutorRegistrationInput) => {
    const result = await AuthService.registerTutor(input);
    if (!result.error) {
      if (result.needsEmailVerification) {
        // Email confirmation is required; user is NOT logged in yet
        setCurrentUser(GUEST_PROFILE);
        setIsLoggedOut(true);
        return {
          success: true,
          needsEmailVerification: true,
          verificationNotice: result.verificationNotice,
        };
      }
      if (result.profile) {
        setCurrentUser(result.profile);
        setIsLoggedOut(false);
        return { success: true };
      }
    }
    return { success: false, error: result.error || 'Tutor registration failed' };
  };

  const completeOnboarding = async (input: any) => {
    try {
      const result = await AuthService.completeCellLeaderOnboarding(input);
      setCurrentUser(result.profile);
      setIsLoggedOut(false);
      return { success: true, isExistingCellAssociated: result.isExistingCellAssociated };
    } catch (err: any) {
      return { success: false, error: err.message || 'Onboarding failed' };
    }
  };

  const changePassword = async (newPass: string) => {
    const result = await AuthService.changePassword(newPass);
    if (result.success) {
      await refreshProfile();
      return { success: true };
    }
    return { success: false, error: result.error };
  };

  const logout = async () => {
    await AuthService.signOut();
    setCurrentUser(GUEST_PROFILE);
    setIsLoggedOut(true);
  };

  const updateAvatar = async (avatarUrl: string) => {
    if (!currentUser.id) return { success: false, error: 'Unauthenticated' };
    try {
      const updated = await AuthService.updateUserAvatar(currentUser.id, avatarUrl);
      setCurrentUser(updated);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to update profile picture' };
    }
  };

  const role = currentUser.role;
  const isAdmin = currentUser.id !== '' && (role === 'admin' || role === 'super_admin' || role === 'national_admin');
  const isTutor = !isAdmin;
  const effectiveRole: 'admin' | 'tutor' = isAdmin ? 'admin' : 'tutor';
  const isOnboarded = currentUser.is_onboarded ?? true;
  const mustChangePassword = Boolean(currentUser.must_change_password);

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
