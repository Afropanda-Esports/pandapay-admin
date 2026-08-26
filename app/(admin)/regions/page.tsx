'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Suspense } from 'react';

import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getRegions } from '@/lib/api/products';
import type { Region } from '@/lib/types';
import { CreateRegionDialog } from './components/create-region-dialog';
import { EditRegionDialog } from './components/edit-region-dialog';

const SKELETON_ROW_KEYS = ['r1', 'r2', 'r3', 'r4', 'r5'];

function RegionsTable({ regions }: Readonly<{ regions: Region[] }>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Code</th>
            <th className="px-3 py-2 font-medium">Name</th>
            <th className="px-3 py-2 font-medium">Currency</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Created</th>
            <th className="px-3 py-2 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {regions.map((region) => (
            <tr
              key={region.id}
              className="border-t border-border/60 align-middle"
            >
              <td className="px-3 py-2">
                <span className="font-mono text-xs">{region.code}</span>
              </td>
              <td className="px-3 py-2 font-medium">{region.name}</td>
              <td className="px-3 py-2">{region.currency}</td>
              <td className="px-3 py-2">
                {region.isActive ? (
                  <Badge className="bg-success-100 text-success-700 hover:bg-success-100 border-0">
                    Active
                  </Badge>
                ) : (
                  <Badge className="bg-neutral-100 text-neutral-500 hover:bg-neutral-100 border-0">
                    Inactive
                  </Badge>
                )}
              </td>
              <td className="px-3 py-2 text-xs text-muted-foreground">
                {format(parseISO(region.createdAt), 'dd MMM yyyy')}
              </td>
              <td className="px-3 py-2 text-right">
                <EditRegionDialog region={region} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RegionsTableSkeleton() {
  return (
    <div className="rounded-lg border border-border">
      {SKELETON_ROW_KEYS.map((k) => (
        <div
          key={k}
          className="flex items-center gap-3 border-b border-border/60 px-3 py-3 last:border-b-0"
        >
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

interface RegionsBodyProps {
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  data: Region[] | undefined;
}

function RegionsBody({ isLoading, isError, refetch, data }: Readonly<RegionsBodyProps>) {
  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-muted-foreground">
        <AlertCircle className="size-8" />
        <p>Failed to load regions.</p>
        <Button variant="outline" size="sm" onClick={refetch}>
          <RefreshCw className="mr-2 size-4" /> Retry
        </Button>
      </div>
    );
  }
  if (isLoading || !data) return <RegionsTableSkeleton />;
  if (data.length === 0) {
    return (
      <EmptyState
        title="No regions found"
        message="Create your first region to organize products."
      />
    );
  }
  return <RegionsTable regions={data} />;
}

function RegionsContent() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['regions'],
    queryFn: getRegions,
  });

  return (
    <div>
      <PageHeader
        title="Regions"
        description="Manage geographic regions and currencies for your product catalog."
        actions={<CreateRegionDialog />}
      />

      <RegionsBody
        isLoading={isLoading}
        isError={isError}
        refetch={refetch}
        data={data}
      />
    </div>
  );
}

export default function RegionsPage() {
  return (
    <Suspense
      fallback={
        <div>
          <PageHeader
            title="Regions"
            description="Manage geographic regions and currencies for your product catalog."
          />
          <RegionsTableSkeleton />
        </div>
      }
    >
      <RegionsContent />
    </Suspense>
  );
}
