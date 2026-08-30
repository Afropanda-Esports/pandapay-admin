import type { SupportRequestStatus } from '@/lib/types';

export function buildSupportRequestsQuery(
  page = 1,
  limit = 20,
  status?: SupportRequestStatus,
): URLSearchParams {
  const q = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (status) q.set('status', status);
  return q;
}
