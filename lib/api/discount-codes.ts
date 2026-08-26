import { apiFetch } from './client';
import type {
  DiscountCode,
  DiscountCodeStatus,
  GenerateDiscountCodesInput,
  PaginatedResponse,
} from '@/lib/types';

export function listDiscountCodes(
  page = 1,
  limit = 20,
  status?: DiscountCodeStatus,
  productId?: string,
  categoryId?: string,
) {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) q.set('status', status);
  if (productId) q.set('productId', productId);
  if (categoryId) q.set('categoryId', categoryId);
  return apiFetch<PaginatedResponse<DiscountCode>>(`/admin/discount-codes?${q}`);
}

export const generateDiscountCodes = (body: GenerateDiscountCodesInput) =>
  apiFetch<DiscountCode[]>('/admin/discount-codes/generate', {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const revokeDiscountCode = (id: string) =>
  apiFetch<DiscountCode>(`/admin/discount-codes/${id}/revoke`, {
    method: 'PATCH',
  });
