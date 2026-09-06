const MISSING = '—';

function isBlank(value: string | null | undefined): value is null | undefined | '' {
  return value == null || value.trim() === '';
}

/** Locale-format an API decimal string. Display only — not for money math. */
function formatNgnDecimal(raw: string, fractionDigits: number): string {
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n)) return raw;
  return `₦${n.toLocaleString('en-NG', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;
}

/**
 * Realized FX markup for display.
 * `null` / missing → "—". `"0.00"` is a real zero — since PRICE-004 that means
 * a product with no face value, so no currency was crossed and there is no FX
 * margin to report.
 */
export function formatFxMarkupNgn(
  value: string | null | undefined,
): string {
  if (isBlank(value)) return MISSING;
  return formatNgnDecimal(value, 2);
}

export function formatMarkupBps(
  bps: number | null | undefined,
): string {
  if (bps == null || !Number.isFinite(bps)) return MISSING;
  const pct = bps / 100;
  return `${bps} bps (${pct}%)`;
}

/**
 * PRICE-004 retired pricing modes, but `orders.pricing_mode` survives as a
 * legacy column: orders are financial records and are not rewritten. Orders
 * placed before the change still show how they were priced; ones placed since
 * carry null and render as "—". Deleting this would erase that history from
 * the console.
 */
export function formatPricingMode(
  mode: string | null | undefined,
): string {
  if (mode === 'GLOBAL_FX') return 'GLOBAL_FX';
  if (mode === 'MANUAL_NGN') return 'Manual NGN';
  return MISSING;
}

export function formatPriceUsd(
  value: string | null | undefined,
): string {
  if (isBlank(value)) return MISSING;
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n)) return value;
  return `$${n.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatOracleNgnPerUsd(
  value: string | null | undefined,
): string {
  if (isBlank(value)) return MISSING;
  return `${formatNgnDecimal(value, 4)} / $1`;
}

export function formatRateSnapshot(
  value: string | null | undefined,
): string {
  if (isBlank(value)) return MISSING;
  return value;
}
