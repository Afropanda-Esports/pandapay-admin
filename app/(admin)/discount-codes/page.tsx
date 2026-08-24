'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { DiscountStatusBadge, deriveDiscountCodeStatus } from '@/components/features/discount-codes/discount-status-badge';
import { GenerateDiscountCodesDialog } from '@/components/features/discount-codes/generate-discount-codes-dialog';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { PaginationControls } from '@/components/shared/pagination-controls';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/use-permissions';
import { listDiscountCodes, revokeDiscountCode } from '@/lib/api/discount-codes';
import { getProducts } from '@/lib/api/products';
import { getCategories } from '@/lib/api/categories';
import { ApiError } from '@/lib/api/client';
import type { DiscountCode, DiscountCodeStatus } from '@/lib/types';

const PAGE_SIZE = 20;

const STATUS_TABS: { value: DiscountCodeStatus | 'ALL'; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'USED', label: 'Used' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'REVOKED', label: 'Revoked' },
  { value: 'ALL', label: 'All' },
];

const DISCOUNT_TYPE_LABEL: Record<DiscountCode['discountType'], string> = {
  PERCENTAGE: '% off',
  FIXED_AMOUNT: 'off',
};

function formatDiscountValue(code: DiscountCode) {
  const n = Number.parseFloat(code.discountValue);
  const value = Number.isFinite(n) ? n.toLocaleString('en-NG') : code.discountValue;
  return code.discountType === 'PERCENTAGE'
    ? `${value}% off`
    : `₦${value} ${DISCOUNT_TYPE_LABEL.FIXED_AMOUNT}`;
}

export default function DiscountCodesPage() {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const canManage = can('discount-codes:manage');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<DiscountCodeStatus | 'ALL'>('ACTIVE');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['discount-codes', page, statusFilter],
    queryFn: () =>
      listDiscountCodes(page, PAGE_SIZE, statusFilter === 'ALL' ? undefined : statusFilter),
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => getProducts(),
    staleTime: 60_000,
  });
  const productNameById = new Map((products ?? []).map((p) => [p.id, p.name]));

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    staleTime: 60_000,
  });
  const categoryNameById = new Map((categories ?? []).map((c) => [c.id, c.name]));

  const revoke = useMutation({
    mutationFn: revokeDiscountCode,
    onSuccess: () => {
      toast.success('Discount code revoked');
      queryClient.invalidateQueries({ queryKey: ['discount-codes'] });
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
        title="Discount Codes"
        description="Single-use codes redeemable against a product or category."
        actions={canManage ? <GenerateDiscountCodesDialog /> : undefined}
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
          <p>Failed to load discount codes.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 size-4" /> Retry
          </Button>
        </div>
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : codes.length === 0 ? (
        <EmptyState
          title="No discount codes"
          message="No codes match this filter yet."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Code</th>
                  <th className="px-3 py-2 font-medium">Applies to</th>
                  <th className="px-3 py-2 font-medium">Discount</th>
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
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {code.categoryId
                        ? categoryNameById.get(code.categoryId) || 'Unknown Category'
                        : (code.productId && productNameById.get(code.productId)) ||
                          `${code.productId?.slice(0, 8)}…`}
                    </td>
                    <td className="px-3 py-2">{formatDiscountValue(code)}</td>
                    <td className="px-3 py-2">
                      <DiscountStatusBadge code={code} />
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {format(parseISO(code.expiresAt), 'PP')}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {code.recipientLabel ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {canManage && deriveDiscountCodeStatus(code) === 'ACTIVE' ? (
                        <ConfirmDialog
                          trigger={
                            <Button size="sm" variant="outline">
                              Revoke
                            </Button>
                          }
                          title="Revoke this discount code?"
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
