/**
 * Forerunners Network International (FNI) - Digital Reporting System
 * Pure Supabase Authentication & Identity Service
 * 
 * Features:
 * - 100% Supabase Auth native integration (signUp, signInWithPassword, signOut, resetPassword)
 * - Zero Firebase dependencies
 * - Robust account provisioning: auto-creates Profile in Supabase PostgreSQL
 * - Strict security: self-registration NEVER grants administrative roles (always 'tutor')
 * - Full session persistence, automatic token refresh, and lifecycle synchronization
 * - Fallback to secure client-side PBKDF2 password cryptography for offline resilience
 */

import { Profile, Cell, TutorRegistrationInput, TutorLoginInput } from '../types';
import { INITIAL_PROFILES } from './mockData';
import { supabase, isSupabaseConfigured, setSupabaseAccessToken } from '../lib/supabase';
import { ReportService } from './reportService';
import { CellService, normalizeCellName } from './cellService';
import { SupabaseService } from './supabaseService';
import { SyncStateService } from './syncStateService';

const STORAGE_KEYS = {
  CURRENT_PROFILE: 'fni_current_profile_v6_strict',
  PROFILES_LIST: 'fni_profiles_directory_v6_strict',
  ADMIN_SECURITY: 'fni_admin_security_config_v6_strict',
  TUTOR_CREDS: 'fni_tutor_secure_creds_v6_strict',
  ACTIVE_SESSION: 'fni_active_session_v6_strict',
};

interface AdminSecurityConfig {
  initialConfigured: boolean;
  passwordSalt?: string;
  passwordHash?: string;
  configuredAt?: string;
}

interface StoredTutorCredential {
  uid: string;
  fullName: string;
  email: string;
  cellName: string;
  normalizedCell: string;
  salt: string;
  hash: string;
  createdAt: string;
}

/**
 * Client-side Cryptographic PBKDF2 Password Hasher (Web Crypto API)
 * Ensures passwords are NEVER stored in plain text anywhere in storage or database
 */
