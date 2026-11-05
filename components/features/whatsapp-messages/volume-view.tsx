'use client';

import {
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
import type { AnalyticsDayWindow, WhatsappMessageVolume } from '@/lib/types';

const WINDOWS: AnalyticsDayWindow[] = [7, 14, 30];

function CountLine({
  label,
  value,
}: Readonly<{ label: string; value: number }>) {
  return (
    <p className="flex justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value.toLocaleString('en-NG')}</span>
    </p>
  );
}

export function WhatsappVolumeView({
  days,
  onDaysChange,
  data,
  loading,
  error,
  onRetry,
  onSelectNumber,
}: Readonly<{
  days: AnalyticsDayWindow;
  onDaysChange: (days: AnalyticsDayWindow) => void;
  data: WhatsappMessageVolume | undefined;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onSelectNumber: (whatsappNumber: string) => void;
}>) {
  if (loading) return <Skeleton className="h-64 w-full" />;
  if (error || !data) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed px-4 py-8 text-sm text-muted-foreground">
        <p>Could not load message volume.</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </div>
    );
  }

  const chart = data.buckets.map((bucket) => ({
    ...bucket,
    label: formatAnalyticsDay(bucket.date),
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {(
          [
            ['Today', data.periods.day],
            ['This week', data.periods.week],
            ['This month', data.periods.month],
          ] as const
        ).map(([title, counts]) => (
          <Card key={title}>
            <CardHeader>
              <CardTitle className="text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <CountLine label="Total" value={counts.total} />
              <CountLine label="Inbound" value={counts.inbound} />
              <CountLine label="Outbound" value={counts.outbound} />
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Today, this week (Monday through today), and this month use Africa/Lagos.
        The chart and top users follow the selected day window.
      </p>

      <div className="flex flex-wrap gap-2">
        {WINDOWS.map((window) => (
          <Button
            key={window}
            size="sm"
            variant={days === window ? 'default' : 'outline'}
            onClick={() => onDaysChange(window)}
          >
            {window} days
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Messages per day</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chart}>
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
                dataKey="inbound"
                name="Inbound"
                stackId="messages"
                fill="var(--color-info-500)"
              />
              <Bar
                dataKey="outbound"
                name="Outbound"
                stackId="messages"
                fill="var(--color-primary-500)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top users</CardTitle>
        </CardHeader>
        <CardContent>
          {data.topUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No messages in this window.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.topUsers.map((user) => (
                <li
                  key={`${user.userId ?? 'phone'}:${user.whatsappNumber}`}
                  className="flex flex-wrap items-center justify-between gap-3"
                >
                  <button
                    type="button"
                    className="text-primary underline-offset-2 hover:underline"
                    onClick={() => onSelectNumber(user.whatsappNumber)}
                  >
                    {user.whatsappNumber}
                  </button>
                  <span className="tabular-nums text-muted-foreground">
                    {user.total.toLocaleString('en-NG')} total · {user.inbound}{' '}
                    in · {user.outbound} out
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
