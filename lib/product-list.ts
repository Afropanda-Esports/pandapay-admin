import type { ProductWithStats } from '@/lib/types';

export const NO_BRAND_LABEL = 'No brand';

export const STOCK_FILTERS = ['all', 'in_stock', 'out_of_stock', 'unavailable'] as const;

export type StockFilter = (typeof STOCK_FILTERS)[number];

export function isStockFilter(value: string): value is StockFilter {
  return (STOCK_FILTERS as readonly string[]).includes(value);
}

export type ProductBrandGroup = {
  brandId: string | null;
  brandName: string;
  products: ProductWithStats[];
};

const matchesStock = (product: ProductWithStats, stock: StockFilter): boolean => {
  if (stock === 'all') return true;
  const available = product.voucherStats.available;
  if (stock === 'unavailable') return !product.isAvailable;
  if (stock === 'in_stock') {
    return product.isAvailable && available > 0;
  }
  return product.isAvailable && available === 0;
};

const matchesQuery = (product: ProductWithStats, needle: string): boolean => {
  if (!needle) return true;
  const haystacks = [
    product.name,
    product.sku ?? '',
    product.brand?.name ?? '',
  ];
  return haystacks.some((value) => value.toLowerCase().includes(needle));
};

export function filterProductList(
  products: readonly ProductWithStats[],
  query: string,
  stock: StockFilter,
): ProductWithStats[] {
  const needle = query.trim().toLowerCase();
  return products.filter(
    (product) => matchesStock(product, stock) && matchesQuery(product, needle),
  );
}

const byName = (a: string, b: string) =>
  a.localeCompare(b, 'en', { sensitivity: 'base' });

export function groupProductsByBrand(
  products: readonly ProductWithStats[],
): ProductBrandGroup[] {
  const groups = new Map<string, ProductBrandGroup>();
  for (const product of products) {
    const brandId = product.brand?.id ?? product.brandId ?? null;
    const brandName = product.brand?.name?.trim() || NO_BRAND_LABEL;
    const key = brandId ?? `name:${brandName}`;
    const existing = groups.get(key);
    if (existing) {
      existing.products.push(product);
    } else {
      groups.set(key, { brandId, brandName, products: [product] });
    }
  }
  return [...groups.values()]
    .map((group) => ({
      ...group,
      products: [...group.products].sort((a, b) => byName(a.name, b.name)),
    }))
    .sort((a, b) => byName(a.brandName, b.brandName) || byName(a.brandId ?? '', b.brandId ?? ''));
}
