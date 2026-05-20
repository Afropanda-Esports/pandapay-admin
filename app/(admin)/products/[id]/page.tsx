'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  PauseCircle,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { use } from 'react';
import { toast } from 'sonner';

import { PricingCard } from '@/components/features/products/pricing-card';
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
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/lib/api/client';
import { getProduct, updateProduct } from '@/lib/api/products';
import type { ProductCategory, ProductWithStats } from '@/lib/types';
import { cn } from '@/lib/utils';

const CATEGORY_LABEL: Record<ProductCategory, string> = {
  GIFT_CARD: 'Gift Card',
  GAME_TOP_UP: 'Game Top-up',
  AIRTIME: 'Airtime',
};

const formatPrice = (price: string, currency: string) => {
  const n = Number.parseFloat(price);
  const formatted = Number.isFinite(n)
    ? n.toLocaleString('en-NG', { maximumFractionDigits: 2 })
    : price;
  return currency === 'NGN' ? `₦${formatted}` : `${formatted} ${currency}`;
};

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
            value={CATEGORY_LABEL[product.category]}
          />
          <DetailRow label="Currency" value={product.currency} />
          <DetailRow
            label="Status"
            value={
              product.isAvailable ? (
                <Badge className="bg-success-100 text-success-700 hover:bg-success-100 border-0">
                  Available
                </Badge>
              ) : (
                <Badge className="bg-neutral-100 text-neutral-500 hover:bg-neutral-100 border-0">
                  Unavailable
                </Badge>
              )
            }
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
  const { available, total, used } = product.voucherStats;
  const ratio = total === 0 ? 0 : available / total;
  const pct = Math.round(ratio * 100);

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
        description={`${CATEGORY_LABEL[product.category]} · ${formatPrice(
          product.snapshotNgnPrice,
          product.currency,
        )}`}
        actions={
          <div className="flex items-center gap-2">
            {backLink}
            <UploadVouchersDialog
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
          key={`${product.id}-${product.pricingMode}-${product.priceUsd ?? ''}-${product.manualPriceNgn ?? ''}`}
          product={product}
        />
        <VoucherStatsCard product={product} />
      </div>
    </div>
  );
}
