import { UserSession, UserProfile, AdminSecurityConfig, Cell } from '../types';
import { getSupabaseClient } from './supabase';
import { getCells, addCell, updateCell, loadStore, saveStore } from './storage';

const STORAGE_KEY_ADMIN_SECURITY = 'fni_admin_security_v1';
const STORAGE_KEY_PROFILES = 'fni_user_profiles_v1';
const STORAGE_KEY_SESSION = 'fni_current_session_v1';

// ---------------------------------------------------------------------------
// Cryptographic Password Hashing (Web Crypto API SHA-256)
// ---------------------------------------------------------------------------
export async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateSalt(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------------------
// Administrator Security Configuration & Password Enforcement
// ---------------------------------------------------------------------------
export function getAdminSecurityConfig(): AdminSecurityConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ADMIN_SECURITY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Could not read admin security config', e);
  }

  // Default: Initial setup not yet done. Initial credentials: admin / admin123
  return {
    initialSetupDone: false,
    passwordHash: '',
    salt: generateSalt(),
    adminUsername: 'admin'
  };
}

export function saveAdminSecurityConfig(cfg: AdminSecurityConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY_ADMIN_SECURITY, JSON.stringify(cfg));
  } catch (e) {
    console.error('Failed saving admin security config', e);
  }
}

/**
 * Validates administrator sign-in credentials.
 * Enforces requirement: initial credentials (admin / admin123) are ONLY valid
 * on first-time setup and are PERMANENTLY DISABLED once new password is created.
 */
export async function verifyAdminCredentials(
  usernameInput: string,
  passwordInput: string
): Promise<{ success: boolean; needsPasswordChange: boolean; message?: string }> {
  const config = getAdminSecurityConfig();
  const u = usernameInput.trim().toLowerCase();

  const isUsernameMatch = u === 'admin' || u === 'admin@fni.org';

  if (!isUsernameMatch) {
    return { success: false, needsPasswordChange: false, message: 'Invalid administrator username or email.' };
  }

  // Stage 1: First-time setup
  if (!config.initialSetupDone) {
    if (passwordInput === 'admin123') {
      return { success: true, needsPasswordChange: true };
    }
    return { success: false, needsPasswordChange: false, message: 'Invalid initial password. Use initial setup credentials.' };
  }

  // Stage 2: Initial setup is already completed.
  // The temporary credentials 'admin123' are explicitly disabled.
  if (passwordInput === 'admin123') {
    return {
      success: false,
      needsPasswordChange: false,
      message: 'Initial temporary credentials have been disabled. Please enter your updated administrator password.'
    };
  }

  const computedHash = await hashPassword(passwordInput, config.salt);
  if (computedHash === config.passwordHash) {
    return { success: true, needsPasswordChange: false };
  }

  return { success: false, needsPasswordChange: false, message: 'Incorrect administrator password.' };
}

/**
 * Changes administrator password and disables the temporary setup credentials permanently.
 */
export async function setAdminNewPassword(newPassword: string): Promise<{ success: boolean; message?: string }> {
  if (newPassword.length < 8) {
    return { success: false, message: 'Password must be at least 8 characters long.' };
  }
  if (newPassword === 'admin123') {
    return { success: false, message: 'New password cannot be the temporary setup password.' };
  }

  const config = getAdminSecurityConfig();
  const newSalt = generateSalt();
  const newHash = await hashPassword(newPassword, newSalt);

  const updatedConfig: AdminSecurityConfig = {
    ...config,
    initialSetupDone: true,
    passwordHash: newHash,
    salt: newSalt,
    lastChangedAt: new Date().toISOString()
  };

  saveAdminSecurityConfig(updatedConfig);

  // Sync with Supabase Auth if connected
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.auth.updateUser({ password: newPassword });
    } catch (e) {
      console.warn('Could not update password on Supabase instance', e);
    }
  }

  return { success: true };
}

// ---------------------------------------------------------------------------
// User Profiles & Cell Associations
// ---------------------------------------------------------------------------
export function getStoredProfiles(): UserProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROFILES);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error reading profiles', e);
  }
  return [];
}

export function saveStoredProfiles(profiles: UserProfile[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(profiles));
  } catch (e) {
    console.error('Error saving profiles', e);
  }
}

export function getProfileByEmail(email: string): UserProfile | undefined {
  const profiles = getStoredProfiles();
  return profiles.find(p => p.email.toLowerCase() === email.toLowerCase());
}

export function saveProfile(profile: UserProfile): void {
  const profiles = getStoredProfiles();
  const index = profiles.findIndex(p => p.email.toLowerCase() === profile.email.toLowerCase());
  if (index >= 0) {
    profiles[index] = { ...profiles[index], ...profile, updatedAt: new Date().toISOString() };
  } else {
    profiles.push(profile);
  }
  saveStoredProfiles(profiles);

  // Sync with Supabase table if connected
  const supabase = getSupabaseClient();
  if (supabase) {
    supabase
      .from('profiles')
      .upsert({
        id: profile.id,
        email: profile.email,
        full_name: profile.fullName,
        role: profile.role,
        phone: profile.phone,
        created_at: profile.createdAt
      })
      .then(({ error }) => {
        if (error) console.warn('Supabase profile upsert error:', error);
      });
  }
}

/**
 * Normalizes cell name for duplicate prevention (e.g. "Grace", "Grace cell", "grace cell" all match "Grace Cell")
 */
export function normalizeCellName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+cell$/i, '');
}

/**
 * Matches existing cell or registers a new one, avoiding duplicates.
 */
export function matchOrCreateCell(params: {
  cellNameInput: string;
  areaInput: string;
  leaderName: string;
  leaderEmail: string;
  leaderPhone: string;
  meetingDay?: string;
  meetingTime?: string;
}): { cell: Cell; isExisting: boolean } {
  const cells = getCells();
  const normalizedTarget = normalizeCellName(params.cellNameInput);

  const existingCell = cells.find(c => normalizeCellName(c.name) === normalizedTarget);

  if (existingCell) {
    // Associate with existing cell without creating duplicates
    updateCell(existingCell.id, {
      leader: existingCell.leader || params.leaderName,
      leaderEmail: params.leaderEmail || existingCell.leaderEmail,
      leaderPhone: params.leaderPhone || existingCell.leaderPhone
    });
    return { cell: existingCell, isExisting: true };
  }

  // Register new cell
  const formattedName = params.cellNameInput.trim().toLowerCase().endsWith('cell')
    ? params.cellNameInput.trim()
    : `${params.cellNameInput.trim()} Cell`;

  const newCell = addCell({
    name: formattedName,
    leader: params.leaderName,
    area: params.areaInput.trim() || 'General Area',
    leaderEmail: params.leaderEmail,
    leaderPhone: params.leaderPhone,
    meetingDay: params.meetingDay || 'Wednesday',
    meetingTime: params.meetingTime || '18:30',
    active: true
  });

  return { cell: newCell, isExisting: false };
}

// ---------------------------------------------------------------------------
// Current Session Management
// ---------------------------------------------------------------------------
export function getCurrentSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSION);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Could not load session', e);
  }
  return null;
}

export function saveCurrentSession(session: UserSession | null): void {
  try {
    if (session) {
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
    } else {
      localStorage.removeItem(STORAGE_KEY_SESSION);
    }
  } catch (e) {
    console.error('Could not save session', e);
  }
}
