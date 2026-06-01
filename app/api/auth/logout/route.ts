import { NextResponse } from 'next/server';

import {
  ADMIN_ROLE_COOKIE,
  ADMIN_TOKEN_COOKIE,
  clearSessionCookieOptions,
} from '@/lib/auth/session';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_TOKEN_COOKIE, '', clearSessionCookieOptions());
  res.cookies.set(ADMIN_ROLE_COOKIE, '', clearSessionCookieOptions());
  return res;
}
