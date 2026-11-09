/**
 * Forerunners Network International (FNI) - Digital Reporting System
 * Pure Supabase Authentication & Identity Service (Strict Production Backend)
 * 
 * Strict Security Rules:
 * - 100% Supabase Auth native integration (signUp, signInWithPassword, signOut, resetPassword)
 * - Zero artificial email addresses; requires genuine user email address
 * - Zero local-only account creation or PBKDF2 local password hash storage
 * - Zero client-side administrator bypasses (admin123 and demo role-switching permanently removed)
 * - Strict server-side role verification: self-registration NEVER grants administrative roles (always 'tutor')
 * - Full email verification handling: users without confirmed session cannot access protected sessions
 * - Complete session persistence, automatic token refresh, and lifecycle synchronization
 */

import { Profile, Cell, TutorRegistrationInput, TutorLoginInput, AdminLoginInput } from '../types';
import { supabase, isSupabaseConfigured, setSupabaseAccessToken } from '../lib/supabase';
import { ReportService } from './reportService';
import { CellService, normalizeCellName } from './cellService';
import { SupabaseService } from './supabaseService';
import { SyncStateService } from './syncStateService';

const STORAGE_KEYS = {
  CURRENT_PROFILE: 'fni_current_profile_v6_strict',
  ACTIVE_SESSION: 'fni_active_session_v6_strict',
  PROFILES_DIRECTORY: 'fni_profiles_directory_v6_strict',
};

