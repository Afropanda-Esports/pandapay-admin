import { apiFetch } from './client';
import type { ExchangeRate, ExchangeRateHistoryItem } from '@/lib/types';

export const getCurrentRate = () =>
  apiFetch<ExchangeRate | null>('/admin/pricing/rate');

export const getOracleRate = () =>
  apiFetch<{ oracleRate: number | null; lastFetchedAt: string | null }>('/admin/pricing/oracle');

export const getRateHistory = (limit = 50) =>
  apiFetch<ExchangeRateHistoryItem[]>(
    `/admin/pricing/rate/history?limit=${limit}`,
  );

export const setRate = (body: { markupBps: number; note?: string }) =>
  apiFetch<{ rate: ExchangeRate; affected: number }>('/admin/pricing/rate', {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const recomputeAll = () =>
  apiFetch<{ affected: number }>('/admin/pricing/recompute', {
    method: 'POST',
  });
