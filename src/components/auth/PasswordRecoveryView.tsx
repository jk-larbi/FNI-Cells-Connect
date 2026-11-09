import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

interface PasswordRecoveryViewProps {
  onComplete: () => void;
}

export const PasswordRecoveryView: React.FC<PasswordRecoveryViewProps> = ({ onComplete }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Use a password with at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }
    if (!supabase) {
      setError('The authentication service is unavailable. Please try again.');
      return;
    }

    setSaving(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        setError('This reset link is invalid or has expired. Request a new password reset email.');
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      await supabase.auth.signOut();
      onComplete();
    } catch (err: any) {
      setError(err?.message || 'Password could not be updated. Please request a new reset link.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-5 py-10">
      <section className="w-full max-w-md rounded-2xl border border-[#E3E8EF] p-7 shadow-xl">
        <div className="text-center mb-7">
          <h1 className="text-2xl font-bold text-[#142B4A]">Create a new password</h1>
          <p className="text-sm text-[#667085] mt-2">Choose a new password for your FNI Cells Connect account.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-semibold text-[#142B4A]">
            New password
            <input autoComplete="new-password" type="password" minLength={8} required value={password}
              onChange={e => setPassword(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[#E3E8EF] px-4 py-3 text-sm outline-none focus:border-[#142B4A]"
              placeholder="At least 8 characters" />
          </label>
          <label className="block text-sm font-semibold text-[#142B4A]">
            Confirm new password
            <input autoComplete="new-password" type="password" minLength={8} required value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[#E3E8EF] px-4 py-3 text-sm outline-none focus:border-[#142B4A]"
              placeholder="Enter the password again" />
          </label>
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={saving}
            className="w-full rounded-xl bg-[#142B4A] px-4 py-3 font-semibold text-white disabled:opacity-50">
            {saving ? 'Updating password…' : 'Update password'}
          </button>
        </form>
      </section>
    </main>
  );
};
