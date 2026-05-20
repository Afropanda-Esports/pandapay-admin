import { apiFetch } from './client';
import type { AdminUser } from '@/lib/types';

export const getMe = () => apiFetch<AdminUser>('/admin/me');

export const changeOwnPassword = (body: {
  currentPassword: string;
  newPassword: string;
}) =>
  apiFetch<{ success: true }>('/admin/me/change-password', {
    method: 'POST',
    body: JSON.stringify(body),
  });
