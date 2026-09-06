import type { PricingMode } from '@/lib/types';

/**
 * Currencies the system can price in — mirrors backend `SupportedCurrency`
 * (CUR-001). Keep this list identical to the API enum; widening it here without
 * the backend is how an unpriceable product reaches the console.
 */
export const SUPPORTED_CURRENCIES = ['NGN', 'USD'] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export function isSupportedCurrency(
  value: unknown,
): value is SupportedCurrency {
  return (
    typeof value === 'string' &&
    (SUPPORTED_CURRENCIES as readonly string[]).includes(value)
  );
}

const SYMBOLS: Record<SupportedCurrency, string> = {
  NGN: '₦',
  USD: '$',
};

/**
 * D1(a): base currency is derived from pricing mode so the two cannot diverge
 * in the admin console. MANUAL_NGN → NGN, GLOBAL_FX → USD.
 */
export function baseCurrencyFor(mode: PricingMode): SupportedCurrency {
  if (mode === 'MANUAL_NGN') return 'NGN';
  if (mode === 'GLOBAL_FX') return 'USD';
  const _exhaustive: never = mode;
  return _exhaustive;
}

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
 * Renders an amount in its own currency — `$5` / `₦8,000`.
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
 * Display price for a product row: NGN products use the snapshot; USD products
 * use the face value. Falls back safely when a field is missing.
 */
export function formatProductPrice(product: {
  baseCurrency: SupportedCurrency;
  snapshotNgnPrice: string;
  priceUsd: string | null;
}): string {
  if (product.baseCurrency === 'USD') {
    if (product.priceUsd == null || product.priceUsd.trim() === '') {
      throw new Error('USD product is missing priceUsd');
    }
    return formatMoney(product.priceUsd, 'USD');
  }
  return formatMoney(product.snapshotNgnPrice, 'NGN');
}
