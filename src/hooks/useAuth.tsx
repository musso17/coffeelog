'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { supabase } from '@/lib/supabaseClient';

import type { AuthError, Session, User } from '@supabase/supabase-js';
import type { ReactNode } from 'react';

type SignInPayload = { email: string; password: string };
type SignUpPayload = { email: string; password: string };
type MagicLinkPayload = { email: string };

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithPassword: (
    payload: SignInPayload,
  ) => Promise<{ data: { user: User | null; session: Session | null }; error: AuthError | null }>;
  signUpWithPassword: (
    payload: SignUpPayload,
  ) => Promise<{ data: { user: User | null; session: Session | null }; error: AuthError | null }>;
  signInWithMagicLink: (
    payload: MagicLinkPayload,
  ) => Promise<{ data: { user: User | null; session: Session | null }; error: AuthError | null }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      setLoading(true);
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Failed to fetch session', error);
      }
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
      },
    );

    init();

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signInWithPassword = useCallback(
    async (payload: SignInPayload) => {
      const result = await supabase.auth.signInWithPassword(payload);
      if (!result.error) {
        setSession(result.data.session);
        setUser(result.data.user);
      }
      return result;
    },
    [],
  );

  const signUpWithPassword = useCallback(
    async (payload: SignUpPayload) => {
      const result = await supabase.auth.signUp({
        email: payload.email,
        password: payload.password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });
      if (!result.error) {
        setSession(result.data.session);
        setUser(result.data.user);
      }
      return result;
    },
    [],
  );

  const signInWithMagicLink = useCallback(
    async (payload: MagicLinkPayload) => {
      const result = await supabase.auth.signInWithOtp({
        email: payload.email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      if (!result.error) {
        setSession(result.data.session);
        setUser(result.data.user ?? null);
      }
      return result;
    },
    [],
  );

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out', error);
    }
    setSession(null);
    setUser(null);
  }, []);

  const refreshSession = useCallback(async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Failed to refresh session', error);
      return;
    }
    setSession(data.session);
    setUser(data.session?.user ?? null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      signInWithPassword,
      signUpWithPassword,
      signInWithMagicLink,
      signOut,
      refreshSession,
    }),
    [
      user,
      session,
      loading,
      signInWithPassword,
      signUpWithPassword,
      signInWithMagicLink,
      signOut,
      refreshSession,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
