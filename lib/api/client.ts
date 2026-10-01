const REQUEST_TIMEOUT_MS = 30_000;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    /** The backend's machine-readable `code` (e.g. `SKU_TAKEN`), when sent. */
    public readonly code?: string,
    /**
     * The backend's structured `details` on a 4xx — e.g. the figures behind a
     * `409 LARGE_RATE_CHANGE`, which the confirmation dialog shows (GBP-005).
     */
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ErrorBody {
  message?: string;
  code?: string;
  details?: Record<string, unknown>;
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
    const body = (await res.json().catch(() => null)) as ErrorBody | null;
    throw new ApiError(
      403,
      body?.message ?? 'You do not have permission for this action',
      body?.code,
    );
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ErrorBody | null;
    throw new ApiError(
      res.status,
      body?.message ?? 'Request failed',
      body?.code,
      body?.details,
    );
  }

  if (res.status === 204) return undefined as T;

  // A 200 with an empty body happens whenever a controller returns `null`
  // (e.g. "no settings saved yet") — NestJS/Express send that as a genuinely
  // empty response rather than the JSON literal `null`, so res.json() would
  // throw "Unexpected end of JSON input" here.
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}
