import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';

import { fetchSessions, isAuthenticationError, type AuthSession } from '@/services/authApi';
import { clearSession, readSession, saveSession } from '@/services/sessionStorage';

type AuthStatus = 'loading' | 'signedIn' | 'signedOut';

type AuthContextValue = {
  session: AuthSession | null;
  signIn: (session: AuthSession) => Promise<void>;
  signOut: () => Promise<void>;
  status: AuthStatus;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const currentSession = useRef<AuthSession | null>(null);

  const signOut = useCallback(async () => {
    currentSession.current = null;
    setSession(null);
    setStatus('signedOut');
    await clearSession();
  }, []);

  const signIn = useCallback(async (nextSession: AuthSession) => {
    await saveSession(nextSession);
    currentSession.current = nextSession;
    setSession(nextSession);
    setStatus('signedIn');
  }, []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      let storedSession: AuthSession | null;
      try {
        storedSession = await readSession();
      } catch {
        if (mounted) setStatus('signedOut');
        return;
      }
      if (!storedSession) {
        if (mounted) setStatus('signedOut');
        return;
      }

      try {
        await fetchSessions(storedSession.token);
      } catch (error) {
        if (isAuthenticationError(error)) {
          await clearSession();
          if (mounted) setStatus('signedOut');
          return;
        }
        // Keep the encrypted local session during a transient network failure.
      }

      if (mounted) {
        currentSession.current = storedSession;
        setSession(storedSession);
        setStatus('signedIn');
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') return;
      const activeSession = currentSession.current;
      if (!activeSession) return;
      void fetchSessions(activeSession.token).catch((error: unknown) => {
        if (isAuthenticationError(error)) void signOut();
      });
    });
    return () => subscription.remove();
  }, [signOut]);

  const value = useMemo(() => ({ session, signIn, signOut, status }), [session, signIn, signOut, status]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
