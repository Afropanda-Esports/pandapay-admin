'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { AlertCircle, Coins, RefreshCw, RotateCw } from 'lucide-react';
import { toast } from 'sonner';

import { SetRateForm } from '@/components/features/pricing/set-rate-form';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useMe } from '@/hooks/use-me';
import { getAdminDirectory } from '@/lib/api/admins';
import { ApiError } from '@/lib/api/client';
import {
  getCurrentRate,
  getRateHistory,
  recomputeAll,
} from '@/lib/api/pricing';
import type { AdminDirectoryItem, ExchangeRateHistoryItem } from '@/lib/types';

const HISTORY_SKELETON = ['h1', 'h2', 'h3', 'h4'];

function CurrentRateCard({
  ngnPerUsd,
  effectiveFrom,
  note,
}: Readonly<{
  ngnPerUsd: number;
  effectiveFrom: string;
  note: string | null;
}>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Coins className="size-4" />
          Current rate
        </CardTitle>
        <CardDescription>
          Applied to every GLOBAL_FX product&apos;s NGN price.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="font-heading text-4xl font-bold tabular-nums">
          ₦{ngnPerUsd.toLocaleString('en-NG', { maximumFractionDigits: 4 })}{' '}
          <span className="text-base font-normal text-muted-foreground">
            / $1
          </span>
        </p>
        <p className="text-xs text-muted-foreground">
          Effective {format(parseISO(effectiveFrom), 'PPpp')}
        </p>
        {note && (
          <p className="text-xs text-muted-foreground italic">{note}</p>
        )}
      </CardContent>
    </Card>
  );
}

function CurrentRateSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-3 w-64" />
      </CardContent>
    </Card>
  );
}

function NoRateCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">No rate set</CardTitle>
        <CardDescription>
          GLOBAL_FX products cannot be priced until a rate is set.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

function RecomputeButton() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => recomputeAll(),
    onSuccess: (res) => {
      toast.success(
        res.affected === 0
          ? 'All prices are already up to date.'
          : `Recomputed ${res.affected} product${res.affected === 1 ? '' : 's'}.`,
      );
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err) => {
      const message =
        err instanceof ApiError ? err.message : 'Recompute failed';
      toast.error(message);
    },
  });

  return (
    <ConfirmDialog
      trigger={
        <Button variant="outline" disabled={mutation.isPending}>
          <RotateCw className="size-4" />
          Recompute all
        </Button>
      }
      title="Recompute every product?"
      description="Walks every product and re-derives the NGN snapshot from its current pricing inputs. Use this if prices look stale or you suspect drift. Same outcome you'd get from saving the rate again."
      confirmLabel="Recompute"
      isPending={mutation.isPending}
      onConfirm={async () => {
        await mutation.mutateAsync();
      }}
    />
  );
}

function actorName(
  id: string | null,
  lookup: Map<string, AdminDirectoryItem>,
): string {
  if (!id) return 'system';
  const admin = lookup.get(id);
  if (admin) return admin.displayName;
  return `${id.slice(0, 8)}…`;
}

function RateHistoryTable({
  rows,
  lookup,
}: Readonly<{
  rows: ExchangeRateHistoryItem[];
  lookup: Map<string, AdminDirectoryItem>;
}>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Rate</th>
            <th className="px-3 py-2 font-medium">Set by</th>
            <th className="px-3 py-2 font-medium">Note</th>
            <th className="px-3 py-2 font-medium">When</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const d = parseISO(row.effectiveFrom);
            return (
              <tr
                key={row.id}
                className="border-t border-border/60 align-middle"
              >
                <td className="px-3 py-2 tabular-nums">
                  ₦{row.ngnPerUsd.toLocaleString('en-NG', { maximumFractionDigits: 4 })}
                </td>
                <td className="px-3 py-2">
                  {actorName(row.setById, lookup)}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {row.note ?? '—'}
                </td>
                <td className="px-3 py-2">
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <span className="cursor-help text-xs text-muted-foreground">
                          {formatDistanceToNow(d, { addSuffix: true })}
                        </span>
                      }
                    />
                    <TooltipContent>{format(d, 'PPpp')}</TooltipContent>
                  </Tooltip>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="rounded-lg border border-border">
      {HISTORY_SKELETON.map((k) => (
        <div
          key={k}
          className="flex items-center gap-3 border-b border-border/60 px-3 py-3 last:border-b-0"
        >
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

export default function PricingPage() {
  const { data: me } = useMe();
  const isSuperAdmin = me?.role === 'SUPER_ADMIN';

  const {
    data: rate,
    isLoading: rateLoading,
    isError: rateError,
    refetch: refetchRate,
  } = useQuery({
    queryKey: ['pricing-rate'],
    queryFn: getCurrentRate,
  });

  const {
    data: history,
    isLoading: historyLoading,
  } = useQuery({
    queryKey: ['pricing-rate-history'],
    queryFn: () => getRateHistory(50),
  });

  const { data: directory } = useQuery({
    queryKey: ['admin-directory'],
    queryFn: getAdminDirectory,
    staleTime: 5 * 60_000,
  });

  const lookup = new Map<string, AdminDirectoryItem>(
    (directory ?? []).map((a) => [a.id, a]),
  );

  return (
    <div>
      <PageHeader
        title="Pricing"
        description="Global NGN/USD rate and per-product pricing controls."
        actions={isSuperAdmin ? <RecomputeButton /> : undefined}
      />

      {rateError ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-muted-foreground">
          <AlertCircle className="size-8" />
          <p>Failed to load current rate.</p>
          <Button variant="outline" size="sm" onClick={() => refetchRate()}>
            <RefreshCw className="mr-2 size-4" /> Retry
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {rateLoading ? (
            <CurrentRateSkeleton />
          ) : rate ? (
            <CurrentRateCard
              ngnPerUsd={rate.ngnPerUsd}
              effectiveFrom={rate.effectiveFrom}
              note={rate.note}
            />
          ) : (
            <NoRateCard />
          )}

          {isSuperAdmin && (
            <SetRateForm currentRate={rate?.ngnPerUsd ?? null} />
          )}
        </div>
      )}

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-medium">Rate history</h2>
        {historyLoading ? (
          <HistorySkeleton />
        ) : history && history.length > 0 ? (
          <RateHistoryTable rows={history} lookup={lookup} />
        ) : (
          <EmptyState
            title="No history yet"
            message="Rate changes will appear here."
          />
        )}
      </div>
    </div>
  );
}
