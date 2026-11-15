'use client';

import { X } from 'lucide-react';
import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from 'nuqs';
import { useState } from 'react';

import {
  DateRangeFilter,
  STATUS_LABEL,
  STATUS_VALUES,
} from '@/components/features/orders/order-filters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { OrderStatus } from '@/lib/types';

const NETWORKS = ['solana', 'ethereum', 'base', 'near'] as const;

const NETWORK_LABEL: Record<(typeof NETWORKS)[number], string> = {
  solana: 'Solana',
  ethereum: 'Ethereum',
  base: 'Base',
  near: 'NEAR',
};

const ALL = '__all__';

const STATUS_ITEMS: Record<string, string> = {
  [ALL]: 'All statuses',
  ...STATUS_LABEL,
};

const NETWORK_ITEMS: Record<string, string> = {
  [ALL]: 'All networks',
  ...NETWORK_LABEL,
};

export const intentsListParsers = {
  tab: parseAsStringLiteral(['overview', 'orders'] as const).withDefault(
    'overview',
  ),
  status: parseAsStringLiteral(STATUS_VALUES),
  chain: parseAsStringLiteral(NETWORKS),
  orderId: parseAsString,
  from: parseAsString,
  to: parseAsString,
  page: parseAsInteger.withDefault(1),
};

export function IntentsFilters() {
  const [filters, setFilters] = useQueryStates(intentsListParsers, {
    shallow: false,
  });
  const [orderIdDraft, setOrderIdDraft] = useState(filters.orderId ?? '');
  const hasFilter = Boolean(
    filters.status || filters.chain || filters.orderId || filters.from || filters.to,
  );

  const commitOrderId = () => {
    const trimmed = orderIdDraft.trim();
    if ((filters.orderId ?? '') === trimmed) return;
    setFilters({ orderId: trimmed || null, page: 1 });
  };

  const reset = () => {
    setOrderIdDraft('');
    setFilters({
      status: null,
      chain: null,
      orderId: null,
      from: null,
      to: null,
      page: 1,
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        items={STATUS_ITEMS}
        value={filters.status ?? ALL}
        onValueChange={(value: string | null) =>
          setFilters({
            status: !value || value === ALL ? null : (value as OrderStatus),
            page: 1,
          })
        }
      >
        <SelectTrigger className="w-37.5">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {STATUS_VALUES.map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_LABEL[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        items={NETWORK_ITEMS}
        value={filters.chain ?? ALL}
        onValueChange={(value: string | null) =>
          setFilters({
            chain:
              !value || value === ALL
                ? null
                : (value as (typeof NETWORKS)[number]),
            page: 1,
          })
        }
      >
        <SelectTrigger className="w-37.5">
          <SelectValue placeholder="Network" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All networks</SelectItem>
          {NETWORKS.map((n) => (
            <SelectItem key={n} value={n}>
              {NETWORK_LABEL[n]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <DateRangeFilter
        from={filters.from}
        to={filters.to}
        onChange={(range) => setFilters({ ...range, page: 1 })}
      />

      <Input
        value={orderIdDraft}
        onChange={(e) => setOrderIdDraft(e.target.value)}
        onBlur={commitOrderId}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commitOrderId();
          }
        }}
        placeholder="Order ID or reference"
        className="w-50 font-mono text-xs"
      />

      {hasFilter && (
        <Button variant="ghost" size="sm" onClick={reset}>
          <X className="size-4" />
          Reset
        </Button>
      )}
    </div>
  );
}
