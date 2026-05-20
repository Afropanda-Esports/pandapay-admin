import { apiFetch } from './client';
import type { AdminDirectoryItem, AdminRole, AdminUser } from '@/lib/types';

export const getAdminDirectory = () =>
  apiFetch<AdminDirectoryItem[]>('/admin/admins/directory');

export const getAdmins = () => apiFetch<AdminUser[]>('/admin/admins');

export const createAdmin = (body: {
  email: string;
  displayName: string;
  role: AdminRole;
}) =>
  apiFetch<{ admin: AdminUser; temporaryPassword: string }>('/admin/admins', {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const updateAdmin = (
  id: string,
  body: {
    displayName?: string;
    role?: AdminRole;
    isActive?: boolean;
  },
) =>
  apiFetch<AdminUser>(`/admin/admins/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

export const resetAdminPassword = (id: string) =>
  apiFetch<{ temporaryPassword: string }>(
    `/admin/admins/${id}/reset-password`,
    {
      method: 'POST',
    },
  );
