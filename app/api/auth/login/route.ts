import { NextRequest, NextResponse } from 'next/server';

import {
  ADMIN_ROLE_COOKIE,
  ADMIN_TOKEN_COOKIE,
  getApiBaseUrl,
  sessionCookieOptions,
} from '@/lib/auth/session';

interface UpstreamLoginBody {
  access_token?: string;
  must_change_password?: boolean;
  role?: string;
  email?: string;
  display_name?: string;
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
  }

  const upstream = await fetch(`${getApiBaseUrl()}/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!upstream.ok) {
    const errBody = (await upstream.json().catch(() => null)) as {
      message?: string;
    } | null;
    const message = errBody?.message ?? 'Invalid credentials';
    return NextResponse.json({ message }, { status: upstream.status });
  }

  const payload = (await upstream.json()) as UpstreamLoginBody;
  const token = payload.access_token;
  if (!token) {
    return NextResponse.json(
      { message: 'Login response missing token' },
      { status: 502 },
    );
  }

  const res = NextResponse.json({
    must_change_password: Boolean(payload?.must_change_password),
    role: payload?.role,
    email: payload?.email,
    display_name: payload?.display_name,
  });

  res.cookies.set(ADMIN_TOKEN_COOKIE, token, sessionCookieOptions());

  const role = payload?.role;
  if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
    res.cookies.set(ADMIN_ROLE_COOKIE, role, sessionCookieOptions());
  }

  return res;
}
