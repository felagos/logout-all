export type User = {
  id: string;
  email: string;
  name: string;
};

export type AuthSession = {
  token: string;
  user: User;
};

export type Session = {
  sessionId: string;
  deviceInfo: string;
  ipAddress: string;
  lastActivity: string;
  createdAt: string;
};

type Credentials = {
  email: string;
  password: string;
};

type RegisterCredentials = Credentials & { name: string };

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

function getApiUrl() {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/$/, '');
  if (!apiUrl) {
    throw new ApiError(
      'Falta EXPO_PUBLIC_API_URL. Configura la URL LAN del backend en .env.local.',
      0,
    );
  }
  return `${apiUrl}/api/auth`;
}

async function parseResponse(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function request(path: string, init?: RequestInit) {
  const response = await fetch(`${getApiUrl()}${path}`, init);
  const body = await parseResponse(response);
  if (!response.ok) {
    throw new ApiError(
      typeof body.error === 'string' ? body.error : 'No pudimos completar la solicitud.',
      response.status,
    );
  }
  return body;
}

async function authenticate(path: '/login' | '/register', credentials: Credentials | RegisterCredentials) {
  const body = await request(path, {
    body: JSON.stringify(credentials),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });
  if (typeof body.token !== 'string' || typeof body.user !== 'object' || body.user === null) {
    throw new ApiError('El servidor devolvió una respuesta de autenticación inválida.', 502);
  }
  return { token: body.token, user: body.user as User } satisfies AuthSession;
}

export function login(credentials: Credentials) {
  return authenticate('/login', credentials);
}

export function register(credentials: RegisterCredentials) {
  return authenticate('/register', credentials);
}

function authorization(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function fetchSessions(token: string) {
  const body = await request('/sessions', { headers: authorization(token) });
  return Array.isArray(body.sessions) ? (body.sessions as Session[]) : [];
}

export async function logout(token: string) {
  await request('/logout', { headers: authorization(token), method: 'POST' });
}

export async function logoutAll(token: string) {
  const body = await request('/logout-all', { headers: authorization(token), method: 'POST' });
  return typeof body.message === 'string' ? body.message : 'Sesiones cerradas.';
}

export function authEventsUrl(token: string) {
  return `${getApiUrl()}/events?token=${encodeURIComponent(token)}`;
}

export function isAuthenticationError(error: unknown) {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}
