'use client';

import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { MessageSquare, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { PageHeader } from '@/components/shared/page-header';
import { PaginationControls } from '@/components/shared/pagination-controls';
import { WhatsappVolumeView } from '@/components/features/whatsapp-messages/volume-view';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/use-permissions';
import {
  getWhatsappMessagesSummary,
  getWhatsappMessageVolume,
  listWhatsappMessages,
} from '@/lib/api/whatsapp-messages';
import type {
  AnalyticsDayWindow,
  WhatsappMessage,
  WhatsappMessageDirection,
} from '@/lib/types';

const PAGE_SIZE = 20;

type ViewMode = 'list' | 'user' | 'summary' | 'volume';

export default function WhatsappMessagesPage() {
  const { can } = usePermissions();
  const canView = can('orders:view');

  const [view, setView] = useState<ViewMode>('list');
  const [page, setPage] = useState(1);
  const [direction, setDirection] = useState<WhatsappMessageDirection | 'all'>(
    'all',
  );
  const [reason, setReason] = useState('');
  const [phone, setPhone] = useState('');
  const [volumeDays, setVolumeDays] = useState<AnalyticsDayWindow>(14);

  const listFilters = useMemo(
    () => ({
      whatsappNumber: phone.trim() || undefined,
      direction: direction === 'all' ? undefined : direction,
      reason: reason.trim() || undefined,
    }),
    [phone, direction, reason],
  );

  const listQuery = useQuery({
    queryKey: ['whatsapp-messages', page, listFilters],
    queryFn: () => listWhatsappMessages(page, PAGE_SIZE, listFilters),
    enabled: canView && view === 'list',
  });

  const userQuery = useQuery({
    queryKey: ['whatsapp-messages-user', phone, page, direction],
    queryFn: () =>
      listWhatsappMessages(page, PAGE_SIZE, {
        whatsappNumber: phone.trim(),
        direction: direction === 'all' ? undefined : direction,
      }),
    enabled: canView && view === 'user' && phone.trim().length > 0,
  });

  const summaryQuery = useQuery({
    queryKey: ['whatsapp-messages-summary'],
    queryFn: () => getWhatsappMessagesSummary(),
    enabled: canView && view === 'summary',
  });

  const volumeQuery = useQuery({
    queryKey: ['whatsapp-message-volume', volumeDays],
    queryFn: () => getWhatsappMessageVolume(volumeDays),
    enabled: canView && view === 'volume',
  });

  if (!canView) {
    return (
      <p className="text-sm text-muted-foreground">
        You do not have permission to view WhatsApp messages.
      </p>
    );
  }

  const active =
    view === 'list'
      ? listQuery
      : view === 'user'
        ? userQuery
        : view === 'summary'
          ? summaryQuery
          : volumeQuery;

  return (
    <div className="space-y-6">
      <PageHeader
        title="WhatsApp messages"
        description="Inbound and outbound WhatsApp transcript for ops — voucher codes are redacted."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void active.refetch()}
          >
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['list', 'All messages'],
            ['user', 'By user'],
            ['summary', 'Summary'],
            ['volume', 'Volume'],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            size="sm"
            variant={view === id ? 'default' : 'outline'}
            onClick={() => {
              setView(id);
              setPage(1);
            }}
          >
            {label}
          </Button>
        ))}
      </div>

      {view === 'list' || view === 'user' ? (
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Direction</label>
            <div className="flex gap-1">
              {(['all', 'inbound', 'outbound'] as const).map((d) => (
                <Button
                  key={d}
                  size="sm"
                  variant={direction === d ? 'default' : 'outline'}
                  onClick={() => {
                    setDirection(d);
                    setPage(1);
                  }}
                >
                  {d}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground" htmlFor="wa-phone">
              WhatsApp number
            </label>
            <Input
              id="wa-phone"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setPage(1);
              }}
              placeholder="234…"
              className="w-48"
            />
          </div>
          {view === 'list' ? (
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground" htmlFor="wa-reason">
                Reason
              </label>
              <Input
                id="wa-reason"
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setPage(1);
                }}
                placeholder="fulfillment_codes"
                className="w-48"
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {view === 'summary' ? (
        <SummaryPanel
          loading={summaryQuery.isLoading}
          error={summaryQuery.isError}
          data={summaryQuery.data}
        />
      ) : view === 'volume' ? (
        <WhatsappVolumeView
          days={volumeDays}
          onDaysChange={setVolumeDays}
          data={volumeQuery.data}
          loading={volumeQuery.isLoading}
          error={volumeQuery.isError}
          onRetry={() => void volumeQuery.refetch()}
          onSelectNumber={(number) => {
            setPhone(number);
            setView('user');
            setPage(1);
          }}
        />
      ) : view === 'user' && !phone.trim() ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Enter a WhatsApp number to load their messages.
          </CardContent>
        </Card>
      ) : (
        <MessageList
          loading={view === 'list' ? listQuery.isLoading : userQuery.isLoading}
          error={view === 'list' ? listQuery.isError : userQuery.isError}
          rows={
            (view === 'list' ? listQuery.data?.data : userQuery.data?.data) ??
            []
          }
          total={
            (view === 'list' ? listQuery.data?.total : userQuery.data?.total) ??
            0
          }
          page={page}
          onPageChange={setPage}
          timeline={view === 'user'}
        />
      )}
    </div>
  );
}

