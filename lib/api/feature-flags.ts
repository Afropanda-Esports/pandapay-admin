import { apiFetch } from './client';
import type { FeatureFlag } from '@/lib/types';

export interface UpdateFeatureFlagBody {
  enabled?: boolean;
  activeFrom?: string | null;
  activeUntil?: string | null;
  description?: string;
}

export const getFeatureFlags = () =>
  apiFetch<FeatureFlag[]>('/admin/feature-flags');

export const updateFeatureFlag = (key: string, body: UpdateFeatureFlagBody) =>
  apiFetch<FeatureFlag>(`/admin/feature-flags/${encodeURIComponent(key)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

/** Mirrors backend isEnabled() window logic for UI badges. */
export function isFeatureFlagEffective(flag: FeatureFlag): boolean {
  if (!flag.enabled) return false;
  const now = Date.now();
  if (flag.activeFrom && now < new Date(flag.activeFrom).getTime()) {
    return false;
  }
  if (flag.activeUntil && now > new Date(flag.activeUntil).getTime()) {
    return false;
  }
  return true;
}
