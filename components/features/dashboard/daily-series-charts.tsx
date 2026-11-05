'use client';

import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import {
  chartGridStroke,
  chartTick,
  chartTooltipStyle,
} from '@/components/features/analytics/chart-style';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatAnalyticsDay } from '@/lib/analytics-date';
import { getStatsSeries } from '@/lib/api/stats-series';
import type { AnalyticsDayWindow, StatsSeries } from '@/lib/types';

const WINDOWS: AnalyticsDayWindow[] = [7, 14, 30];

function displayNgn(raw: string): string {
  const [whole, frac = '00'] = raw.split('.');
  return `₦${Number(whole).toLocaleString('en-NG')}.${frac}`;
}

function WindowControl({
  days,
  onChange,
}: Readonly<{
  days: AnalyticsDayWindow;
  onChange: (days: AnalyticsDayWindow) => void;
}>) {
  return (
    <div className="flex gap-2">
      {WINDOWS.map((window) => (
        <Button
          key={window}
          size="sm"
          variant={days === window ? 'default' : 'outline'}
          onClick={() => onChange(window)}
        >
          {window} days
        </Button>
      ))}
    </div>
  );
}

function SeriesBody({ series }: Readonly<{ series: StatsSeries }>) {
  const revenue = series.buckets.map((bucket) => ({
    date: bucket.date,
    label: formatAnalyticsDay(bucket.date),
    revenue: Number(bucket.revenueNgn),
    revenueNgn: bucket.revenueNgn,
  }));
  const orders = series.buckets.map((bucket) => ({
    date: bucket.date,
    label: formatAnalyticsDay(bucket.date),
    ordersCreated: bucket.ordersCreated,
    ordersFulfilled: bucket.ordersFulfilled,
  }));

  return (
    <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Daily revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={revenue}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke={chartGridStroke}
              />
              <XAxis
                dataKey="label"
                tick={chartTick}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={chartTick}
                axisLine={false}
                tickLine={false}
                width={56}
              />
              <Tooltip
                contentStyle={chartTooltipStyle}
                formatter={(_value, _name, item) => {
                  const raw = (item.payload as { revenueNgn?: string })
                    .revenueNgn;
                  return [raw ? displayNgn(raw) : '—', 'Revenue'];
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke="var(--color-primary-500)"
                fill="var(--color-primary-500)"
                fillOpacity={0.2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily orders</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={orders}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke={chartGridStroke}
              />
              <XAxis
                dataKey="label"
                tick={chartTick}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                allowDecimals={false}
                tick={chartTick}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar
                dataKey="ordersCreated"
                name="Created"
                fill="var(--color-info-500)"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="ordersFulfilled"
                name="Fulfilled"
                fill="var(--color-success-500)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

export function DailySeriesCharts() {
  const [days, setDays] = useState<AnalyticsDayWindow>(14);
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['stats-series', days],
    queryFn: () => getStatsSeries(days),
    refetchInterval: 30_000,
  });

  return (
    <section className="mt-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Daily trend</h2>
          <p className="text-xs text-muted-foreground">
            Calendar days in Africa/Lagos. Revenue is fulfilled orders only.
          </p>
        </div>
        <WindowControl days={days} onChange={setDays} />
      </div>
      {isError ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed px-4 py-8 text-sm text-muted-foreground">
          <p>Could not load the daily charts.</p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            <RefreshCw className="mr-2 size-4" /> Retry
          </Button>
        </div>
      ) : isLoading || !data ? (
        <Skeleton className="h-[280px] w-full" />
      ) : (
        <SeriesBody series={data} />
      )}
      {isFetching && !isLoading ? (
        <p className="mt-2 text-xs text-muted-foreground">Refreshing daily trend…</p>
      ) : null}
    </section>
  );
}
