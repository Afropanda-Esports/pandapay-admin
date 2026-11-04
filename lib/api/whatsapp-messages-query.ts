export type WhatsappMessagesListFilters = {
  whatsappNumber?: string;
  userId?: string;
  direction?: 'inbound' | 'outbound';
  intent?: string;
  reason?: string;
  from?: string;
  to?: string;
};

export function buildWhatsappMessagesQuery(
  page = 1,
  limit = 20,
  filters: WhatsappMessagesListFilters = {},
): URLSearchParams {
  const q = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (filters.whatsappNumber) q.set('whatsappNumber', filters.whatsappNumber);
  if (filters.userId) q.set('userId', filters.userId);
  if (filters.direction) q.set('direction', filters.direction);
  if (filters.intent) q.set('intent', filters.intent);
  if (filters.reason) q.set('reason', filters.reason);
  if (filters.from) q.set('from', filters.from);
  if (filters.to) q.set('to', filters.to);
  return q;
}

export function buildWhatsappMessagesSummaryQuery(from?: string, to?: string): URLSearchParams {
  const q = new URLSearchParams();
  if (from) q.set('from', from);
  if (to) q.set('to', to);
  return q;
}
