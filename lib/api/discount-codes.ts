import { apiFetch } from './client';
import type {
  DiscountCode,
  DiscountCodeStatus,
  GenerateDiscountCodesInput,
  PaginatedResponse,
  ProductCategory,
} from '@/lib/types';

export function listDiscountCodes(
  page = 1,
  limit = 20,
  status?: DiscountCodeStatus,
  productId?: string,
  category?: ProductCategory,
) {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) q.set('status', status);
  if (productId) q.set('productId', productId);
  if (category) q.set('category', category);
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
