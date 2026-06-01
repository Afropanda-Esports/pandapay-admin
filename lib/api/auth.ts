import type { LoginResponse } from '@/lib/types';
import { ApiError } from './client';

export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(30_000),
  });

  const body = (await res.json().catch(() => null)) as
    | LoginResponse
    | { message?: string }
    | null;

  if (!res.ok) {
    throw new ApiError(
      res.status,
      body && 'message' in body && body.message
        ? body.message
        : 'Invalid credentials',
    );
  }

  return body as LoginResponse;
}

export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'same-origin',
  });
}
