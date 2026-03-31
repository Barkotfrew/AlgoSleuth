import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { AccentColorPreference, AppearanceSettings, FontSizePreference, ThemePreference } from '../types';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  userEmail?: string | null;
  appearance: AppearanceSettings;
  onAppearanceChange: (next: AppearanceSettings) => void;
  onClearEvidence: () => Promise<void>;
}

type SettingsTab = 'Account' | 'Security' | 'Preferences';

type ProfileStatus = { type: 'success' | 'error'; message: string } | null;

type DataStatus = { type: 'success' | 'error'; message: string } | null;

const tabs: SettingsTab[] = ['Account', 'Security', 'Preferences'];
const themeOptions: ThemePreference[] = ['Dark', 'Light', 'System'];
const fontOptions: FontSizePreference[] = ['Small', 'Medium', 'Large'];
const accentOptions: { value: AccentColorPreference; label: string; swatch: string }[] = [
  { value: 'Yellow', label: 'Yellow', swatch: '#FFD700' },
  { value: 'Green', label: 'Green', swatch: '#34D399' },
  { value: 'Red', label: 'Red', swatch: '#FF3B3B' },
  { value: 'Cyan', label: 'Cyan', swatch: '#22D3EE' },
  { value: 'Purple', label: 'Purple', swatch: '#A855F7' },
];

