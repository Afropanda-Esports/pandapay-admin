'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { RefreshCw } from 'lucide-react';
import { ConfirmManualPaymentDialog } from '@/components/features/orders/confirm-manual-payment-dialog';
import { PageHeader } from '@/components/shared/page-header';
import { PaginationControls } from '@/components/shared/pagination-controls';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/use-permissions';
import { listManualPayments, retryManualSettlement, type ManualPaymentQueueRow } from '@/lib/api/manual-payments';
import { useMe } from '@/hooks/use-me';
import { ManualPaymentSettingsCard } from '@/components/features/orders/manual-payment-settings-card';

const PAGE_SIZE = 20;

export default function ManualPaymentsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [rail, setRail] = useState('');
  const queryClient = useQueryClient();
  const canManage = usePermissions().can('orders:manage');
  const isSuperAdmin = useMe().data?.role === 'SUPER_ADMIN';
  const query = useQuery({ queryKey: ['manual-payments', page, status, rail], queryFn: () => listManualPayments(page, PAGE_SIZE, { status: status || undefined, settlement: rail || undefined }), refetchInterval: 30_000 });
  const rows = query.data?.data ?? [];
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['manual-payments'] });

  return <div className="space-y-6">
    <PageHeader title="Manual payments" description="Transfers awaiting verification in the platform bank account. Confirm only an exact, cleared credit." actions={<Button variant="outline" size="sm" onClick={() => query.refetch()}><RefreshCw className="mr-2 size-4" />Refresh</Button>} />
    {isSuperAdmin ? <ManualPaymentSettingsCard /> : null}
    <div className="flex flex-wrap gap-3"><select className="rounded-md border bg-background px-3 py-2 text-sm" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">All states</option>{['AWAITING','REPORTED','UNDER_REVIEW','NEEDS_ACTION','CONFIRMED','REJECTED','EXPIRED'].map((value) => <option key={value}>{value}</option>)}</select><select className="rounded-md border bg-background px-3 py-2 text-sm" value={rail} onChange={(event) => { setRail(event.target.value); setPage(1); }}><option value="">All rails</option><option>MANUAL_BANK_TRANSFER</option></select></div>
    {query.isLoading ? <Skeleton className="h-48 w-full" /> : query.isError ? <p className="text-sm text-destructive">Failed to load manual payments.</p> : rows.length === 0 ? <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No manual payments match these filters.</CardContent></Card> : <>
      <ul className="space-y-4">{rows.map((order) => <ManualPaymentCard key={order.orderRef} order={order} canManage={canManage} onConfirmed={refresh} />)}</ul>
      {query.data && query.data.total > PAGE_SIZE ? <PaginationControls page={page} limit={PAGE_SIZE} total={query.data.total} onPageChange={setPage} /> : null}
    </>}
  </div>;
}

function ManualPaymentCard({ order, canManage, onConfirmed }: Readonly<{ order: ManualPaymentQueueRow; canManage: boolean; onConfirmed: () => void }>) {
  const expired = order.expiresAt ? new Date(order.expiresAt) <= new Date() : false;
  const retry = useMutation({ mutationFn: () => retryManualSettlement(order.orderRef), onSuccess: onConfirmed });
  return <Card>
    <CardHeader className="flex flex-row items-start justify-between gap-4">
      <div><CardTitle className="text-base">{order.productName}</CardTitle><p className="text-sm text-muted-foreground">{order.orderRef} · {order.settlement} · {order.attemptStatus}</p></div>
      <span className={expired ? 'text-sm font-medium text-destructive' : 'text-sm text-muted-foreground'}>{order.expiresAt ? `Expires ${format(parseISO(order.expiresAt), 'PPpp')}` : 'Pending'}</span>
    </CardHeader>
    <CardContent className="space-y-3 text-sm">
      <p className="text-lg font-semibold">₦{Number(order.netReceived).toLocaleString('en-NG')} / ₦{Number(order.expectedAmount).toLocaleString('en-NG')}</p>
      <p>{order.customerPhone ?? 'Customer'}{order.bankReference ? ` · Ref ${order.bankReference}` : ''}</p>
      <div className="flex gap-2">{canManage && !expired ? <ConfirmManualPaymentDialog orderId={order.orderRef} amount={order.expectedAmount} onConfirmed={onConfirmed} trigger={<Button size="sm">Verify / record credit</Button>} /> : null}{canManage && order.paymentCount > 0 ? <Button size="sm" variant="outline" disabled={retry.isPending} onClick={() => retry.mutate()}>Retry settlement</Button> : null}</div>
    </CardContent>
  </Card>;
}
