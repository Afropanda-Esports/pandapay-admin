'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { RefreshCw } from 'lucide-react';
import { ConfirmManualPaymentDialog } from '@/components/features/orders/confirm-manual-payment-dialog';
import { PageHeader } from '@/components/shared/page-header';
import { PaginationControls } from '@/components/shared/pagination-controls';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/use-permissions';
import { listManualPayments } from '@/lib/api/manual-payments';
import type { Order } from '@/lib/types';
import { useMe } from '@/hooks/use-me';
import { ManualPaymentSettingsCard } from '@/components/features/orders/manual-payment-settings-card';

const PAGE_SIZE = 20;

export default function ManualPaymentsPage() {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const canManage = usePermissions().can('orders:manage');
  const isSuperAdmin = useMe().data?.role === 'SUPER_ADMIN';
  const query = useQuery({ queryKey: ['manual-payments', page], queryFn: () => listManualPayments(page, PAGE_SIZE), refetchInterval: 30_000 });
  const rows = query.data?.data ?? [];
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['manual-payments'] });

  return <div className="space-y-6">
    <PageHeader title="Manual payments" description="Transfers awaiting verification in the platform bank account. Confirm only an exact, cleared credit." actions={<Button variant="outline" size="sm" onClick={() => query.refetch()}><RefreshCw className="mr-2 size-4" />Refresh</Button>} />
    {isSuperAdmin ? <ManualPaymentSettingsCard /> : null}
    {query.isLoading ? <Skeleton className="h-48 w-full" /> : query.isError ? <p className="text-sm text-destructive">Failed to load manual payments.</p> : rows.length === 0 ? <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No manual payments are awaiting verification.</CardContent></Card> : <>
      <ul className="space-y-4">{rows.map((order) => <ManualPaymentCard key={order.id} order={order} canManage={canManage} onConfirmed={refresh} />)}</ul>
      {query.data && query.data.total > PAGE_SIZE ? <PaginationControls page={page} limit={PAGE_SIZE} total={query.data.total} onPageChange={setPage} /> : null}
    </>}
  </div>;
}

function ManualPaymentCard({ order, canManage, onConfirmed }: Readonly<{ order: Order; canManage: boolean; onConfirmed: () => void }>) {
  const expired = order.expiresAt ? new Date(order.expiresAt) <= new Date() : false;
  return <Card>
    <CardHeader className="flex flex-row items-start justify-between gap-4">
      <div><CardTitle className="text-base">{order.product?.name ?? 'Product'}</CardTitle><p className="text-sm text-muted-foreground">Created {format(parseISO(order.createdAt), 'PPpp')}</p></div>
      <span className={expired ? 'text-sm font-medium text-destructive' : 'text-sm text-muted-foreground'}>{expired ? 'Expired' : order.expiresAt ? `Expires ${format(parseISO(order.expiresAt), 'PPpp')}` : 'Pending'}</span>
    </CardHeader>
    <CardContent className="space-y-3 text-sm">
      <p className="text-lg font-semibold">₦{Number(order.amount).toLocaleString('en-NG', { maximumFractionDigits: 2 })}</p>
      <p>{order.user?.displayName ?? 'Customer'} · {order.user?.whatsappNumber}</p>
      <Button variant="link" size="sm" render={<Link href={`/orders/${order.id}`} />} className="h-auto px-0 font-mono text-xs">Order {order.id}</Button>
      {canManage && !expired ? <ConfirmManualPaymentDialog orderId={order.id} amount={order.amount} onConfirmed={onConfirmed} trigger={<Button size="sm">Verify and confirm</Button>} /> : null}
    </CardContent>
  </Card>;
}
