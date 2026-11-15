import { Badge } from '@/components/ui/badge';

type Variant = 'default' | 'secondary' | 'destructive' | 'outline';

const VARIANT: Record<string, Variant> = {
  SETTLED: 'default',
  SETTLING: 'secondary',
  DEPOSIT_DETECTED: 'secondary',
  AWAITING_DEPOSIT: 'outline',
  UNDERPAID: 'destructive',
  EXPIRED: 'outline',
  RETURNED: 'destructive',
  FAILED: 'destructive',
};

const LABEL: Record<string, string> = {
  SETTLED: 'Settled',
  SETTLING: 'Settling',
  DEPOSIT_DETECTED: 'Deposit detected',
  AWAITING_DEPOSIT: 'Awaiting deposit',
  UNDERPAID: 'Underpaid',
  EXPIRED: 'Expired',
  RETURNED: 'Returned',
  FAILED: 'Failed',
};

/** Status reported by the checkout service, not the PandaPay order status. */
export function CheckoutStatusBadge({
  status,
}: Readonly<{ status: string | null | undefined }>) {
  if (!status) {
    return <span className="text-xs text-muted-foreground">No webhook yet</span>;
  }
  return (
    <Badge variant={VARIANT[status] ?? 'outline'}>{LABEL[status] ?? status}</Badge>
  );
}
