'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ChevronDown, Plus, RefreshCw, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { getCategories } from '@/lib/api/categories';

import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/hooks/use-permissions';
import { getProducts } from '@/lib/api/products';
import { formatProductPrice } from '@/lib/money';
import {
  filterProductList,
  groupProductsByBrand,
  isStockFilter,
  type StockFilter,
} from '@/lib/product-list';
import type { ProductWithStats } from '@/lib/types';
import { cn } from '@/lib/utils';

const SKELETON_KEYS = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'];

const ALL_CATEGORIES = 'ALL';

const STOCK_SELECT_ITEMS: Record<StockFilter, string> = {
  all: 'All stock',
  in_stock: 'In stock',
  out_of_stock: 'Out of stock',
  unavailable: 'Unavailable',
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
    <div className="min-w-36 space-y-1">
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
      <Badge className="border-0 bg-neutral-100 text-neutral-500 hover:bg-neutral-100">
        Unavailable
      </Badge>
    );
  }
  if (stockAvailable === 0) {
    return (
      <Badge className="border-0 bg-error-100 text-error-700 hover:bg-error-100">
        Out of stock
      </Badge>
    );
  }
  return (
    <Badge className="border-0 bg-success-100 text-success-700 hover:bg-success-100">
      Available
    </Badge>
  );
}

function ProductsTableSkeleton() {
  return (
    <div className="rounded-lg border border-border">
      {SKELETON_KEYS.map((k) => (
        <div
          key={k}
          className="flex items-center gap-3 border-b border-border/60 px-3 py-3 last:border-b-0"
        >
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-5 w-20" />
        </div>
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

function ProductsEmpty({ tab }: Readonly<{ tab: string }>) {
  const isAll = tab === ALL_CATEGORIES;
  return (
    <EmptyState
      title={isAll ? 'No products yet' : 'No products in this category'}
      message={
        isAll
          ? 'A Super Admin can create the first product.'
          : 'Choose another category to see the rest of the catalog.'
      }
    />
  );
}

function ProductsNoMatch({ onClear }: Readonly<{ onClear: () => void }>) {
  return (
    <EmptyState
      title="No products match"
      message="Clear search or stock filter to see the rest of this category."
      action={
        <Button variant="outline" size="sm" onClick={onClear}>
          Clear filters
        </Button>
      }
    />
  );
}

function ProductRow({ product }: Readonly<{ product: ProductWithStats }>) {
  const router = useRouter();
  const href = `/products/${product.id}`;

  return (
    <tr
      className="cursor-pointer border-t border-border/60 align-middle hover:bg-muted/30"
      onClick={(event) => {
        if ((event.target as HTMLElement).closest('a')) return;
        router.push(href);
      }}
    >
      <td className="px-3 py-2">
        <Link href={href} className="font-medium hover:underline">
          {product.name}
        </Link>
        {product.sku ? (
          <p className="font-mono text-xs text-muted-foreground">{product.sku}</p>
        ) : null}
      </td>
      <td className="px-3 py-2 text-sm">{formatProductPrice(product)}</td>
      <td className="px-3 py-2 text-sm text-muted-foreground">
        {product.category?.name || 'Unknown'}
      </td>
      <td className="px-3 py-2">
        <StockBar stats={product.voucherStats} />
      </td>
      <td className="px-3 py-2">
        <AvailabilityBadge
          isAvailable={product.isAvailable}
          stockAvailable={product.voucherStats.available}
        />
      </td>
    </tr>
  );
}

function ProductsTable({ products }: Readonly<{ products: ProductWithStats[] }>) {
  const groups = groupProductsByBrand(products);
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Product</th>
            <th className="px-3 py-2 font-medium">Face</th>
            <th className="px-3 py-2 font-medium">Category</th>
            <th className="px-3 py-2 font-medium">Stock</th>
            <th className="px-3 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <BrandSection key={group.brandId ?? group.brandName} group={group} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BrandSection({
  group,
}: Readonly<{
  group: ReturnType<typeof groupProductsByBrand>[number];
}>) {
  const [open, setOpen] = useState(true);

  return (
    <>
      <tr className="bg-muted/20">
        <th colSpan={5} className="px-0 py-0 font-medium">
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-muted/40"
          >
            <ChevronDown
              className={cn(
                'size-4 shrink-0 transition-transform',
                !open && '-rotate-90',
              )}
              aria-hidden
            />
            {group.brandName}
            <span className="font-normal normal-case text-muted-foreground/80">
              {group.products.length}
            </span>
          </button>
        </th>
      </tr>
      {open
        ? group.products.map((product) => (
            <ProductRow key={product.id} product={product} />
          ))
        : null}
    </>
  );
}

function ProductsBody({
  isLoading,
  isError,
  refetch,
  products,
  tab,
  query,
  stock,
  onClearFilters,
}: Readonly<{
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  products: ProductWithStats[] | undefined;
  tab: string;
  query: string;
  stock: StockFilter;
  onClearFilters: () => void;
}>) {
  const filtered = useMemo(
    () => (products ? filterProductList(products, query, stock) : []),
    [products, query, stock],
  );

  if (isError) return <ProductsError onRetry={refetch} />;
  if (isLoading || !products) return <ProductsTableSkeleton />;
  if (products.length === 0) return <ProductsEmpty tab={tab} />;
  if (filtered.length === 0) return <ProductsNoMatch onClear={onClearFilters} />;
  return <ProductsTable products={filtered} />;
}

export default function ProductsPage() {
  const [tab, setTab] = useState<string>(ALL_CATEGORIES);
  const [query, setQuery] = useState('');
  const [stock, setStock] = useState<StockFilter>('all');
  const { can } = usePermissions();

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['products', tab],
    queryFn: () =>
      getProducts(tab === ALL_CATEGORIES ? undefined : tab),
  });

  const products = data;
  const categoryItems: Record<string, string> = {
    [ALL_CATEGORIES]: 'All categories',
    ...Object.fromEntries(categories.map((c) => [c.id, c.name])),
  };

  return (
    <div>
      <PageHeader
        title="Products"
        description="Gift card and top-up SKUs. New products start unavailable until their price is reviewed, stock is uploaded and they are marked available."
        actions={
          // GBP-006: products:create is Super Admin only (backend SuperAdminGuard).
          can('products:create') ? (
            <Button render={<Link href="/products/new" />}>
              <Plus className="size-4" />
              Create product
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, SKU, or brand"
            className="pl-8"
            aria-label="Search products"
          />
        </div>
        <Select
          items={categoryItems}
          value={tab}
          onValueChange={(value) => {
            if (!value) return;
            if (value === ALL_CATEGORIES || categories.some((c) => c.id === value)) {
              setTab(value);
            }
          }}
        >
          <SelectTrigger className="w-48" aria-label="Filter by category">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CATEGORIES}>All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          items={STOCK_SELECT_ITEMS}
          value={stock}
          onValueChange={(value) => {
            if (value && isStockFilter(value)) setStock(value);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Stock" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stock</SelectItem>
            <SelectItem value="in_stock">In stock</SelectItem>
            <SelectItem value="out_of_stock">Out of stock</SelectItem>
            <SelectItem value="unavailable">Unavailable</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ProductsBody
        isLoading={isLoading}
        isError={isError}
        refetch={refetch}
        products={products}
        tab={tab}
        query={query}
        stock={stock}
        onClearFilters={() => {
          setQuery('');
          setStock('all');
        }}
      />
    </div>
  );
}
