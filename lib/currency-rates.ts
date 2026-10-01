import { formatDistanceStrict } from 'date-fns';

import { formatRatePerUnit, isSupportedCurrency } from './money.ts';
import type { LargeRateChangeDetails, RateManagement } from '@/lib/types';

/**
 * The Currency rates page — GBP-005.
 *
 *   USD → NGN  automatic: the oracle's rate. Read-only here, always.
 *   GBP → NGN  manual: a business rate a Super Admin sets (DECISION C), with a
 *              confirmation above a 10 % move (DECISION R, enforced by the
 *              backend) and a staleness WARNING after 3 days (DECISION Q).
 *
 * Nothing here decides whether a rate is accepted — the backend does. These
 * helpers only describe what it returned.
 */

/** DECISION Q: warn when the manual rate is older than this. Never blocks checkout. */
export const RATE_STALE_AFTER_DAYS = 3;

const DAY_MS = 86_400_000;

export function managementLabel(management: RateManagement): string {
  return management === 'ORACLE' ? 'Automatic · oracle' : 'Manual';
}

/**
 * Whether the UI offers "Set new rate". Only a manually managed rate, and only
 * to someone holding `pricing:manage` (Super Admin) — the backend refuses
 * everyone else anyway; the console must not offer a control that will 403.
 */
export function canSetRate(
  management: RateManagement,
  canManagePricing: boolean,
): boolean {
  return management === 'MANUAL' && canManagePricing;
}

export function rateAgeLabel(effectiveFrom: string, now: Date): string {
  return `Set ${formatDistanceStrict(new Date(effectiveFrom), now)} ago`;
}

/**
 * The admin warning for a manual rate older than three days, or null. A rate
 * that has never been set is not "stale" — the card says it is not set.
 */
export function staleRateWarning(
  currency: string,
  effectiveFrom: string | null,
  now: Date,
): string | null {
  if (!effectiveFrom) return null;
  const ageMs = now.getTime() - new Date(effectiveFrom).getTime();
  if (ageMs <= RATE_STALE_AFTER_DAYS * DAY_MS) return null;
  const days = Math.floor(ageMs / DAY_MS);
  return `The ${currency}/NGN rate was set ${days} day${days === 1 ? '' : 's'} ago — older than ${RATE_STALE_AFTER_DAYS} days. Check it is still right. Checkout is not blocked.`;
}

/** The backend's rule for a manual rate: > 0, ≤ 8 integer digits, ≤ 4 dp. */
const RATE_PATTERN = /^(?!0+(\.0+)?$)\d{1,8}(\.\d{1,4})?$/;

export function rateInputIssue(raw: string): string | null {
  const value = raw.trim();
  if (value === '') return 'Enter the naira amount for one unit';
  if (!RATE_PATTERN.test(value)) {
    return 'Enter a positive number with at most 4 decimal places';
  }
  return null;
}

/** The details of a `409 LARGE_RATE_CHANGE`, or null for any other error. */
export function largeRateChangeFrom(err: unknown): LargeRateChangeDetails | null {
  if (!err || typeof err !== 'object') return null;
  const e = err as { status?: unknown; code?: unknown; details?: unknown };
  if (e.status !== 409 || e.code !== 'LARGE_RATE_CHANGE') return null;
  if (!e.details || typeof e.details !== 'object') return null;
  return e.details as LargeRateChangeDetails;
}

/** `"15.0000"` → `+15%`, `"-12.5000"` → `−12.5%`. String-based; no floats. */
export function formatChangePercent(changePercent: string): string {
  const match = /^(-)?(\d+)(?:\.(\d+))?$/.exec(changePercent.trim());
  if (!match) return `${changePercent}%`;
  const fraction = (match[3] ?? '').replace(/0+$/, '');
  const magnitude = fraction ? `${match[2]}.${fraction}` : match[2]!;
  if (/^0(\.0*)?$/.test(magnitude)) return '0%';
  return `${match[1] ? '−' : '+'}${magnitude}%`;
}

export interface LargeRateChangeSummary {
  current: string;
  proposed: string;
  change: string;
  threshold: string;
}

/** What the confirmation dialog shows — the backend's own figures. */
export function describeLargeRateChange(
  details: LargeRateChangeDetails,
): LargeRateChangeSummary {
  const currency = isSupportedCurrency(details.currency) ? details.currency : 'GBP';
  return {
    current: formatRatePerUnit(details.previousNgnPerUnit, currency),
    proposed: formatRatePerUnit(details.proposedNgnPerUnit, currency),
    change: formatChangePercent(details.changePercent),
    threshold: `${details.thresholdPercent}%`,
  };
}

/** Live (non-archived) products priced in `currency` — the ones a rate change reprices. */
export function affectedProductCount(
  products: ReadonlyArray<{ baseCurrency: string; archivedAt?: string | null }>,
  currency: string,
): number {
  return products.filter((p) => p.baseCurrency === currency && !p.archivedAt)
    .length;
}
