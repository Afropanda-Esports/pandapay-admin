/**
 * Where to send an admin after login.
 *
 * The `redirect` query parameter is attacker-controllable (anyone can send an
 * admin a crafted login link), so only same-origin paths are accepted. Anything
 * else falls back to the dashboard, so a login can never forward the admin to
 * another site.
 */
export const DEFAULT_AFTER_LOGIN = '/dashboard';

export function safeRedirectPath(raw: string | null | undefined): string {
  if (!raw) return DEFAULT_AFTER_LOGIN;
  const value = raw.trim();
  // A single leading slash only: "//host" and "/\host" are protocol-relative
  // in browsers and leave the origin.
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return DEFAULT_AFTER_LOGIN;
  }
  // Control characters (tabs and newlines are stripped by URL parsers and
  // can smuggle a scheme or host back in).
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return DEFAULT_AFTER_LOGIN;
  try {
    const base = 'https://admin.invalid';
    const url = new URL(value, base);
    if (url.origin !== base) return DEFAULT_AFTER_LOGIN;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_AFTER_LOGIN;
  }
}
