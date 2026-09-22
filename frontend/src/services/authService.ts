const authApiUrl = 'http://localhost/api/auth'

export type User = {
  id: string
  email: string
  name: string
}

export type Session = {
  sessionId: string
  deviceInfo: string
  ipAddress: string
  lastActivity: string
  createdAt: string
}

export type AuthSession = {
  user: User
  token: string
}

type AuthCredentials = {
  email: string
  password: string
  name?: string
}

export async function authenticate(credentials: AuthCredentials): Promise<AuthSession> {
  const isRegistering = credentials.name !== undefined
  const response = await fetch(`${authApiUrl}/${isRegistering ? 'register' : 'login'}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error ?? 'We could not complete that request.')
  }
  return { user: data.user, token: data.token }
}

export async function fetchSessions(token: string, signal?: AbortSignal): Promise<Session[]> {
  const response = await fetch(`${authApiUrl}/sessions`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  })
  if (!response.ok) {
    throw new Error('Unable to load sessions')
  }
  const data = await response.json()
  return data.sessions
}

export async function logout(token: string): Promise<void> {
  await fetch(`${authApiUrl}/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export async function logoutAll(token: string): Promise<string> {
  const response = await fetch(`${authApiUrl}/logout-all`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error ?? 'All sessions could not be ended.')
  }
  return data.message
}

export function createAuthEventsUrl(token: string): string {
  return `${authApiUrl}/events?token=${encodeURIComponent(token)}`
}
