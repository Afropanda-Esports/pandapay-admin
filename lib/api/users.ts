import { apiFetch } from './client';
import type { PaginatedResponse, UserListItem, UserDetail } from '@/lib/types';

interface GetUsersParams {
  page?: number;
  limit?: number;
  search?: string;
}

export const getUsers = ({
  page = 1,
  limit = 20,
  search,
}: GetUsersParams = {}) => {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) q.set('search', search);
  return apiFetch<PaginatedResponse<UserListItem>>(`/admin/users?${q}`);
};

export const getUser = (id: string) =>
  apiFetch<UserDetail>(`/admin/users/${id}`);

export const unlockPin = (id: string) =>
  apiFetch<{ success: boolean }>(`/admin/users/${id}/unlock-pin`, {
    method: 'PATCH',
  });

export const getTransactions = (id: string, page = 1, limit = 20) => {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  return apiFetch<PaginatedResponse<import('@/lib/types').Transaction>>(`/admin/users/${id}/transactions?${q}`);
};

export const creditWallet = (id: string, data: { amount: number; note: string }) =>
  apiFetch<{ success: boolean; reference: string }>(`/admin/users/${id}/wallet/credit`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
