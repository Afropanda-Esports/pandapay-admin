import type { PricingMode } from '@/lib/types';

/**
 * WhatsApp's catalog list rows truncate past this, and the backend enforces the
 * same limit on brand and product-line names. Checking it in the form means the
 * customer-facing constraint is explained where the admin is typing, rather than
 * arriving as a server error after submit.
 */
export const CATALOG_NAME_MAX_LENGTH = 24;

/**
 * Brands are scoped to a region, so the same platform exists once per region —
 * a list showing bare names renders "PlayStation" twice with no way to tell
 * them apart, and picking the wrong one files a product line under the wrong
 * region.
 *
 * Falls back to the bare name when regions have not loaded yet, or when the
 * brand points at a region that is not in the list, rather than rendering
 * "PlayStation — undefined".
 */
export function brandLabel(
  brand: { name: string; regionId: string },
  regions: readonly { id: string; name: string }[] | undefined,
): string {
  const region = regions?.find((candidate) => candidate.id === brand.regionId);
  return region ? `${brand.name} — ${region.name}` : brand.name;
}

/**
 * Brand names come from `GET /admin/product-brands/allowed-names`, never from a
 * list in this repo. The backend constrains the field with `@IsIn(LAUNCH_BRANDS)`
 * and the WhatsApp bot matches customer messages against the same constant — a
 * second copy here would drift from both, which is the defect CAT-007 fixed.
 */
export function brandNameItems(
  allowed: readonly string[] | undefined,
): Record<string, string> {
  return Object.fromEntries((allowed ?? []).map((name) => [name, name]));
}

/** Returns a message when the name cannot be used, or null when it is fine. */
export function catalogNameIssue(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length === 0) return 'Name is required';
  if (trimmed.length > CATALOG_NAME_MAX_LENGTH) {
    return `Name must be at most ${CATALOG_NAME_MAX_LENGTH} characters — it has to fit a WhatsApp catalog row`;
  }
  return null;
}

/**
 * DISC-008: every product carries a dollar value, in both pricing modes, because
 * that is what a USD discount code is measured against.
 *
 * For GLOBAL_FX it drives the naira price. For MANUAL_NGN it does **not** — the
 * naira price stays exactly what the admin set, and the dollar figure is a
 * declared value used only for discount arithmetic. The two can drift apart, so
 * the form has to say which one it is.
 */
export function usdPriceHelp(mode: PricingMode, rateNgnPerUsd?: number): string {
  if (mode === 'MANUAL_NGN') {
    return 'Used to value discount codes. It does not change the NGN price above — keep it in step with that price yourself.';
  }
  return rateNgnPerUsd
    ? `Sets the NGN price. Current rate: ₦${rateNgnPerUsd.toLocaleString('en-NG')} / $1`
    : 'No FX rate set — configure one on the Pricing page first.';
}
