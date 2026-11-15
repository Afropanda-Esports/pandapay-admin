'use client';

import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';

import { DetailRow, InfoCard } from '@/components/shared/detail-card';
import { StatCard } from '@/components/shared/stat-card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getIntentsOverview } from '@/lib/api/intents';
import { formatUsdcBaseUnits } from '@/lib/intents-format';
import type { IntentsOverview as Overview } from '@/lib/types';

import { CopyButton, ExplorerLink } from './intents-links';

function AccountRow({
  label,
  accountId,
  explorerUrl,
}: Readonly<{ label: string; accountId: string; explorerUrl: string }>) {
  return (
    <DetailRow
      label={label}
      value={
        <span className="inline-flex items-center gap-1">
          <ExplorerLink href={explorerUrl}>{accountId}</ExplorerLink>
          <CopyButton value={accountId} label={label} />
        </span>
      }
    />
  );
}

function ContractsCard({ overview }: Readonly<{ overview: Overview }>) {
  const { contract } = overview;
  return (
    <InfoCard title="Deployed contracts">
      <AccountRow
        label="Guard contract"
        accountId={contract.policyContractId}
        explorerUrl={contract.policyExplorerUrl}
      />
      <AccountRow
        label="Treasury"
        accountId={contract.treasuryAccountId}
        explorerUrl={contract.treasuryExplorerUrl}
      />
      <DetailRow
        label="Network"
        value={<Badge variant="outline">NEAR {contract.network}</Badge>}
      />
    </InfoCard>
  );
}

function GuardStateCard({ overview }: Readonly<{ overview: Overview }>) {
  const { onchain } = overview;
  return (
    <InfoCard title="Guard state (live)">
      {onchain.status === 'unavailable' && (
        <Alert className="mb-3">
          <AlertTriangle className="size-4" />
          <AlertTitle>NEAR RPC unavailable</AlertTitle>
          <AlertDescription>
            Could not read the guard contract just now. Values below may be
            missing; this page retries every 30 seconds.
          </AlertDescription>
        </Alert>
      )}
      <DetailRow
        label="Per-refund limit"
        value={
          onchain.limits
            ? `${formatUsdcBaseUnits(onchain.limits.perTx)} USDC`
            : '—'
        }
      />
      <DetailRow
        label="Daily limit"
        value={
          onchain.limits
            ? `${formatUsdcBaseUnits(onchain.limits.daily)} USDC`
            : '—'
        }
      />
      <DetailRow
        label="Spent today (UTC)"
        value={
          onchain.daySpend !== null
            ? `${formatUsdcBaseUnits(onchain.daySpend)} USDC`
            : '—'
        }
      />
    </InfoCard>
  );
}

function NetworksCard({ overview }: Readonly<{ overview: Overview }>) {
  return (
    <InfoCard title="Enabled networks">
      {overview.networks.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No networks enabled. Set the INTENTS_CHECKOUT_REFUND_* variables on
          the API.
        </p>
      ) : (
        overview.networks.map((network) => (
          <DetailRow
            key={network.id}
            label={network.title}
            value={<span className="font-mono text-xs">{network.assetId}</span>}
          />
        ))
      )}
    </InfoCard>
  );
}

function Totals({ overview }: Readonly<{ overview: Overview }>) {
  const { totals } = overview;
  const by = totals.byStatus;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="USDC orders" value={totals.orders} icon={ShoppingBag} />
      <StatCard
        label="USDC received"
        value={totals.receivedUsdc}
        subtitle="Paid and fulfilled orders"
        icon={CircleDollarSign}
      />
      <StatCard
        label="Fulfilled"
        value={by.FULFILLED ?? 0}
        subtitle={`${by.PAID ?? 0} paid, awaiting delivery`}
        icon={CheckCircle2}
      />
      <StatCard
        label="Pending or expired"
        value={(by.PENDING ?? 0) + (by.EXPIRED ?? 0)}
        subtitle={`${by.PENDING ?? 0} pending, ${by.EXPIRED ?? 0} expired`}
        icon={Clock}
      />
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {['a', 'b', 'c', 'd'].map((k) => (
          <Skeleton key={k} className="h-24" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {['e', 'f'].map((k) => (
          <Skeleton key={k} className="h-48" />
        ))}
      </div>
    </div>
  );
}

export function IntentsOverview() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['intents', 'overview'],
    queryFn: getIntentsOverview,
    refetchInterval: 30_000,
  });

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-muted-foreground">
        <AlertCircle className="size-8" />
        <p>Failed to load the NEAR Intents overview.</p>
        <Button variant="outline" size="sm" onClick={() => void refetch()}>
          <RefreshCw className="mr-2 size-4" /> Retry
        </Button>
      </div>
    );
  }
  if (isLoading || !data) return <OverviewSkeleton />;

  return (
    <div className="space-y-4">
      <Totals overview={data} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ContractsCard overview={data} />
        <GuardStateCard overview={data} />
        <NetworksCard overview={data} />
      </div>
    </div>
  );
}
