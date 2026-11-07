import { Profile, CellLeaderOnboardingInput, Cell } from '../types';
import { INITIAL_PROFILES } from './mockData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ReportService } from './reportService';

const STORAGE_KEYS = {
  CURRENT_PROFILE: 'fni_current_profile_v2',
  PROFILES_LIST: 'fni_profiles_directory_v2',
  ADMIN_SECURITY: 'fni_admin_security_config_v2',
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
      target = role === 'admin' ? INITIAL_PROFILES[0] : INITIAL_PROFILES[1];
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

    // 2. Local / Mock Auth Handling for immediate testing and resilience
    const allProfiles = this.getAllProfiles();
    const effectiveEmail = (
      options?.testEmail ||
      (provider === 'google' ? 'cell.leader.fni@gmail.com' : 'cell.leader.fni@privaterelay.appleid.com')
    ).toLowerCase();

    const existing = allProfiles.find(p => p.email.toLowerCase() === effectiveEmail);

    if (existing) {
      // Returning user: sign in normally, retains existing details!
      this.setCurrentProfile(existing);
      return { profile: existing, isNewUser: false, error: null };
    }

    // New First-Time User: Create cell leader profile with is_onboarded = false
    const fullName = options?.testName || (provider === 'google' ? 'Pastor David Mensah' : 'Minister Grace Taylor');
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
    const allCells = await ReportService.getCells();
    const allRegions = await ReportService.getRegions();

    // 1. Normalize cell name for duplicate prevention
    const rawName = input.cellName.trim();
    const normalizedAttempt = rawName.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Check if cell already exists by normalized name or exact name
    let associatedCell = allCells.find(c => {
      const existingNormalized = (c.normalized_name || c.name).toLowerCase().replace(/[^a-z0-9]/g, '');
      return existingNormalized === normalizedAttempt || c.name.toLowerCase() === rawName.toLowerCase();
    });

    let isExistingCellAssociated = false;
    let targetRegion = allRegions.find(r => r.id === input.regionId) || allRegions[0];

    if (associatedCell) {
      // Cell already exists! Associate the user with existing cell
      isExistingCellAssociated = true;
      associatedCell = {
        ...associatedCell,
        leader_id: current.id,
        leader_name: input.fullName,
        leader_phone: input.phoneNumber,
        meeting_day: input.meetingDay || associatedCell.meeting_day,
        meeting_time: input.meetingTime || associatedCell.meeting_time,
        venue_address: input.venueAddress || associatedCell.venue_address,
      };
      await ReportService.updateCell(associatedCell);
    } else {
      // Create new registered cell
      const newCellCode = `FNI-CEL-${targetRegion?.code?.split('-')[2] || 'LOS'}-${(allCells.length + 1).toString().padStart(3, '0')}`;
      associatedCell = {
        id: `cell-${Date.now()}`,
        name: rawName,
        normalized_name: normalizedAttempt,
        code: newCellCode,
        region_id: targetRegion ? targetRegion.id : 'reg-lagos',
        region_name: targetRegion ? targetRegion.name : 'Lagos Central Region',
        leader_id: current.id,
        leader_name: input.fullName,
        leader_phone: input.phoneNumber,
        meeting_day: input.meetingDay,
        meeting_time: input.meetingTime,
        venue_address: input.venueAddress,
        target_attendance: Number(input.targetAttendance) || 20,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      await ReportService.addCell(associatedCell);
    }

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
      action: isExistingCellAssociated ? 'CELL_LEADER_LINKED_EXISTING' : 'CELL_REGISTERED_AND_ONBOARDED',
      entity_type: 'cells',
      entity_id: associatedCell.id,
      details: {
        leader_name: input.fullName,
        cell_name: associatedCell.name,
        isExistingCellAssociated,
      },
    });

    return {
      profile: updatedProfile,
      cell: associatedCell,
      isExistingCellAssociated,
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
