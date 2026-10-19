import { NextRequest, NextResponse } from 'next/server';

import { getApiBaseUrl } from '@/lib/auth/session';

interface UpstreamLoginBody {
  status?: string;
  challenge_id?: string;
  access_token?: string;
  message?: string;
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
  if (payload.status === 'MFA_REQUIRED' && payload.challenge_id) {
    return NextResponse.json({
      status: 'MFA_REQUIRED',
      challenge_id: payload.challenge_id,
    });
  }

  return NextResponse.json(
    { message: 'Login response missing challenge' },
    { status: 502 },
  );
}
