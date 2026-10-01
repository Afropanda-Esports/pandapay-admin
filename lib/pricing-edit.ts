import {
  declaredUsdIssue,
  faceValueIssue,
  formatFaceValue,
  formatMoney,
  formatRatePerUnit,
  isConvertedCurrency,
  ngnPriceIssue,
  type PricingCurrency,
} from './money.ts';
import { formatBpsAsPercent, parseMarkupInput } from './markup.ts';
import type { PricePreview, PricePreviewRequest } from '@/lib/types';

/**
 * Editing a product's price — GBP-005. Shared by the product pricing card and
 * the create-product form (GBP-006).
 *
 *   USD, GBP  face value (`baseAmount`) + markup. The selling price shown is
 *             the BACKEND's (`POST /admin/pricing/preview`), the same function
 *             that saves and charges it — the console never computes one.
 *   NGN       the native naira price + its declared dollar value. Nothing to
 *             convert, so nothing to preview: the typed price is the price.
 */

export type PricingEditKind = 'FACE_VALUE' | 'NGN_PRICE';

export function pricingEditKind(currency: string): PricingEditKind {
  return isConvertedCurrency(currency) ? 'FACE_VALUE' : 'NGN_PRICE';
}

export interface PreviewRequestResult {
  request?: PricePreviewRequest;
  /** Why no request can be made yet (an input is invalid or incomplete). */
  blocked?: string;
  /** A naira product: there is no conversion to preview. */
  notApplicable?: true;
}

/** Turn the form's raw inputs into a preview request — or say why not. */
export function previewRequestFor(input: {
  currency: PricingCurrency;
  regionId?: string;
  faceValue: string;
  markup: string;
}): PreviewRequestResult {
  if (!isConvertedCurrency(input.currency)) return { notApplicable: true };
  const faceIssue = faceValueIssue(input.faceValue);
  if (faceIssue) return { blocked: faceIssue };
  const parsed = parseMarkupInput(input.markup);
  if (parsed.error) return { blocked: parsed.error };
  const market = input.regionId
    ? { regionId: input.regionId }
    : { currency: input.currency };
  return {
    request: {
      ...market,
      baseAmount: input.faceValue.trim(),
      markupBps: parsed.markupBps ?? null,
    },
  };
}

export interface PreviewDisplay {
  faceValue: string;
  rateLabel: string;
  rate: string;
  markup: string;
  ngnPrice: string;
}

/**
 * The backend preview as the card shows it — in the product's own currency,
 * never a dollar figure for a pound product.
 */
export function describePreview(
  preview: PricePreview,
  productMarkupBps: number | null,
): PreviewDisplay {
  const effective = formatBpsAsPercent(preview.effectiveMarkupBps);
  let markup: string;
  if (productMarkupBps === null) markup = `${effective} (general markup)`;
  else if (productMarkupBps === 0) markup = `${effective} (this product — sells at cost)`;
  else markup = `${effective} (this product)`;
  return {
    faceValue: formatFaceValue(preview.baseAmount, preview.currency),
    rateLabel: `Current ${preview.currency}/NGN rate`,
    rate: formatRatePerUnit(preview.ngnPerUnit, preview.currency),
    markup,
    ngnPrice: formatMoney(preview.ngnPrice, 'NGN'),
  };
}

export function previewErrorMessage(err: unknown, currency: string): string {
  const e = (err ?? {}) as { code?: unknown };
  if (e.code === 'FX_RATE_MISSING') {
    return `No ${currency}/NGN rate is set — a Super Admin must set one on the Currency rates page first.`;
  }
  return 'Could not load the price preview. Saving is disabled until it loads.';
}

export type PreviewState = 'idle' | 'loading' | 'ready' | 'error';

/**
 * Why Save is disabled, or null when it may be pressed. A converted product
 * cannot be saved without an authoritative preview on screen: loading, failing
 * (no rate) or stale input all block it.
 */
export function saveBlockReason(state: {
  kind: PricingEditKind;
  isDirty: boolean;
  inputError: string | null;
  preview: PreviewState;
}): string | null {
  if (!state.isDirty) return 'No changes to save';
  if (state.inputError) return state.inputError;
  if (state.kind === 'NGN_PRICE') return null;
  if (state.preview === 'loading') return 'Waiting for the price preview';
  if (state.preview !== 'ready') return 'The price preview is unavailable';
  return null;
}

export type PricingPatch =
  | { baseAmount: string; markupBps: number | null }
  | { ngnPrice: number; priceUsd: number };

/**
 * The body for `PATCH /admin/products/:id/pricing`. `markupBps: null` is sent
 * on purpose — it clears the product's own markup back to the general one.
 * Throws on invalid input: the card disables Save first, so a throw is a bug.
 */
export function buildPricingPatch(
  currency: PricingCurrency,
  input: {
    faceValue?: string;
    markup?: string;
    ngnPrice?: string;
    declaredUsd?: string;
  },
): PricingPatch {
  if (pricingEditKind(currency) === 'FACE_VALUE') {
    const faceValue = input.faceValue ?? '';
    const issue = faceValueIssue(faceValue);
    if (issue) throw new Error(issue);
    const parsed = parseMarkupInput(input.markup ?? '');
    if (parsed.error) throw new Error(parsed.error);
    return { baseAmount: faceValue.trim(), markupBps: parsed.markupBps ?? null };
  }
  const ngnPrice = input.ngnPrice ?? '';
  const declaredUsd = input.declaredUsd ?? '';
  const issue = ngnPriceIssue(ngnPrice) ?? declaredUsdIssue(declaredUsd);
  if (issue) throw new Error(issue);
  // JSON numbers, as the backend's `@IsNumber({ maxDecimalPlaces: 2 })` expects;
  // validated above to two decimals, and converted to Decimal server-side.
  return { ngnPrice: Number(ngnPrice.trim()), priceUsd: Number(declaredUsd.trim()) };
}
