import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { setAuthRememberPreference, supabase } from '../services/supabase';

interface RegisterResult {
  needsEmailVerification: boolean;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  register: (email: string, password: string, rememberMe: boolean) => Promise<RegisterResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const upsertProfile = async (user: User): Promise<void> => {
  const displayName = typeof user.user_metadata?.display_name === 'string' ? user.user_metadata.display_name : null;
  if (!user.email) {
    return;
  }

  const { error } = await supabase.from('profiles').upsert(
    {
      user_id: user.id,
      email: user.email,
      display_name: displayName,
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    console.warn('Profile sync skipped:', error.message);
  }
};

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const bootstrapSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Failed to load auth session:', error);
      }

      if (!isMounted) {
        return;
      }

      const currentSession = data.session ?? null;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setIsLoading(false);

      if (currentSession?.user) {
        await upsertProfile(currentSession.user);
      }
    };

    void bootstrapSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setIsLoading(false);

      if (nextSession?.user) {
        void upsertProfile(nextSession.user);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string, rememberMe: boolean) => {
    setAuthRememberPreference(rememberMe);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      throw error;
    }
  }, []);

  const register = useCallback(
    async (email: string, password: string, rememberMe: boolean): Promise<RegisterResult> => {
      setAuthRememberPreference(rememberMe);

      const { data, error } = await supabase.auth.signUp({ email, password });

      if (error) {
        throw error;
      }

      if (data.user && data.session) {
        await upsertProfile(data.user);
      }

      return { needsEmailVerification: !data.session };
    },
    []
  );

  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      isLoading,
      login,
      register,
      logout,
    }),
    [user, session, isLoading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider.');
  }

  return context;
};