async function hashPasswordWithSalt(password: string, existingSalt?: string): Promise<{ salt: string; hash: string }> {
  const enc = new TextEncoder();
  const salt = existingSalt || Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0')).join('');

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: enc.encode(salt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  const hash = Array.from(new Uint8Array(derivedBits))
    .map(b => b.toString(16).padStart(2, '0')).join('');

  return { salt, hash };
}

async function verifyPassword(password: string, salt: string, storedHash: string): Promise<boolean> {
  const { hash } = await hashPasswordWithSalt(password, salt);
  return hash === storedHash;
}

export class AuthService {
  // --- Persistent Storage Helpers ---
  static getAllProfiles(): Profile[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PROFILES_LIST);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed to parse stored profiles', e);
    }
    return INITIAL_PROFILES;
  }

  static saveProfiles(profiles: Profile[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PROFILES_LIST, JSON.stringify(profiles));
    } catch (e) {
      console.warn('Failed to save profiles to localStorage', e);
    }
  }

  static getAdminSecurityConfig(): AdminSecurityConfig {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ADMIN_SECURITY);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      // fallback
    }
    return {
      initialConfigured: false,
    };
  }

  static saveAdminSecurityConfig(config: AdminSecurityConfig): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ADMIN_SECURITY, JSON.stringify(config));
    } catch (e) {
      console.warn('Failed to save admin security config', e);
    }
  }

  private static getStoredTutorCredentials(): Record<string, StoredTutorCredential> {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.TUTOR_CREDS);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private static saveTutorCredential(key: string, cred: StoredTutorCredential): void {
    try {
      const all = this.getStoredTutorCredentials();
      all[key.toLowerCase().trim()] = cred;
      localStorage.setItem(STORAGE_KEYS.TUTOR_CREDS, JSON.stringify(all));
    } catch (e) {
      console.warn('Failed to save tutor credential locally', e);
    }
  }

  static getCurrentProfile(): Profile {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_PROFILE);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      // fallback
    }
    return INITIAL_PROFILES[0];
  }

  static setCurrentProfile(profile: Profile): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_PROFILE, JSON.stringify(profile));
      localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, profile.id);
    } catch (e) {
      console.warn('Failed to save current profile locally', e);
    }
  }

  static async fetchProfileById(userId: string): Promise<Profile | null> {
    const remote = await SupabaseService.getProfile(userId);
    if (remote) {
      this.setCurrentProfile(remote);
      return remote;
    }
    const local = this.getAllProfiles().find(p => p.id === userId);
    return local || null;
  }

  // --- 1. TUTOR REGISTRATION (SUPABASE AUTH + ACCOUNT PROVISIONING) ---
  static async registerTutor(input: TutorRegistrationInput): Promise<{
    profile: Profile | null;
    cell: Cell | null;
    error: string | null;
    verificationNotice?: string;
  }> {
    const cleanName = input.fullName.trim();
    const cleanCellName = input.cellName.trim();
    const password = input.password || '';

    // Validation
    if (!cleanName || !cleanCellName || !password) {
      return { profile: null, cell: null, error: 'Full name, cell name, and password are required.' };
    }

    if (password.length < 6) {
      return { profile: null, cell: null, error: 'Password must be at least 6 characters long.' };
    }

    if (input.confirmPassword && password !== input.confirmPassword) {
      return { profile: null, cell: null, error: 'Passwords do not match.' };
    }

    const normalizedCell = normalizeCellName(cleanCellName);

    // 1. Check duplicate cell registration
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

    // 2. Resolve or generate valid Supabase email address
    let email = (input as any).email?.trim();
    if (!email || !email.includes('@')) {
      // Format valid email with domain accepted by GoTrue
      const sanitizedName = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const uniqueSuffix = Date.now().toString().slice(-4);
      email = `${sanitizedName}.${uniqueSuffix}@gmail.com`;
    }

    let supabaseUid: string | null = null;
    let emailVerificationRequired = false;

    // 3. Register user in Supabase Auth
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: cleanName,
              cell_name: cleanCellName,
              role: 'tutor', // STRICT: Enforce tutor role on registration
            },
          },
        });

        if (authError) {
          console.warn('Supabase Auth signUp notice:', authError.message);
          // If error is duplicate email, report clearly
          if (authError.message.toLowerCase().includes('already registered')) {
            return { profile: null, cell: null, error: 'An account with this name/email already exists. Please log in.' };
          }
          return { profile: null, cell: null, error: authError.message };
        }

        if (authData?.user) {
          supabaseUid = authData.user.id;
          if (!authData.session) {
            emailVerificationRequired = true;
          }
        }
      } catch (err: any) {
        console.warn('Supabase Auth signup exception:', err);
      }
    }

    const uid = supabaseUid || `tutor-${Date.now()}`;
    const cellId = `cell-${Date.now()}`;
    const nowIso = new Date().toISOString();

    // 4. Register Cell Fellowship
    const newCell: Cell = {
      id: cellId,
      name: cleanCellName,
      normalized_name: normalizedCell,
      location: 'Central Campus',
      code: `FNI-CEL-${(allCells.length + 1).toString().padStart(3, '0')}`,
      tutorUid: uid,
      leader_id: uid,
      leader_name: cleanName,
      meeting_day: 'Wednesday',
      meeting_time: '18:30',
      venue_address: 'Fellowship Center',
      target_attendance: 25,
      status: 'Active',
      is_active: true,
      created_at: nowIso,
    };
    await CellService.updateCell(newCell);

    // 5. Create Profile (Role strictly enforced as 'tutor')
    const newProfile: Profile = {
      id: uid,
      email,
      full_name: cleanName,
      cell_id: cellId,
      cell_name: cleanCellName,
      role: 'tutor', // STRICT: Never allow self-elevation to admin
      is_active: true,
      is_onboarded: true,
      must_change_password: false,
      auth_provider: 'email',
      created_at: nowIso,
    };

    // Save profile locally
    const allProfiles = this.getAllProfiles();
    this.saveProfiles([newProfile, ...allProfiles]);

    // Save salt and hash securely for local fallback
    const { salt, hash } = await hashPasswordWithSalt(password);
    this.saveTutorCredential(`${cleanName.toLowerCase()}::${normalizedCell}`, {
      uid,
      fullName: cleanName,
      email,
      cellName: cleanCellName,
      normalizedCell,
      salt,
      hash,
      createdAt: nowIso,
    });
    // Also save by clean name and by email
    this.saveTutorCredential(cleanName.toLowerCase(), {
      uid,
      fullName: cleanName,
      email,
      cellName: cleanCellName,
      normalizedCell,
      salt,
      hash,
      createdAt: nowIso,
    });
    this.saveTutorCredential(email.toLowerCase(), {
      uid,
      fullName: cleanName,
      email,
      cellName: cleanCellName,
      normalizedCell,
      salt,
      hash,
      createdAt: nowIso,
    });

    // 6. Save in Supabase PostgreSQL
    try {
      await SupabaseService.upsertProfile(newProfile);
    } catch (e) {
      console.warn('Supabase upsertProfile notice:', e);
    }

    this.setCurrentProfile(newProfile);

    // Trigger retry of any queued offline sync writes
    SyncStateService.retryPendingSync().catch(() => {});

    // 7. Audit log & Notification
    ReportService.recordAuditLog({
      action: 'TUTOR_REGISTERED_CELL',
      entity_type: 'users',
      entity_id: newProfile.id,
      details: {
        tutor_name: newProfile.full_name,
        cell_name: newCell.name,
      },
    });

    try {
      const { NotificationService } = await import('./notificationService');
      await NotificationService.createNotification({
        userId: 'admin',
        title: 'New Fellowship Cell & Tutor Registered',
        message: `${cleanName} has registered "${cleanCellName}" in the fellowship directory.`,
        type: 'system_alert',
        channel: 'in_app',
        metadata: {
          targetTab: 'cell-management',
          cellId,
          cellName: cleanCellName,
          tutorUid: uid,
          tutorName: cleanName,
        },
      });
    } catch (e) {
      console.warn('Failed to notify admin of tutor registration:', e);
    }

    return {
      profile: newProfile,
      cell: newCell,
      error: null,
      verificationNotice: emailVerificationRequired
        ? 'Account registered! If email confirmation is enabled, please verify your email before next sign-in.'
        : undefined,
    };
  }

  // --- 2. TUTOR LOGIN (SUPABASE AUTH EMAIL/PASSWORD + CREDENTIAL LOOKUP) ---
  static async signInTutor(input: TutorLoginInput): Promise<{ profile: Profile | null; error: string | null }> {
    const rawIdentifier = input.fullName.trim();
    const password = input.password || '';

    if (!rawIdentifier || !password) {
      return { profile: null, error: 'Full name and password are required.' };
    }

    // 1. Check if user identifier is an email or a full name
    let targetEmail: string | null = null;
    let targetFullName = rawIdentifier;

    if (rawIdentifier.includes('@')) {
      targetEmail = rawIdentifier.toLowerCase();
    } else {
      // Look up email by Full Name in Supabase
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('email, id, full_name, cell_name')
            .ilike('full_name', rawIdentifier)
            .limit(1);

          if (!error && data && data.length > 0 && data[0].email) {
            targetEmail = data[0].email;
            targetFullName = data[0].full_name;
          }
        } catch (e) {
          console.warn('Supabase profile email lookup notice:', e);
        }
      }

      // Check local stored tutor credentials
      if (!targetEmail) {
        const creds = this.getStoredTutorCredentials();
        const cred = creds[rawIdentifier.toLowerCase()];
        if (cred?.email) {
          targetEmail = cred.email;
        }
      }
    }

    // 2. Authenticate with Supabase Auth if configured and email resolved
    if (isSupabaseConfigured && supabase && targetEmail) {
      try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: targetEmail,
          password,
        });

        if (!authError && authData?.user) {
          // Fetch authoritative profile from Supabase
          let profile = await SupabaseService.getProfile(authData.user.id);
          if (!profile) {
            // Reconstruct from auth metadata if not yet created in public.profiles
            profile = {
              id: authData.user.id,
              email: authData.user.email || targetEmail,
              full_name: authData.user.user_metadata?.full_name || targetFullName,
              cell_name: authData.user.user_metadata?.cell_name || undefined,
              role: (authData.user.user_metadata?.role as any) || 'tutor',
              is_active: true,
              is_onboarded: true,
              must_change_password: false,
              created_at: authData.user.created_at || new Date().toISOString(),
            };
            await SupabaseService.upsertProfile(profile);
          }

          this.setCurrentProfile(profile);
          SyncStateService.retryPendingSync().catch(() => {});
          return { profile, error: null };
        } else if (authError) {
          console.warn('Supabase Auth signIn notice:', authError.message);
          if (authError.message.includes('Email not confirmed')) {
            return {
              profile: null,
              error: 'Email address not yet confirmed. Please check your inbox for the confirmation link.',
            };
          }
          if (authError.message.includes('Invalid login credentials')) {
            // Also attempt local fallback before rejecting
          }
        }
      } catch (err: any) {
        console.warn('Supabase Auth login exception:', err);
      }
    }

    // 3. Fallback: Authenticate via Stored Cryptographic PBKDF2 Credentials
    const storedCreds = this.getStoredTutorCredentials();
    const candidateCred = storedCreds[rawIdentifier.toLowerCase()] ||
      Object.values(storedCreds).find(c =>
        c.fullName.toLowerCase() === rawIdentifier.toLowerCase() ||
        c.email.toLowerCase() === rawIdentifier.toLowerCase()
      );

    if (candidateCred) {
      const isMatch = await verifyPassword(password, candidateCred.salt, candidateCred.hash);
      if (isMatch) {
        const allProfiles = this.getAllProfiles();
        const profile = allProfiles.find(p => p.id === candidateCred.uid) || {
          id: candidateCred.uid,
          email: candidateCred.email || `${candidateCred.normalizedCell}@fnicells.org`,
          full_name: candidateCred.fullName,
          cell_name: candidateCred.cellName,
          role: 'tutor' as const,
          is_active: true,
          is_onboarded: true,
          must_change_password: false,
          created_at: candidateCred.createdAt,
        };

        this.setCurrentProfile(profile);
        return { profile, error: null };
      }
    }

    return { profile: null, error: 'Invalid name/email or password. Please verify your credentials.' };
  }

  // --- 3. SUSPEND & REACTIVATE TUTOR ---
  static async suspendTutor(tutorUid: string, reason?: string, adminName?: string): Promise<boolean> {
    const allProfiles = this.getAllProfiles();
    const target = allProfiles.find(p => p.id === tutorUid);
    if (!target) return false;

    target.is_active = false;
    this.saveProfiles(allProfiles);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('profiles').update({ is_active: false }).eq('id', tutorUid);
      } catch (e) {
        console.warn('Supabase suspendTutor error:', e);
      }
    }

    ReportService.recordAuditLog({
      action: 'TUTOR_SUSPENDED',
      entity_type: 'users',
      entity_id: tutorUid,
      details: { reason: reason || 'Administrative suspension', suspended_by: adminName || 'Admin' },
    });

    return true;
  }

  static async reactivateTutor(tutorUid: string, adminName?: string): Promise<boolean> {
    const allProfiles = this.getAllProfiles();
    const target = allProfiles.find(p => p.id === tutorUid);
    if (!target) return false;

    target.is_active = true;
    this.saveProfiles(allProfiles);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('profiles').update({ is_active: true }).eq('id', tutorUid);
      } catch (e) {
        console.warn('Supabase reactivateTutor error:', e);
      }
    }

    ReportService.recordAuditLog({
      action: 'TUTOR_REACTIVATED',
      entity_type: 'users',
      entity_id: tutorUid,
      details: { reactivated_by: adminName || 'Admin' },
    });

    return true;
  }

  // --- 4. ADMINISTRATOR AUTHENTICATION ---
  static async signInAdmin(passwordAttempt: string): Promise<{ profile: Profile | null; error: string | null }> {
    const adminConfig = this.getAdminSecurityConfig();

    // 1. Attempt Supabase Auth login as admin if Supabase is active
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: 'admin@fnicells.org',
          password: passwordAttempt,
        });

        if (!authError && authData?.user) {
          const profile = await SupabaseService.getProfile(authData.user.id) || {
            id: authData.user.id,
            email: 'admin@fnicells.org',
            full_name: 'System Administrator',
            role: 'super_admin',
            is_active: true,
            is_onboarded: true,
            must_change_password: false,
            created_at: authData.user.created_at,
          };
          this.setCurrentProfile(profile);
          SyncStateService.retryPendingSync().catch(() => {});
          return { profile, error: null };
        }
      } catch (e) {
        console.warn('Supabase admin login notice:', e);
      }
    }

    // 2. Unconfigured / First Sign-In: Default temporary credential "admin123"
    if (!adminConfig.initialConfigured) {
      if (passwordAttempt === 'admin123') {
        const adminProfile: Profile = {
          id: 'usr-admin',
          email: 'admin@fnicells.org',
          full_name: 'System Administrator',
          role: 'super_admin',
          is_active: true,
          is_onboarded: true,
          must_change_password: true,
          auth_provider: 'credentials',
          created_at: new Date().toISOString(),
        };
        this.setCurrentProfile(adminProfile);
        return { profile: adminProfile, error: null };
      }
      return { profile: null, error: 'Incorrect initial administrator password. Default is "admin123".' };
    }

    // 3. Configured Permanent Password: Validate with PBKDF2 hash
    if (adminConfig.passwordSalt && adminConfig.passwordHash) {
      const isMatch = await verifyPassword(passwordAttempt, adminConfig.passwordSalt, adminConfig.passwordHash);
      if (isMatch) {
        const adminProfile: Profile = {
          id: 'usr-admin',
          email: 'admin@fnicells.org',
          full_name: 'System Administrator',
          role: 'super_admin',
          is_active: true,
          is_onboarded: true,
          must_change_password: false,
          auth_provider: 'credentials',
          created_at: adminConfig.configuredAt || new Date().toISOString(),
        };
        this.setCurrentProfile(adminProfile);
        return { profile: adminProfile, error: null };
      }
    }

    return { profile: null, error: 'Invalid administrator password.' };
  }

  // --- 5. PASSWORD MANAGEMENT ---
  static async changeAdminPassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    if (newPassword === 'admin123') {
      return { success: false, error: 'You cannot use the temporary default password as your permanent password.' };
    }

    // Update in Supabase Auth if configured
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.updateUser({ password: newPassword });
      } catch (e) {
        console.warn('Supabase updateUser password notice:', e);
      }
    }

    // Update local security configuration
    const { salt, hash } = await hashPasswordWithSalt(newPassword);
    this.saveAdminSecurityConfig({
      initialConfigured: true,
      passwordSalt: salt,
      passwordHash: hash,
      configuredAt: new Date().toISOString(),
    });

    const current = this.getCurrentProfile();
    current.must_change_password = false;
    this.setCurrentProfile(current);

    ReportService.recordAuditLog({
      action: 'ADMIN_PASSWORD_CHANGED',
      entity_type: 'users',
      entity_id: current.id,
      details: { user: current.full_name },
    });

    return { success: true };
  }

  static async changeTutorPassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) {
          console.warn('Supabase updateUser password notice:', error.message);
        }
      } catch (e) {
        console.warn('Supabase password update exception:', e);
      }
    }

    const current = this.getCurrentProfile();
    const { salt, hash } = await hashPasswordWithSalt(newPassword);
    this.saveTutorCredential(current.full_name.toLowerCase(), {
      uid: current.id,
      fullName: current.full_name,
      email: current.email,
      cellName: current.cell_name || 'Fellowship Cell',
      normalizedCell: normalizeCellName(current.cell_name || ''),
      salt,
      hash,
      createdAt: new Date().toISOString(),
    });

    current.must_change_password = false;
    this.setCurrentProfile(current);

    return { success: true };
  }

  // --- 6. PASSWORD RESET REQUEST ---
  static async requestPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
    if (!email || !email.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' };
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/?tab=account` : undefined,
        });
        if (error) {
          return { success: false, error: error.message };
        }
        return { success: true };
      } catch (e: any) {
        return { success: false, error: e?.message || 'Password reset request failed.' };
      }
    }

    return { success: true };
  }

  // --- 7. DEMO ROLE SWITCHER ---
  static switchDemoRole(role: 'admin' | 'cell_leader'): Profile {
    if (role === 'admin') {
      const p: Profile = {
        id: 'usr-admin',
        email: 'admin@fnicells.org',
        full_name: 'Administrator',
        role: 'super_admin',
        is_active: true,
        is_onboarded: true,
        must_change_password: false,
        auth_provider: 'credentials',
        created_at: new Date().toISOString(),
      };
      this.setCurrentProfile(p);
      return p;
    } else {
      const p: Profile = {
        id: 'usr-tutor-agape',
        email: 'agape@fnicells.org',
        full_name: 'Agape Cell Tutor',
        cell_id: 'cell-agape-demo',
        cell_name: 'Agape Fellowship Cell',
        role: 'tutor',
        is_active: true,
        is_onboarded: true,
        must_change_password: false,
        auth_provider: 'email',
        created_at: new Date().toISOString(),
      };
      this.setCurrentProfile(p);
      return p;
    }
  }

  // --- 8. CELL LEADER ONBOARDING ---
  static async completeCellLeaderOnboarding(input: any): Promise<{ profile: Profile; isExistingCellAssociated?: boolean }> {
    const current = this.getCurrentProfile();
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

  // --- 9. AVATAR UPLOAD ---
  static async updateUserAvatar(userId: string, avatarUrl: string): Promise<Profile> {
    const current = this.getCurrentProfile();
    current.avatar_url = avatarUrl;
    this.setCurrentProfile(current);

    try {
      await SupabaseService.updateProfileAvatar(userId, avatarUrl);
    } catch (e) {
      console.warn('Supabase updateProfileAvatar notice:', e);
    }

    return current;
  }

  // --- 10. SIGN OUT ---
  static async signOut(): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Supabase signOut notice:', e);
      }
    }

    setSupabaseAccessToken(null);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_PROFILE);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
  }
}
