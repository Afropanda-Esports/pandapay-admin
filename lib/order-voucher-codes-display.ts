const MISSING = '—';

export function formatOrderVoucherCodes(
  codes: string[] | null | undefined,
): string {
  if (codes == null || codes.length === 0) return MISSING;
  return codes.join('\n');
}

/** Clipboard payload. Null when there is nothing to copy. */
export function orderVoucherCodesCopyText(
  codes: string[] | null | undefined,
): string | null {
  if (codes == null || codes.length === 0) return null;
  return codes.join('\n');
}
