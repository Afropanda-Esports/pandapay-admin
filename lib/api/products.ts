import { apiFetch } from './client';
import type {
  PricingMode,
  Product,
  ProductWithStats,
  VoucherStats,
  Region,
  ProductBrand,
  ProductLine,
} from '@/lib/types';

export const getRegions = () => apiFetch<Region[]>('/admin/regions');

export const createRegion = (body: { code: string; name: string; currency: string }) =>
  apiFetch<Region>('/admin/regions', {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const updateRegion = (id: string, body: { name: string; isActive?: boolean }) =>
  apiFetch<Region>(`/admin/regions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

export const getProductBrands = (regionId?: string, categoryId?: string) => {
  const params = new URLSearchParams();
  if (regionId) params.append('regionId', regionId);
  if (categoryId) params.append('categoryId', categoryId);
  const q = params.toString();
  return apiFetch<ProductBrand[]>(`/admin/product-brands${q ? `?${q}` : ''}`);
};

export const getProductLines = (brandId?: string) => {
  const q = brandId ? `?brandId=${brandId}` : '';
  return apiFetch<ProductLine[]>(`/admin/product-lines${q}`);
};

export const createProductLine = (body: { brandId: string; name: string }) =>
  apiFetch<ProductLine>('/admin/product-lines', {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const updateProductLine = (
  id: string,
  body: { name?: string; isActive?: boolean },
) =>
  apiFetch<ProductLine>(`/admin/product-lines/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

export const getProducts = (categoryId?: string) =>
  apiFetch<ProductWithStats[]>(
    `/admin/products${categoryId ? `?categoryId=${categoryId}` : ''}`,
  );

export const getProduct = (id: string) =>
  apiFetch<ProductWithStats>(`/admin/products/${id}`);

export const createProduct = (body: {
  brandId: string;
  lineId: string;
  name: string;
  categoryId: string;
  currency?: string;
  pricingMode: PricingMode;
  priceUsd?: number;
  manualPriceNgn?: number;
}) =>
  apiFetch<Product>('/admin/products', {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const updateProduct = (
  id: string,
  body: { name?: string; isAvailable?: boolean },
) =>
  apiFetch<Product>(`/admin/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

export const updateProductPricing = (
  id: string,
  body: {
    pricingMode?: PricingMode;
    priceUsd?: number;
    manualPriceNgn?: number;
  },
) =>
  apiFetch<Product>(`/admin/products/${id}/pricing`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

export const uploadVouchers = (id: string, codes: string[]) =>
  apiFetch<{ inserted: number }>(`/admin/products/${id}/vouchers`, {
    method: 'POST',
    body: JSON.stringify({ codes }),
  });

export const getVoucherStats = (id: string) =>
  apiFetch<{ productId: string } & VoucherStats>(
    `/admin/products/${id}/vouchers/stats`,
  );
