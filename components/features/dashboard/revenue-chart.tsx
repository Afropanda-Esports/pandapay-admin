'use client';

import type { ComponentProps } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Rectangle,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { Stats } from '@/lib/types';

interface RevenueEntry {
  name: string;
  value: number;
  color: string;
}

const formatCompactNgn = (n: number) => {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₦${(n / 1_000).toFixed(1)}k`;
  return `₦${n}`;
};

const formatFullNgn = (n: number) => `₦${n.toLocaleString('en-NG')}`;

const renderColoredBar = (
  props: ComponentProps<typeof Rectangle> & { payload?: RevenueEntry },
) => <Rectangle {...props} fill={props.payload?.color ?? props.fill} />;

export function RevenueChart({
  revenue,
}: Readonly<{ revenue: Stats['revenue'] }>) {
  const data: RevenueEntry[] = [
    {
      name: 'Last 7 days',
      value: revenue.last7DaysNgn,
      color: 'var(--color-primary-500)',
    },
    {
      name: 'All time',
      value: revenue.totalNgn,
      color: 'var(--color-secondary-500)',
    },
  ];

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} barCategoryGap="35%">
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="var(--color-border-subtle)"
        />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatCompactNgn}
          tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
          axisLine={false}
          tickLine={false}
          width={56}
        />
        <Tooltip
          cursor={{ fill: 'var(--color-muted)', opacity: 0.4 }}
          formatter={(v) => [formatFullNgn(Number(v)), 'Revenue']}
          contentStyle={{
            background: 'var(--color-popover)',
            color: 'var(--color-popover-foreground)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            fontSize: '13px',
          }}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} shape={renderColoredBar} />
      </BarChart>
    </ResponsiveContainer>
  );
}
