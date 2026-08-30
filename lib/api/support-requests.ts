import { apiFetch } from './client';
import { buildSupportRequestsQuery } from './support-requests-query';
import type {
  PaginatedResponse,
  SupportRequest,
  SupportRequestStatus,
} from '@/lib/types';

export { buildSupportRequestsQuery } from './support-requests-query';

export const listSupportRequests = (
  page = 1,
  limit = 20,
  status?: SupportRequestStatus,
) => {
  const q = buildSupportRequestsQuery(page, limit, status);
  return apiFetch<PaginatedResponse<SupportRequest>>(
    `/admin/support-requests?${q}`,
  );
};

export const resolveSupportRequest = (
  id: string,
  resolutionNote?: string,
) =>
  apiFetch<SupportRequest>(`/admin/support-requests/${id}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ resolutionNote }),
  });
