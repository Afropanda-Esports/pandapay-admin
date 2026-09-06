/**
 * A product's margin over cost, in basis points — PRICE-004.
 *
 * The pricing-mode toggle is gone. A price is its face value converted at the
 * oracle rate and marked up by a margin set per product:
 *
 *     price = priceUsd × oracleNgnPerUsd × (1 + markupBps / 10000)
 *
 * The distinction this module protects is `null` versus `0`. An empty field
 * means *inherit the global markup*; a typed `0` means *sell at cost*. They
 * produce different prices, and a number input that coerces blank to `0` would
 * sell at cost with nothing anywhere reporting it — which is why parsing lives
 * here, tested, rather than inline in the form.
 */

/** Matches the backend's `@Max(10000)` — 100%. */
export const MAX_MARKUP_BPS = 10000;

export interface ParsedMarkup {
  /** `null` inherits the global markup. Absent when `error` is set. */
  markupBps?: number | null;
  error?: string;
}

export function parseMarkupInput(raw: string): ParsedMarkup {
  const trimmed = raw.trim();
  if (trimmed === '') return { markupBps: null };

  if (!/^-?\d+$/.test(trimmed)) {
    if (/^-?\d+\.\d+$/.test(trimmed)) {
      return { error: 'Markup must be a whole number of basis points' };
    }
    return { error: 'Enter a markup in basis points, e.g. 1350 for 13.5%' };
  }

  const value = Number.parseInt(trimmed, 10);
  if (value < 0) {
    return { error: 'Markup cannot be negative — it would sell below cost' };
  }
  if (value > MAX_MARKUP_BPS) {
    return { error: `Markup cannot exceed ${MAX_MARKUP_BPS} bps (100%)` };
  }
  return { markupBps: value };
}

/**
 * `null` means follow the global; `0` is a deliberate zero margin. `??` rather
 * than `||`, because `||` would quietly turn "sell at cost" into the global.
 */
export function effectiveMarkupBps(
  productMarkupBps: number | null,
  globalMarkupBps: number,
): number {
  return productMarkupBps ?? globalMarkupBps;
}

/**
 * Whether changing the global markup will leave this product where it is.
 *
 * A zero markup counts — it is the strongest override there is. Getting this
 * backwards would tell an admin their product tracks a global figure it
 * actually ignores.
 */
export function overridesGlobal(productMarkupBps: number | null): boolean {
  return productMarkupBps !== null;
}

/** Prices are shown in whole ₦50 steps, and rounding never reduces margin. */
const ROUNDING_STEP = 50;

/**
 * What the backend will compute, previewed before saving. Must agree with
 * `roundUpToNearest50` to the naira, or the admin sets one price and the
 * customer is charged another.
 */
export function previewNgn(
  priceUsd: string,
  oracleNgnPerUsd: number | null,
  markupBps: number,
): string | null {
  if (oracleNgnPerUsd == null) return null;
  const usd = Number.parseFloat(priceUsd);
  if (!Number.isFinite(usd)) return null;

  const withMargin =
    usd * oracleNgnPerUsd * ((10000 + markupBps) / 10000);
  const rounded = Math.ceil(withMargin / ROUNDING_STEP) * ROUNDING_STEP;
  return rounded.toFixed(2);
}
