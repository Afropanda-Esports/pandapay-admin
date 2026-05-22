'use client';

import { useQuery } from '@tanstack/react-query';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import {
  AlertCircle,
  ArrowLeft,
  ArrowLeftRight,
  RefreshCw,
  User as UserIcon,
  Wallet,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import { use, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useMe } from '@/hooks/use-me';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

import { PinStatusCard } from '@/components/features/users/pin-status-card';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
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
import { getUser, getTransactions, creditWallet } from '@/lib/api/users';
import type { Order, PaymentMode, UserDetail } from '@/lib/types';

const PAYMENT_MODE_LABEL: Record<PaymentMode, string> = {
  WALLET: 'Wallet',
  DIRECT_TRANSFER: 'Transfer',
};

const formatAmount = (raw: string) => {
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n)) return raw;
  return `₦${n.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
};

const formatBalance = (n: number) =>
  `₦${n.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;

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
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-1.5 tabular-nums text-2xl font-bold">
            <Wallet className="size-6 text-muted-foreground" />
            {formatBalance(user.walletBalance)}
          </div>
          <CreditWalletDialog userId={user.id} />
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
            label="Funding Account"
            value={`${user.virtualAccount.accountNumber} (${user.virtualAccount.bankName})`}
          />
        ) : (
          <DetailRow
            label="Funding Account"
            value={<span className="text-muted-foreground">Not set up</span>}
          />
        )}
      </CardContent>
    </Card>
  );
}

function CreditWalletDialog({ userId }: Readonly<{ userId: string }>) {
  const { data: me } = useMe();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const mutation = useMutation({
    mutationFn: () => creditWallet(userId, { amount: Number(amount), note }),
    onSuccess: () => {
      toast.success(`Wallet credited · ${formatAmount(amount)}`);
      setOpen(false);
      setAmount('');
      setNote('');
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
      queryClient.invalidateQueries({ queryKey: ['user-transactions', userId] });
    },
    onError: (error) => {
      toast.error('Failed to credit wallet', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    },
  });

  if (me?.role !== 'SUPER_ADMIN') return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="secondary">
            <Plus className="mr-2 size-4" />
            Credit wallet
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Credit Wallet</DialogTitle>
          <DialogDescription>
            Manually add funds to this user&apos;s wallet. This action will be audited.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="amount">Amount (₦)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="note">Note (Internal)</Label>
            <Input
              id="note"
              placeholder="e.g. Refund for failed order"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!amount || Number(amount) <= 0 || mutation.isPending}
          >
            {mutation.isPending ? 'Processing...' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PaymentModeBadge({ mode }: Readonly<{ mode: PaymentMode }>) {
  const Icon = mode === 'WALLET' ? Wallet : ArrowLeftRight;
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

function WalletLedgerCard({ userId }: Readonly<{ userId: string }>) {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['user-transactions', userId, page],
    queryFn: () => getTransactions(userId, page),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Wallet Ledger</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : isError ? (
          <div className="text-sm text-destructive">Failed to load transactions</div>
        ) : !data || data.data.length === 0 ? (
          <EmptyState
            title="No transactions"
            message="This wallet has no ledger history."
            className="py-10"
          />
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2 font-medium">Date</th>
                    <th className="px-2 py-2 font-medium">Type</th>
                    <th className="px-2 py-2 font-medium">Amount</th>
                    <th className="px-2 py-2 font-medium">Reference</th>
                    <th className="px-2 py-2 font-medium">Order</th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((tx) => (
                    <tr
                      key={tx.id}
                      className="border-t border-border/60 align-middle"
                    >
                      <td className="px-2 py-2 text-xs text-muted-foreground">
                        {format(parseISO(tx.createdAt), 'PPpp')}
                      </td>
                      <td className="px-2 py-2">
                        <Badge variant={tx.type === 'CREDIT' ? 'default' : 'secondary'} className="text-[10px]">
                          {tx.type}
                        </Badge>
                      </td>
                      <td className="px-2 py-2 tabular-nums">
                        {formatAmount(tx.amount.toString())}
                      </td>
                      <td className="px-2 py-2 font-mono text-xs text-muted-foreground">
                        {tx.reference}
                      </td>
                      <td className="px-2 py-2">
                        {tx.orderId ? (
                          <Button
                            variant="link"
                            className="h-auto p-0 font-mono text-xs"
                            render={<Link href={`/orders/${tx.orderId}`} />}
                          >
                            {tx.orderId.slice(0, 8)}…
                          </Button>
                        ) : (
                          '—'
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
                    onClick={() => setPage(p => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page * data.limit >= data.total}
                    onClick={() => setPage(p => p + 1)}
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
        <WalletLedgerCard userId={user.id} />
      </div>
    </div>
  );
}
