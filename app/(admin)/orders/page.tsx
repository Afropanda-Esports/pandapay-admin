'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import {
  AlertCircle,
  ArrowLeftRight,
  RefreshCw,
  Send,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { useQueryStates } from 'nuqs';
import { Suspense } from 'react';
import { toast } from 'sonner';

import {
  OrderFilters,
  orderListParsers,
} from '@/components/features/orders/order-filters';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { PaginationControls } from '@/components/shared/pagination-controls';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ApiError } from '@/lib/api/client';
import { getOrders, resendOrder } from '@/lib/api/orders';
import type { Order, PaginatedResponse, PaymentMode } from '@/lib/types';

const PAGE_SIZE = 20;
const SKELETON_ROW_KEYS = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8'];

const formatAmount = (raw: string) => {
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n)) return raw;
  return `₦${n.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
};

function PaymentModeBadge({ mode }: Readonly<{ mode: PaymentMode }>) {
  const isWallet = mode === 'WALLET';
  const Icon = isWallet ? Wallet : ArrowLeftRight;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <Icon className="size-3.5" />
      {isWallet ? 'Wallet' : 'Transfer'}
    </span>
  );
}

function TruncatedId({ id }: Readonly<{ id: string }>) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className="cursor-help font-mono text-xs">
            {id.slice(0, 8)}…
          </span>
        }
      />
      <TooltipContent>{id}</TooltipContent>
    </Tooltip>
  );
}

function OrderDate({ iso }: Readonly<{ iso: string }>) {
  const d = parseISO(iso);
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className="cursor-help text-xs text-muted-foreground">
            {formatDistanceToNow(d, { addSuffix: true })}
          </span>
        }
      />
      <TooltipContent>{format(d, 'PPpp')}</TooltipContent>
    </Tooltip>
  );
}

function ResendCell({ order }: Readonly<{ order: Order }>) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => resendOrder(order.id),
    onSuccess: () => {
      toast.success('Voucher resent via WhatsApp');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (err) => {
      const message =
        err instanceof ApiError ? err.message : 'Failed to resend voucher';
      toast.error(message);
    },
  });

  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="sm" disabled={mutation.isPending}>
          <Send className="size-3.5" />
          Resend
        </Button>
      }
      title="Resend voucher?"
      description="Re-deliver the voucher code to the customer via WhatsApp. The original code is reused."
      confirmLabel="Resend"
      isPending={mutation.isPending}
      onConfirm={async () => {
        await mutation.mutateAsync();
      }}
    />
  );
}

interface OrdersTableProps {
  orders: Order[];
}

function OrdersTable({ orders }: Readonly<OrdersTableProps>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Order</th>
            <th className="px-3 py-2 font-medium">User</th>
            <th className="px-3 py-2 font-medium">Product</th>
            <th className="px-3 py-2 font-medium">Amount</th>
            <th className="px-3 py-2 font-medium">Mode</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Date</th>
            <th className="px-3 py-2 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr
              key={order.id}
              className="border-t border-border/60 align-middle"
            >
              <td className="px-3 py-2">
                <TruncatedId id={order.id} />
              </td>
              <td className="px-3 py-2">
                {order.user ? (
                  <span className="font-mono text-xs">
                    {order.user.whatsappNumber}
                  </span>
                ) : (
                  <TruncatedId id={order.userId} />
                )}
              </td>
              <td className="px-3 py-2">{order.product?.name ?? '—'}</td>
              <td className="px-3 py-2 tabular-nums">
                {formatAmount(order.amount)}
              </td>
              <td className="px-3 py-2">
                <PaymentModeBadge mode={order.paymentMode} />
              </td>
              <td className="px-3 py-2">
                <StatusBadge status={order.status} />
              </td>
              <td className="px-3 py-2">
                <OrderDate iso={order.createdAt} />
              </td>
              <td className="px-3 py-2 text-right">
                <div className="inline-flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    render={<Link href={`/orders/${order.id}`} />}
                  >
                    View
                  </Button>
                  {order.status === 'FULFILLED' && (
                    <ResendCell order={order} />
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OrdersTableSkeleton() {
  return (
    <div className="rounded-lg border border-border">
      {SKELETON_ROW_KEYS.map((k) => (
        <div
          key={k}
          className="flex items-center gap-3 border-b border-border/60 px-3 py-3 last:border-b-0"
        >
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-16" />
        </div>
      ))}
    </div>
  );
}

interface OrdersBodyProps {
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  data: PaginatedResponse<Order> | undefined;
}

function OrdersBody({ isLoading, isError, refetch, data }: Readonly<OrdersBodyProps>) {
  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-muted-foreground">
        <AlertCircle className="size-8" />
        <p>Failed to load orders.</p>
        <Button variant="outline" size="sm" onClick={refetch}>
          <RefreshCw className="mr-2 size-4" /> Retry
        </Button>
      </div>
    );
  }
  if (isLoading || !data) return <OrdersTableSkeleton />;
  if (data.data.length === 0) {
    return (
      <EmptyState
        title="No orders match these filters"
        message="Adjust the filters above or wait for new activity."
      />
    );
  }
  return <OrdersTable orders={data.data} />;
}

function OrdersContent() {
  const [state, setState] = useQueryStates(orderListParsers, {
    shallow: false,
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [
      'orders',
      state.status,
      state.userId,
      state.from,
      state.to,
      state.page,
    ],
    queryFn: () =>
      getOrders({
        page: state.page,
        limit: PAGE_SIZE,
        status: state.status ?? undefined,
        userId: state.userId ?? undefined,
        from: state.from ?? undefined,
        to: state.to ?? undefined,
      }),
  });

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Search, filter, and resend customer orders."
      />

      <div className="mb-4">
        <OrderFilters />
      </div>

      <OrdersBody
        isLoading={isLoading}
        isError={isError}
        refetch={refetch}
        data={data}
      />

      {data && data.data.length > 0 && (
        <div className="mt-4">
          <PaginationControls
            page={state.page}
            limit={PAGE_SIZE}
            total={data.total}
            onPageChange={(page) => setState({ page })}
          />
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense
      fallback={
        <div>
          <PageHeader
            title="Orders"
            description="Search, filter, and resend customer orders."
          />
          <OrdersTableSkeleton />
        </div>
      }
    >
      <OrdersContent />
    </Suspense>
  );
}
