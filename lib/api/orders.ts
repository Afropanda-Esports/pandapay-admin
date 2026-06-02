import { apiFetch } from './client';
import type {
  PaginatedResponse,
  Order,
  OrderDetail,
  OrderStatus,
  PaymentMode,
} from '@/lib/types';

interface GetOrdersParams {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  userId?: string;
  from?: string;
  to?: string;
}

export const getOrders = ({
  page = 1,
  limit = 20,
  ...rest
}: GetOrdersParams = {}) => {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  Object.entries(rest).forEach(
    ([k, v]) => v != null && v !== '' && q.set(k, v),
  );
  return apiFetch<PaginatedResponse<Order>>(`/admin/orders?${q}`);
};

export const getOrder = (id: string) =>
  apiFetch<OrderDetail>(`/admin/orders/${id}`);

export const resendOrder = (id: string) =>
  apiFetch<{ success: boolean }>(`/admin/orders/${id}/resend`, {
    method: 'POST',
  });

export const fulfillOrder = (id: string) =>
  apiFetch<{ success: boolean }>(`/admin/orders/${id}/fulfill`, {
    method: 'POST',
  });

export const refundOrder = (
  id: string,
  body?: { refundChannel?: string; externalReference?: string; note?: string },
) =>
  apiFetch<{ success: boolean; reference: string }>(`/admin/orders/${id}/refund`, {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
  });

export const retryOrder = (id: string) =>
  apiFetch<{ success: boolean; orderId: string }>(`/admin/orders/${id}/retry`, {
    method: 'POST',
  });

export const createPurchase = (body: {
  userId: string;
  productId: string;
  paymentMode?: PaymentMode;
  markPaid?: boolean;
  autoFulfill?: boolean;
}) =>
  apiFetch<{ orderId: string }>('/admin/orders/purchase', {
    method: 'POST',
    body: JSON.stringify(body),
  });
