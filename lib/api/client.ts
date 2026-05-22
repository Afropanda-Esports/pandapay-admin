import Cookies from 'js-cookie';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = Cookies.get('admin_token');

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    // Only force-logout when there was an active session token.
    // If there's no token this is a login attempt with bad credentials —
    // let the caller's catch block handle it and show an error message.
    if (token) {
      Cookies.remove('admin_token');
      if (globalThis.window !== undefined) globalThis.location.href = '/login';
      throw new ApiError(401, 'Session expired');
    }
    const body = await res.json().catch(() => null) as { message?: string } | null;
    throw new ApiError(401, body?.message ?? 'Invalid credentials');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null) as { message?: string } | null;
    throw new ApiError(res.status, body?.message ?? 'Request failed');
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
