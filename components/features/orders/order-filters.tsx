'use client';

import { format, parseISO } from 'date-fns';
import { CalendarIcon, X } from 'lucide-react';
import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from 'nuqs';
import { useState } from 'react';
import type { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { OrderStatus } from '@/lib/types';

const STATUS_VALUES = [
  'PENDING',
  'PAID',
  'FULFILLED',
  'EXPIRED',
  'FAILED',
  'REFUNDED',
] as const satisfies readonly OrderStatus[];

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Pending',
  PAID: 'Paid',
  FULFILLED: 'Fulfilled',
  EXPIRED: 'Expired',
  FAILED: 'Failed',
  REFUNDED: 'Refunded',
};

const ALL = '__all__';

const STATUS_SELECT_ITEMS: Record<string, string> = {
  [ALL]: 'All statuses',
  PENDING: STATUS_LABEL.PENDING,
  PAID: STATUS_LABEL.PAID,
  FULFILLED: STATUS_LABEL.FULFILLED,
  EXPIRED: STATUS_LABEL.EXPIRED,
  FAILED: STATUS_LABEL.FAILED,
  REFUNDED: STATUS_LABEL.REFUNDED,
};

export const orderListParsers = {
  status: parseAsStringLiteral(STATUS_VALUES),
  userId: parseAsString,
  from: parseAsString,
  to: parseAsString,
  page: parseAsInteger.withDefault(1),
};

const safeParse = (value: string | null): Date | undefined => {
  if (!value) return undefined;
  const d = parseISO(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

const formatRangeLabel = (from?: Date, to?: Date) => {
  if (from && to) return `${format(from, 'dd MMM')} – ${format(to, 'dd MMM yyyy')}`;
  if (from) return `${format(from, 'dd MMM yyyy')} – …`;
  return 'Any date';
};

export function OrderFilters() {
  const [filters, setFilters] = useQueryStates(orderListParsers, {
    shallow: false,
  });
  const [userIdDraft, setUserIdDraft] = useState(filters.userId ?? '');

  const fromDate = safeParse(filters.from);
  const toDate = safeParse(filters.to);
  const hasFilter =
    Boolean(filters.status) ||
    Boolean(filters.userId) ||
    Boolean(filters.from) ||
    Boolean(filters.to);

  const handleStatusChange = (value: string | null) => {
    setFilters({
      status: !value || value === ALL ? null : (value as OrderStatus),
      page: 1,
    });
  };

  const handleRangeSelect = (range: DateRange | undefined) => {
    setFilters({
      from: range?.from ? format(range.from, 'yyyy-MM-dd') : null,
      to: range?.to ? format(range.to, 'yyyy-MM-dd') : null,
      page: 1,
    });
  };

  const commitUserId = () => {
    const trimmed = userIdDraft.trim();
    if ((filters.userId ?? '') === trimmed) return;
    setFilters({ userId: trimmed || null, page: 1 });
  };

  const handleReset = () => {
    setUserIdDraft('');
    setFilters({
      status: null,
      userId: null,
      from: null,
      to: null,
      page: 1,
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        items={STATUS_SELECT_ITEMS}
        value={filters.status ?? ALL}
        onValueChange={handleStatusChange}
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

      <Popover>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              className="justify-start font-normal text-muted-foreground data-[has-value=true]:text-foreground"
              data-has-value={Boolean(fromDate || toDate)}
            >
              <CalendarIcon className="size-4" />
              {formatRangeLabel(fromDate, toDate)}
            </Button>
          }
        />
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={{ from: fromDate, to: toDate }}
            onSelect={handleRangeSelect}
            numberOfMonths={2}
            defaultMonth={fromDate}
          />
        </PopoverContent>
      </Popover>

      <Input
        value={userIdDraft}
        onChange={(e) => setUserIdDraft(e.target.value)}
        onBlur={commitUserId}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commitUserId();
          }
        }}
        placeholder="User ID"
        className="w-50 font-mono text-xs"
      />

      {hasFilter && (
        <Button variant="ghost" size="sm" onClick={handleReset}>
          <X className="size-4" />
          Reset
        </Button>
      )}
    </div>
  );
}
