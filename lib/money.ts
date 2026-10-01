/**
 * Currencies the system can price in — mirrors backend `SupportedCurrency`
 * (CUR-001). Keep this list identical to the API enum; widening it here without
 * the backend is how an unpriceable product reaches the console.
 *
 * GBP-003: GBP is a real pricing currency in the backend (dark — the UK region
 * is inactive), so the console must be able to render a GBP product. Being in
 * this list grants *display* only. What an operator may do in a currency is a
 * separate, explicit list — `VOUCHER_CURRENCIES` below, and the pricing-edit
 * capability (`canEditPricingHere`) further down this file.
 */
export const SUPPORTED_CURRENCIES = ['NGN', 'USD', 'GBP'] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

/** A product's pricing currency — what `baseCurrency` can hold. */
export type PricingCurrency = SupportedCurrency;

export function isSupportedCurrency(
  value: unknown,
): value is SupportedCurrency {
  return (
    typeof value === 'string' &&
    (SUPPORTED_CURRENCIES as readonly string[]).includes(value)
  );
}

/**
 * Currencies a promotional voucher can be issued in — mirrors the backend's
 * `VOUCHER_CURRENCIES` (DECISION F: no GBP vouchers at launch). Explicit, so
 * adding a pricing currency above cannot put it in the voucher dialog.
 */
export const VOUCHER_CURRENCIES = ['NGN', 'USD'] as const;

export type VoucherCurrency = (typeof VOUCHER_CURRENCIES)[number];

export function isVoucherCurrency(value: unknown): value is VoucherCurrency {
  return (
    typeof value === 'string' &&
    (VOUCHER_CURRENCIES as readonly string[]).includes(value)
  );
}

/**
 * Currencies priced by converting a face value (`baseAmount`) at a rate —
 * mirrors the backend's `isConvertedCurrency`. NGN is the native price.
 */
export const CONVERTED_CURRENCIES = ['USD', 'GBP'] as const;

export function isConvertedCurrency(currency: string): boolean {
  return (CONVERTED_CURRENCIES as readonly string[]).includes(currency);
}

const SYMBOLS: Record<SupportedCurrency, string> = {
  NGN: '₦',
  USD: '$',
  GBP: '£',
};

/**
 * Split an amount into fixed-2 decimal parts without floating-point money math.
 * Rounds half-up on the third fractional digit (matches Decimal.js toFixed(2)).
 */
function toFixed2Parts(amount: string | number): {
  whole: string;
  fraction: string;
} {
  const raw = typeof amount === 'number' ? String(amount) : amount.trim();
  if (!/^-?\d+(\.\d+)?$/.test(raw)) {
    throw new Error(`Invalid money amount: ${amount}`);
  }

  const negative = raw.startsWith('-');
  const unsigned = negative ? raw.slice(1) : raw;
  const [wholeRaw, fracRaw = ''] = unsigned.split('.');
  const digits = (fracRaw + '000').slice(0, 3);
  let frac2 = Number.parseInt(digits.slice(0, 2), 10);
  let whole = BigInt(wholeRaw);
  if (Number.parseInt(digits[2]!, 10) >= 5) {
    frac2 += 1;
  }
  if (frac2 >= 100) {
    frac2 = 0;
    whole += BigInt(1);
  }

  const wholeStr = whole.toString();
  return {
    whole: negative && whole !== BigInt(0) ? `-${wholeStr}` : wholeStr,
    fraction: frac2.toString().padStart(2, '0'),
  };
}

/**
 * Renders an amount in its own currency — `$5` / `£10` / `₦8,000`.
 * Whole amounts drop decimals; fractional amounts keep them.
 * Unsupported codes throw rather than rendering `"6,985 undefined"`.
 */
export function formatMoney(
  amount: string | number,
  currency: SupportedCurrency,
): string {
  if (!isSupportedCurrency(currency)) {
    throw new Error(`Unsupported currency: ${String(currency)}`);
  }
  const { whole, fraction } = toFixed2Parts(amount);
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fraction === '00'
    ? `${SYMBOLS[currency]}${grouped}`
    : `${SYMBOLS[currency]}${grouped}.${fraction}`;
}

/**
 * Display price for a product row, in the product's own currency — GBP-003.
 *
 *   converted (USD, GBP)  the face value: `baseAmount` + `baseCurrency` → `$10`, `£10`
 *   NGN                   the naira price: `snapshotNgnPrice` → `₦8,000`
 *
 * A GBP product is never shown as dollars and never as its naira snapshot. A USD
 * product from a backend that predates `baseAmount` falls back to `priceUsd`
 * (its mirror); no other currency ever reads `priceUsd`. A converted product
 * with no face value is a data error and throws, as it always has for USD.
 */
export function formatProductPrice(product: {
  baseCurrency: SupportedCurrency;
  snapshotNgnPrice: string;
  priceUsd?: string | null;
  baseAmount?: string | null;
}): string {
  if (!isConvertedCurrency(product.baseCurrency)) {
    return formatMoney(product.snapshotNgnPrice, 'NGN');
  }
  const faceValue =
    nonBlank(product.baseAmount) ??
    // Only USD's priceUsd is its face value (a mirror). GBP has none.
    (product.baseCurrency === 'USD' ? nonBlank(product.priceUsd) : null);
  if (faceValue === null) {
    throw new Error(`${product.baseCurrency} product is missing its face value`);
  }
  return formatMoney(faceValue, product.baseCurrency);
}

function nonBlank(value: string | null | undefined): string | null {
  return value == null || value.trim() === '' ? null : value;
}

// ─── Pricing-edit capability (GBP-003) ───────────────────────────────────────

/**
 * What the console's EXISTING pricing controls can safely do — GBP-003.
 *
 * Both controls were built for dollars. The product pricing card edits the face
 * value as `priceUsd` behind a `$` prefix and previews with the USD oracle; the
 * general-markup form previews every product with the USD oracle. For a GBP
 * product that would send a field the backend refuses, show the wrong symbol and
 * preview the wrong price. Until GBP-5 builds the currency-aware versions, GBP
 * pricing is read-only here and changed through the API by a Super Admin.
 *
 * An explicit list, like the backend's capabilities: a newly enabled currency is
 * read-only here until someone decides otherwise.
 */
export const PRICING_CARD_EDIT_CURRENCIES = ['NGN', 'USD'] as const;

export function canEditPricingHere(currency: string): boolean {
  return (PRICING_CARD_EDIT_CURRENCIES as readonly string[]).includes(currency);
}

/**
 * Currencies the general-markup form's USD-oracle preview can price. Mirrors the
 * backend's `ORACLE_CURRENCIES`.
 */
const ORACLE_PREVIEW_CURRENCIES = ['USD'] as const;

/**
 * A product that WILL move when the general markup changes (it is converted and
 * inherits the general markup) but that the form cannot preview, because its
 * rate is not the USD oracle — a GBP product. The form must say these exist
 * rather than leave them out silently.
 */
export function followsGlobalMarkupWithoutPreview(product: {
  baseCurrency: string;
  markupBps: number | null;
}): boolean {
  return (
    product.markupBps === null &&
    isConvertedCurrency(product.baseCurrency) &&
    !(ORACLE_PREVIEW_CURRENCIES as readonly string[]).includes(
      product.baseCurrency,
    )
  );
}
