import React, { createContext, useContext, useState, useEffect } from 'react';
import { Profile, TutorRegistrationInput, TutorLoginInput, AdminLoginInput } from '../types';
import { AuthService } from '../services/authService';
import { ConversationCacheService } from '../services/conversationCacheService';
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
  updateBanner: (bannerUrl: string) => Promise<{ success: boolean; error?: string }>;
  updateProfileDetails: (fullName: string, username: string) => Promise<{ success: boolean; error?: string }>;
  updateUserProfile: (data: { full_name?: string; phone_number?: string; email?: string }) => Promise<{ success: boolean; error?: string }>;
  signOutOtherDevices: () => Promise<{ success: boolean; error?: string }>;
  requestAccountDeactivation: (reason: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  deleteOwnAccount: () => Promise<{ success: boolean; error?: string }>;
  deleteUserAccount: (userId: string) => Promise<{ success: boolean; error?: string }>;
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
            // If network request failed (e.g. offline/reconnection in standalone iOS app),
            // preserve the authenticated session from local cache instead of kicking the user out
            const cached = AuthService.getCurrentProfile();
            if (cached && cached.id) {
              setCurrentUser(cached);
              setIsLoggedOut(false);
            } else {
              setCurrentUser(GUEST_PROFILE);
              setIsLoggedOut(true);
            }
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
          const pendingOAuth = sessionStorage.getItem('fni_pending_oauth_tutor');
          if (pendingOAuth) {
            try {
              const profile = await AuthService.completeOAuthTutorRegistration(JSON.parse(pendingOAuth));
              sessionStorage.removeItem('fni_pending_oauth_tutor');
              setCurrentUser(profile);
              setIsLoggedOut(false);
              return;
            } catch (error) {
              console.error('FNI social registration could not be completed:', error);
              sessionStorage.removeItem('fni_pending_oauth_tutor');
              await supabase.auth.signOut();
              setCurrentUser(GUEST_PROFILE);
              setIsLoggedOut(true);
              return;
            }
          }
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

  // Keep durable app data fresh across every device signed in to this account.
  useEffect(() => {
    if (!currentUser?.id || !isSupabaseConfigured || !supabase) return;
    let active = true;
    let unsubscribe: (() => void) | undefined;
    import('../services/cloudSyncService').then(({ CloudSyncService }) => {
      if (!active) return;
      unsubscribe = CloudSyncService.subscribe(currentUser.id, change => {
        if (!active) return;
        window.dispatchEvent(new CustomEvent('fni:cloud-data-changed', { detail: change }));
      });
    });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [currentUser?.id]);

  // Keep this account's own profile photo synchronized across its signed-in devices.
  useEffect(() => {
    if (!currentUser?.id || !isSupabaseConfigured || !supabase) return;
    const channel = supabase
      .channel(`fni-own-avatar-${currentUser.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profile_avatar_updates' },
        async (payload) => {
          const update = (payload.new || {}) as { user_id?: string };
          const ownAuthId = currentUser.supabase_user_id || currentUser.id;
          if (update.user_id !== ownAuthId) return;
          const updated = await AuthService.fetchProfileById(currentUser.id);
          if (updated) setCurrentUser(updated);
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUser?.id, currentUser?.supabase_user_id]);

  // Keep account preferences (theme, notification settings and chat appearance)
  // synchronized when another signed-in device changes them.
  useEffect(() => {
    if (!currentUser?.id || !isSupabaseConfigured || !supabase) return;
    let active = true;
    let unsubscribe: (() => void) | undefined;
    import('../services/userSettingsService').then(({ UserSettingsService }) => {
      if (!active) return;
      unsubscribe = UserSettingsService.subscribeToUserSettings(currentUser.id, (settings) => {
        if (!active || !settings) return;
        window.dispatchEvent(new CustomEvent('fni:user-settings-updated', { detail: settings }));
      });
      void UserSettingsService.getUserSettings(currentUser.id).then((settings) => {
        if (active && settings) {
          window.dispatchEvent(new CustomEvent('fni:user-settings-updated', { detail: settings }));
        }
      });
    });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [currentUser?.id]);

  // Persist explicit theme changes to the signed-in user's cloud settings.
  useEffect(() => {
    if (!currentUser?.id) return;
    const handleThemeChange = (event: Event) => {
      const preference = (event as CustomEvent).detail;
      if (preference !== 'light' && preference !== 'dark' && preference !== 'system') return;
      import('../services/userSettingsService').then(({ UserSettingsService }) => {
        void UserSettingsService.saveUserSettings(currentUser.id, { themePreference: preference });
      });
    };
    window.addEventListener('fni:theme-preference-changed', handleThemeChange);
    return () => window.removeEventListener('fni:theme-preference-changed', handleThemeChange);
  }, [currentUser?.id]);

  // Re-fetch the signed-in profile when the tutor returns to an already-open portal.
  // This ensures administrator-side cell unassignments are reflected without requiring a sign-out.
  useEffect(() => {
    if (!currentUser?.id || !isSupabaseConfigured || !supabase) return;
    let active = true;
    const syncProfile = async () => {
      const updated = await AuthService.fetchProfileById(currentUser.id);
      if (active && updated) setCurrentUser(updated);
    };
    window.addEventListener('focus', syncProfile);
    document.addEventListener('visibilitychange', syncProfile);
    return () => {
      active = false;
      window.removeEventListener('focus', syncProfile);
      document.removeEventListener('visibilitychange', syncProfile);
    };
  }, [currentUser?.id]);

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

  const updateProfileDetails = async (fullName: string, username: string) => {
    if (!currentUser.id) return { success: false, error: 'Unauthenticated' };
    try {
      const updated = await AuthService.updateAdministratorProfile(currentUser.id, fullName, username);
      setCurrentUser(updated);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to update administrator profile.' };
    }
  };

  const updateUserProfile = async (data: { full_name?: string; phone_number?: string; email?: string }) => {
    if (!currentUser.id) return { success: false, error: 'Unauthenticated.' };
    const res = await AuthService.updateUserProfile(currentUser.id, data);
    if (res.success && res.profile) {
      setCurrentUser(res.profile);
    }
    return res;
  };

  const signOutOtherDevices = async () => {
    return AuthService.signOutOtherDevices();
  };

  const requestAccountDeactivation = async (reason: string) => {
    if (!currentUser.id) return { success: false, error: 'Unauthenticated.' };
    return AuthService.requestAccountDeactivation(currentUser.id, reason);
  };

  const deleteOwnAccount = async () => {
    const result = await AuthService.deleteOwnAccount();
    if (result.success) {
      setCurrentUser(GUEST_PROFILE);
      setIsLoggedOut(true);
    }
    return result;
  };

  const deleteUserAccount = async (userId: string) => AuthService.deleteUserAccount(userId);

  const logout = async () => {
    if (currentUser?.id) {
      ConversationCacheService.clearUserCache(currentUser.id);
    }
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

  const updateBanner = async (bannerUrl: string) => {
    if (!currentUser.id) return { success: false, error: 'Unauthenticated' };
    try {
      const updated = await AuthService.updateUserBanner(currentUser.id, bannerUrl);
      setCurrentUser(updated);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to update background banner' };
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
        updateBanner,
        updateProfileDetails,
        updateUserProfile,
        signOutOtherDevices,
        requestAccountDeactivation,
        logout,
        deleteOwnAccount,
        deleteUserAccount,
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
