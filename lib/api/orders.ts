import { apiFetch } from './client';
import type {
  PaginatedResponse,
  Order,
  OrderDetail,
  OrderStatus,
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
