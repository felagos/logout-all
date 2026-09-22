import * as SecureStore from 'expo-secure-store';

import type { AuthSession } from './authApi';

const sessionKey = 'logout-all.auth-session';

function isAuthSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== 'object') return false;
  const session = value as Partial<AuthSession>;
  return (
    typeof session.token === 'string'
    && typeof session.user?.id === 'string'
    && typeof session.user.email === 'string'
    && typeof session.user.name === 'string'
  );
}

export async function readSession() {
  const value = await SecureStore.getItemAsync(sessionKey);
  if (!value) return null;
  try {
    const session = JSON.parse(value) as unknown;
    if (isAuthSession(session)) return session;
  } catch {
    // A malformed local value is treated as signed out.
  }
  await SecureStore.deleteItemAsync(sessionKey);
  return null;
}

export function saveSession(session: AuthSession) {
  return SecureStore.setItemAsync(sessionKey, JSON.stringify(session));
}

export function clearSession() {
  return SecureStore.deleteItemAsync(sessionKey);
}