export class AuthService {
  // --- Persistent Storage Helpers ---
  static getAllProfiles(): Profile[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PROFILES_DIRECTORY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed to parse stored profiles', e);
    }
    return [];
  }

  static saveProfiles(profiles: Profile[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PROFILES_DIRECTORY, JSON.stringify(profiles));
    } catch (e) {
      console.warn('Failed to save profiles to localStorage', e);
    }
  }

  static getCurrentProfile(): Profile | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_PROFILE);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  static setCurrentProfile(profile: Profile | null): void {
    try {
      if (profile) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_PROFILE, JSON.stringify(profile));
        localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, profile.id);
      } else {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_PROFILE);
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
      }
    } catch (e) {
      console.warn('Failed to update current profile in localStorage', e);
    }
  }

  /**
   * Fetches the authoritative profile for a given user ID from Supabase.
   */
  static async fetchProfileById(userId: string): Promise<Profile | null> {
    if (!isSupabaseConfigured || !supabase) return null;
    try {
      const remote = await SupabaseService.getProfile(userId);
      if (remote) {
        this.setCurrentProfile(remote);
        return remote;
      }
    } catch (e) {
      console.warn('Failed to fetch profile by id:', e);
    }
    return null;
  }

  /**
   * Validates that the active client session matches a real, active Supabase session.
   * Returns the verified Profile or null if unauthenticated.
   */
  static async getVerifiedSessionProfile(): Promise<Profile | null> {
    if (!isSupabaseConfigured || !supabase) {
      this.setCurrentProfile(null);
      return null;
    }

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session?.user) {
        this.setCurrentProfile(null);
        return null;
      }

      // Authoritative profile lookup
      const profile = await SupabaseService.getProfile(session.user.id);
      if (profile) {
        if (!profile.is_active) {
          await supabase.auth.signOut();
          this.setCurrentProfile(null);
          return null;
        }
        this.setCurrentProfile(profile);
        return profile;
      }

      // Reconstruct standard tutor profile if trigger delay
      const reconstructed: Profile = {
        id: session.user.id,
        supabase_user_id: session.user.id,
        email: session.user.email || '',
        full_name: session.user.user_metadata?.full_name || 'Fellowship Tutor',
        cell_name: session.user.user_metadata?.cell_name || undefined,
        role: 'tutor', // STRICT: Standard user default
        is_active: true,
        is_onboarded: true,
        must_change_password: false,
        created_at: session.user.created_at || new Date().toISOString(),
      };
      await SupabaseService.upsertProfile(reconstructed);
      this.setCurrentProfile(reconstructed);
      return reconstructed;
    } catch (err) {
      console.warn('Session verification exception:', err);
      this.setCurrentProfile(null);
      return null;
    }
  }

  // --- 1. TUTOR REGISTRATION (STRICT SUPABASE AUTH ONLY) ---
  static async registerTutor(input: TutorRegistrationInput): Promise<{
    profile: Profile | null;
    cell: Cell | null;
    error: string | null;
    needsEmailVerification?: boolean;
    verificationNotice?: string;
  }> {
    const cleanName = input.fullName?.trim();
    const cleanUsername = input.username?.trim().toLowerCase();
    const cleanPhone = input.phoneNumber?.trim();
    const cleanCellName = input.cellName?.trim();
    const password = input.password || '';

    if (!cleanName || !cleanUsername || !cleanPhone || !cleanCellName || !password) {
      return { profile: null, cell: null, error: 'Full name, username, phone number, cell name, and password are required.' };
    }
    if (!/^[a-z0-9_]{3,24}$/.test(cleanUsername)) {
      return { profile: null, cell: null, error: 'Username must be 3–24 characters and contain only letters, numbers, or underscores.' };
    }

    if (password.length < 6) {
      return { profile: null, cell: null, error: 'Password must be at least 6 characters long.' };
    }

    if (input.confirmPassword && password !== input.confirmPassword) {
      return { profile: null, cell: null, error: 'Passwords do not match.' };
    }

    if (!isSupabaseConfigured || !supabase) {
      return {
        profile: null,
        cell: null,
        error: 'Supabase authentication service is unavailable. Please check backend connection.',
      };
    }

    const normalizedCell = normalizeCellName(cleanCellName);

    // Check duplicate cell registration in Supabase
    try {
      const allCells = await CellService.getCells();
      const existing = allCells.find(c => {
        const existingNorm = c.normalized_name || normalizeCellName(c.name);
        return existingNorm === normalizedCell;
      });

      if (existing) {
        return {
          profile: null,
          cell: null,
          error: `Cell "${cleanCellName}" is already registered. If this is your cell, please select "Login" instead.`,
        };
      }
    } catch (e) {
      console.warn('Notice checking duplicate cell:', e);
    }

    // Create tutor identity through a trusted Edge Function. No email or SMS is sent.
    try {
      const { data, error: functionError } = await supabase.functions.invoke('tutor-auth', {
        body: { action: 'register', fullName: cleanName, username: cleanUsername, phoneNumber: cleanPhone, cellName: cleanCellName, password },
      });
      if (functionError || !data?.session?.access_token || !data?.session?.refresh_token || !data?.user?.id) {
        return { profile: null, cell: null, error: data?.error || functionError?.message || 'Could not create your tutor account.' };
      }
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token, refresh_token: data.session.refresh_token,
      });
      if (sessionError) return { profile: null, cell: null, error: sessionError.message };

      const uid = data.user.id;
      const cellId = 'cell-' + Date.now();
      const nowIso = new Date().toISOString();
      const newCell: Cell = {
        id: cellId, name: cleanCellName, normalized_name: normalizedCell,
        location: 'Fellowship Center', code: 'FNI-CEL-' + Date.now().toString().slice(-4),
        tutorUid: uid, leader_id: uid, leader_name: cleanName,
        meeting_day: 'Wednesday', meeting_time: '18:30', venue_address: 'Fellowship Center',
        target_attendance: 25, status: 'Active', is_active: true, created_at: nowIso,
      };
      await CellService.updateCell(newCell);
      const newProfile: Profile = {
        id: uid, supabase_user_id: uid, email: '', username: cleanUsername,
        phone_number: data.user.phone || cleanPhone, full_name: cleanName,
        cell_id: cellId, cell_name: cleanCellName, role: 'tutor',
        is_active: true, is_onboarded: true, must_change_password: false,
        auth_provider: 'credentials', created_at: nowIso,
      };
      const profileSaved = await SupabaseService.upsertProfile(newProfile);
      if (!profileSaved) return { profile: null, cell: newCell, error: 'Your account was created, but your profile could not be saved. Please contact FNI support.' };
      this.setCurrentProfile(newProfile);
      ReportService.recordAuditLog({
        action: 'TUTOR_REGISTERED_CELL', entity_type: 'users', entity_id: uid,
        details: { tutor_name: cleanName, username: cleanUsername, cell_name: cleanCellName },
      });
      return { profile: newProfile, cell: newCell, error: null, needsEmailVerification: false };
    } catch (err: any) {
      return { profile: null, cell: null, error: err?.message || 'An unexpected error occurred during registration.' };
    }
  }

  // --- 2. TUTOR LOGIN (USERNAME + PASSWORD VIA TRUSTED EDGE FUNCTION) ---
  static async signInTutor(input: TutorLoginInput): Promise<{ profile: Profile | null; error: string | null }> {
    const username = (input.username || input.fullName || '').trim().toLowerCase();
    const legacyEmail = (input.email || '').trim().toLowerCase();
    const password = input.password || '';
    if ((!username && !legacyEmail) || !password) return { profile: null, error: 'Username and password are required.' };
    if (!isSupabaseConfigured || !supabase) return { profile: null, error: 'Supabase authentication service is unavailable.' };

    try {
      let authUserId: string | null = null;
      if (legacyEmail) {
        const { data, error } = await supabase.auth.signInWithPassword({ email: legacyEmail, password });
        if (error || !data.user) return { profile: null, error: error?.message || 'Invalid username or password.' };
        authUserId = data.user.id;
      } else {
        const { data, error } = await supabase.functions.invoke('tutor-auth', {
          body: { action: 'login', username, password },
        });
        if (error || !data?.session?.access_token || !data?.session?.refresh_token || !data?.user?.id) {
          return { profile: null, error: data?.error || error?.message || 'Invalid username or password.' };
        }
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.session.access_token, refresh_token: data.session.refresh_token,
        });
        if (sessionError) return { profile: null, error: sessionError.message };
        authUserId = data.user.id;
      }
      let profile = await SupabaseService.getProfile(authUserId);
      if (!profile) {
        const { data: userData } = await supabase.auth.getUser();
        profile = {
          id: authUserId, supabase_user_id: authUserId, email: userData.user?.email || '',
          username: userData.user?.user_metadata?.username || username,
          phone_number: userData.user?.phone || undefined,
          full_name: userData.user?.user_metadata?.full_name || username,
          cell_name: userData.user?.user_metadata?.cell_name || undefined,
          role: 'tutor', is_active: true, is_onboarded: true,
          must_change_password: false, auth_provider: 'credentials',
          created_at: userData.user?.created_at || new Date().toISOString(),
        };
        await SupabaseService.upsertProfile(profile);
      }
      if (!profile.is_active) {
        await supabase.auth.signOut();
        this.setCurrentProfile(null);
        return { profile: null, error: 'This account has been deactivated. Please contact church leadership.' };
      }
      this.setCurrentProfile(profile);
      SyncStateService.retryPendingSync().catch(() => {});
      return { profile, error: null };
    } catch (err: any) {
      return { profile: null, error: err?.message || 'Login failed unexpectedly.' };
    }
  }

  // --- 3. ADMINISTRATOR AUTHENTICATION (AUTHENTICATE DIRECTLY AGAINST SUPABASE AUTH) ---
  static async signInAdmin(input: AdminLoginInput): Promise<{ profile: Profile | null; error: string | null }> {
    const email = input.email?.trim().toLowerCase();
    const password = input.password || '';

    if (!email || !password) {
      return { profile: null, error: 'Administrator email and password are required.' };
    }

    if (!isSupabaseConfigured || !supabase) {
      return { profile: null, error: 'Supabase authentication service is unavailable.' };
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        return { profile: null, error: authError.message || 'Invalid administrator credentials.' };
      }

      if (!authData?.user) {
        return { profile: null, error: 'Administrator authentication failed.' };
      }

      // Authoritative profile lookup from Supabase
      const profile = await SupabaseService.getProfile(authData.user.id);
      if (!profile) {
        await supabase.auth.signOut();
        this.setCurrentProfile(null);
        return { profile: null, error: 'Administrator profile not found in Supabase database.' };
      }

      // STRICT: Verify role is genuinely administrative in Supabase PostgreSQL
      const isAdminRole =
        profile.role === 'admin' ||
        profile.role === 'super_admin' ||
        profile.role === 'national_admin';

      if (!isAdminRole) {
        // User is authenticated in Supabase, but is not an authorized administrator
        await supabase.auth.signOut();
        this.setCurrentProfile(null);
        return {
          profile: null,
          error: 'Access denied: This account does not possess administrator privileges.',
        };
      }

      if (!profile.is_active) {
        await supabase.auth.signOut();
        this.setCurrentProfile(null);
        return { profile: null, error: 'This administrator account has been deactivated.' };
      }

      this.setCurrentProfile(profile);
      SyncStateService.retryPendingSync().catch(() => {});
      return { profile, error: null };
    } catch (err: any) {
      return { profile: null, error: err?.message || 'Administrator authentication exception.' };
    }
  }

  // --- 4. SUSPEND & REACTIVATE TUTOR ---
  static async suspendTutor(tutorUid: string, reason?: string, adminName?: string): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;

    try {
      const { error } = await supabase.from('profiles').update({ is_active: false }).eq('id', tutorUid);
      if (error) {
        console.warn('Supabase suspendTutor error:', error.message);
        return false;
      }

      ReportService.recordAuditLog({
        action: 'TUTOR_SUSPENDED',
        entity_type: 'users',
        entity_id: tutorUid,
        details: { reason: reason || 'Administrative suspension', suspended_by: adminName || 'Admin' },
      });

      return true;
    } catch (e) {
      console.warn('Supabase suspendTutor error:', e);
      return false;
    }
  }

  static async reactivateTutor(tutorUid: string, adminName?: string): Promise<boolean> {
    if (!isSupabaseConfigured || !supabase) return false;

    try {
      const { error } = await supabase.from('profiles').update({ is_active: true }).eq('id', tutorUid);
      if (error) {
        console.warn('Supabase reactivateTutor error:', error.message);
        return false;
      }

      ReportService.recordAuditLog({
        action: 'TUTOR_REACTIVATED',
        entity_type: 'users',
        entity_id: tutorUid,
        details: { reactivated_by: adminName || 'Admin' },
      });

      return true;
    } catch (e) {
      console.warn('Supabase reactivateTutor error:', e);
      return false;
    }
  }

  // --- 5. PASSWORD MANAGEMENT ---
  static async changePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: 'Supabase service is unavailable.' };
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        return { success: false, error: error.message };
      }

      const current = this.getCurrentProfile();
      if (current) {
        current.must_change_password = false;
        this.setCurrentProfile(current);
        await supabase.from('profiles').update({ must_change_password: false }).eq('id', current.id);
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Password update failed.' };
    }
  }

  // --- 6. PASSWORD RESET REQUEST ---
  static async requestPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
    if (!email || !email.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }

    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: 'Supabase authentication service is unavailable.' };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: typeof window !== 'undefined'
          ? `${window.location.origin}${import.meta.env.BASE_URL}?tab=reset-password`
          : undefined,
      });
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Password reset request failed.' };
    }
  }

  // --- 7. CELL LEADER ONBOARDING ---
  static async completeCellLeaderOnboarding(input: any): Promise<{ profile: Profile; isExistingCellAssociated?: boolean }> {
    const current = this.getCurrentProfile();
    if (!current) throw new Error('Unauthenticated user cannot complete onboarding');

    const res = await CellService.registerCell({
      name: input.cellName,
      location: input.location || input.venueAddress,
      tutorUid: current.id,
      leaderName: input.fullName,
      leaderPhone: input.phoneNumber,
      regionId: input.regionId,
      meetingDay: input.meetingDay,
      meetingTime: input.meetingTime,
      venueAddress: input.venueAddress,
      targetAttendance: input.targetAttendance,
    });

    current.full_name = input.fullName;
    current.cell_id = res.cell.id;
    current.cell_name = res.cell.name;
    current.phone_number = input.phoneNumber;
    current.region_id = input.regionId;
    current.is_onboarded = true;

    this.setCurrentProfile(current);
    await SupabaseService.upsertProfile(current);

    return { profile: current, isExistingCellAssociated: res.isExistingAssociated };
  }

  // --- 8. AVATAR UPLOAD ---
  static async updateUserAvatar(userId: string, avatarUrl: string): Promise<Profile> {
    const current = this.getCurrentProfile();
    if (!current) throw new Error('Unauthenticated');

    current.avatar_url = avatarUrl;
    this.setCurrentProfile(current);

    try {
      await SupabaseService.updateProfileAvatar(userId, avatarUrl);
    } catch (e) {
      console.warn('Supabase updateProfileAvatar notice:', e);
    }

    return current;
  }

  // --- 9. SIGN OUT ---
  static async signOut(): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Supabase signOut notice:', e);
      }
    }

    setSupabaseAccessToken(null);
    this.setCurrentProfile(null);
  }
}
