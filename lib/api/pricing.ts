import { apiFetch } from './client';
import type {
  CurrencyRateView,
  CurrencyRatesOverview,
  ExchangeRate,
  ExchangeRateHistoryItem,
  PricePreview,
  PricePreviewRequest,
  SetCurrencyRateInput,
  SetCurrencyRateResult,
} from '@/lib/types';

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

// ─── GBP-005: currency rates and the authoritative preview ───────────────────

/** The current raw rate of every converted currency (any admin). */
export const getCurrencyRates = () =>
  apiFetch<CurrencyRatesOverview>('/admin/pricing/rates');

/** Recent raw rates for one converted currency, newest first (any admin). */
export const getCurrencyRateHistory = (currency: string, limit = 50) =>
  apiFetch<CurrencyRateView[]>(
    `/admin/pricing/rates/${encodeURIComponent(currency)}/history?limit=${limit}`,
  );

/**
 * Set a manually managed rate (GBP) — Super Admin. A change of more than 10 %
 * is refused with `409 LARGE_RATE_CHANGE` (its `details` carry the figures)
 * until resent with `confirmLargeChange: true`. USD is refused: the oracle's.
 */
export const setCurrencyRate = (currency: string, body: SetCurrencyRateInput) =>
  apiFetch<SetCurrencyRateResult>(
    `/admin/pricing/rates/${encodeURIComponent(currency)}`,
    { method: 'POST', body: JSON.stringify(body) },
  );

/**
 * What a converted product would cost — computed by the backend with the same
 * formula, rate and general markup as creation, repricing and checkout. The
 * admin never computes a selling price itself.
 */
export const previewPrice = (body: PricePreviewRequest, signal?: AbortSignal) =>
  apiFetch<PricePreview>('/admin/pricing/preview', {
    method: 'POST',
    body: JSON.stringify(body),
    signal,
  });
