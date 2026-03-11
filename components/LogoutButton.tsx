import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface LogoutButtonProps {
  className?: string;
  onError?: (message: string) => void;
  children?: React.ReactNode;
}

const LogoutButton: React.FC<LogoutButtonProps> = ({ className, onError, children }) => {
  const { logout } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleClick = async () => {
    setLocalError(null);
    setIsSubmitting(true);

    try {
      await logout();
    } catch (authError) {
      const message = authError instanceof Error ? authError.message : 'Failed to logout.';
      if (onError) {
        onError(message);
      } else {
        setLocalError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isSubmitting}
        className={
          className ??
          'rounded-sm border border-[#333] px-4 py-2 text-xs font-mono uppercase tracking-wider text-gray-200 hover:border-[#FFD700] hover:text-[#FFD700] disabled:opacity-50'
        }
      >
        {isSubmitting ? 'Signing Out...' : children ?? 'Logout'}
      </button>
      {!onError && localError && <p className="mt-2 text-xs text-red-300">{localError}</p>}
    </div>
  );
};

export default LogoutButton;
