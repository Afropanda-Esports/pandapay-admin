import { apiFetch } from './client';
import {
  buildWhatsappMessagesQuery,
  buildWhatsappMessagesSummaryQuery,
  type WhatsappMessagesListFilters,
} from './whatsapp-messages-query';
import type {
  PaginatedResponse,
  WhatsappMessage,
  WhatsappMessageSummary,
} from '@/lib/types';

export {
  buildWhatsappMessagesQuery,
  buildWhatsappMessagesSummaryQuery,
} from './whatsapp-messages-query';
export type { WhatsappMessagesListFilters } from './whatsapp-messages-query';

export const listWhatsappMessages = (
  page = 1,
  limit = 20,
  filters: WhatsappMessagesListFilters = {},
) => {
  const q = buildWhatsappMessagesQuery(page, limit, filters);
  return apiFetch<PaginatedResponse<WhatsappMessage>>(
    `/admin/whatsapp-messages?${q}`,
  );
};

export const listWhatsappMessagesForUser = (
  userId: string,
  page = 1,
  limit = 50,
) =>
  apiFetch<PaginatedResponse<WhatsappMessage>>(
    `/admin/whatsapp-messages/users/${encodeURIComponent(userId)}?${buildWhatsappMessagesQuery(page, limit)}`,
  );

export const getWhatsappMessagesSummary = (from?: string, to?: string) => {
  const q = buildWhatsappMessagesSummaryQuery(from, to);
  const qs = q.toString();
  return apiFetch<WhatsappMessageSummary>(
    `/admin/whatsapp-messages/summary${qs ? `?${qs}` : ''}`,
  );
};
