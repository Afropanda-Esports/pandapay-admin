'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import {
  AlertCircle,
  CheckCircle2,
  Filter,
  RefreshCw,
  Send,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { RecordRefundDialog } from '@/components/features/orders/record-refund-dialog';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { PaginationControls } from '@/components/shared/pagination-controls';
import { RequirePermission } from '@/components/shared/require-permission';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/use-permissions';
import { ApiError } from '@/lib/api/client';
import {
  createPurchase,
  fulfillOrder,
  getOrders,
  refundOrder,
  resendOrder,
  retryOrder,
} from '@/lib/api/orders';
import { getProducts } from '@/lib/api/products';
import { getUsers } from '@/lib/api/users';
import type { Order, OrderStatus, PaymentMode } from '@/lib/types';

const PAGE_SIZE = 20;

const STATUS_OPTIONS: Array<OrderStatus | 'ALL'> = [
  'ALL',
  'PENDING',
  'PAID',
  'FULFILLED',
  'FAILED',
  'EXPIRED',
];

function formatAmount(raw: string) {
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n)) return raw;
  return `₦${n.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
}

export default function TransactionsPage() {
  const queryClient = useQueryClient();
  const { role, can } = usePermissions();

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<OrderStatus | 'ALL'>('ALL');

  const [userId, setUserId] = useState('');
  const [productId, setProductId] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('DIRECT_TRANSFER');
  const [markPaid, setMarkPaid] = useState(true);
  const [autoFulfill, setAutoFulfill] = useState(false);

  const ordersQuery = useQuery({
    queryKey: ['transactions', page, status],
    queryFn: () =>
      getOrders({
        page,
        limit: PAGE_SIZE,
        status: status === 'ALL' ? undefined : status,
      }),
  });

  const usersQuery = useQuery({
    queryKey: ['transactions-users'],
    queryFn: () => getUsers({ page: 1, limit: 100 }),
  });
  const productsQuery = useQuery({
    queryKey: ['transactions-products'],
    queryFn: () => getProducts(),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createPurchase({
        userId,
        productId,
        paymentMode,
        markPaid,
        autoFulfill,
      }),
    onSuccess: ({ orderId }) => {
      toast.success(`Transaction created (${orderId.slice(0, 8)}…)`);
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['stats'] });
      setPage(1);
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Could not create transaction'),
  });

  const fulfillMutation = useMutation({
    mutationFn: (id: string) => fulfillOrder(id),
    onSuccess: () => {
      toast.success('Order fulfilled');
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Could not fulfill order'),
  });

  const resendMutation = useMutation({
    mutationFn: (id: string) => resendOrder(id),
    onSuccess: () => toast.success('Voucher resent'),
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : 'Could not resend voucher'),
  });

  const refundMutation = useMutation({
    mutationFn: (args: {
      id: string;
      refundChannel: string;
      externalReference?: string;
      note?: string;
    }) =>
      refundOrder(args.id, {
        refundChannel: args.refundChannel,
        externalReference: args.externalReference,
        note: args.note,
      }),
    onSuccess: ({ reference }) => {
      toast.success(`Refund recorded (${reference})`);
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
      void queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: (err) => {
      const message =
        err instanceof ApiError ? err.message : 'Could not process refund';
      toast.error(message);
    },
  });

  const retryMutation = useMutation({
    mutationFn: (id: string) => retryOrder(id),
    onSuccess: ({ orderId }) => {
      toast.success(`Retry order created (${orderId.slice(0, 8)}…)`);
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (err) => {
      const message =
        err instanceof ApiError ? err.message : 'Could not retry order';
      toast.error(message);
    },
  });

  const rows = ordersQuery.data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        description="Run purchase operations end-to-end and monitor outcomes."
      />

      <RequirePermission
        permission="orders:manage"
        role={role}
        showForbidden
        forbiddenTitle="Order operations restricted"
        forbiddenMessage="Your role cannot create transactions."
      >
        <Card>
          <CardHeader>
            <CardTitle>Create Transaction</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <Select value={userId || null} onValueChange={(v) => setUserId(v ?? '')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {(usersQuery.data?.data ?? []).map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.displayName ?? u.whatsappNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={productId || null}
                onValueChange={(v) => setProductId(v ?? '')}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {(productsQuery.data ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              <Select
                value={paymentMode}
                onValueChange={(v) => setPaymentMode((v as PaymentMode) ?? 'DIRECT_TRANSFER')}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DIRECT_TRANSFER">Bank transfer</SelectItem>
                  <SelectItem value="CRYPTO">USDC (crypto)</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant={markPaid ? 'default' : 'outline'}
                onClick={() => setMarkPaid((s) => !s)}
              >
                {markPaid ? <CheckCircle2 className="size-4" /> : null}
                {markPaid ? 'Marked paid' : 'Leave pending'}
              </Button>
              <Button
                variant={autoFulfill ? 'default' : 'outline'}
                disabled={!markPaid}
                onClick={() => setAutoFulfill((s) => !s)}
              >
                {autoFulfill ? 'Auto-fulfill ON' : 'Auto-fulfill OFF'}
              </Button>
            </div>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={
                !can('orders:manage') ||
                !userId ||
                !productId ||
                createMutation.isPending
              }
            >
              {createMutation.isPending ? 'Creating…' : 'Create transaction'}
            </Button>
          </CardContent>
        </Card>
      </RequirePermission>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Transactions</CardTitle>
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-muted-foreground" />
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus((v as OrderStatus | 'ALL') ?? 'ALL');
                setPage(1);
              }}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === 'ALL' ? 'All statuses' : s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => ordersQuery.refetch()}>
              <RefreshCw className="mr-2 size-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {ordersQuery.isError ? (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <AlertCircle className="size-7" />
              <p>Could not load transactions.</p>
            </div>
          ) : ordersQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              title="No transactions"
              message="Create one from the form above or adjust filters."
            />
          ) : (
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
                    <th className="px-3 py-2 font-medium">Created</th>
                    <th className="px-3 py-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((order: Order) => (
                    <tr key={order.id} className="border-t border-border/60">
                      <td className="px-3 py-2 font-mono text-xs">{order.id.slice(0, 8)}…</td>
                      <td className="px-3 py-2">{order.user?.displayName ?? order.user?.whatsappNumber ?? '—'}</td>
                      <td className="px-3 py-2">{order.product?.name ?? '—'}</td>
                      <td className="px-3 py-2">{formatAmount(order.amount)}</td>
                      <td className="px-3 py-2">{order.paymentMode}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline">{order.status}</Badge>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {format(parseISO(order.createdAt), 'PPp')}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex items-center gap-1">
                          {order.status === 'PAID' ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => fulfillMutation.mutate(order.id)}
                              disabled={fulfillMutation.isPending}
                            >
                              Fulfill
                            </Button>
                          ) : null}
                          {order.status === 'FULFILLED' ? (
                            <ConfirmDialog
                              trigger={
                                <Button size="sm" variant="ghost" disabled={resendMutation.isPending}>
                                  <Send className="size-3.5" />
                                  Resend
                                </Button>
                              }
                              title="Resend voucher?"
                              description="Re-deliver the voucher to the customer on WhatsApp."
                              confirmLabel="Resend"
                              onConfirm={async () => {
                                await resendMutation.mutateAsync(order.id);
                              }}
                            />
                          ) : null}
                          {(order.status === 'PAID' || order.status === 'FULFILLED') && can('orders:manage') ? (
                            <RecordRefundDialog
                              orderSummary={`${order.product?.name ?? 'Order'} · ${formatAmount(order.amount)}`}
                              isPending={refundMutation.isPending}
                              trigger={
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={refundMutation.isPending}
                                >
                                  Refund
                                </Button>
                              }
                              onSubmit={async (payload) => {
                                await refundMutation.mutateAsync({
                                  id: order.id,
                                  refundChannel: payload.refundChannel,
                                  externalReference: payload.externalReference,
                                  note: payload.note,
                                });
                              }}
                            />
                          ) : null}
                          {(order.status === 'FAILED' || order.status === 'EXPIRED') && can('orders:manage') ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={retryMutation.isPending}
                              onClick={() => retryMutation.mutate(order.id)}
                            >
                              Retry
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {ordersQuery.data && ordersQuery.data.total > PAGE_SIZE ? (
            <div className="mt-4">
              <PaginationControls
                page={page}
                total={ordersQuery.data.total}
                limit={PAGE_SIZE}
                onPageChange={setPage}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

