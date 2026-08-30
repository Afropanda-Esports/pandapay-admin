'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { useState } from 'react';

import { ResolveSupportRequestDialog } from '@/components/features/support/resolve-support-request-dialog';
import { PageHeader } from '@/components/shared/page-header';
import { PaginationControls } from '@/components/shared/pagination-controls';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/use-permissions';
import { listSupportRequests } from '@/lib/api/support-requests';
import type { SupportRequest, SupportRequestStatus } from '@/lib/types';

const PAGE_SIZE = 20;

const STATUS_LABEL: Record<SupportRequestStatus, string> = {
  OPEN: 'Open',
  RESOLVED: 'Resolved',
};

export default function SupportRequestsPage() {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const canManage = can('orders:manage');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<SupportRequestStatus>('OPEN');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['support-requests', page, statusFilter],
    queryFn: () => listSupportRequests(page, PAGE_SIZE, statusFilter),
  });

  const rows = data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support requests"
        description="WhatsApp help and support tickets submitted by customers."
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {(['OPEN', 'RESOLVED'] as SupportRequestStatus[]).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={statusFilter === s ? 'default' : 'outline'}
            onClick={() => {
              setStatusFilter(s);
              setPage(1);
            }}
          >
            {STATUS_LABEL[s]}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : isError ? (
        <p className="text-sm text-destructive">Failed to load support requests.</p>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No support requests for this filter.
          </CardContent>
        </Card>
      ) : (
        <>
          <ul className="space-y-4">
            {rows.map((row) => (
              <SupportRequestCard
                key={row.id}
                row={row}
                canManage={canManage}
                onResolved={() => {
                  void queryClient.invalidateQueries({
                    queryKey: ['support-requests'],
                  });
                }}
              />
            ))}
          </ul>
          {data && data.total > PAGE_SIZE ? (
            <PaginationControls
              page={page}
              limit={PAGE_SIZE}
              total={data.total}
              onPageChange={setPage}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

function SupportRequestCard({
  row,
  canManage,
  onResolved,
}: Readonly<{
  row: SupportRequest;
  canManage: boolean;
  onResolved: () => void;
}>) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base font-mono">{row.whatsappNumber}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {format(parseISO(row.createdAt), 'PPpp')}
          </p>
        </div>
        <Badge variant="outline">{STATUS_LABEL[row.status]}</Badge>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="whitespace-pre-wrap">{row.issueDescription}</p>
        <p>
          Order:{' '}
          {row.orderId ? (
            <Button
              variant="link"
              size="sm"
              render={<Link href={`/orders/${row.orderId}`} />}
              className="h-auto px-0 font-mono text-sm"
            >
              {row.orderId.slice(0, 8)}…
            </Button>
          ) : (
            <span className="text-muted-foreground">No order linked</span>
          )}
        </p>
        {row.status === 'RESOLVED' && row.resolvedAt ? (
          <p className="text-muted-foreground">
            Resolved {format(parseISO(row.resolvedAt), 'PPpp')}
            {row.resolutionNote ? (
              <>
                {' '}
                — <span className="text-foreground">{row.resolutionNote}</span>
              </>
            ) : null}
          </p>
        ) : null}
        {row.status === 'OPEN' && canManage ? (
          <ResolveSupportRequestDialog
            requestId={row.id}
            onResolved={onResolved}
            trigger={
              <Button size="sm" variant="secondary">
                Mark resolved
              </Button>
            }
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