const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  onClose,
  userEmail,
  appearance,
  onAppearanceChange,
  onClearEvidence,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('Account');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<ProfileStatus>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>(null);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [dataStatus, setDataStatus] = useState<DataStatus>(null);
  const { logout } = useAuth();
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<DataStatus>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setActiveTab('Account');
    setPassword('');
    setConfirmPassword('');
    setStatus(null);
    setProfileStatus(null);
    setDataStatus(null);
    setDeleteStatus(null);

    const loadProfile = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        setProfileUserId(null);
        setProfileName('');
        setProfileEmail(userEmail ?? '');
        return;
      }

      setProfileUserId(data.user.id);
      setProfileEmail(data.user.email ?? userEmail ?? '');

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('display_name, email')
        .eq('user_id', data.user.id)
        .maybeSingle();

      if (profileError) {
        setProfileStatus({ type: 'error', message: profileError.message });
        return;
      }

      if (profileData?.display_name) {
        setProfileName(profileData.display_name);
      }
      if (profileData?.email) {
        setProfileEmail(profileData.email);
      }
    };

    void loadProfile();
  }, [open, userEmail]);

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

  const handleProfileSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setProfileStatus(null);

    if (!profileUserId) {
      setProfileStatus({ type: 'error', message: 'Profile session unavailable. Please re-open settings.' });
      return;
    }

    const trimmedEmail = profileEmail.trim().toLowerCase();
    if (!trimmedEmail) {
      setProfileStatus({ type: 'error', message: 'Email is required.' });
      return;
    }

    const displayName = profileName.trim();
    setIsProfileSaving(true);

    const authUpdates: { email?: string; data?: { display_name?: string | null } } = {};
    if (trimmedEmail && trimmedEmail !== (userEmail ?? '').toLowerCase()) {
      authUpdates.email = trimmedEmail;
    }
    authUpdates.data = { display_name: displayName || null };

    if (authUpdates.email || authUpdates.data) {
      const { error } = await supabase.auth.updateUser(authUpdates);
      if (error) {
        setProfileStatus({ type: 'error', message: error.message });
        setIsProfileSaving(false);
        return;
      }
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(
        {
          user_id: profileUserId,
          email: trimmedEmail,
          display_name: displayName || null,
        },
        { onConflict: 'user_id' }
      );

    if (profileError) {
      setProfileStatus({ type: 'error', message: profileError.message });
      setIsProfileSaving(false);
      return;
    }

    setProfileStatus({
      type: 'success',
      message: authUpdates.email
        ? 'Profile saved. Check your inbox to confirm the new email address.'
        : 'Profile updated successfully.',
    });
    setIsProfileSaving(false);
  };

  const handleAppearanceChange = (patch: Partial<AppearanceSettings>) => {
    onAppearanceChange({ ...appearance, ...patch });
  };

  const handleLogout = async () => {
    setLogoutError(null);
    setIsSigningOut(true);

    try {
      await logout();
      onClose();
    } catch (error: any) {
      setLogoutError(error?.message ?? 'Failed to logout.');
    } finally {
      setIsSigningOut(false);
    }
  };

  const isAuthenticated = Boolean(profileUserId);
  const handleClearEvidence = async () => {
    setDataStatus(null);

    const confirmed = window.confirm('Clear all evidence history for your account? This cannot be undone.');
    if (!confirmed) {
      return;
    }

    try {
      await onClearEvidence();
      setDataStatus({ type: 'success', message: 'Evidence history cleared.' });
    } catch (error: any) {
      setDataStatus({ type: 'error', message: error?.message ?? 'Unable to clear evidence history.' });
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteStatus(null);

    const confirmed = window.confirm(
      'Delete your account and all associated data? This action is permanent and cannot be undone.'
    );
    if (!confirmed) {
      return;
    }

    setIsDeletingAccount(true);

    try {
      const { error } = await supabase.functions.invoke('delete-account');
      if (error) {
        throw error;
      }
      setDeleteStatus({ type: 'success', message: 'Account deleted successfully.' });
      await logout();
      onClose();
    } catch (error: any) {
      setDeleteStatus({ type: 'error', message: error?.message ?? 'Unable to delete account.' });
    } finally {
      setIsDeletingAccount(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#0b0b0b] border border-[#333] shadow-[0_0_40px_rgba(0,0,0,0.6)] custom-scrollbar">
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
              <div className="space-y-6">
                <div className="border-b border-[#222] pb-3">
                  <h3 className="text-sm font-bold text-[#e0e0e0] uppercase tracking-wider">Account Overview</h3>
                  <p className="text-xs text-gray-500 font-mono">Manage your profile and identity.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="bg-[#111] border border-[#222] p-4">
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 font-mono">Signed in as</p>
                    <p className="text-sm text-[#FFD700] font-mono mt-2">{maskedEmail}</p>
                  </div>
                  <div className="bg-[#111] border border-[#222] p-4">
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 font-mono">Session status</p>
                    <p className={`text-sm font-mono mt-2 ${isAuthenticated ? "text-green-400" : "text-gray-400"}`}>
                      {isAuthenticated ? "Active" : "Guest"}
                    </p>
                  </div>
                </div>
                {!isAuthenticated && (
                  <div className="border border-[#222] bg-[#111] p-4 text-xs font-mono text-gray-400">
                    Sign in to manage profile and security settings.
                  </div>
                )}

                {isAuthenticated && (
                  <>
                    <form onSubmit={handleProfileSave} className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="text-xs font-mono uppercase tracking-[0.2em] text-[#FF3B3B]">
                          Display name
                          <input
                            type="text"
                            value={profileName}
                            onChange={(event) => setProfileName(event.target.value)}
                            className="mt-2 w-full border border-[#333] bg-[#0a0a0a] p-3 text-sm text-[#e0e0e0] focus:border-[#FFD700] focus:outline-none"
                            placeholder="Agent name"
                          />
                        </label>

                        <label className="text-xs font-mono uppercase tracking-[0.2em] text-[#FF3B3B]">
                          Email
                          <input
                            type="email"
                            value={profileEmail}
                            onChange={(event) => setProfileEmail(event.target.value)}
                            className="mt-2 w-full border border-[#333] bg-[#0a0a0a] p-3 text-sm text-[#e0e0e0] focus:border-[#FFD700] focus:outline-none"
                            placeholder="agent@domain.com"
                          />
                        </label>
                      </div>

                      {profileStatus && (
                        <div
                          className={`text-xs font-mono border px-3 py-2 ${
                            profileStatus.type === 'success'
                              ? 'border-green-500/40 bg-green-900/20 text-green-300'
                              : 'border-[#FF3B3B]/50 bg-[#2a0d0d] text-red-200'
                          }`}
                        >
                          {profileStatus.message}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isProfileSaving}
                        className="border border-[#FFD700] text-[#FFD700] px-4 py-2 text-xs font-mono uppercase tracking-widest hover:bg-[#FFD700]/10 disabled:opacity-50"
                      >
                        {isProfileSaving ? 'Saving...' : 'Save profile'}
                      </button>
                    </form>

                    <div className="border-t border-[#222] pt-4">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-[#e0e0e0]">Sign out</h4>
                      <p className="text-xs text-gray-500 font-mono mt-1">End this session on the current device.</p>
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={handleLogout}
                          disabled={isSigningOut}
                          className="rounded-sm border border-[#FF3B3B] px-4 py-2 text-xs font-mono uppercase tracking-wider text-[#FF3B3B] hover:bg-[#FF3B3B]/10 disabled:opacity-50"
                        >
                          {isSigningOut ? 'Signing Out...' : 'Logout'}
                        </button>
                      </div>
                      {logoutError && (
                        <div className="mt-3 text-xs font-mono border border-[#FF3B3B]/50 bg-[#2a0d0d] px-3 py-2 text-red-200">
                          {logoutError}
                        </div>
                      )}
                    </div>

                    <div className="border-t border-[#222] pt-4">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-[#e0e0e0]">Delete account</h4>
                      <p className="text-xs text-gray-500 font-mono mt-1">Permanently remove your account and all data.</p>
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={handleDeleteAccount}
                          disabled={isDeletingAccount}
                          className="rounded-sm border border-[#FF3B3B] px-4 py-2 text-xs font-mono uppercase tracking-wider text-[#FF3B3B] hover:bg-[#FF3B3B]/10 disabled:opacity-50"
                        >
                          {isDeletingAccount ? 'Deleting...' : 'Delete my account'}
                        </button>
                      </div>
                      {deleteStatus && (
                        <div
                          className={`mt-3 text-xs font-mono border px-3 py-2 ${
                            deleteStatus.type === 'success'
                              ? 'border-green-500/40 bg-green-900/20 text-green-300'
                              : 'border-[#FF3B3B]/50 bg-[#2a0d0d] text-red-200'
                          }`}
                        >
                          {deleteStatus.message}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'Security' && (
              !isAuthenticated ? (
                <div className="border border-[#222] bg-[#111] p-4 text-xs font-mono text-gray-400">
                  Sign in to update your password.
                </div>
              ) : (
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
              )
            )}

            {activeTab === 'Preferences' && (
              <div className="space-y-6">
                <div className="border-b border-[#222] pb-3">
                  <h3 className="text-sm font-bold text-[#e0e0e0] uppercase tracking-wider">App Appearance</h3>
                  <p className="text-xs text-gray-500 font-mono">Tune the look and feel of the console.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-xs font-mono uppercase tracking-[0.2em] text-[#FF3B3B]">
                    Theme
                    <select
                      value={appearance.theme}
                      onChange={(event) => handleAppearanceChange({ theme: event.target.value as ThemePreference })}
                      className="mt-2 w-full border border-[#333] bg-[#0a0a0a] p-3 text-sm text-[#e0e0e0] focus:border-[#FFD700] focus:outline-none"
                    >
                      {themeOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-xs font-mono uppercase tracking-[0.2em] text-[#FF3B3B]">
                    Font size
                    <select
                      value={appearance.fontSize}
                      onChange={(event) => handleAppearanceChange({ fontSize: event.target.value as FontSizePreference })}
                      className="mt-2 w-full border border-[#333] bg-[#0a0a0a] p-3 text-sm text-[#e0e0e0] focus:border-[#FFD700] focus:outline-none"
                    >
                      {fontOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-mono uppercase tracking-[0.2em] text-[#FF3B3B]">Accent color</p>
                  <div className="flex flex-wrap gap-2">
                    {accentOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleAppearanceChange({ accent: option.value })}
                        className={`px-3 py-2 border text-[10px] font-mono uppercase tracking-widest transition-all ${
                          appearance.accent === option.value
                            ? 'border-[#FFD700] text-[#FFD700]'
                            : 'border-[#333] text-gray-400 hover:border-[#FFD700] hover:text-[#FFD700]'
                        }`}
                      >
                        <span className="inline-flex items-center gap-2">
                          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: option.swatch }} />
                          {option.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-b border-[#222] pb-3">
                  <h3 className="text-sm font-bold text-[#e0e0e0] uppercase tracking-wider">Data & Privacy</h3>
                  <p className="text-xs text-gray-500 font-mono">Control stored evidence for your account.</p>
                </div>

                <div className="bg-[#111] border border-[#222] p-4 space-y-3">
                  <p className="text-xs font-mono text-gray-400">Clear all stored evidence and timeline history.</p>
                  <button
                    type="button"
                    onClick={handleClearEvidence}
                    className="border border-[#FF3B3B] text-[#FF3B3B] px-3 py-2 text-xs font-mono uppercase tracking-widest hover:bg-[#FF3B3B]/10"
                  >
                    Clear evidence history
                  </button>

                  {dataStatus && (
                    <div
                      className={`text-xs font-mono border px-3 py-2 ${
                        dataStatus.type === 'success'
                          ? 'border-green-500/40 bg-green-900/20 text-green-300'
                          : 'border-[#FF3B3B]/50 bg-[#2a0d0d] text-red-200'
                      }`}
                    >
                      {dataStatus.message}
                    </div>
                  )}
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















