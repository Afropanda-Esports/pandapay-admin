'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Circle,
  PauseCircle,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { use, useState } from 'react';
import { toast } from 'sonner';

import { PricingCard } from '@/components/features/products/pricing-card';
import { ArchiveProductButton } from '@/components/features/products/archive-product-button';
import { DeleteProductDialog } from '@/components/features/products/delete-product-dialog';
import { RenameProductDialog } from '@/components/features/products/rename-product-dialog';
import { UploadVouchersDialog } from '@/components/features/products/upload-vouchers-dialog';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/lib/api/client';
import {
  getProduct,
  getVoucherBatch,
  listVoucherBatches,
  updateProduct,
} from '@/lib/api/products';
import { formatMoney, formatProductPrice } from '@/lib/money';
import { readinessChecklist } from '@/lib/product-create';
import type { ProductWithStats } from '@/lib/types';
import { cn } from '@/lib/utils';

function productStatusBadge(isAvailable: boolean, stockAvailable: number) {
  if (isAvailable && stockAvailable > 0) {
    return (
      <Badge className="bg-success-100 text-success-700 hover:bg-success-100 border-0">
        Available
      </Badge>
    );
  }
  if (isAvailable && stockAvailable === 0) {
    return (
      <Badge className="bg-error-100 text-error-700 hover:bg-error-100 border-0">
        Out of stock
      </Badge>
    );
  }
  return (
    <Badge className="bg-neutral-100 text-neutral-500 hover:bg-neutral-100 border-0">
      Unavailable
    </Badge>
  );
}

const stockBarColor = (available: number, total: number) => {
  if (total === 0) return 'bg-neutral-300';
  const ratio = available / total;
  if (ratio > 0.3) return 'bg-success-500';
  if (ratio > 0.1) return 'bg-warning-500';
  return 'bg-error-500';
};

