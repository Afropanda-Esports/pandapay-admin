import { apiFetch } from './client';
import type { Category } from '@/lib/types';

export const getCategories = () => apiFetch<Category[]>('/admin/categories');

export const createCategory = (body: { code: string; name: string }) =>
  apiFetch<Category>('/admin/categories', {
    method: 'POST',
    body: JSON.stringify(body),
  });

/** CAT-009: refused with a 409 when any product still uses the category. */
export const deleteCategory = (id: string) =>
  apiFetch<{ deleted: true }>(`/admin/categories/${id}`, { method: 'DELETE' });

export const updateCategory = (id: string, body: { name: string; isActive?: boolean }) =>
  apiFetch<Category>(`/admin/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
