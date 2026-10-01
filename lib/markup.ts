/**
 * A product's margin over cost, in basis points — PRICE-004.
 *
 * The pricing-mode toggle is gone. A converted product's price is its face
 * value converted at its currency's raw rate and marked up by a margin set per
 * product — computed ONLY by the backend (`POST /admin/pricing/preview`,
 * GBP-005). This module parses and describes markups; it never prices.
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

/**
 * The general markup typed as a percentage (`2.55` → 255 bps), parsed as a
 * string so `1.15` cannot become 114.99999999999999 bps. At most two decimal
 * places — a basis point is the finest unit the backend stores.
 */
export function parsePercentToBps(raw: string): { bps?: number; error?: string } {
  const trimmed = raw.trim();
  const match = /^(\d{1,3})(?:\.(\d{1,2}))?$/.exec(trimmed);
  if (!match) {
    if (/^\d+\.\d{3,}$/.test(trimmed)) {
      return { error: 'At most two decimal places (0.01% is one basis point)' };
    }
    return { error: 'Enter a percentage between 0 and 100, e.g. 2.55' };
  }
  const whole = Number.parseInt(match[1]!, 10);
  const fraction = Number.parseInt((match[2] ?? '').padEnd(2, '0'), 10);
  const bps = whole * 100 + fraction;
  if (bps > MAX_MARKUP_BPS) return { error: 'Must be 100% or less' };
  return { bps };
}

/** `1350` → `"13.5%"`. Integer arithmetic only. */
export function formatBpsAsPercent(bps: number): string {
  const whole = Math.trunc(bps / 100);
  const fraction = String(bps % 100).padStart(2, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}%` : `${whole}%`;
}

export interface MarkupGuidance {
  /** Always present: what the field's current value will do. */
  help: string;
  /**
   * GBP-005 / OD-11: a GBP product left blank is allowed, but the operator is
   * told it follows the general markup — the same field for USD carries no
   * warning because inheriting is the long-established default there.
   */
  warning: string | null;
}

/** Currencies where a blank markup is allowed but called out. */
const WARN_ON_BLANK_MARKUP = ['GBP'];

export function markupGuidance(
  currency: string,
  parsed: ParsedMarkup,
  generalMarkupBps: number | null,
): MarkupGuidance {
  if (parsed.error) {
    return { help: 'Basis points over cost — 1350 is 13.5%.', warning: null };
  }
  const bps = parsed.markupBps ?? null;
  if (bps === null) {
    const general =
      generalMarkupBps === null
        ? 'the general markup (not loaded yet)'
        : `the general markup (${formatBpsAsPercent(generalMarkupBps)})`;
    return {
      help: `Blank — follows ${general}. Changing the general markup moves this product.`,
      warning: WARN_ON_BLANK_MARKUP.includes(currency)
        ? 'Blank markup follows the general markup.'
        : null,
    };
  }
  if (bps === 0) {
    return {
      help: 'Zero margin — this product sells at cost and ignores the general markup.',
      warning: null,
    };
  }
  return {
    help: `${formatBpsAsPercent(bps)} over cost. This overrides the general markup, so changing the general will not move this product.`,
    warning: null,
  };
}

/** Converted currencies the general markup applies to (mirrors the backend). */
const GENERAL_MARKUP_CURRENCIES = ['USD', 'GBP'] as const;

export interface GeneralMarkupFollowers {
  /** Products that inherit the general markup, per converted currency. */
  byCurrency: Record<(typeof GENERAL_MARKUP_CURRENCIES)[number], number>;
  /** Total that move when the general markup changes. */
  following: number;
  /** Converted products with their own markup (0 included) — they do not move. */
  overriding: number;
}

/**
 * GBP-005 — who the general markup moves. It applies to every CONVERTED
 * currency (USD and GBP); a naira product is priced directly and never moves.
 * A product's own markup — `0` included — overrides it.
 */
export function generalMarkupFollowers(
  products: ReadonlyArray<{
    baseCurrency: string;
    markupBps: number | null;
    archivedAt?: string | null;
  }>,
): GeneralMarkupFollowers {
  const byCurrency = { USD: 0, GBP: 0 };
  let overriding = 0;
  for (const product of products) {
    if (product.archivedAt) continue;
    const currency = product.baseCurrency as keyof typeof byCurrency;
    if (!(GENERAL_MARKUP_CURRENCIES as readonly string[]).includes(currency)) {
      continue;
    }
    if (overridesGlobal(product.markupBps)) overriding += 1;
    else byCurrency[currency] += 1;
  }
  return {
    byCurrency,
    following: byCurrency.USD + byCurrency.GBP,
    overriding,
  };
}
