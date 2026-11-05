import { apiFetch, ApiError } from './client';
import { parseStatsSeries } from './analytics-parse';
import type { StatsSeries } from '@/lib/types';

export { parseStatsSeries } from './analytics-parse';

export async function getStatsSeries(days: 7 | 14 | 30): Promise<StatsSeries> {
  const body = await apiFetch<unknown>(`/admin/stats/series?days=${days}`);
  const parsed = parseStatsSeries(body);
  if (!parsed.ok) {
    throw new ApiError(
      200,
      'Dashboard series response did not match the expected shape',
    );
  }
  return parsed.data;
}
