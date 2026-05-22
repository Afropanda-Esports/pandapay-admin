'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  Send,
  PackageCheck,
} from 'lucide-react';
import Link from 'next/link';
import { use } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/lib/api/client';
import { getOrder, resendOrder, fulfillOrder } from '@/lib/api/orders';
import type { OrderDetail, PaymentMode } from '@/lib/types';

const PAYMENT_MODE_LABEL: Record<PaymentMode, string> = {
  WALLET: 'Wallet',
  DIRECT_TRANSFER: 'Direct transfer',
};

const formatAmount = (raw: string) => {
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n)) return raw;
  return `₦${n.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
};

const formatDateTime = (iso: string) => format(parseISO(iso), 'PPpp');

function DetailRow({
  label,
  value,
}: Readonly<{ label: string; value: React.ReactNode }>) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/60 py-2 last:border-b-0">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-right text-sm font-medium break-all">{value}</span>
    </div>
  );
}

function InfoCard({
  title,
  children,
}: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function FulfillmentInconsistencyAlert() {
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="size-4" />
      <AlertTitle>Fulfillment inconsistency</AlertTitle>
      <AlertDescription>
        A voucher was assigned to this order but is not marked as used.
        Investigate before resending.
      </AlertDescription>
    </Alert>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-64" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {['o', 'p', 'u', 'v'].map((k) => (
          <Card key={k}>
            <CardHeader>
              <Skeleton className="h-5 w-28" />
            </CardHeader>
            <CardContent className="space-y-3">
              {['a', 'b', 'c', 'd'].map((kk) => (
                <Skeleton key={kk} className="h-5 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function OrderInfo({ order }: Readonly<{ order: OrderDetail }>) {
  return (
    <InfoCard title="Order">
      <DetailRow
        label="Order ID"
        value={<span className="font-mono text-xs">{order.id}</span>}
      />
      <DetailRow label="Status" value={<StatusBadge status={order.status} />} />
      <DetailRow label="Amount" value={formatAmount(order.amount)} />
      <DetailRow label="Created" value={formatDateTime(order.createdAt)} />
      {order.expiresAt && (
        <DetailRow label="Expires" value={formatDateTime(order.expiresAt)} />
      )}
    </InfoCard>
  );
}

function PaymentInfo({ order }: Readonly<{ order: OrderDetail }>) {
  return (
    <InfoCard title="Payment">
      <DetailRow
        label="Mode"
        value={PAYMENT_MODE_LABEL[order.paymentMode]}
      />
      {order.paystackReference && (
        <DetailRow
          label="Paystack ref"
          value={
            <span className="font-mono text-xs">{order.paystackReference}</span>
          }
        />
      )}
      <DetailRow
        label="Voucher assigned"
        value={order.voucherAssigned ? 'Yes' : 'No'}
      />
      <DetailRow
        label="Voucher used"
        value={order.voucherIsUsed ? 'Yes' : 'No'}
      />
    </InfoCard>
  );
}

function UserInfo({ order }: Readonly<{ order: OrderDetail }>) {
  return (
    <InfoCard title="User">
      <DetailRow
        label="User ID"
        value={
          <Button
            variant="link"
            size="sm"
            render={<Link href={`/users/${order.userId}`} />}
            className="h-auto px-0 font-mono text-xs"
          >
            {order.userId}
          </Button>
        }
      />
      {order.user?.whatsappNumber && (
        <DetailRow
          label="WhatsApp"
          value={
            <span className="font-mono">{order.user.whatsappNumber}</span>
          }
        />
      )}
      {order.user?.displayName && (
        <DetailRow label="Name" value={order.user.displayName} />
      )}
    </InfoCard>
  );
}

function VoucherInfo({ order }: Readonly<{ order: OrderDetail }>) {
  return (
    <InfoCard title="Voucher / Product">
      <DetailRow
        label="Product"
        value={
          order.product ? (
            <Button
              variant="link"
              size="sm"
              render={<Link href={`/products/${order.productId}`} />}
              className="h-auto px-0"
            >
              {order.product.name}
            </Button>
          ) : (
            '—'
          )
        }
      />
      {order.product?.snapshotNgnPrice && (
        <DetailRow
          label="Price"
          value={`${formatAmount(order.product.snapshotNgnPrice)} ${
            order.product.currency
          }`}
        />
      )}
      <DetailRow
        label="Assigned"
        value={order.voucherAssigned ? 'Yes' : 'No'}
      />
      <DetailRow label="Used" value={order.voucherIsUsed ? 'Yes' : 'No'} />
    </InfoCard>
  );
}

export default function OrderDetailPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = use(params);
  const queryClient = useQueryClient();

  const { data: order, isLoading, isError, refetch } = useQuery({
    queryKey: ['order', id],
    queryFn: () => getOrder(id),
  });

  const resendMutation = useMutation({
    mutationFn: () => resendOrder(id),
    onSuccess: () => {
      toast.success('Voucher resent via WhatsApp');
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (err) => {
      const message =
        err instanceof ApiError ? err.message : 'Failed to resend voucher';
      toast.error(message);
    },
  });

  const fulfillMutation = useMutation({
    mutationFn: () => fulfillOrder(id),
    onSuccess: () => {
      toast.success('Order fulfilled');
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (err) => {
      const message =
        err instanceof ApiError ? err.message : 'Failed to fulfill order';
      toast.error(message);
    },
  });

  const backLink = (
    <Button variant="ghost" size="sm" render={<Link href="/orders" />}>
      <ArrowLeft className="size-4" />
      Back to orders
    </Button>
  );

  if (isError) {
    return (
      <div>
        <PageHeader title="Order" actions={backLink} />
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-muted-foreground">
          <AlertCircle className="size-8" />
          <p>Failed to load order.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 size-4" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading || !order) {
    return (
      <div>
        <PageHeader title="Order" actions={backLink} />
        <DetailSkeleton />
      </div>
    );
  }

  const isInconsistent = order.voucherAssigned && !order.voucherIsUsed;
  const canResend = order.status === 'FULFILLED';
  const canFulfill = order.status === 'PAID';

  const actions = (
    <div className="flex items-center gap-2">
      {backLink}
      {canFulfill && (
        <ConfirmDialog
          trigger={
            <Button disabled={fulfillMutation.isPending} variant="secondary">
              <PackageCheck className="size-4" />
              Fulfill order
            </Button>
          }
          title="Force-fulfill order?"
          description="Trigger fulfillment for this order? A voucher will be claimed and sent to the customer immediately."
          confirmLabel="Fulfill"
          isPending={fulfillMutation.isPending}
          onConfirm={async () => {
            await fulfillMutation.mutateAsync();
          }}
        />
      )}
      {canResend && (
        <ConfirmDialog
          trigger={
            <Button disabled={resendMutation.isPending}>
              <Send className="size-4" />
              Resend voucher
            </Button>
          }
          title="Resend voucher?"
          description="Re-deliver the voucher code to the customer via WhatsApp. The original code is reused."
          confirmLabel="Resend"
          isPending={resendMutation.isPending}
          onConfirm={async () => {
            await resendMutation.mutateAsync();
          }}
        />
      )}
    </div>
  );

  return (
    <div>
      <PageHeader
        title={`Order ${order.id.slice(0, 8)}…`}
        description={`Created ${formatDateTime(order.createdAt)}`}
        actions={actions}
      />

      {isInconsistent && <FulfillmentInconsistencyAlert />}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <OrderInfo order={order} />
        <PaymentInfo order={order} />
        <UserInfo order={order} />
        <VoucherInfo order={order} />
      </div>
    </div>
  );
}
