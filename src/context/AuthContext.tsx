import React, { createContext, useContext, useState, useEffect } from 'react';
import { Profile, TutorRegistrationInput, TutorLoginInput } from '../types';
import { AuthService } from '../services/authService';
import { auth, db, isFirebaseConfigured, googleProvider, appleProvider } from '../lib/firebase';
import { onAuthStateChanged, getRedirectResult, linkWithPopup, linkWithRedirect, signInWithPopup, signInWithRedirect, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

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
  linkRecoveryProvider: (provider: 'google' | 'apple') => Promise<{ success: boolean; pending?: boolean; error?: string }>;
  loginWithProvider: (provider: 'google' | 'apple') => Promise<{ success: boolean; pending?: boolean; error?: string }>;
  updateAvatar: (avatarUrl: string) => Promise<{ success: boolean; error?: string }>;
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
      // Complete OAuth redirect flows used by mobile browsers.
      getRedirectResult(auth).then(async (result) => {
        if (!result || !db) return;
        const profileSnap = await getDoc(doc(db, 'profiles', result.user.uid));
        if (!profileSnap.exists()) {
          await firebaseSignOut(auth);
          localStorage.removeItem('fni_active_session_v5_clean_prod');
          setIsLoggedOut(true);
          return;
        }
        const profile = profileSnap.data() as Profile;
        if (profile.is_active === false || (profile as any).status === 'Suspended') {
          await firebaseSignOut(auth);
          localStorage.removeItem('fni_active_session_v5_clean_prod');
          setIsLoggedOut(true);
          return;
        }
        AuthService.setCurrentProfile(profile);
        localStorage.setItem('fni_active_session_v5_clean_prod', profile.id);
        setCurrentUser(profile);
        setIsLoggedOut(false);
      }).catch((error) => console.error('FNI OAuth redirect could not be completed:', error));
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



  const linkRecoveryProvider = async (provider: 'google' | 'apple') => {
    if (!auth?.currentUser || auth.currentUser.uid !== currentUser?.id) return { success: false, error: 'Please sign in to your FNI account with your current password before linking a recovery account.' };
    try {
      const oauthProvider = provider === 'google' ? googleProvider : appleProvider;
      const isMobileBrowser = typeof window !== 'undefined' && (window.matchMedia('(max-width: 768px)').matches || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
      if (isMobileBrowser) { await linkWithRedirect(auth.currentUser, oauthProvider); return { success: true, pending: true }; }
      await linkWithPopup(auth.currentUser, oauthProvider);
      return { success: true };
    }
    catch (err: any) { const code = err?.code || ''; const message = code === 'auth/credential-already-in-use' || code === 'auth/account-exists-with-different-credential' ? 'This Google or Apple account is already connected to another FNI account. Sign in to that account first; accounts are never merged automatically.' : code === 'auth/provider-already-linked' ? 'This sign-in provider is already linked to your FNI account.' : err?.message || 'Could not link this recovery account.'; return { success: false, error: message }; }
  };

  const loginWithProvider = async (provider: 'google' | 'apple') => {
    if (!auth || !db || !isFirebaseConfigured) return { success: false, error: 'FNI secure sign-in is not configured.' };
    try {
      const oauthProvider = provider === 'google' ? googleProvider : appleProvider;
      const isMobileBrowser = typeof window !== 'undefined' && (window.matchMedia('(max-width: 768px)').matches || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
      if (isMobileBrowser) { await signInWithRedirect(auth, oauthProvider); return { success: true, pending: true }; }
      const credential = await signInWithPopup(auth, oauthProvider);
      const profileSnap = await getDoc(doc(db, 'profiles', credential.user.uid));
      if (!profileSnap.exists()) { await firebaseSignOut(auth); return { success: false, error: 'No FNI account is linked to this Google or Apple ID. Ask your cell administrator for help.' }; }
      const profile = profileSnap.data() as Profile;
      if (profile.is_active === false || (profile as any).status === 'Suspended') { await firebaseSignOut(auth); return { success: false, error: 'This FNI account is suspended. Please contact the administration.' }; }
      AuthService.setCurrentProfile(profile); localStorage.setItem('fni_active_session_v5_clean_prod', profile.id); setCurrentUser(profile); setIsLoggedOut(false); return { success: true };
    } catch (err: any) { const code = err?.code || ''; const message = code === 'auth/popup-closed-by-user' ? 'Sign-in was cancelled.' : code === 'auth/account-exists-with-different-credential' ? 'This email is registered with a different sign-in method. Use the method originally linked to your FNI account.' : err?.message || 'Could not sign in with that account.'; return { success: false, error: message }; }
  };

  const logout = async () => {
    await AuthService.signOut();
    localStorage.removeItem('fni_active_session_v5_clean_prod');
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
        linkRecoveryProvider,
        loginWithProvider,
        updateAvatar,
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