function DetailRow({
  label,
  value,
}: Readonly<{ label: string; value: React.ReactNode }>) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/60 py-2 last:border-b-0">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function DetailsCard({
  product,
  onToggle,
  isToggling,
}: Readonly<{
  product: ProductWithStats;
  onToggle: () => void;
  isToggling: boolean;
}>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-0">
          <DetailRow label="Name" value={product.name} />
          <DetailRow
            label="Category"
            value={product.category?.name || 'Unknown'}
          />
          <DetailRow
            label="SKU"
            value={
              product.sku ? (
                <span className="font-mono text-xs">{product.sku}</span>
              ) : (
                '—'
              )
            }
          />
          <DetailRow
            label="Region"
            value={
              product.brand?.region
                ? `${product.brand.region.name}${product.brand.region.isActive ? '' : ' (inactive)'}`
                : '—'
            }
          />
          <DetailRow label="Currency" value={product.baseCurrency} />
          <DetailRow
            label="Status"
            value={productStatusBadge(product.isAvailable, product.voucherStats.available)}
          />
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={onToggle}
            disabled={isToggling}
          >
            {product.isAvailable ? (
              <>
                <PauseCircle className="size-4" />
                Mark unavailable
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4" />
                Mark available
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function VoucherStatsCard({
  product,
}: Readonly<{ product: ProductWithStats }>) {
  const {
    available,
    total,
    used,
    lastUnitCostNgn,
    lastUnitCostFxRate,
    lastStockedAt,
    liveInventoryCostNgn,
    sellingPriceNgn,
  } = product.voucherStats;
  const ratio = total === 0 ? 0 : available / total;
  const pct = Math.round(ratio * 100);
  const sell =
    sellingPriceNgn != null
      ? formatMoney(sellingPriceNgn, 'NGN')
      : formatProductPrice(product);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Voucher stock</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Total
            </p>
            <p className="font-heading text-2xl font-bold">
              {total.toLocaleString('en-NG')}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Available
            </p>
            <p className="font-heading text-2xl font-bold text-success-600">
              {available.toLocaleString('en-NG')}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Used
            </p>
            <p className="font-heading text-2xl font-bold text-muted-foreground">
              {used.toLocaleString('en-NG')}
            </p>
          </div>
        </div>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            Selling price:{' '}
            <span className="font-medium text-foreground">{sell}</span>
          </p>
          {lastUnitCostNgn != null ? (
            <p>
              Last cost / unit:{' '}
              <span className="font-medium text-foreground">
                {formatMoney(lastUnitCostNgn, 'NGN')}
              </span>
              {lastUnitCostFxRate != null
                ? ` · rate ${Number(lastUnitCostFxRate).toLocaleString('en-NG')}`
                : null}
              {lastStockedAt != null ? (
                <span className="block text-xs">
                  Stocked {new Date(lastStockedAt).toLocaleString('en-NG')}
                </span>
              ) : null}
            </p>
          ) : null}
          {liveInventoryCostNgn != null ? (
            <p>
              Live inventory cost:{' '}
              <span className="font-medium text-foreground">
                {formatMoney(liveInventoryCostNgn, 'NGN')}
              </span>
              <span className="block text-xs">
                Sum of ₦ buy cost on unused PINs.
              </span>
            </p>
          ) : null}
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Stock level</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                stockBarColor(available, total),
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StockHistoryCard({ productId }: Readonly<{ productId: string }>) {
  const [batchId, setBatchId] = useState<string | null>(null);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['product-voucher-batches', productId],
    queryFn: () => listVoucherBatches(productId, { limit: 50 }),
  });
  const detail = useQuery({
    queryKey: ['product-voucher-batch', productId, batchId],
    queryFn: () => getVoucherBatch(productId, batchId!),
    enabled: batchId != null,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock history</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : isError ? (
          <p className="text-sm text-muted-foreground">
            Could not load stock batches.
          </p>
        ) : !data?.items.length ? (
          <p className="text-sm text-muted-foreground">
            No stock-in batches yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3 font-medium">Date</th>
                  <th className="py-2 pr-3 font-medium">Qty</th>
                  <th className="py-2 pr-3 font-medium">Purchase</th>
                  <th className="py-2 pr-3 font-medium">Rate</th>
                  <th className="py-2 pr-3 font-medium">₦/unit</th>
                  <th className="py-2 font-medium">Left</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((b) => (
                  <tr
                    key={b.id}
                    className="border-t border-border/60 cursor-pointer hover:bg-muted/40"
                    onClick={() => setBatchId(b.id)}
                  >
                    <td className="py-2 pr-3 tabular-nums">
                      {new Date(b.stockedAt).toLocaleString('en-NG')}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">{b.qty}</td>
                    <td className="py-2 pr-3 tabular-nums">
                      {b.currency}{' '}
                      {Number(b.purchaseTotal).toLocaleString('en-NG', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">
                      {b.fxRate != null
                        ? Number(b.fxRate).toLocaleString('en-NG')
                        : '—'}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">
                      {formatMoney(b.unitCostNgn, 'NGN')}
                    </td>
                    <td className="py-2 tabular-nums">
                      {b.unusedCount}/{b.qty}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-muted-foreground">
              Click a row for PIN-level cost (codes never shown).
            </p>
          </div>
        )}
      </CardContent>

      <Dialog
        open={batchId != null}
        onOpenChange={(open) => {
          if (!open) setBatchId(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Batch PINs</DialogTitle>
          </DialogHeader>
          {detail.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : detail.data ? (
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                {formatMoney(detail.data.batch.unitCostNgn, 'NGN')}/unit ·{' '}
                {detail.data.batch.qty} codes ·{' '}
                {new Date(detail.data.batch.stockedAt).toLocaleString('en-NG')}
              </p>
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="py-1 pr-2 font-medium">PIN id</th>
                      <th className="py-1 pr-2 font-medium">Cost ₦</th>
                      <th className="py-1 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.data.pins.map((pin) => (
                      <tr key={pin.id} className="border-t border-border/60">
                        <td className="py-1 pr-2 font-mono text-xs">
                          {pin.id.slice(0, 8)}…
                        </td>
                        <td className="py-1 pr-2 tabular-nums">
                          {pin.unitCostNgn != null
                            ? formatMoney(pin.unitCostNgn, 'NGN')
                            : '—'}
                        </td>
                        <td className="py-1">
                          {pin.isUsed ? 'Used' : 'Unused'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Batch not found.</p>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/**
 * GBP-006 — where this product is on the way to customers:
 * create → unavailable → review price → upload stock → mark available → region
 * active → visible. Operator feedback only; it changes nothing.
 */
function ReadinessCard({ product }: Readonly<{ product: ProductWithStats }>) {
  const { items, customerVisible } = readinessChecklist({
    snapshotNgnPrice: product.snapshotNgnPrice,
    sku: product.sku,
    isAvailable: product.isAvailable,
    archivedAt: product.archivedAt,
    voucherStats: product.voucherStats,
    regionActive: product.brand?.region ? product.brand.region.isActive : null,
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Readiness</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <ul className="space-y-1.5 text-sm">
          {items.map((item) => (
            <li key={item.key} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2">
                {item.ok ? (
                  <CheckCircle2 className="size-4 text-success-600" />
                ) : (
                  <Circle className="size-4 text-muted-foreground" />
                )}
                {item.label}
              </span>
              <span className="tabular-nums text-muted-foreground">{item.value}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          {customerVisible
            ? 'Customers can see and buy this product.'
            : 'Not visible to customers yet.'}
        </p>
      </CardContent>
    </Card>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent className="space-y-3">
          {['a', 'b', 'c', 'd', 'e'].map((k) => (
            <Skeleton key={k} className="h-5 w-full" />
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {['x', 'y', 'z'].map((k) => (
              <Skeleton key={k} className="h-12 w-full" />
            ))}
          </div>
          <Skeleton className="h-2 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function ProductDetailPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = use(params);
  const queryClient = useQueryClient();

  const { data: product, isLoading, isError, refetch } = useQuery({
    queryKey: ['product', id],
    queryFn: () => getProduct(id),
  });

  const toggleAvailability = useMutation({
    mutationFn: (next: boolean) => updateProduct(id, { isAvailable: next }),
    onSuccess: (updated) => {
      toast.success(
        updated.isAvailable ? 'Marked available' : 'Marked unavailable',
      );
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err) => {
      const message =
        err instanceof ApiError ? err.message : 'Failed to update product';
      toast.error(message);
    },
  });

  const backLink = (
    <Button variant="ghost" size="sm" render={<Link href="/products" />}>
      <ArrowLeft className="size-4" />
      Back
    </Button>
  );

  if (isError) {
    return (
      <div>
        <PageHeader title="Product" actions={backLink} />
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-muted-foreground">
          <AlertCircle className="size-8" />
          <p>Failed to load product.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 size-4" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading || !product) {
    return (
      <div>
        <PageHeader title="Product" actions={backLink} />
        <DetailSkeleton />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={product.name}
        description={`${product.category?.name || 'Unknown'} · ${formatProductPrice(
          product,
        )}`}
        actions={
          <div className="flex items-center gap-2">
            {backLink}
            <RenameProductDialog
              productId={product.id}
              currentName={product.name}
            />
            <UploadVouchersDialog
              productId={product.id}
              productName={product.name}
            />
            <ArchiveProductButton
              productId={product.id}
              archivedAt={product.archivedAt}
            />
            <DeleteProductDialog
              productId={product.id}
              productName={product.name}
            />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DetailsCard
          product={product}
          onToggle={() => toggleAvailability.mutate(!product.isAvailable)}
          isToggling={toggleAvailability.isPending}
        />
        <PricingCard
          key={`${product.id}-${product.markupBps ?? 'global'}-${product.baseAmount ?? product.priceUsd ?? ''}-${product.snapshotNgnPrice}`}
          product={product}
        />
        <VoucherStatsCard product={product} />
        <ReadinessCard product={product} />
        <div className="lg:col-span-2">
          <StockHistoryCard productId={product.id} />
        </div>
      </div>
    </div>
  );
}
