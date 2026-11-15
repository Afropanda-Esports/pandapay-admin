export interface IntentsOrdersQuery {
  page: number;
  limit: number;
  status?: string | null;
  chain?: string | null;
  from?: string | null;
  to?: string | null;
  orderId?: string | null;
}

export function buildIntentsOrdersQuery({
  page,
  limit,
  ...filters
}: IntentsOrdersQuery): URLSearchParams {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  for (const [key, value] of Object.entries(filters)) {
    const trimmed = value?.trim();
    if (trimmed) q.set(key, trimmed);
  }
  return q;
}
