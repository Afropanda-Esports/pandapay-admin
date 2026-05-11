import { apiFetch } from './client';
import type { PaginatedResponse, AuditLog, AuditAction } from '@/lib/types';

interface GetAuditLogsParams {
  page?: number;
  limit?: number;
  actor?: string;
  action?: AuditAction;
  from?: string;
  to?: string;
}

export const getAuditLogs = ({
  page = 1,
  limit = 20,
  ...rest
}: GetAuditLogsParams = {}) => {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  Object.entries(rest).forEach(
    ([k, v]) => v != null && v !== '' && q.set(k, v),
  );
  return apiFetch<PaginatedResponse<AuditLog>>(`/admin/audit-logs?${q}`);
};
