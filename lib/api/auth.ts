import type { LoginResponse, MfaRequiredResponse } from '@/lib/types';
import { ApiError } from './client';

async function parseJson(res: Response): Promise<unknown> {
  return res.json().catch(() => null);
}

export async function login(
  email: string,
  password: string,
): Promise<MfaRequiredResponse> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(30_000),
  });

  const body = (await parseJson(res)) as
    | MfaRequiredResponse
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

  if (
    !body ||
    !('status' in body) ||
    body.status !== 'MFA_REQUIRED' ||
    !body.challenge_id
  ) {
    throw new ApiError(502, 'Login response missing challenge');
  }

  return body;
}

export async function verifyLogin(
  challengeId: string,
  code: string,
): Promise<LoginResponse> {
  const res = await fetch('/api/auth/login/verify', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challenge_id: challengeId, code }),
    signal: AbortSignal.timeout(30_000),
  });

  const body = (await parseJson(res)) as
    | LoginResponse
    | { message?: string }
    | null;

  if (!res.ok) {
    throw new ApiError(
      res.status,
      body && 'message' in body && body.message
        ? body.message
        : 'Invalid or expired code',
    );
  }

  return body as LoginResponse;
}

export async function resendLoginCode(
  challengeId: string,
): Promise<MfaRequiredResponse> {
  const res = await fetch('/api/auth/login/resend', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challenge_id: challengeId }),
    signal: AbortSignal.timeout(30_000),
  });

  const body = (await parseJson(res)) as
    | MfaRequiredResponse
    | { message?: string }
    | null;

  if (!res.ok) {
    throw new ApiError(
      res.status,
      body && 'message' in body && body.message
        ? body.message
        : 'Could not resend code',
    );
  }

  return body as MfaRequiredResponse;
}

export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'same-origin',
  });
}
