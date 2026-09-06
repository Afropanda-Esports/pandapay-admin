'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { GenerateVoucherCodesDialog } from '@/components/features/voucher-codes/generate-voucher-codes-dialog';
import {
  VoucherStatusBadge,
  deriveVoucherCodeStatus,
} from '@/components/features/voucher-codes/voucher-status-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { PaginationControls } from '@/components/shared/pagination-controls';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/use-permissions';
import { ApiError } from '@/lib/api/client';
import { listVoucherCodes, revokeVoucherCode } from '@/lib/api/voucher-codes';
import { formatMoney, isSupportedCurrency } from '@/lib/money';
import type { VoucherCode, VoucherCodeStatus } from '@/lib/types';

const PAGE_SIZE = 20;

const STATUS_TABS: { value: VoucherCodeStatus | 'ALL'; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'USED', label: 'Used' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'REVOKED', label: 'Revoked' },
  { value: 'ALL', label: 'All' },
];

/**
 * VOUCH-001: show the face value in its own currency — never convert for
 * display (that would reintroduce FX drift between page loads).
 */
function formatVoucherValue(code: VoucherCode) {
  if (!isSupportedCurrency(code.currency)) {
    return `${code.value} ${code.currency}`;
  }
  try {
    return formatMoney(code.value, code.currency);
  } catch {
    return `${code.value} ${code.currency}`;
  }
}

export default function VoucherCodesPage() {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const canManage = can('voucher-codes:manage');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<VoucherCodeStatus | 'ALL'>('ACTIVE');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['voucher-codes', page, statusFilter],
    queryFn: () =>
      listVoucherCodes(page, PAGE_SIZE, statusFilter === 'ALL' ? undefined : statusFilter),
  });

  const revoke = useMutation({
    mutationFn: revokeVoucherCode,
    onSuccess: () => {
      toast.success('Voucher code revoked');
      queryClient.invalidateQueries({ queryKey: ['voucher-codes'] });
    },
    onError: (err) => {
      const message = err instanceof ApiError ? err.message : 'Could not revoke code';
      toast.error(message);
    },
  });

  const codes = data?.data ?? [];

  return (
    <div>
      <PageHeader
        title="Voucher Codes"
        description="Single-use fixed-amount vouchers in NGN or USD. Each applies only to cart items in the same currency."
        actions={canManage ? <GenerateVoucherCodesDialog /> : undefined}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab.value}
            size="sm"
            variant={statusFilter === tab.value ? 'default' : 'outline'}
            onClick={() => {
              setStatusFilter(tab.value);
              setPage(1);
            }}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {isError ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-muted-foreground">
          <AlertCircle className="size-8" />
          <p>Failed to load voucher codes.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 size-4" /> Retry
          </Button>
        </div>
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : codes.length === 0 ? (
        <EmptyState
          title="No voucher codes"
          message="No codes match this filter yet."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Code</th>
                  <th className="px-3 py-2 font-medium">Value</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Expires</th>
                  <th className="px-3 py-2 font-medium">Recipient</th>
                  <th className="px-3 py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((code) => (
                  <tr key={code.id} className="border-t border-border/60 align-middle">
                    <td className="px-3 py-2 font-mono text-xs">{code.code}</td>
                    <td className="px-3 py-2">{formatVoucherValue(code)}</td>
                    <td className="px-3 py-2">
                      <VoucherStatusBadge code={code} />
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {format(parseISO(code.expiresAt), 'PP')}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {code.recipientLabel ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {canManage && deriveVoucherCodeStatus(code) === 'ACTIVE' ? (
                        <ConfirmDialog
                          trigger={
                            <Button size="sm" variant="outline">
                              Revoke
                            </Button>
                          }
                          title="Revoke this voucher code?"
                          description={`${code.code} will no longer be redeemable. This can't be undone.`}
                          confirmLabel="Revoke"
                          variant="destructive"
                          isPending={revoke.isPending}
                          onConfirm={async () => {
                            await revoke.mutateAsync(code.id);
                          }}
                        />
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data && data.total > PAGE_SIZE ? (
            <div className="mt-4">
              <PaginationControls
                page={page}
                limit={PAGE_SIZE}
                total={data.total}
                onPageChange={setPage}
              />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
