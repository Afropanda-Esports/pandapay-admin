'use client';

import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { AlertCircle, BadgePercent } from 'lucide-react';

import { BulkDiscountDialog } from '@/components/features/pricing/bulk-discount-dialog';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getBulkDiscount } from '@/lib/api/pricing';
import { formatBpsAsPercent } from '@/lib/markup';
import { formatMoney } from '@/lib/money';

/**
 * The automatic discount on large WhatsApp orders. Any admin can see it; only
 * a Super Admin (`pricing:manage`) gets the edit button.
 */
export function BulkDiscountCard({
  canManagePricing,
  actorName,
}: Readonly<{
  canManagePricing: boolean;
  actorName: (id: string | null) => string;
}>) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['bulk-discount'],
    queryFn: getBulkDiscount,
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <BadgePercent className="size-4" />
              Bulk discount
            </CardTitle>
            <CardDescription>
              {data
                ? `Applies to WhatsApp orders of ${formatMoney(data.thresholdNgn, 'NGN')} or more, including USDC. Not combined with discount or voucher codes.`
                : 'An automatic discount on large WhatsApp orders.'}
            </CardDescription>
          </div>
          {data ? (
            <Badge variant={data.enabled ? 'default' : 'secondary'}>
              {data.enabled ? 'On' : 'Off'}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isError ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="size-4" />
            Failed to load the bulk discount.
          </p>
        ) : isLoading || !data ? (
          <>
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-3 w-56" />
          </>
        ) : (
          <>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="font-heading text-3xl font-bold tabular-nums">
                  {formatBpsAsPercent(data.bps)}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {data.bps} bps, from {formatMoney(data.thresholdNgn, 'NGN')}
                </p>
              </div>
              {canManagePricing ? <BulkDiscountDialog current={data} /> : null}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.updatedAt
                ? `Last changed by ${actorName(data.updatedBy)} on ${format(parseISO(data.updatedAt), 'PPp')}.`
                : 'Never changed.'}
              {canManagePricing ? '' : ' Only a Super Admin can change it.'}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
