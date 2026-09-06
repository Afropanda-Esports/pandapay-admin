import { apiFetch } from './client';
import type {
  GenerateVoucherCodesInput,
  PaginatedResponse,
  VoucherCode,
  VoucherCodeStatus,
} from '@/lib/types';

export function listVoucherCodes(
  page = 1,
  limit = 20,
  status?: VoucherCodeStatus,
  productId?: string,
  categoryId?: string,
) {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) q.set('status', status);
  if (productId) q.set('productId', productId);
  if (categoryId) q.set('categoryId', categoryId);
  return apiFetch<PaginatedResponse<VoucherCode>>(`/admin/voucher-codes?${q}`);
}

export const generateVoucherCodes = (body: GenerateVoucherCodesInput) =>
  apiFetch<VoucherCode[]>('/admin/voucher-codes/generate', {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const revokeVoucherCode = (id: string) =>
  apiFetch<VoucherCode>(`/admin/voucher-codes/${id}/revoke`, {
    method: 'PATCH',
  });
