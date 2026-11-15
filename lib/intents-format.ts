const USDC_DECIMALS = 6;
const BASE_UNITS = /^[0-9]+$/;

/** USDC base units (6 decimals) as a decimal string, using string maths only. */
export function formatUsdcBaseUnits(value: string | null | undefined): string {
  if (!value || !BASE_UNITS.test(value)) return '—';
  const padded = value.padStart(USDC_DECIMALS + 1, '0');
  const whole = padded.slice(0, -USDC_DECIMALS).replace(/^0+(?=\d)/, '');
  return `${whole}.${padded.slice(-USDC_DECIMALS)}`;
}

/** The link, if it is https; anything else is shown as plain text. */
export function safeExplorerHref(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).protocol === 'https:' ? value : null;
  } catch {
    return null;
  }
}

export function nearblocksAccountUrl(accountId: string): string {
  return `https://nearblocks.io/address/${encodeURIComponent(accountId)}`;
}

export function shortHash(hash: string): string {
  return hash.length <= 14 ? hash : `${hash.slice(0, 6)}…${hash.slice(-5)}`;
}
