import { Profile, Cell, TutorRegistrationInput, TutorLoginInput } from '../types';
import { INITIAL_PROFILES } from './mockData';
import { auth, db, isFirebaseConfigured, firebaseApp } from '../lib/firebase';
import { signInWithCustomToken, signOut as fbSignOut } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { ReportService } from './reportService';
import { CellService, normalizeCellName } from './cellService';

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

  // --- 1. TUTOR REGISTRATION (ONLY: Full Name, Cell Name, Password, Confirm Password) ---
  static async registerTutor(input: TutorRegistrationInput): Promise<{
    profile: Profile | null;
    cell: Cell | null;
    error: string | null;
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

    // 2. Try Firebase Cloud Function if reachable
    if (isFirebaseConfigured && firebaseApp) {
      try {
        const functions = getFunctions(firebaseApp);
        const registerTutorCallable = httpsCallable(functions, 'registerTutor');
        const result: any = await registerTutorCallable({
          fullName: cleanName,
          cellName: cleanCellName,
          password,
          confirmPassword: input.confirmPassword,
        });

        if (result.data?.customToken && auth) {
          await signInWithCustomToken(auth, result.data.customToken);
        }

        if (result.data?.profile) {
          this.setCurrentProfile(result.data.profile);
          return { profile: result.data.profile, cell: result.data.cell, error: null };
        }
      } catch (err: any) {
        console.warn('Cloud Function registerTutor notice, completing with client cryptography:', err.message);
      }
    }

    // 3. Robust Cryptographic Setup (Client Salted PBKDF2)
    const { salt, hash } = await hashPasswordWithSalt(password);
    const uid = `tutor-${Date.now()}`;
    const cellId = `cell-${Date.now()}`;
    const nowIso = new Date().toISOString();

    // Register Cell
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

    // Create User Profile (No password stored in profile!)
    const newProfile: Profile = {
      id: uid,
      email: `${normalizedCell}@fnicells.org`,
      full_name: cleanName,
      cell_id: cellId,
      cell_name: cleanCellName,
      role: 'tutor',
      is_active: true,
      is_onboarded: true,
      must_change_password: false,
      created_at: nowIso,
    };

    // Save profile locally
    const allProfiles = this.getAllProfiles();
    this.saveProfiles([newProfile, ...allProfiles]);

    // Save salt and hash securely
    this.saveTutorCredential(`${cleanName.toLowerCase()}::${normalizedCell}`, {
      uid,
      fullName: cleanName,
      cellName: cleanCellName,
      normalizedCell,
      salt,
      hash,
      createdAt: nowIso,
    });

    // Save in Firestore if db connected
    if (isFirebaseConfigured && db) {
      try {
        await setDoc(doc(db, 'profiles', uid), newProfile);
        await setDoc(doc(db, 'cells', cellId), newCell);
      } catch (e) {
        console.warn('Firestore setDoc notice:', e);
      }
    }

    this.setCurrentProfile(newProfile);

    // Audit log
    ReportService.recordAuditLog({
      action: 'TUTOR_REGISTERED_CELL',
      entity_type: 'users',
      entity_id: newProfile.id,
      details: {
        tutor_name: newProfile.full_name,
        cell_name: newCell.name,
      },
    });

    return { profile: newProfile, cell: newCell, error: null };
  }

  // --- 2. TUTOR LOGIN (ONLY: Full Name and Password) ---
  static async signInTutor(input: TutorLoginInput): Promise<{ profile: Profile | null; error: string | null }> {
    const cleanName = input.fullName.trim();
    const password = input.password || '';
    const cleanCellName = input.cellName?.trim() || '';

    if (!cleanName || !password) {
      return { profile: null, error: 'Full name and password are required.' };
    }

    // 1. Try Firebase Cloud Function if reachable
    if (isFirebaseConfigured && firebaseApp) {
      try {
        const functions = getFunctions(firebaseApp);
        const loginTutorCallable = httpsCallable(functions, 'loginTutor');
        const result: any = await loginTutorCallable({
          fullName: cleanName,
          cellName: cleanCellName || undefined,
          password,
        });

        if (result.data?.customToken && auth) {
          await signInWithCustomToken(auth, result.data.customToken);
        }

        if (result.data?.profile) {
          this.setCurrentProfile(result.data.profile);
          return { profile: result.data.profile, error: null };
        }
      } catch (err: any) {
        console.warn('Cloud Function loginTutor notice, checking local credential store:', err.message);
      }
    }

    // 2. Local Credential Verification by Full Name
    const storedCreds = this.getStoredTutorCredentials();
    const candidateCreds = Object.values(storedCreds).filter(
      c => c.fullName.toLowerCase() === cleanName.toLowerCase()
    );

    if (candidateCreds.length === 0) {
      return { profile: null, error: `No tutor account found for "${cleanName}". Please check spelling or select "Sign Up".` };
    }

    // Verify salted cryptographic hash
    let matchedCred: StoredTutorCredential | null = null;
    for (const cred of candidateCreds) {
      const isValid = await verifyPassword(password, cred.salt, cred.hash);
      if (isValid) {
        matchedCred = cred;
        break;
      }
    }

    if (!matchedCred) {
      return { profile: null, error: 'Invalid password. Please check your credentials.' };
    }

    const allProfiles = this.getAllProfiles();
    const matchedProfile = allProfiles.find(p => p.id === matchedCred!.uid) || {
      id: matchedCred.uid,
      email: `${matchedCred.normalizedCell}@fnicells.org`,
      full_name: matchedCred.fullName,
      cell_name: matchedCred.cellName,
      role: 'tutor' as const,
      is_active: true,
      is_onboarded: true,
      created_at: matchedCred.createdAt,
    };

    this.setCurrentProfile(matchedProfile);
    return { profile: matchedProfile, error: null };
  }

  // --- 3. ADMINISTRATOR LOGIN (ONLY: Password, Default: admin123) ---
  static async signInAdmin(passwordAttempt: string): Promise<{ profile: Profile | null; error: string | null }> {
    if (!passwordAttempt) {
      return { profile: null, error: 'Administrator password is required.' };
    }

    const securityConfig = this.getAdminSecurityConfig();

    // 1. Try Firebase Cloud Function if reachable
    if (isFirebaseConfigured && firebaseApp) {
      try {
        const functions = getFunctions(firebaseApp);
        const loginAdminCallable = httpsCallable(functions, 'loginAdmin');
        const result: any = await loginAdminCallable({ password: passwordAttempt });

        if (result.data?.customToken && auth) {
          await signInWithCustomToken(auth, result.data.customToken);
        }

        if (result.data?.profile) {
          this.setCurrentProfile(result.data.profile);
          return { profile: result.data.profile, error: null };
        }
      } catch (err: any) {
        console.warn('Cloud Function loginAdmin notice, checking local security config:', err.message);
      }
    }

    // 2. Initial Setup State vs Configured State
    if (!securityConfig.initialConfigured) {
      // Must use temporary password 'admin123'
      if (passwordAttempt !== 'admin123') {
        return { profile: null, error: 'Invalid initial password. Use the temporary setup credentials (admin123).' };
      }

      // First-time login: Enforce immediate password change
      const adminProfile: Profile = {
        id: 'usr-admin-master',
        email: 'admin@forerunners.org',
        full_name: 'System Administrator',
        role: 'admin',
        is_active: true,
        is_onboarded: true,
        must_change_password: true, // Forces immediate modal
        created_at: new Date().toISOString(),
      };

      this.setCurrentProfile(adminProfile);
      return { profile: adminProfile, error: null };
    } else {
      // Already configured: admin123 is permanently disabled
      if (passwordAttempt === 'admin123') {
        return {
          profile: null,
          error: 'The temporary password (admin123) is permanently disabled. Please use your newly configured administrator password.',
        };
      }

      if (securityConfig.passwordSalt && securityConfig.passwordHash) {
        const isValid = await verifyPassword(passwordAttempt, securityConfig.passwordSalt, securityConfig.passwordHash);
        if (!isValid) {
          return { profile: null, error: 'Incorrect administrator password.' };
        }
      }

      const adminProfile: Profile = {
        id: 'usr-admin-master',
        email: 'admin@forerunners.org',
        full_name: 'System Administrator',
        role: 'admin',
        is_active: true,
        is_onboarded: true,
        must_change_password: false,
        created_at: new Date().toISOString(),
      };

      this.setCurrentProfile(adminProfile);
      return { profile: adminProfile, error: null };
    }
  }

  // --- 4. CHANGE ADMINISTRATOR PASSWORD ---
  static async changeAdminPassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    if (!newPassword || newPassword.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters long.' };
    }

    if (newPassword === 'admin123') {
      return {
        success: false,
        error: 'You cannot reuse the default temporary password (admin123). Please choose a new secure password.',
      };
    }

    // Cloud Function if reachable
    if (isFirebaseConfigured && firebaseApp) {
      try {
        const functions = getFunctions(firebaseApp);
        const changePassCallable = httpsCallable(functions, 'changeAdminPassword');
        await changePassCallable({ newPassword });
      } catch (err: any) {
        console.warn('Cloud Function changeAdminPassword notice:', err.message);
      }
    }

    // Hash securely
    const { salt, hash } = await hashPasswordWithSalt(newPassword);

    this.saveAdminSecurityConfig({
      initialConfigured: true,
      passwordSalt: salt,
      passwordHash: hash,
      configuredAt: new Date().toISOString(),
    });

    const current = this.getCurrentProfile();
    if (current) {
      const updatedAdmin: Profile = {
        ...current,
        must_change_password: false,
      };
      this.setCurrentProfile(updatedAdmin);
    }

    ReportService.recordAuditLog({
      action: 'ADMIN_PASSWORD_UPDATED',
      entity_type: 'auth_security',
      entity_id: 'usr-admin-master',
      details: {
        message: 'Administrator password successfully updated. Initial temporary credentials permanently disabled.',
      },
    });

    return { success: true };
  }

  // --- 5. CHANGE TUTOR PASSWORD ---
  static async changeTutorPassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    const current = this.getCurrentProfile();
    if (!current) return { success: false, error: 'No active session.' };

    const { salt, hash } = await hashPasswordWithSalt(newPassword);
    const key = `${current.full_name.toLowerCase()}::${normalizeCellName(current.cell_name || '')}`;

    this.saveTutorCredential(key, {
      uid: current.id,
      fullName: current.full_name,
      cellName: current.cell_name || 'Cell',
      normalizedCell: normalizeCellName(current.cell_name || ''),
      salt,
      hash,
      createdAt: new Date().toISOString(),
    });

    return { success: true };
  }

  // --- ROLE SWITCHING FOR DEMO / PREVIEWS ---
  static switchDemoRole(role: 'admin' | 'cell_leader'): Profile {
    const all = this.getAllProfiles();
    let target = all.find(p => role === 'admin' ? (p.role === 'admin' || p.role === 'super_admin') : p.role === 'tutor');
    if (!target) {
      if (role === 'admin') {
        target = {
          id: 'usr-admin-master',
          email: 'admin@fnicells.org',
          full_name: 'FNI General Overseer / Administrator',
          role: 'admin',
          is_active: true,
          is_onboarded: true,
          must_change_password: false,
          created_at: new Date().toISOString(),
        };
      } else {
        target = {
          id: 'usr-tutor-default',
          email: 'tutor@fnicells.org',
          full_name: 'David Asante',
          cell_name: 'Dominion Cell Legon',
          cell_id: 'cell-legon-01',
          role: 'tutor',
          is_active: true,
          is_onboarded: true,
          must_change_password: false,
          created_at: new Date().toISOString(),
        };
      }
    }
    this.setCurrentProfile(target);
    return target;
  }

  // Legacy fallback if needed
  static async completeCellLeaderOnboarding(input: any): Promise<{ profile: Profile; isExistingCellAssociated?: boolean }> {
    const current = this.getCurrentProfile();
    const updated: Profile = {
      ...(current || {}),
      id: current?.id || `tutor-${Date.now()}`,
      full_name: input.fullName || current?.full_name || 'Tutor',
      email: current?.email || `${Date.now()}@fnicells.org`,
      cell_name: input.cellName || current?.cell_name || 'Cell',
      role: 'tutor',
      is_active: true,
      is_onboarded: true,
      must_change_password: false,
      created_at: current?.created_at || new Date().toISOString(),
    };
    this.setCurrentProfile(updated);
    return { profile: updated, isExistingCellAssociated: false };
  }

  // --- SIGN OUT ---
  static async signOut(): Promise<void> {
    if (isFirebaseConfigured && auth) {
      try {
        await fbSignOut(auth);
      } catch (e) {
        console.warn('Firebase signout notice', e);
      }
    }
    localStorage.removeItem(STORAGE_KEYS.CURRENT_PROFILE);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
  }
}
