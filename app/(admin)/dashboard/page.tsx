'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertCircle, RefreshCw, ShoppingBag, Ticket, Users, Wallet } from 'lucide-react';

import { OrdersChart } from '@/components/features/dashboard/orders-chart';
import { RevenueChart } from '@/components/features/dashboard/revenue-chart';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getStats } from '@/lib/api/stats';

const formatNgn = (n: number) => `₦${n.toLocaleString('en-NG')}`;
const formatCount = (n: number) => n.toLocaleString('en-NG');

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

      {isFetching && !isLoading && (
        <p className="mt-3 text-xs text-muted-foreground">Refreshing…</p>
      )}
    </div>
  );
}
