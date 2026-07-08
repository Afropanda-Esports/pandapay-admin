import { apiFetch } from './client';
import type { PaginatedResponse, PaymentException, PaymentExceptionStatus } from '@/lib/types';

export const listPaymentExceptions = (
  page = 1,
  limit = 20,
  status?: PaymentExceptionStatus,
) => {
  const q = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (status) q.set('status', status);
  return apiFetch<PaginatedResponse<PaymentException>>(
    `/admin/payment-exceptions?${q}`,
  );
};

export const resolvePaymentException = (
  id: string,
  resolutionNote?: string,
) =>
  apiFetch<PaymentException>(`/admin/payment-exceptions/${id}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ resolutionNote }),
  });
