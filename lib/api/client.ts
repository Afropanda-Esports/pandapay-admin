const REQUEST_TIMEOUT_MS = 30_000;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Same-origin BFF proxy — JWT stays in HttpOnly cookie (see `/api/backend/*`).
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const url = `/api/backend${normalized}`;

  const res = await fetch(url, {
    ...options,
    credentials: 'same-origin',
    signal: options.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (res.status === 401) {
    const body = (await res.json().catch(() => null)) as {
      message?: string;
    } | null;
    const message = body?.message ?? 'Session expired';

    if (globalThis.window !== undefined) {
      const onLoginPage = globalThis.location.pathname === '/login';
      if (!onLoginPage) {
        globalThis.location.href = '/login';
      }
    }

    throw new ApiError(401, message);
  }

  if (res.status === 403) {
    const body = (await res.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new ApiError(403, body?.message ?? 'You do not have permission for this action');
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new ApiError(res.status, body?.message ?? 'Request failed');
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
