'use client';

import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { AlertTriangle, ArrowLeft, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { use } from 'react';

import { CheckoutStatusBadge } from '@/components/features/intents/checkout-status-badge';
import { CopyButton, TxHashLinks } from '@/components/features/intents/intents-links';
import { DetailRow, InfoCard } from '@/components/shared/detail-card';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getIntentsOrder } from '@/lib/api/intents';
import { formatUsdcBaseUnits } from '@/lib/intents-format';
import type { IntentsEvent, IntentsOrderDetail } from '@/lib/types';

import IntentsOrderLoading from './loading';

const dateTime = (iso: string | null) =>
  iso ? format(parseISO(iso), 'PPpp') : '—';

const usdc = (value: string | null) => (value ? `${value} USDC` : '—');

const baseUnitsUsdc = (value: string | null) =>
  value ? `${formatUsdcBaseUnits(value)} USDC` : '—';

function OrderCard({ order }: Readonly<{ order: IntentsOrderDetail }>) {
  return (
    <InfoCard title="Order">
      <DetailRow label="Reference" value={order.publicOrderRef ?? '—'} />
      <DetailRow label="Status" value={<StatusBadge status={order.status} />} />
      <DetailRow label="Customer" value={order.whatsappNumber ?? '—'} />
      <DetailRow label="Product" value={order.productName ?? '—'} />
      <DetailRow label="Network" value={order.network ?? '—'} />
      <DetailRow label="USDC asked" value={usdc(order.cryptoAmountUsdc)} />
      <DetailRow label="USDC received" value={usdc(order.cryptoReceivedUsdc)} />
      <DetailRow
        label="Deposit address"
        value={
          order.cryptoDepositAddress ? (
            <span className="inline-flex items-center gap-1 font-mono text-xs">
              {order.cryptoDepositAddress}
              <CopyButton value={order.cryptoDepositAddress} label="Deposit address" />
            </span>
          ) : (
            '—'
          )
        }
      />
      <DetailRow label="Created" value={dateTime(order.createdAt)} />
    </InfoCard>
  );
}

function CheckoutCard({ order }: Readonly<{ order: IntentsOrderDetail }>) {
  const intents = order.intents;
  return (
    <InfoCard title="NEAR Intents payment">
      <DetailRow
        label="Checkout status"
        value={<CheckoutStatusBadge status={intents?.checkoutStatus} />}
      />
      <DetailRow
        label="Payment ID"
        value={
          intents?.paymentId ? (
            <span className="inline-flex items-center gap-1 font-mono text-xs">
              {intents.paymentId}
              <CopyButton value={intents.paymentId} label="Payment ID" />
            </span>
          ) : (
            '—'
          )
        }
      />
      <DetailRow
        label="Origin tx"
        value={<TxHashLinks hashes={intents?.originTxHashes ?? []} />}
      />
      <DetailRow
        label="NEAR tx"
        value={<TxHashLinks hashes={intents?.destinationTxHashes ?? []} />}
      />
      {order.cryptoTxHash && (
        <DetailRow
          label="Legacy chain tx"
          value={<span className="font-mono text-xs">{order.cryptoTxHash}</span>}
        />
      )}
      <DetailRow label="Last update" value={dateTime(intents?.lastEventAt ?? null)} />
    </InfoCard>
  );
}

function OnchainCard({ order }: Readonly<{ order: IntentsOrderDetail }>) {
  const { status, record } = order.onchain;
  return (
    <InfoCard title="Guard contract record">
      {status === 'unavailable' && (
        <Alert className="mb-3">
          <AlertTriangle className="size-4" />
          <AlertTitle>NEAR RPC unavailable</AlertTitle>
          <AlertDescription>
            Could not read the guard contract. Reload to try again.
          </AlertDescription>
        </Alert>
      )}
      {status === 'not_registered' && (
        <p className="text-sm text-muted-foreground">
          Not registered on chain. The guard has no record for this payment
          {order.intents?.paymentId ? '' : ' (no checkout payment id yet)'}.
        </p>
      )}
      {record && (
        <>
          <DetailRow label="Received" value={baseUnitsUsdc(record.amountReceived)} />
          <DetailRow label="Refunded" value={baseUnitsUsdc(record.refunded)} />
          <DetailRow label="Reserved for refund" value={baseUnitsUsdc(record.reserved)} />
          <DetailRow
            label="Fulfilled on chain"
            value={
              <Badge variant={record.fulfilled ? 'default' : 'outline'}>
                {record.fulfilled ? 'Yes' : 'No'}
              </Badge>
            }
          />
          <DetailRow
            label="Refund destination"
            value={<span className="font-mono text-xs">{record.refundDestination}</span>}
          />
          <DetailRow
            label="Origin asset"
            value={<span className="font-mono text-xs">{record.originAsset}</span>}
          />
        </>
      )}
    </InfoCard>
  );
}

function EventRow({ event }: Readonly<{ event: IntentsEvent }>) {
  return (
    <li className="border-b border-border/60 py-3 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-xs">{event.type}</span>
        <span className="text-xs text-muted-foreground">
          {dateTime(event.occurredAt)}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
        <span>
          <span className="text-muted-foreground">Status </span>
          {event.status ?? '—'}
        </span>
        <span>
          <span className="text-muted-foreground">Deposited </span>
          {baseUnitsUsdc(event.depositedAmount)}
        </span>
        <span>
          <span className="text-muted-foreground">Settled </span>
          {baseUnitsUsdc(event.settledAmount)}
        </span>
        <span>
          <span className="text-muted-foreground">Refunded </span>
          {baseUnitsUsdc(event.refundedAmount)}
        </span>
      </div>
      {(event.originTxHashes.length > 0 || event.destinationTxHashes.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-6 text-xs">
          <span className="inline-flex items-start gap-2">
            <span className="text-muted-foreground">Origin</span>
            <TxHashLinks hashes={event.originTxHashes} />
          </span>
          <span className="inline-flex items-start gap-2">
            <span className="text-muted-foreground">NEAR</span>
            <TxHashLinks hashes={event.destinationTxHashes} />
          </span>
        </div>
      )}
    </li>
  );
}

function TimelineCard({ events }: Readonly<{ events: IntentsEvent[] }>) {
  return (
    <InfoCard title="Checkout webhooks">
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No webhooks received from the checkout service for this order.
        </p>
      ) : (
        <ol>
          {events.map((event, index) => (
            <EventRow key={`${event.type}-${event.occurredAt ?? index}`} event={event} />
          ))}
        </ol>
      )}
    </InfoCard>
  );
}

export default function IntentsOrderPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = use(params);
  const { data, isLoading, error } = useQuery({
    queryKey: ['intents', 'order', id],
    queryFn: () => getIntentsOrder(id),
  });

  if (error) throw error;
  if (isLoading || !data) return <IntentsOrderLoading />;

  return (
    <div className="space-y-4">
      <PageHeader
        title={`USDC order ${data.publicOrderRef ?? data.id.slice(0, 8)}`}
        description="NEAR Intents payment, checkout webhooks and the guard contract record."
        actions={
          <>
            <Button variant="ghost" size="sm" render={<Link href="/intents?tab=orders" />}>
              <ArrowLeft className="size-4" /> Back
            </Button>
            <Button variant="outline" size="sm" render={<Link href={`/orders/${data.id}`} />}>
              <ExternalLink className="size-4" /> Full order
            </Button>
          </>
        }
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <OrderCard order={data} />
        <CheckoutCard order={data} />
        <OnchainCard order={data} />
        <TimelineCard events={data.events} />
      </div>
    </div>
  );
}