function SummaryPanel({
  loading,
  error,
  data,
}: Readonly<{
  loading: boolean;
  error: boolean;
  data:
    | {
        byIntent: Record<string, number>;
        byReason: Record<string, number>;
        totalInbound: number;
        totalOutbound: number;
      }
    | undefined;
}>) {
  if (loading) return <Skeleton className="h-48 w-full" />;
  if (error) {
    return (
      <p className="text-sm text-destructive">Failed to load summary.</p>
    );
  }
  if (!data) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Last 24h — {data.totalInbound} inbound / {data.totalOutbound}{' '}
            outbound
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CountList title="By intent (inbound)" counts={data.byIntent} />
          <CountList title="By reason (outbound)" counts={data.byReason} />
        </CardContent>
      </Card>
    </div>
  );
}

function CountList({
  title,
  counts,
}: Readonly<{ title: string; counts: Record<string, number> }>) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return (
    <div>
      <p className="mb-2 text-sm font-medium">{title}</p>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {entries.map(([key, n]) => (
            <li key={key} className="flex justify-between gap-4">
              <span className="font-mono text-xs">{key}</span>
              <span>{n}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MessageList({
  loading,
  error,
  rows,
  total,
  page,
  onPageChange,
  timeline,
}: Readonly<{
  loading: boolean;
  error: boolean;
  rows: WhatsappMessage[];
  total: number;
  page: number;
  onPageChange: (p: number) => void;
  timeline: boolean;
}>) {
  if (loading) return <Skeleton className="h-48 w-full" />;
  if (error) {
    return (
      <p className="text-sm text-destructive">Failed to load messages.</p>
    );
  }
  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No messages for this filter.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <ul className={timeline ? 'space-y-3' : 'space-y-3'}>
        {rows.map((row) => (
          <MessageRow key={row.id} row={row} timeline={timeline} />
        ))}
      </ul>
      {total > PAGE_SIZE ? (
        <PaginationControls
          page={page}
          limit={PAGE_SIZE}
          total={total}
          onPageChange={onPageChange}
        />
      ) : null}
    </>
  );
}

function MessageRow({
  row,
  timeline,
}: Readonly<{ row: WhatsappMessage; timeline: boolean }>) {
  const inbound = row.direction === 'inbound';
  return (
    <li
      className={
        timeline
          ? `flex ${inbound ? 'justify-start' : 'justify-end'}`
          : undefined
      }
    >
      <Card
        className={
          timeline
            ? `max-w-[85%] ${inbound ? '' : 'border-primary/30 bg-primary/5'}`
            : undefined
        }
      >
        <CardContent className="space-y-2 py-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant={inbound ? 'secondary' : 'default'}>
              {row.direction}
            </Badge>
            {row.reason ? (
              <span className="font-mono">{row.reason}</span>
            ) : null}
            {row.intent ? (
              <span className="font-mono">intent:{row.intent}</span>
            ) : null}
            <span>{format(parseISO(row.createdAt), 'yyyy-MM-dd HH:mm:ss')}</span>
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="size-3" />
              {row.whatsappNumber}
            </span>
            {row.userId ? (
              <Link
                href={`/users/${row.userId}`}
                className="text-primary underline-offset-2 hover:underline"
              >
                user
              </Link>
            ) : null}
            {row.orderId ? (
              <Link
                href={`/orders/${row.orderId}`}
                className="text-primary underline-offset-2 hover:underline"
              >
                order
              </Link>
            ) : null}
          </div>
          <p className="whitespace-pre-wrap text-sm">{row.body}</p>
          {row.conversationStep ? (
            <p className="text-xs text-muted-foreground">
              step: {row.conversationStep}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </li>
  );
}
