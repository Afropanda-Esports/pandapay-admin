'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { useState } from 'react';

import { ResolvePaymentExceptionDialog } from '@/components/features/orders/resolve-payment-exception-dialog';
import { PageHeader } from '@/components/shared/page-header';
import { PaginationControls } from '@/components/shared/pagination-controls';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/use-permissions';
import { listPaymentExceptions } from '@/lib/api/payment-exceptions';
import type { PaymentException, PaymentExceptionStatus } from '@/lib/types';

const PAGE_SIZE = 20;

const STATUS_LABEL: Record<PaymentExceptionStatus, string> = {
  REFUND_INITIATED: 'Refund initiated',
  REFUND_FAILED: 'Refund failed',
  RESOLVED: 'Resolved',
};

function formatAmount(raw: string) {
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n)) return raw;
  return `₦${n.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
}

export default function PaymentExceptionsPage() {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const canManage = can('orders:manage');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] =
    useState<PaymentExceptionStatus>('REFUND_FAILED');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['payment-exceptions', page, statusFilter],
    queryFn: () => listPaymentExceptions(page, PAGE_SIZE, statusFilter),
  });

  const rows = data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment exceptions"
        description="Overpayments where excess refund needs review or follow-up."
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {(
          ['REFUND_FAILED', 'REFUND_INITIATED', 'RESOLVED'] as PaymentExceptionStatus[]
        ).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={statusFilter === s ? 'default' : 'outline'}
            onClick={() => {
              setStatusFilter(s);
              setPage(1);
            }}
          >
            {STATUS_LABEL[s]}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : isError ? (
        <p className="text-sm text-destructive">Failed to load payment exceptions.</p>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No payment exceptions for this filter.
          </CardContent>
        </Card>
      ) : (
        <>
          <ul className="space-y-4">
            {rows.map((row) => (
              <ExceptionCard
                key={row.id}
                row={row}
                canManage={canManage}
                onResolved={() => {
                  void queryClient.invalidateQueries({
                    queryKey: ['payment-exceptions'],
                  });
                }}
              />
            ))}
          </ul>
          {data && data.total > PAGE_SIZE ? (
            <PaginationControls
              page={page}
              limit={PAGE_SIZE}
              total={data.total}
              onPageChange={setPage}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

function ExceptionCard({
  row,
  canManage,
  onResolved,
}: Readonly<{
  row: PaymentException;
  canManage: boolean;
  onResolved: () => void;
}>) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base">
            Order{' '}
            <Button
              variant="link"
              size="sm"
              render={<Link href={`/orders/${row.orderId}`} />}
              className="h-auto px-0 font-mono text-sm"
            >
              {row.orderId.slice(0, 8)}…
            </Button>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {format(parseISO(row.createdAt), 'PPpp')}
          </p>
        </div>
        <Badge variant="outline">{STATUS_LABEL[row.status]}</Badge>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p>
          Expected {formatAmount(row.expectedAmount)} · Received{' '}
          {formatAmount(row.receivedAmount)} · Excess{' '}
          <span className="font-medium">{formatAmount(row.excessAmount)}</span>
        </p>
        <p className="font-mono text-xs text-muted-foreground">
          Paystack ref: {row.paystackReference}
        </p>
        {row.status !== 'RESOLVED' && canManage ? (
          <ResolvePaymentExceptionDialog
            exceptionId={row.id}
            excessAmount={row.excessAmount}
            onResolved={onResolved}
            trigger={
              <Button size="sm" variant="secondary">
                Mark resolved
              </Button>
            }
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
