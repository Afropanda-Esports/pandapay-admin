/** Server-only session cookie for admin JWT (never exposed to client JS). */
export const ADMIN_TOKEN_COOKIE = 'admin_token';

/** HttpOnly hint for edge routing (API still enforces JWT role). */
export const ADMIN_ROLE_COOKIE = 'admin_role';

/** Align with pandapay-be `JWT_EXPIRES_IN` default (24h). */
export const SESSION_MAX_AGE_SECONDS = 24 * 60 * 60;

export function getApiBaseUrl(): string {
  const url =
    process.env.API_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!url) {
    throw new Error(
      'API_URL (or NEXT_PUBLIC_API_URL) must be set for the admin BFF',
    );
  }
  return url.replace(/\/$/, '');
}

export function sessionCookieOptions(): {
  httpOnly: true;
  secure: boolean;
  sameSite: 'strict';
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export function clearSessionCookieOptions(): {
  httpOnly: true;
  secure: boolean;
  sameSite: 'strict';
  path: string;
  maxAge: 0;
} {
  return {
    ...sessionCookieOptions(),
    maxAge: 0,
  };
}
