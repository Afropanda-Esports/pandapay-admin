import { NextRequest, NextResponse } from 'next/server';

import { getApiBaseUrl } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
  }

  const upstream = await fetch(`${getApiBaseUrl()}/admin/auth/login/resend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const payload = (await upstream.json().catch(() => null)) as {
    status?: string;
    challenge_id?: string;
    message?: string;
  } | null;

  if (!upstream.ok) {
    return NextResponse.json(
      { message: payload?.message ?? 'Could not resend code' },
      { status: upstream.status },
    );
  }

  return NextResponse.json({
    status: payload?.status ?? 'MFA_REQUIRED',
    challenge_id: payload?.challenge_id,
  });
}
