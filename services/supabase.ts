import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const AUTH_REMEMBER_KEY = 'algosleuth_auth_remember';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

const canUseBrowserStorage = (): boolean => typeof window !== 'undefined' && !!window.localStorage && !!window.sessionStorage;

export const getAuthRememberPreference = (): boolean => {
  if (!canUseBrowserStorage()) {
    return true;
  }

  return window.localStorage.getItem(AUTH_REMEMBER_KEY) !== 'false';
};

export const setAuthRememberPreference = (remember: boolean): void => {
  if (!canUseBrowserStorage()) {
    return;
  }

  window.localStorage.setItem(AUTH_REMEMBER_KEY, remember ? 'true' : 'false');
};

const authStorage = {
  getItem: (key: string): string | null => {
    if (!canUseBrowserStorage()) {
      return null;
    }

    if (getAuthRememberPreference()) {
      return window.localStorage.getItem(key);
    }

    return window.sessionStorage.getItem(key);
  },
  setItem: (key: string, value: string): void => {
    if (!canUseBrowserStorage()) {
      return;
    }

    if (getAuthRememberPreference()) {
      window.localStorage.setItem(key, value);
      window.sessionStorage.removeItem(key);
      return;
    }

    window.sessionStorage.setItem(key, value);
    window.localStorage.removeItem(key);
  },
  removeItem: (key: string): void => {
    if (!canUseBrowserStorage()) {
      return;
    }

    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: authStorage,
  },
});
