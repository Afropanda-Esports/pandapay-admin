'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, RefreshCw, ShoppingBag, Ticket, Users, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { OrdersChart } from '@/components/features/dashboard/orders-chart';
import { RevenueChart } from '@/components/features/dashboard/revenue-chart';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { RequirePermission } from '@/components/shared/require-permission';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/use-permissions';
import { createPurchase } from '@/lib/api/orders';
import { getProducts } from '@/lib/api/products';
import { getStats } from '@/lib/api/stats';
import { getUsers } from '@/lib/api/users';
import type { PaymentMode } from '@/lib/types';

const formatNgn = (n: number) => `₦${n.toLocaleString('en-NG')}`;
const formatCount = (n: number) => n.toLocaleString('en-NG');

function OperationsCard() {
  const queryClient = useQueryClient();
  const { role, can } = usePermissions();
  const canManageOrders = can('orders:manage');
  const [userId, setUserId] = useState<string>('');
  const [productId, setProductId] = useState<string>('');
  const [paymentMode, setPaymentMode] =
    useState<PaymentMode>('DIRECT_TRANSFER');
  const [markPaid, setMarkPaid] = useState<boolean>(true);
  const [autoFulfill, setAutoFulfill] = useState<boolean>(false);

  const usersQuery = useQuery({
    queryKey: ['dashboard-users'],
    queryFn: () => getUsers({ page: 1, limit: 100 }),
  });
  const productsQuery = useQuery({
    queryKey: ['dashboard-products'],
    queryFn: () => getProducts(),
  });

  const users = usersQuery.data?.data ?? [];
  const products = productsQuery.data ?? [];

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === productId) ?? null,
    [products, productId],
  );

  const purchaseMutation = useMutation({
    mutationFn: () =>
      createPurchase({
        userId,
        productId,
        paymentMode,
        markPaid,
        autoFulfill,
      }),
    onSuccess: ({ orderId }) => {
      toast.success(`Purchase created: ${orderId.slice(0, 8)}…`);
      void queryClient.invalidateQueries({ queryKey: ['stats'] });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Could not create purchase');
    },
  });

  return (
    <RequirePermission
      permission="orders:manage"
      role={role}
      showForbidden
      forbiddenTitle="Operations access required"
      forbiddenMessage="Your role cannot create or settle purchases from the dashboard."
    >
      <Card>
        <CardHeader>
          <CardTitle>Operations</CardTitle>
          <p className="text-sm text-muted-foreground">
            Create purchases end-to-end from admin: order, payment, and optional
            fulfillment.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div>
              <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                User
              </p>
              <Select value={userId || null} onValueChange={(v) => setUserId(v ?? '')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.displayName ?? u.whatsappNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                Product
              </p>
              <Select
                value={productId || null}
                onValueChange={(v) => setProductId(v ?? '')}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div>
              <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                Payment mode
              </p>
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
            </div>
            <div>
              <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                Payment status
              </p>
              <div className="flex gap-2">
                <Button
                  variant={markPaid ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMarkPaid(true)}
                  className="flex-1"
                >
                  Mark paid
                </Button>
                <Button
                  variant={!markPaid ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setMarkPaid(false);
                    setAutoFulfill(false);
                  }}
                  className="flex-1"
                >
                  Pending
                </Button>
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                Fulfillment
              </p>
              <div className="flex gap-2">
                <Button
                  variant={autoFulfill ? 'default' : 'outline'}
                  size="sm"
                  disabled={!markPaid}
                  onClick={() => setAutoFulfill(true)}
                  className="flex-1"
                >
                  Auto-fulfill
                </Button>
                <Button
                  variant={!autoFulfill ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAutoFulfill(false)}
                  className="flex-1"
                >
                  Hold
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
            {selectedProduct ? (
              <>Selected amount: ₦{Number(selectedProduct.snapshotNgnPrice).toLocaleString('en-NG')}</>
            ) : (
              'Select a product to see the amount that will be charged.'
            )}
          </div>

          <Button
            disabled={
              !canManageOrders ||
              !userId ||
              !productId ||
              purchaseMutation.isPending ||
              usersQuery.isLoading ||
              productsQuery.isLoading
            }
            onClick={() => purchaseMutation.mutate()}
          >
            {purchaseMutation.isPending ? 'Creating…' : 'Create purchase'}
          </Button>
        </CardContent>
      </Card>
    </RequirePermission>
  );
}

export default function DashboardPage() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['stats'],
    queryFn: getStats,
    refetchInterval: 30_000,
  });

  if (isError) {
    return (
      <div>
        <PageHeader title="Dashboard" description="Live metrics across PandaPay." />
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-muted-foreground">
          <AlertCircle className="size-8" />
          <p>Failed to load dashboard stats.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 size-4" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Live metrics across PandaPay."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Users}
          label="Total Users"
          value={data ? formatCount(data.users.total) : '—'}
          subtitle={
            data ? `+${formatCount(data.users.newLast7Days)} this week` : undefined
          }
          isLoading={isLoading}
        />
        <StatCard
          icon={Wallet}
          label="Total Revenue"
          value={data ? formatNgn(data.revenue.totalNgn) : '—'}
          subtitle={
            data ? `${formatNgn(data.revenue.last7DaysNgn)} this week` : undefined
          }
          isLoading={isLoading}
        />
        <StatCard
          icon={ShoppingBag}
          label="Fulfilled Orders"
          value={data ? formatCount(data.orders.fulfilled) : '—'}
          subtitle={
            data
              ? `${formatCount(data.orders.failed)} failed · ${formatCount(
                  data.orders.expired,
                )} expired`
              : undefined
          }
          isLoading={isLoading}
        />
        <StatCard
          icon={Ticket}
          label="Voucher Stock"
          value={data ? `${formatCount(data.vouchers.available)} available` : '—'}
          subtitle={
            data
              ? `${formatCount(data.vouchers.used)}/${formatCount(
                  data.vouchers.total,
                )} used`
              : undefined
          }
          isLoading={isLoading}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Orders by status</CardTitle>
          </CardHeader>
          <CardContent>
            {data ? (
              <OrdersChart orders={data.orders} />
            ) : (
              <Skeleton className="h-[240px] w-full" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {data ? (
              <RevenueChart revenue={data.revenue} />
            ) : (
              <Skeleton className="h-[240px] w-full" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <OperationsCard />
      </div>

      {isFetching && !isLoading && (
        <p className="mt-3 text-xs text-muted-foreground">Refreshing…</p>
      )}
    </div>
  );
}
