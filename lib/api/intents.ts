import { apiFetch } from './client';
import { buildIntentsOrdersQuery, type IntentsOrdersQuery } from './intents-query';
import type {
  IntentsOrder,
  IntentsOrderDetail,
  IntentsOverview,
  PaginatedResponse,
} from '@/lib/types';

export const getIntentsOverview = () =>
  apiFetch<IntentsOverview>('/admin/intents/overview');

export const getIntentsOrders = (query: IntentsOrdersQuery) =>
  apiFetch<PaginatedResponse<IntentsOrder>>(
    `/admin/intents/orders?${buildIntentsOrdersQuery(query)}`,
  );

export const getIntentsOrder = (id: string) =>
  apiFetch<IntentsOrderDetail>(`/admin/intents/orders/${encodeURIComponent(id)}`);
