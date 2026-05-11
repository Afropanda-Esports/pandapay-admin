import { apiFetch } from './client';

export const login = (email: string, password: string) =>
  apiFetch<{ access_token: string }>('/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
