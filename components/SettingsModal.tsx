import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabase';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  userEmail?: string | null;
}

type SettingsTab = 'Account' | 'Security' | 'Preferences';

const tabs: SettingsTab[] = ['Account', 'Security', 'Preferences'];

const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose, userEmail }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('Account');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setActiveTab('Account');
    setPassword('');
    setConfirmPassword('');
    setStatus(null);
  }, [open]);

  const maskedEmail = useMemo(() => {
    if (!userEmail) {
      return 'guest@agent';
    }

    return userEmail;
  }, [userEmail]);

  const handlePasswordUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);

    if (!password || password.length < 6) {
      setStatus({ type: 'error', message: 'Password must be at least 6 characters.' });
      return;
    }

    if (password !== confirmPassword) {
      setStatus({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    setIsUpdating(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setStatus({ type: 'error', message: error.message });
      setIsUpdating(false);
      return;
    }

    setStatus({ type: 'success', message: 'Password updated successfully.' });
    setPassword('');
    setConfirmPassword('');
    setIsUpdating(false);
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-[#0b0b0b] border border-[#333] shadow-[0_0_40px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between border-b border-[#222] px-5 py-4">
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.35em] text-[#FF3B3B]">Settings</p>
            <h2 className="text-lg font-bold text-[#FFD700] tracking-widest uppercase">Agent Console</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs uppercase tracking-wider text-gray-400 hover:text-[#FFD700]"
          >
            Close
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr]">
          <div className="border-b md:border-b-0 md:border-r border-[#222] p-4">
            <div className="flex md:flex-col gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`text-xs font-mono uppercase tracking-widest px-3 py-2 border ${
                    activeTab === tab
                      ? 'border-[#FFD700] text-[#FFD700] bg-[#141414]'
                      : 'border-transparent text-gray-500 hover:text-gray-200 hover:border-[#333]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6 space-y-6">
            {activeTab === 'Account' && (
              <div className="space-y-4">
                <div className="border-b border-[#222] pb-3">
                  <h3 className="text-sm font-bold text-[#e0e0e0] uppercase tracking-wider">Account Overview</h3>
                  <p className="text-xs text-gray-500 font-mono">Your primary identity and session details.</p>
                </div>
                <div className="grid gap-4">
                  <div className="bg-[#111] border border-[#222] p-4">
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 font-mono">Signed in as</p>
                    <p className="text-sm text-[#FFD700] font-mono mt-2">{maskedEmail}</p>
                  </div>
                  <div className="bg-[#111] border border-[#222] p-4">
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 font-mono">Session status</p>
                    <p className="text-sm text-green-400 font-mono mt-2">Active</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'Security' && (
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div className="border-b border-[#222] pb-3">
                  <h3 className="text-sm font-bold text-[#e0e0e0] uppercase tracking-wider">Security</h3>
                  <p className="text-xs text-gray-500 font-mono">Update your password to secure your account.</p>
                </div>

                <div className="grid gap-4">
                  <label className="text-xs font-mono uppercase tracking-[0.2em] text-[#FF3B3B]">
                    New password
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="mt-2 w-full border border-[#333] bg-[#0a0a0a] p-3 text-sm text-[#e0e0e0] focus:border-[#FFD700] focus:outline-none"
                    />
                  </label>

                  <label className="text-xs font-mono uppercase tracking-[0.2em] text-[#FF3B3B]">
                    Confirm new password
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className="mt-2 w-full border border-[#333] bg-[#0a0a0a] p-3 text-sm text-[#e0e0e0] focus:border-[#FFD700] focus:outline-none"
                    />
                  </label>
                </div>

                {status && (
                  <div
                    className={`text-xs font-mono border px-3 py-2 ${
                      status.type === 'success'
                        ? 'border-green-500/40 bg-green-900/20 text-green-300'
                        : 'border-[#FF3B3B]/50 bg-[#2a0d0d] text-red-200'
                    }`}
                  >
                    {status.message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isUpdating}
                  className="border border-[#FFD700] text-[#FFD700] px-4 py-2 text-xs font-mono uppercase tracking-widest hover:bg-[#FFD700]/10 disabled:opacity-50"
                >
                  {isUpdating ? 'Updating...' : 'Update password'}
                </button>
              </form>
            )}

            {activeTab === 'Preferences' && (
              <div className="space-y-4">
                <div className="border-b border-[#222] pb-3">
                  <h3 className="text-sm font-bold text-[#e0e0e0] uppercase tracking-wider">Preferences</h3>
                  <p className="text-xs text-gray-500 font-mono">Tune the experience. More controls coming soon.</p>
                </div>
                <div className="bg-[#111] border border-[#222] p-4 text-xs font-mono text-gray-400">
                  Preference controls will be deployed in the next ops cycle.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
