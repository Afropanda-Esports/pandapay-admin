import { CATALOG_NAME_MAX_LENGTH } from './catalog-forms.ts';
import { parseMarkupInput } from './markup.ts';
import {
  declaredUsdIssue,
  faceValueIssue,
  formatMoney,
  isConvertedCurrency,
  isSupportedCurrency,
  ngnPriceIssue,
  type PricingCurrency,
} from './money.ts';

/**
 * Creating a product from the admin — GBP-006 (Super Admin only).
 *
 * Products only: the region, brand, product line and category must already
 * exist. The currency is the REGION's (Region → Brand → Line → Product); the
 * form shows it read-only and never sends it. The backend validates every rule
 * again, recomputes the price from the current rate (the preview is advisory —
 * the stored snapshot is the truth) and creates the product UNAVAILABLE unless
 * "Available once stocked" is ticked (DECISION J).
 */

export interface CreateProductForm {
  regionId: string;
  brandId: string;
  lineId: string;
  categoryId: string;
  name: string;
  sku: string;
  /** USD/GBP: the face value, in the region's currency. */
  faceValue: string;
  /** USD/GBP: blank inherits the general markup; `0` is an explicit zero. */
  markup: string;
  /** NGN: the naira price. */
  ngnPrice: string;
  /** NGN: the declared dollar value the backend still requires. */
  declaredUsd: string;
  availableOnceStocked: boolean;
}

export const EMPTY_CREATE_FORM: CreateProductForm = {
  regionId: '',
  brandId: '',
  lineId: '',
  categoryId: '',
  name: '',
  sku: '',
  faceValue: '',
  markup: '',
  ngnPrice: '',
  declaredUsd: '',
  availableOnceStocked: false,
};

interface RegionLike {
  id: string;
  code: string;
  name: string;
  currency: string;
  isActive: boolean;
}

/** `United Kingdom · GBP · Inactive` — inactive regions are offered (staging). */
export function regionOptionLabel(region: RegionLike): string {
  const label = `${region.name} · ${region.currency}`;
  return region.isActive ? label : `${label} · Inactive`;
}

/** The region's currency, or null when unknown to this console. */
export function currencyOfRegion(
  regions: readonly RegionLike[],
  regionId: string,
): PricingCurrency | null {
  const currency = regions.find((r) => r.id === regionId)?.currency;
  return currency && isSupportedCurrency(currency) ? currency : null;
}

export function brandsInRegion<T extends { regionId: string; isActive: boolean }>(
  brands: readonly T[],
  regionId: string,
): T[] {
  if (!regionId) return [];
  return brands.filter((b) => b.regionId === regionId && b.isActive);
}

export function linesOfBrand<T extends { brandId: string; isActive: boolean }>(
  lines: readonly T[],
  brandId: string,
): T[] {
  if (!brandId) return [];
  return lines.filter((l) => l.brandId === brandId && l.isActive);
}

export function activeCategories<T extends { isActive: boolean }>(
  categories: readonly T[],
): T[] {
  return categories.filter((c) => c.isActive);
}

/**
 * A new region invalidates the brand and line under it, and the price inputs
 * that belonged to the old currency (a naira price means nothing for GBP).
 */
export function selectRegion(
  form: CreateProductForm,
  regionId: string,
): CreateProductForm {
  if (regionId === form.regionId) return form;
  return {
    ...form,
    regionId,
    brandId: '',
    lineId: '',
    faceValue: '',
    ngnPrice: '',
    declaredUsd: '',
  };
}

/** A new brand invalidates the line. */
export function selectBrand(
  form: CreateProductForm,
  brandId: string,
): CreateProductForm {
  if (brandId === form.brandId) return form;
  return { ...form, brandId, lineId: '' };
}

const NAME_MIN_LENGTH = 2;

export function productNameIssue(raw: string): string | null {
  const name = raw.trim();
  if (name === '') return 'Name is required';
  if (name.length < NAME_MIN_LENGTH) {
    return `Name must be at least ${NAME_MIN_LENGTH} characters`;
  }
  if (name.length > CATALOG_NAME_MAX_LENGTH) {
    return `Name must be at most ${CATALOG_NAME_MAX_LENGTH} characters — it has to fit a WhatsApp catalog row`;
  }
  return null;
}

/** The backend's `PRODUCT_SKU_PATTERN` (GBP-006). */
export const SKU_PATTERN = /^[A-Z0-9][A-Z0-9-]{1,63}$/;

/** Explains an invalid SKU. Never rewrites it — the operator types the SKU. */
export function skuIssue(raw: string): string | null {
  if (raw === '') return 'SKU is required';
  if (SKU_PATTERN.test(raw)) return null;
  if (/[a-z]/.test(raw)) return 'Use upper-case letters — the SKU is stored exactly as typed';
  return 'SKU: 2–64 characters of A–Z, 0–9 and hyphens, starting with a letter or digit';
}

/**
 * A suggested SKU — `BRAND-REGION-CUR-AMOUNT`, e.g. `AMAZON-UK-GBP-10`. Only a
 * suggestion: nothing enforces the convention beyond `SKU_PATTERN`.
 */
