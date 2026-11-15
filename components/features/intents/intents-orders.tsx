'use client';

import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useQueryStates } from 'nuqs';

import { EmptyState } from '@/components/shared/empty-state';
import { PaginationControls } from '@/components/shared/pagination-controls';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getIntentsOrders } from '@/lib/api/intents';
import type { IntentsOrder } from '@/lib/types';

import { CheckoutStatusBadge } from './checkout-status-badge';
import { IntentsFilters, intentsListParsers } from './intents-filters';
import { TxHashLinks } from './intents-links';

const PAGE_SIZE = 20;
const SKELETON_ROW_KEYS = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6'];

const usdc = (value: string | null) => (value ? `${value} USDC` : '—');

function OrdersTable({ orders }: Readonly<{ orders: IntentsOrder[] }>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Order</th>
            <th className="px-3 py-2 font-medium">Customer</th>
            <th className="px-3 py-2 font-medium">Product</th>
            <th className="px-3 py-2 font-medium">Network</th>
            <th className="px-3 py-2 font-medium text-right">Asked</th>
            <th className="px-3 py-2 font-medium text-right">Received</th>
            <th className="px-3 py-2 font-medium">Checkout</th>
            <th className="px-3 py-2 font-medium">Order</th>
            <th className="px-3 py-2 font-medium text-right">Origin tx</th>
            <th className="px-3 py-2 font-medium text-right">NEAR tx</th>
            <th className="px-3 py-2 font-medium">Created</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-t border-border/60 align-middle">
              <td className="px-3 py-2 font-mono text-xs">
                {order.publicOrderRef ?? `${order.id.slice(0, 8)}…`}
              </td>
              <td className="px-3 py-2 font-mono text-xs">
                {order.whatsappNumber ?? '—'}
              </td>
              <td className="px-3 py-2">{order.productName ?? '—'}</td>
              <td className="px-3 py-2">{order.network ?? '—'}</td>
              <td className="px-3 py-2 text-right tabular-nums">
                {usdc(order.cryptoAmountUsdc)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {usdc(order.cryptoReceivedUsdc)}
              </td>
              <td className="px-3 py-2">
                <CheckoutStatusBadge status={order.intents?.checkoutStatus} />
              </td>
              <td className="px-3 py-2">
                <StatusBadge status={order.status} />
              </td>
              <td className="px-3 py-2 text-right">
                <TxHashLinks hashes={order.intents?.originTxHashes ?? []} />
              </td>
              <td className="px-3 py-2 text-right">
                <TxHashLinks hashes={order.intents?.destinationTxHashes ?? []} />
              </td>
              <td className="px-3 py-2 text-xs text-muted-foreground">
                {format(parseISO(order.createdAt), 'dd MMM, HH:mm')}
              </td>
              <td className="px-3 py-2 text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  render={<Link href={`/intents/${order.id}`} />}
                >
                  View
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OrdersSkeleton() {
  return (
    <div className="rounded-lg border border-border">
      {SKELETON_ROW_KEYS.map((k) => (
        <div
          key={k}
          className="flex items-center gap-3 border-b border-border/60 px-3 py-3 last:border-b-0"
        >
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

export function IntentsOrders() {
  const [state, setState] = useQueryStates(intentsListParsers, {
    shallow: false,
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [
      'intents',
      'orders',
      state.status,
      state.chain,
      state.orderId,
      state.from,
      state.to,
      state.page,
    ],
    queryFn: () =>
      getIntentsOrders({
        page: state.page,
        limit: PAGE_SIZE,
        status: state.status,
        chain: state.chain,
        orderId: state.orderId,
        from: state.from,
        to: state.to,
      }),
  });

  let body: React.ReactNode;
  if (isError) {
    body = (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-muted-foreground">
        <AlertCircle className="size-8" />
        <p>Failed to load USDC orders.</p>
        <Button variant="outline" size="sm" onClick={() => void refetch()}>
          <RefreshCw className="mr-2 size-4" /> Retry
        </Button>
      </div>
    );
  } else if (isLoading || !data) {
    body = <OrdersSkeleton />;
  } else if (data.data.length === 0) {
    body = (
      <EmptyState
        title="No USDC orders match these filters"
        message="Adjust the filters above or wait for a NEAR Intents payment."
      />
    );
  } else {
    body = <OrdersTable orders={data.data} />;
  }

  return (
    <div className="space-y-4">
      <IntentsFilters />
      {body}
      {data && data.data.length > 0 && (
        <PaginationControls
          page={state.page}
          limit={PAGE_SIZE}
          total={data.total}
          onPageChange={(page) => setState({ page })}
        />
      )}
    </div>
  );
}
