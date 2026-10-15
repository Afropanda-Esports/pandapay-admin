const MISSING = '—';

export function formatAppliedDiscountCode(
  code: string | null | undefined,
): string {
  const trimmed = code?.trim();
  if (!trimmed) return MISSING;
  return trimmed;
}

/** Clipboard payload. Null when there is nothing to copy. */
export function appliedDiscountCodeCopyText(
  code: string | null | undefined,
): string | null {
  const trimmed = code?.trim();
  return trimmed ? trimmed : null;
}
