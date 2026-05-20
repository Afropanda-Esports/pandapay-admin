import { apiFetch } from './client';
import type { LoginResponse } from '@/lib/types';

export const login = (email: string, password: string) =>
  apiFetch<LoginResponse>('/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
