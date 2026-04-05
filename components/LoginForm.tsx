import React, { useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getAuthRememberPreference, supabase } from '../services/supabase';

interface LoginFormProps {
  onSwitchToRegister: () => void;
}

const isValidEmail = (value: string): boolean => /\S+@\S+\.\S+/.test(value);

const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState<boolean>(getAuthRememberPreference());
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetStatus, setResetStatus] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const canSubmit = useMemo(() => email.trim().length > 0 && password.length > 0, [email, password]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setResetStatus(null);

    const normalizedEmail = email.trim();

    if (!isValidEmail(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);

    try {
      await login(normalizedEmail, password, rememberMe);
    } catch (authError) {
      const message = authError instanceof Error ? authError.message : 'Login failed. Please try again.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordReset = async () => {
    setError(null);
    setResetStatus(null);

    const normalizedEmail = email.trim();
    if (!isValidEmail(normalizedEmail)) {
      setError('Enter the email you used to register.');
      return;
    }

    setIsResetting(true);

    try {
      const redirectTo = `${window.location.origin}`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo });
      if (resetError) {
        throw resetError;
      }
      setResetStatus('Password reset link sent. Check your email to continue.');
    } catch (resetError) {
      const message = resetError instanceof Error ? resetError.message : 'Unable to send reset link.';
      setError(message);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="login-email" className="block text-xs font-mono uppercase tracking-[0.2em] text-[#FF3B3B] mb-2">
          Agent Email
        </label>
        <input
          id="login-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="agent@unit.ai"
          className="w-full rounded-sm border border-[#333] bg-[#050505] px-4 py-3 text-sm text-gray-200 outline-none focus:border-[#FFD700]"
          autoComplete="email"
        />
      </div>

      <div>
        <label htmlFor="login-password" className="block text-xs font-mono uppercase tracking-[0.2em] text-[#FF3B3B] mb-2">
          Passcode
        </label>
        <input
          id="login-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="********"
          className="w-full rounded-sm border border-[#333] bg-[#050505] px-4 py-3 text-sm text-gray-200 outline-none focus:border-[#FFD700]"
          autoComplete="current-password"
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
      {resetStatus && (
        <p className="rounded-sm border border-green-700 bg-[#0c2a17] px-3 py-2 text-xs text-green-300">
          {resetStatus}
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit || isSubmitting}
        className="w-full rounded-sm bg-[#FFD700] px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-black transition-all disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? 'Authenticating...' : 'Login'}
      </button>

      <button
        type="button"
        onClick={handlePasswordReset}
        disabled={isResetting}
        className="w-full text-center text-xs text-gray-400 underline underline-offset-4 hover:text-[#FFD700] disabled:opacity-50"
      >
        {isResetting ? 'Sending reset link...' : 'Forgot passcode?'}
      </button>

      <button
        type="button"
        onClick={onSwitchToRegister}
        className="w-full text-center text-xs text-gray-400 underline underline-offset-4 hover:text-[#FFD700]"
      >
        Need an account? Register
      </button>
    </form>
  );
};

export default LoginForm;
