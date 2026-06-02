'use client';

import { format, parseISO } from 'date-fns';
import type { PaymentTimelineEntry } from '@/lib/types';

const METHOD_LABEL: Record<PaymentTimelineEntry['method'], string> = {
  DEDICATED_NUBAN: 'Bank transfer (DVA)',
  BANK_TRANSFER: 'Bank transfer',
  WALLET: 'Wallet',
  REFUND: 'Refund',
  CRYPTO_USDC: 'USDC (crypto)',
};

function formatAmount(raw: string) {
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n)) return raw;
  return `₦${n.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
}

export function PaymentTimeline({
  entries,
}: Readonly<{ entries: PaymentTimelineEntry[] }>) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No payment events recorded yet.
      </p>
    );
  }

  return (
    <ol className="relative space-y-4 border-l border-border pl-6">
      {entries.map((entry) => (
        <li key={entry.id} className="relative">
          <span
            className="absolute -left-[1.6rem] top-1.5 size-2.5 rounded-full bg-primary"
            aria-hidden
          />
          <p className="text-sm font-medium">
            {METHOD_LABEL[entry.method]} — {formatAmount(entry.amount)}
          </p>
          <p className="font-mono text-xs text-muted-foreground break-all">
            {entry.providerRef}
          </p>
          <p className="text-xs text-muted-foreground">
            {format(parseISO(entry.confirmedAt), 'PPpp')}
          </p>
        </li>
      ))}
    </ol>
  );
}
