'use client';

import { useQuery } from '@tanstack/react-query';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import {
  AlertCircle,
  ArrowLeft,
  ArrowLeftRight,
  RefreshCw,
  User as UserIcon,
} from 'lucide-react';
import Link from 'next/link';
import { use, useState } from 'react';
import { PinStatusCard } from '@/components/features/users/pin-status-card';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getUser, getUserPayments } from '@/lib/api/users';
import type { Order, PaymentMode, UserDetail } from '@/lib/types';

const PAYMENT_MODE_LABEL: Record<PaymentMode, string> = {
  WALLET: 'Wallet',
  DIRECT_TRANSFER: 'Bank transfer',
  CRYPTO: 'USDC (crypto)',
};

const formatAmount = (raw: string) => {
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n)) return raw;
  return `₦${n.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
};

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

function ProfileCard({ user }: Readonly<{ user: UserDetail }>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <UserIcon className="size-4" />
          Profile
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Orders
            </p>
            <p className="text-2xl font-bold tabular-nums">{user.orderCount}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Payments
            </p>
            <p className="text-2xl font-bold tabular-nums">{user.paymentCount}</p>
          </div>
        </div>
        <DetailRow
          label="User ID"
          value={<span className="font-mono text-xs">{user.id}</span>}
        />
        <DetailRow
          label="Display Name"
          value={user.displayName ?? '—'}
        />
        <DetailRow
          label="WhatsApp"
          value={<span className="font-mono">{user.whatsappNumber}</span>}
        />
        <DetailRow
          label="Joined"
          value={format(parseISO(user.createdAt), 'PPP')}
        />
        {user.virtualAccount ? (
          <DetailRow
            label="Bank account (orders)"
            value={`${user.virtualAccount.accountNumber} (${user.virtualAccount.bankName})`}
          />
        ) : (
          <DetailRow
            label="Bank account (orders)"
            value={<span className="text-muted-foreground">Created on first order</span>}
          />
        )}
      </CardContent>
    </Card>
  );
}

const PAYMENT_METHOD_LABEL: Record<
  import('@/lib/types').PaymentMethod,
  string
> = {
  DEDICATED_NUBAN: 'Bank transfer',
  BANK_TRANSFER: 'Bank transfer',
  WALLET: 'Wallet',
  REFUND: 'Refund',
};

function PaymentModeBadge({ mode }: Readonly<{ mode: PaymentMode }>) {
  const Icon = ArrowLeftRight;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <Icon className="size-3.5" />
      {PAYMENT_MODE_LABEL[mode]}
    </span>
  );
}

function RecentOrdersCard({ orders }: Readonly<{ orders: Order[] }>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Recent Orders</CardTitle>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <EmptyState
            title="No orders yet"
            message="This user hasn't placed any orders."
            className="py-10"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-2 py-2 font-medium">Order</th>
                  <th className="px-2 py-2 font-medium">Product</th>
                  <th className="px-2 py-2 font-medium">Amount</th>
                  <th className="px-2 py-2 font-medium">Mode</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="px-2 py-2 font-medium">Date</th>
                  <th className="px-2 py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-t border-border/60 align-middle"
                  >
                    <td className="px-2 py-2">
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <span className="cursor-help font-mono text-xs">
                              {order.id.slice(0, 8)}…
                            </span>
                          }
                        />
                        <TooltipContent>{order.id}</TooltipContent>
                      </Tooltip>
                    </td>
                    <td className="px-2 py-2">{order.product?.name ?? '—'}</td>
                    <td className="px-2 py-2 tabular-nums">
                      {formatAmount(order.amount)}
                    </td>
                    <td className="px-2 py-2">
                      <PaymentModeBadge mode={order.paymentMode} />
                    </td>
                    <td className="px-2 py-2">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-2 py-2 text-xs text-muted-foreground">
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <span className="cursor-help">
                              {formatDistanceToNow(parseISO(order.createdAt), {
                                addSuffix: true,
                              })}
                            </span>
                          }
                        />
                        <TooltipContent>
                          {format(parseISO(order.createdAt), 'PPpp')}
                        </TooltipContent>
                      </Tooltip>
                    </td>
                    <td className="px-2 py-2 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        render={<Link href={`/orders/${order.id}`} />}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PaymentHistoryCard({ userId }: Readonly<{ userId: string }>) {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['user-payments', userId, page],
    queryFn: () => getUserPayments(userId, page),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Payment history</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : isError ? (
          <div className="text-sm text-destructive">Failed to load payments</div>
        ) : !data || data.data.length === 0 ? (
          <EmptyState
            title="No payments"
            message="Bank transfers and refunds for this user will appear here."
            className="py-10"
          />
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2 font-medium">Date</th>
                    <th className="px-2 py-2 font-medium">Method</th>
                    <th className="px-2 py-2 font-medium">Amount</th>
                    <th className="px-2 py-2 font-medium">Reference</th>
                    <th className="px-2 py-2 font-medium">Order</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((payment) => (
                    <tr
                      key={payment.id}
                      className="border-t border-border/60 align-middle"
                    >
                      <td className="px-2 py-2 text-xs text-muted-foreground">
                        {format(parseISO(payment.confirmedAt), 'PPpp')}
                      </td>
                      <td className="px-2 py-2">
                        <Badge
                          variant={
                            payment.method === 'REFUND' ? 'secondary' : 'default'
                          }
                          className="text-[10px]"
                        >
                          {PAYMENT_METHOD_LABEL[payment.method]}
                        </Badge>
                      </td>
                      <td className="px-2 py-2 tabular-nums">
                        {formatAmount(payment.amount.toString())}
                      </td>
                      <td className="px-2 py-2 font-mono text-xs text-muted-foreground">
                        {payment.providerRef}
                      </td>
                      <td className="px-2 py-2">
                        {payment.orderId ? (
                          <Button
                            variant="link"
                            className="h-auto p-0 font-mono text-xs"
                            render={<Link href={`/orders/${payment.orderId}`} />}
                          >
                            {payment.orderId.slice(0, 8)}…
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Unmatched</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data.total > data.limit && (
              <div className="flex items-center justify-between border-t border-border/60 pt-4 text-sm text-muted-foreground">
                <p>
                  Showing {(page - 1) * data.limit + 1} to{' '}
                  {Math.min(page * data.limit, data.total)} of {data.total}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page * data.limit >= data.total}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {['profile', 'pin'].map((k) => (
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
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-2">
          {['o1', 'o2', 'o3'].map((k) => (
            <Skeleton key={k} className="h-8 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function UserDetailPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = use(params);

  const { data: user, isLoading, isError, refetch } = useQuery({
    queryKey: ['user', id],
    queryFn: () => getUser(id),
  });

  const backLink = (
    <Button variant="ghost" size="sm" render={<Link href="/users" />}>
      <ArrowLeft className="size-4" />
      Back to users
    </Button>
  );

  if (isError) {
    return (
      <div>
        <PageHeader title="User" actions={backLink} />
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-muted-foreground">
          <AlertCircle className="size-8" />
          <p>Failed to load user.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 size-4" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading || !user) {
    return (
      <div>
        <PageHeader title="User" actions={backLink} />
        <DetailSkeleton />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={user.displayName ?? user.whatsappNumber}
        description={
          user.displayName
            ? user.whatsappNumber
            : `Joined ${format(parseISO(user.createdAt), 'PPP')}`
        }
        actions={backLink}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ProfileCard user={user} />
        <PinStatusCard userId={user.id} pinStatus={user.pinStatus} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RecentOrdersCard orders={user.recentOrders} />
        <PaymentHistoryCard userId={user.id} />
      </div>
    </div>
  );
}
