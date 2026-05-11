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

interface StatusEntry {
  name: string;
  value: number;
  color: string;
}

const renderColoredBar = (
  props: ComponentProps<typeof Rectangle> & { payload?: StatusEntry },
) => (
  <Rectangle
    {...props}
    fill={props.payload?.color ?? props.fill}
  />
);

export function OrdersChart({
  orders,
}: Readonly<{ orders: Stats['orders'] }>) {
  const data: StatusEntry[] = [
    { name: 'Fulfilled', value: orders.fulfilled, color: 'var(--color-success-500)' },
    { name: 'Pending', value: orders.pending, color: 'var(--color-warning-500)' },
    { name: 'Paid', value: orders.paid, color: 'var(--color-info-500)' },
    { name: 'Failed', value: orders.failed, color: 'var(--color-error-500)' },
    { name: 'Expired', value: orders.expired, color: 'var(--color-neutral-300)' },
  ];

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} barCategoryGap="30%">
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
          allowDecimals={false}
          tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
          axisLine={false}
          tickLine={false}
          width={32}
        />
        <Tooltip
          cursor={{ fill: 'var(--color-muted)', opacity: 0.4 }}
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
