import type { Profile } from '../types';

/** Test-only identities are kept for QA sign-in but never shown as real members. */
export function isTestProfile(profile: Partial<Profile> | null | undefined): boolean {
  if (!profile) return false;
  if (profile.is_test_account === true) return true;
  const identity = [profile.full_name, profile.email, profile.username]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return /\btest\b|dummy|nonexistent|example\.com/.test(identity);
}
