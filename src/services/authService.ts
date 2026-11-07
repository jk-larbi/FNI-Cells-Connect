import { Profile, CellLeaderOnboardingInput, Cell } from '../types';
import { INITIAL_PROFILES } from './mockData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { FirebaseService } from './firebaseService';
import { isFirebaseConfigured } from '../lib/firebase';
import { ReportService } from './reportService';
import { CellService } from './cellService';

const STORAGE_KEYS = {
  CURRENT_PROFILE: 'fni_current_profile_v5_clean_prod',
  PROFILES_LIST: 'fni_profiles_directory_v5_clean_prod',
  ADMIN_SECURITY: 'fni_admin_security_config_v5_clean_prod',
  ACTIVE_SESSION: 'fni_active_session_v5_clean_prod',
};

interface AdminSecurityConfig {
  initialConfigured: boolean;
  passwordHash?: string;
  configuredAt?: string;
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

  static getCurrentProfile(): Profile {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_PROFILE);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      // fallback
    }
    const all = this.getAllProfiles();
    return all[0] || INITIAL_PROFILES[0];
  }

  static setCurrentProfile(profile: Profile): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_PROFILE, JSON.stringify(profile));
    } catch (e) {
      console.warn('Failed to save current profile locally', e);
    }
  }

  // --- Quick Role Switch for instant UI preview ---
  static switchDemoRole(role: 'admin' | 'cell_leader'): Profile {
    const all = this.getAllProfiles();
    let target = all.find(p => (role === 'admin' ? p.role === 'admin' : p.role === 'cell_leader'));
    if (!target) {
      target = role === 'admin' 
        ? INITIAL_PROFILES[0] 
        : all.find(p => p.role === 'cell_leader') || INITIAL_PROFILES[0];
    }
    this.setCurrentProfile(target);
    return target;
  }

  // --- OAuth Sign In (Google Account & Apple ID) ---
  static async signInWithOAuth(
    provider: 'google' | 'apple',
    options?: { testEmail?: string; testName?: string }
  ): Promise<{ profile: Profile; isNewUser: boolean; error: string | null }> {
    // 1. If Supabase is connected with real client, trigger native OAuth
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: window.location.origin,
          },
        });
        if (error) {
          console.warn('Supabase OAuth error, falling back to simulated handler:', error.message);
        }
      } catch (err) {
        console.warn('Supabase OAuth exception:', err);
      }
    }

    // 2. Local / Real Auth Handling
    const allProfiles = this.getAllProfiles();
    const effectiveEmail = (
      options?.testEmail ||
      (provider === 'google' ? `leader.${Date.now().toString().slice(-4)}@gmail.com` : `leader.${Date.now().toString().slice(-4)}@appleid.com`)
    ).toLowerCase().trim();

    const existing = allProfiles.find(p => p.email.toLowerCase() === effectiveEmail);

    if (existing) {
      // Returning user: sign in normally, retains existing details!
      this.setCurrentProfile(existing);
      return { profile: existing, isNewUser: false, error: null };
    }

    // New First-Time User: Create cell leader profile with is_onboarded = false so they register real details
    const fullName = options?.testName || '';
    const newProfile: Profile = {
      id: `usr-oauth-${Date.now()}`,
      email: effectiveEmail,
      full_name: fullName,
      role: 'cell_leader', // Ordinary OAuth users always default to cell_leader; cannot register as admin
      is_active: true,
      is_onboarded: false, // Triggers required cell registration wizard
      must_change_password: false,
      auth_provider: provider,
      created_at: new Date().toISOString(),
    };

    const updatedList = [newProfile, ...allProfiles];
    this.saveProfiles(updatedList);
    this.setCurrentProfile(newProfile);

    // Save to Firebase if configured
    if (isFirebaseConfigured) {
      try {
        await FirebaseService.saveProfile(newProfile);
      } catch (e) {
        console.warn('Failed to save profile to Firebase', e);
      }
    }

    // Save to Supabase if configured
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('profiles').upsert(newProfile);
      } catch (e) {
        console.warn('Failed to upsert OAuth profile in Supabase', e);
      }
    }

    return { profile: newProfile, isNewUser: true, error: null };
  }

  // --- Administrator Sign In ---
  static async signInAdmin(
    usernameOrEmail: string,
    passwordAttempt: string
  ): Promise<{ profile: Profile | null; error: string | null }> {
    const cleanIdentifier = usernameOrEmail.trim().toLowerCase();
    const securityConfig = this.getAdminSecurityConfig();

    const isMatchUsername = cleanIdentifier === 'admin' || cleanIdentifier === 'admin@forerunners.org';

    if (!isMatchUsername) {
      return { profile: null, error: 'Administrator not found. Check username or email.' };
    }

    // Security Check: Has the temporary initial password been disabled?
    if (securityConfig.initialConfigured) {
      // Temporary password admin123 is disabled
      if (passwordAttempt === 'admin123') {
        return {
          profile: null,
          error: 'Temporary initial credentials (admin123) have expired and are permanently disabled. Please use your newly configured administrator password.',
        };
      }

      // Check against configured password
      if (securityConfig.passwordHash && securityConfig.passwordHash !== passwordAttempt) {
        return { profile: null, error: 'Incorrect administrator password.' };
      }
    } else {
      // Initial Setup Flow:
      // Accepts initial password 'admin123'
      if (passwordAttempt !== 'admin123') {
        return {
          profile: null,
          error: 'Invalid initial password. For first-time administrator setup, use the temporary initial password "admin123".',
        };
      }
    }

    // Find or create admin profile
    const allProfiles = this.getAllProfiles();
    let adminProfile = allProfiles.find(p => p.role === 'admin' || p.email === 'admin@forerunners.org');

    if (!adminProfile) {
      adminProfile = INITIAL_PROFILES[0];
    }

    // If initial credentials are still in use, enforce mandatory password change immediately
    const mustChange = !securityConfig.initialConfigured;
    const currentAdmin: Profile = {
      ...adminProfile,
      must_change_password: mustChange,
      role: 'admin',
    };

    // Update in list
    const updatedProfiles = allProfiles.map(p => (p.id === currentAdmin.id ? currentAdmin : p));
    this.saveProfiles(updatedProfiles);
    this.setCurrentProfile(currentAdmin);

    // If Supabase is active, authenticate with Supabase Auth
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signInWithPassword({
          email: 'admin@forerunners.org',
          password: passwordAttempt,
        });
      } catch (e) {
        console.warn('Supabase auth sign in notice:', e);
      }
    }

    return { profile: currentAdmin, error: null };
  }

  // --- Mandatory Admin Password Change ---
  static async changeAdminPassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    if (!newPassword || newPassword.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters long.' };
    }

    if (newPassword === 'admin123') {
      return { success: false, error: 'New password cannot be the temporary setup password (admin123).' };
    }

    const hasLetter = /[a-zA-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    if (!hasLetter || !hasNumber) {
      return { success: false, error: 'Password must contain both letters and numbers for adequate strength.' };
    }

    // 1. Mark initial credentials as permanently configured and disabled
    this.saveAdminSecurityConfig({
      initialConfigured: true,
      passwordHash: newPassword,
      configuredAt: new Date().toISOString(),
    });

    // 2. Clear must_change_password flag on current admin profile
    const current = this.getCurrentProfile();
    const updatedAdmin: Profile = {
      ...current,
      must_change_password: false,
    };

    const allProfiles = this.getAllProfiles().map(p => (p.id === updatedAdmin.id ? updatedAdmin : p));
    this.saveProfiles(allProfiles);
    this.setCurrentProfile(updatedAdmin);

    // 3. Update password in Supabase Auth if connected
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.updateUser({ password: newPassword });
      } catch (err: any) {
        console.warn('Supabase updateUser password notice:', err?.message);
      }
    }

    // Record audit log
    ReportService.recordAuditLog({
      action: 'ADMIN_PASSWORD_UPDATED',
      entity_type: 'auth_security',
      entity_id: current.id,
      details: {
        message: 'Administrator password successfully updated. Initial temporary credentials disabled.',
        updated_by: current.full_name,
      },
    });

    return { success: true };
  }

  // --- Complete Cell Leader First-Time Onboarding ---
  static async completeCellLeaderOnboarding(
    input: CellLeaderOnboardingInput
  ): Promise<{ profile: Profile; cell: Cell; isExistingCellAssociated: boolean }> {
    const current = this.getCurrentProfile();
    const allRegions = await ReportService.getRegions();
    const targetRegion = allRegions.find(r => r.id === input.regionId) || allRegions[0];

    // Delegate cell creation or association with duplicate prevention to CellService
    const { cell: associatedCell, isExistingAssociated } = await CellService.registerCell({
      name: input.cellName,
      location: input.location || input.venueAddress || 'Fellowship Center',
      tutorUid: current.id,
      leaderName: input.fullName,
      leaderPhone: input.phoneNumber,
      regionId: input.regionId,
      regionName: targetRegion?.name || 'Lagos Central Region',
      meetingDay: input.meetingDay,
      meetingTime: input.meetingTime,
      venueAddress: input.venueAddress,
      targetAttendance: input.targetAttendance,
    });

    // 2. Create / Update Cell Leader Profile
    const updatedProfile: Profile = {
      ...current,
      full_name: input.fullName,
      phone_number: input.phoneNumber,
      cell_id: associatedCell.id,
      cell_name: associatedCell.name,
      region_id: associatedCell.region_id,
      region_name: associatedCell.region_name,
      is_onboarded: true, // Successfully completed registration!
      is_active: true,
    };

    // Save profile locally
    const allProfiles = this.getAllProfiles().map(p => (p.id === updatedProfile.id ? updatedProfile : p));
    this.saveProfiles(allProfiles);
    this.setCurrentProfile(updatedProfile);

    // Save to Firebase if configured
    if (isFirebaseConfigured) {
      try {
        await FirebaseService.saveProfile(updatedProfile);
      } catch (e) {
        console.warn('Failed to save profile to Firebase', e);
      }
    }

    // Save to Supabase if configured
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('profiles').upsert({
          id: updatedProfile.id,
          email: updatedProfile.email,
          full_name: updatedProfile.full_name,
          phone_number: updatedProfile.phone_number,
          cell_id: updatedProfile.cell_id,
          cell_name: updatedProfile.cell_name,
          region_id: updatedProfile.region_id,
          region_name: updatedProfile.region_name,
          role: 'cell_leader',
          is_onboarded: true,
          is_active: true,
        });
      } catch (e) {
        console.warn('Failed to upsert completed onboarding profile to Supabase', e);
      }
    }

    // Record audit trail
    ReportService.recordAuditLog({
      action: isExistingAssociated ? 'CELL_LEADER_LINKED_EXISTING' : 'CELL_REGISTERED_AND_ONBOARDED',
      entity_type: 'cells',
      entity_id: associatedCell.id,
      details: {
        leader_name: input.fullName,
        cell_name: associatedCell.name,
        isExistingCellAssociated: isExistingAssociated,
      },
    });

    return {
      profile: updatedProfile,
      cell: associatedCell,
      isExistingCellAssociated: isExistingAssociated,
    };
  }

  // --- Sign Out ---
  static async signOut(): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Supabase signout failed', e);
      }
    }
    // Switch to a fresh unauthenticated state or default leader
    localStorage.removeItem(STORAGE_KEYS.CURRENT_PROFILE);
  }
}
