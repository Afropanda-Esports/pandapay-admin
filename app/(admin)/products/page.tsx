'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { CreateProductDialog } from '@/components/features/products/create-product-dialog';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getProducts } from '@/lib/api/products';
import type { ProductCategory, ProductWithStats } from '@/lib/types';
import { cn } from '@/lib/utils';

type Tab = 'ALL' | ProductCategory;

const TABS: { value: Tab; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'GIFT_CARD', label: 'Gift Cards' },
  { value: 'GAME_TOP_UP', label: 'Game Top-ups' },
  { value: 'AIRTIME', label: 'Airtime' },
];

const CATEGORY_LABEL: Record<ProductCategory, string> = {
  GIFT_CARD: 'Gift Card',
  GAME_TOP_UP: 'Game Top-up',
  AIRTIME: 'Airtime',
};

const SKELETON_KEYS = ['s1', 's2', 's3', 's4', 's5', 's6'];

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

function StockBar({ stats }: Readonly<{ stats: ProductWithStats['voucherStats'] }>) {
  const { available, total } = stats;
  const ratio = total === 0 ? 0 : available / total;
  const pct = Math.round(ratio * 100);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {available.toLocaleString('en-NG')} / {total.toLocaleString('en-NG')}{' '}
          available
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-all', stockBarColor(available, total))}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function AvailabilityBadge({
  isAvailable,
  stockAvailable,
}: Readonly<{ isAvailable: boolean; stockAvailable: number }>) {
  if (!isAvailable) {
    return (
      <Badge className="bg-neutral-100 text-neutral-500 hover:bg-neutral-100 border-0">
        Unavailable
      </Badge>
    );
  }
  if (stockAvailable === 0) {
    return (
      <Badge className="bg-error-100 text-error-700 hover:bg-error-100 border-0">
        Out of stock
      </Badge>
    );
  }
  return (
    <Badge className="bg-success-100 text-success-700 hover:bg-success-100 border-0">
      Available
    </Badge>
  );
}

function ProductCard({ product }: Readonly<{ product: ProductWithStats }>) {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base">{product.name}</CardTitle>
          <AvailabilityBadge
            isAvailable={product.isAvailable}
            stockAvailable={product.voucherStats.available}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {CATEGORY_LABEL[product.category]} ·{' '}
          {formatPrice(product.snapshotNgnPrice, product.currency)}
        </p>
      </CardHeader>
      <CardContent>
        <StockBar stats={product.voucherStats} />
      </CardContent>
      <CardFooter className="justify-end">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href={`/products/${product.id}`} />}
        >
          View →
        </Button>
      </CardFooter>
    </Card>
  );
}

function ProductCardSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader>
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-2 w-full" />
      </CardContent>
      <CardFooter className="justify-end">
        <Skeleton className="h-7 w-16" />
      </CardFooter>
    </Card>
  );
}

const GRID_CLASSES =
  'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

function ProductsLoading() {
  return (
    <div className={GRID_CLASSES}>
      {SKELETON_KEYS.map((key) => (
        <ProductCardSkeleton key={key} />
      ))}
    </div>
  );
}

function ProductsError({ onRetry }: Readonly<{ onRetry: () => void }>) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-muted-foreground">
      <AlertCircle className="size-8" />
      <p>Failed to load products.</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="mr-2 size-4" /> Retry
      </Button>
    </div>
  );
}

function ProductsEmpty({ tab }: Readonly<{ tab: Tab }>) {
  const isAll = tab === 'ALL';
  return (
    <EmptyState
      title={isAll ? 'No products yet' : 'No products in this category'}
      message={
        isAll
          ? 'Create your first product to start fulfilling orders.'
          : 'Switch tabs or create a new product in this category.'
      }
    />
  );
}

function ProductsGrid({ products }: Readonly<{ products: ProductWithStats[] }>) {
  return (
    <div className={GRID_CLASSES}>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}

function ProductsBody({
  isLoading,
  isError,
  refetch,
  products,
  tab,
}: Readonly<{
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  products: ProductWithStats[] | undefined;
  tab: Tab;
}>) {
  if (isError) return <ProductsError onRetry={refetch} />;
  if (isLoading || !products) return <ProductsLoading />;
  if (products.length === 0) return <ProductsEmpty tab={tab} />;
  return <ProductsGrid products={products} />;
}

export default function ProductsPage() {
  const [tab, setTab] = useState<Tab>('ALL');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['products'],
    queryFn: () => getProducts(),
  });

  const filtered =
    !data || tab === 'ALL' ? data : data.filter((p) => p.category === tab);

  return (
    <div>
      <PageHeader
        title="Products"
        description="Manage gift card and top-up SKUs."
        actions={<CreateProductDialog />}
      />

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as Tab)}
        className="mb-4"
      >
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <ProductsBody
        isLoading={isLoading}
        isError={isError}
        refetch={refetch}
        products={filtered}
        tab={tab}
      />
    </div>
  );
}
