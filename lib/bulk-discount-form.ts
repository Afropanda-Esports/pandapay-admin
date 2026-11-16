/**
 * The bulk discount edit form: what a Super Admin typed, checked before it is
 * sent. The backend validates the same rules and refuses anything else with a
 * 400; this only stops an obviously bad value from leaving the browser.
 *
 * Strings in, strings out for money: the threshold is never parsed to a float.
 */

/** Matches the backend's limit: 10000 bps is 100%. */
export const MAX_BULK_DISCOUNT_BPS = 10000;

export interface BulkDiscountForm {
  enabled: boolean;
  bps: string;
  thresholdNgn: string;
}

export interface BulkDiscountFormErrors {
  bps?: string;
  thresholdNgn?: string;
}

export interface BulkDiscountBody {
  enabled: boolean;
  bps: number;
  thresholdNgn: string;
}

const THRESHOLD = /^(\d{1,12})(?:\.(\d{1,2}))?$/;

function bpsIssue(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) {
    return /^\d+\.\d+$/.test(trimmed)
      ? 'Basis points must be a whole number, e.g. 250 for 2.5%'
      : 'Enter the discount in basis points, e.g. 250 for 2.5%';
  }
  if (Number.parseInt(trimmed, 10) > MAX_BULK_DISCOUNT_BPS) {
    return `Cannot exceed ${MAX_BULK_DISCOUNT_BPS} bps (100%)`;
  }
  return undefined;
}

function thresholdIssue(raw: string): string | undefined {
  const match = THRESHOLD.exec(raw.trim());
  if (!match) {
    return 'Enter a naira amount, e.g. 100000 (at most 2 decimals)';
  }
  if (/^0+$/.test(match[1]!) && /^0*$/.test(match[2] ?? '')) {
    return 'The threshold must be more than ₦0';
  }
  return undefined;
}

export function validateBulkDiscountForm(
  form: BulkDiscountForm,
): BulkDiscountFormErrors {
  const errors: BulkDiscountFormErrors = {};
  const bps = bpsIssue(form.bps);
  if (bps) errors.bps = bps;
  const threshold = thresholdIssue(form.thresholdNgn);
  if (threshold) errors.thresholdNgn = threshold;
  return errors;
}

/** Call only on a form `validateBulkDiscountForm` accepted. */
export function toBulkDiscountBody(form: BulkDiscountForm): BulkDiscountBody {
  const [, whole, fraction = ''] = THRESHOLD.exec(form.thresholdNgn.trim())!;
  return {
    enabled: form.enabled,
    bps: Number.parseInt(form.bps.trim(), 10),
    thresholdNgn: `${whole}.${fraction.padEnd(2, '0')}`,
  };
}
