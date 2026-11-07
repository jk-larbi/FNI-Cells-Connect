import React, { createContext, useContext, useState, useEffect } from 'react';
import { Profile, CellLeaderOnboardingInput } from '../types';
import { AuthService } from '../services/authService';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

interface AuthContextType {
  currentUser: Profile;
  currentRole: 'admin' | 'cell_leader';
  isAdmin: boolean;
  isCellLeader: boolean;
  isOnboarded: boolean;
  mustChangePassword: boolean;
  isLoggedOut: boolean;
  switchRole: (role: 'admin' | 'cell_leader') => void;
  canReviewReports: boolean;
  canManageCells: boolean;
  canManageUsers: boolean;
  canSubmitReport: boolean;
  loginAdmin: (usernameOrEmail: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  loginOAuth: (
    provider: 'google' | 'apple',
    options?: { testEmail?: string; testName?: string }
  ) => Promise<{ success: boolean; isNewUser?: boolean; error?: string }>;
  completeOnboarding: (input: CellLeaderOnboardingInput) => Promise<{ success: boolean; isExistingCellAssociated?: boolean; error?: string }>;
  changePassword: (newPass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  showLoginView: () => void;
  refreshProfile: () => void;
  isSupabaseActive: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<Profile>(() => AuthService.getCurrentProfile());
  const [isLoggedOut, setIsLoggedOut] = useState<boolean>(false);

  // Listen to Supabase Auth state changes if active
  useEffect(() => {
    const client = supabase;
    if (isSupabaseConfigured && client) {
      const { data: { subscription } } = client.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const { data: profileData } = await client
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profileData) {
            AuthService.setCurrentProfile(profileData);
            setCurrentUser(profileData);
            setIsLoggedOut(false);
          }
        } else if (event === 'SIGNED_OUT') {
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
    setCurrentUser(updated);
    setIsLoggedOut(false);
  };

  const showLoginView = () => {
    setIsLoggedOut(true);
  };

  const loginAdmin = async (usernameOrEmail: string, pass: string) => {
    const result = await AuthService.signInAdmin(usernameOrEmail, pass);
    if (result.profile) {
      setCurrentUser(result.profile);
      setIsLoggedOut(false);
      return { success: true };
    }
    return { success: false, error: result.error || 'Administrator login failed' };
  };

  const loginOAuth = async (
    provider: 'google' | 'apple',
    options?: { testEmail?: string; testName?: string }
  ) => {
    const result = await AuthService.signInWithOAuth(provider, options);
    if (result.profile) {
      setCurrentUser(result.profile);
      setIsLoggedOut(false);
      return { success: true, isNewUser: result.isNewUser };
    }
    return { success: false, error: result.error || 'OAuth sign-in failed' };
  };

  const completeOnboarding = async (input: CellLeaderOnboardingInput) => {
    try {
      const result = await AuthService.completeCellLeaderOnboarding(input);
      setCurrentUser(result.profile);
      setIsLoggedOut(false);
      return { success: true, isExistingCellAssociated: result.isExistingCellAssociated };
    } catch (err: any) {
      return { success: false, error: err.message || 'Onboarding registration failed' };
    }
  };

  const changePassword = async (newPass: string) => {
    const result = await AuthService.changeAdminPassword(newPass);
    if (result.success) {
      refreshProfile();
      return { success: true };
    }
    return { success: false, error: result.error };
  };

  const logout = async () => {
    await AuthService.signOut();
    setIsLoggedOut(true);
  };

  const role = currentUser.role;
  const isAdmin = role === 'admin' || role === 'super_admin' || role === 'national_admin' || role === 'regional_leader';
  const effectiveRole: 'admin' | 'cell_leader' = isAdmin ? 'admin' : 'cell_leader';
  const isOnboarded = currentUser.is_onboarded;
  const mustChangePassword = Boolean(currentUser.must_change_password);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole: effectiveRole,
        isAdmin,
        isCellLeader: !isAdmin,
        isOnboarded,
        mustChangePassword,
        isLoggedOut,
        switchRole,
        canReviewReports: isAdmin,
        canManageCells: isAdmin,
        canManageUsers: isAdmin,
        canSubmitReport: true,
        loginAdmin,
        loginOAuth,
        completeOnboarding,
        changePassword,
        logout,
        showLoginView,
        refreshProfile,
        isSupabaseActive: isSupabaseConfigured,
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