export function suggestSku(input: {
  brandName: string;
  regionCode: string;
  currency: string;
  faceValue: string;
}): string | null {
  if (faceValueIssue(input.faceValue)) return null;
  const slug = (value: string) =>
    value
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  const sku = [input.brandName, input.regionCode, input.currency, input.faceValue]
    .map(slug)
    .filter(Boolean)
    .join('-');
  return SKU_PATTERN.test(sku) ? sku : null;
}

export type CreateFormIssues = Partial<Record<keyof CreateProductForm, string>>;

/** Everything that stops Create before the server is asked. Empty = ready. */
export function createFormIssues(
  form: CreateProductForm,
  currency: PricingCurrency | null,
): CreateFormIssues {
  const issues: CreateFormIssues = {};
  if (!form.regionId) issues.regionId = 'Choose a region';
  else if (!currency) issues.regionId = "This region's currency is not supported";
  if (!form.brandId) issues.brandId = 'Choose a brand';
  if (!form.lineId) issues.lineId = 'Choose a product line';
  if (!form.categoryId) issues.categoryId = 'Choose a category';
  const name = productNameIssue(form.name);
  if (name) issues.name = name;
  const sku = skuIssue(form.sku);
  if (sku) issues.sku = sku;

  if (currency && isConvertedCurrency(currency)) {
    const face = faceValueIssue(form.faceValue);
    if (face) issues.faceValue = face;
    const markup = parseMarkupInput(form.markup);
    if (markup.error) issues.markup = markup.error;
  } else if (currency) {
    const ngn = ngnPriceIssue(form.ngnPrice);
    if (ngn) issues.ngnPrice = ngn;
    const usd = declaredUsdIssue(form.declaredUsd);
    if (usd) issues.declaredUsd = usd;
  }
  return issues;
}

export interface CreateProductBody {
  brandId: string;
  lineId: string;
  categoryId: string;
  name: string;
  sku: string;
  baseAmount?: string;
  markupBps?: number | null;
  ngnPrice?: number;
  priceUsd?: number;
  isAvailable: boolean;
}

/**
 * `POST /admin/products`. No currency (the backend derives it, and refuses one
 * in the body); no preview figure (the backend recomputes the price). Blank
 * markup is sent as `null` — inherit — never coerced to `0`.
 */
export function buildCreateProductBody(
  form: CreateProductForm,
  currency: PricingCurrency,
): CreateProductBody {
  const issues = createFormIssues(form, currency);
  const first = Object.values(issues)[0];
  if (first) throw new Error(first);

  const body: CreateProductBody = {
    brandId: form.brandId,
    lineId: form.lineId,
    categoryId: form.categoryId,
    name: form.name.trim(),
    sku: form.sku,
    isAvailable: form.availableOnceStocked,
  };
  if (isConvertedCurrency(currency)) {
    body.baseAmount = form.faceValue.trim();
    body.markupBps = parseMarkupInput(form.markup).markupBps ?? null;
  } else {
    // Validated to two decimals above; the backend converts to Decimal.
    body.ngnPrice = Number(form.ngnPrice.trim());
    body.priceUsd = Number(form.declaredUsd.trim());
  }
  return body;
}

/** The backend's refusal, in operator terms. */
export function createErrorMessage(err: unknown): string {
  const e = (err ?? {}) as { status?: unknown; message?: unknown };
  if (e.status === 403) return 'Only a Super Admin can create products.';
  if ((e.status === 400 || e.status === 409) && typeof e.message === 'string') {
    return e.message;
  }
  return 'Could not create the product.';
}

export interface ReadinessItem {
  key: 'price' | 'stock' | 'available' | 'region';
  label: string;
  value: string;
  ok: boolean;
}

/**
 * The operator's checklist on the product page after creation:
 * create → unavailable → review price → upload stock → mark available → region
 * active → visible. Feedback only; it changes nothing. `customerVisible` mirrors
 * the backend's listing conditions this page can see (available, in stock, not
 * archived, has a SKU, active region); an unknown region is never "visible".
 */
export function readinessChecklist(product: {
  snapshotNgnPrice: string;
  sku?: string | null;
  isAvailable: boolean;
  archivedAt: string | null;
  voucherStats: { available: number };
  regionActive: boolean | null;
}): { items: ReadinessItem[]; customerVisible: boolean } {
  const stock = product.voucherStats.available;
  const items: ReadinessItem[] = [
    {
      key: 'price',
      label: 'Price — review it in the Pricing card',
      value: formatMoney(product.snapshotNgnPrice, 'NGN'),
      ok: true,
    },
    { key: 'stock', label: 'Stock', value: `${stock} available`, ok: stock > 0 },
    {
      key: 'available',
      label: 'Available',
      value: product.isAvailable ? 'Yes' : 'No',
      ok: product.isAvailable,
    },
    {
      key: 'region',
      label: 'Region active',
      value:
        product.regionActive === null ? 'Unknown' : product.regionActive ? 'Yes' : 'No',
      ok: product.regionActive === true,
    },
  ];
  const customerVisible =
    product.isAvailable &&
    stock > 0 &&
    product.regionActive === true &&
    !product.archivedAt &&
    Boolean(product.sku);
  return { items, customerVisible };
}
