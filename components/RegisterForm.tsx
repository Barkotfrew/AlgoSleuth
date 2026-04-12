import React, { useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getAuthRememberPreference } from '../services/supabase';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

const isValidEmail = (value: string): boolean => /\S+@\S+\.\S+/.test(value);

const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin }) => {
  const { register } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState<boolean>(getAuthRememberPreference());
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(
    () => displayName.trim().length > 0 && email.trim().length > 0 && password.length > 0 && confirmPassword.length > 0,
    [displayName, email, password, confirmPassword]
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const normalizedEmail = email.trim();
    const normalizedName = displayName.trim();

    if (!normalizedName) {
      setError('Enter your name.');
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await register(normalizedEmail, password, rememberMe, normalizedName);
      if (result.needsEmailVerification) {
        setSuccessMessage('Registration successful. Check your email to confirm your account.');
      }
    } catch (authError) {
      const message = authError instanceof Error ? authError.message : 'Registration failed. Please try again.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="register-name" className="block text-xs font-mono uppercase tracking-[0.2em] text-[#FF3B3B] mb-2">
          Agent Name
        </label>
        <input
          id="register-name"
          type="text"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Detective name"
          className="w-full rounded-sm border border-[#333] bg-[#050505] px-4 py-3 text-sm text-gray-200 outline-none focus:border-[#FFD700]"
          autoComplete="name"
        />
      </div>

      <div>
        <label htmlFor="register-email" className="block text-xs font-mono uppercase tracking-[0.2em] text-[#FF3B3B] mb-2">
          Agent Email
        </label>
        <input
          id="register-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="agent@unit.ai"
          className="w-full rounded-sm border border-[#333] bg-[#050505] px-4 py-3 text-sm text-gray-200 outline-none focus:border-[#FFD700]"
          autoComplete="email"
        />
      </div>

      <div>
        <label htmlFor="register-password" className="block text-xs font-mono uppercase tracking-[0.2em] text-[#FF3B3B] mb-2">
          Passcode
        </label>
        <input
          id="register-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Minimum 6 characters"
          className="w-full rounded-sm border border-[#333] bg-[#050505] px-4 py-3 text-sm text-gray-200 outline-none focus:border-[#FFD700]"
          autoComplete="new-password"
        />
      </div>

      <div>
        <label htmlFor="register-confirm-password" className="block text-xs font-mono uppercase tracking-[0.2em] text-[#FF3B3B] mb-2">
          Confirm Passcode
        </label>
        <input
          id="register-confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Re-enter passcode"
          className="w-full rounded-sm border border-[#333] bg-[#050505] px-4 py-3 text-sm text-gray-200 outline-none focus:border-[#FFD700]"
          autoComplete="new-password"
        />
      </div>

      <label className="flex items-center gap-2 text-xs font-mono text-gray-300 select-none">
        <input
          type="checkbox"
          checked={rememberMe}
          onChange={(event) => setRememberMe(event.target.checked)}
          className="h-4 w-4 rounded-sm border border-[#555] bg-[#050505] accent-[#FFD700]"
        />
        Remember me on this device
      </label>

      {error && <p className="rounded-sm border border-[#FF3B3B] bg-[#2a0d0d] px-3 py-2 text-xs text-red-300">{error}</p>}
      {successMessage && <p className="rounded-sm border border-green-700 bg-[#0c2a17] px-3 py-2 text-xs text-green-300">{successMessage}</p>}

      <button
        type="submit"
        disabled={!canSubmit || isSubmitting}
        className="w-full rounded-sm bg-[#FFD700] px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-black transition-all disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? 'Creating Account...' : 'Register'}
      </button>

      <button
        type="button"
        onClick={onSwitchToLogin}
        className="w-full text-center text-xs text-gray-400 underline underline-offset-4 hover:text-[#FFD700]"
      >
        Already have an account? Login
      </button>
    </form>
  );
};

export default RegisterForm;
