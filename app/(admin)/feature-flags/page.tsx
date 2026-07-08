'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertCircle, RefreshCw } from 'lucide-react';

import { FeatureFlagRow } from '@/components/features/feature-flags/feature-flag-row';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/use-permissions';
import { getFeatureFlags } from '@/lib/api/feature-flags';

export default function FeatureFlagsPage() {
  const { can } = usePermissions();
  const canManage = can('feature-flags:manage');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['feature-flags'],
    queryFn: getFeatureFlags,
  });

  const flags = data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Feature flags"
        description="Toggle beta features and optional time windows. On/Off saves immediately; schedule fields use Save schedule."
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-muted-foreground">
          <AlertCircle className="size-8" />
          <p>Failed to load feature flags.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 size-4" /> Retry
          </Button>
        </div>
      ) : flags.length === 0 ? (
        <EmptyState
          title="No feature flags"
          message="Flags seeded in the backend will appear here."
        />
      ) : (
        <ul className="space-y-4">
          {flags.map((flag) => (
            <li key={flag.id}>
              <FeatureFlagRow
                key={`${flag.id}-${flag.updatedAt}`}
                flag={flag}
                canManage={canManage}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
