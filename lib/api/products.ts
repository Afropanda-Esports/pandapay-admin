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

// CAT-007 removed category scoping from brands; the backend ignores a
// categoryId param, so passing one only made the query key churn.
export const getProductBrands = (regionId?: string) => {
  const params = new URLSearchParams();
  if (regionId) params.append('regionId', regionId);
  const q = params.toString();
  return apiFetch<ProductBrand[]>(`/admin/product-brands${q ? `?${q}` : ''}`);
};

/**
 * CAT-007 constrains the brand name to LAUNCH_BRANDS server-side. The list is
 * fetched rather than hardcoded so it cannot drift from the constant the
 * WhatsApp bot matches customer messages against.
 */
export const getAllowedBrandNames = () =>
  apiFetch<string[]>('/admin/product-brands/allowed-names');

/** CAT-009: refused with a 409 when any product names the brand, or any line
 *  hangs off it. Deactivating is the reversible alternative. */
export const deleteProductBrand = (id: string) =>
  apiFetch<{ deleted: true }>(`/admin/product-brands/${id}`, {
    method: 'DELETE',
  });

export const updateProductBrand = (
  id: string,
  body: { name?: string; isActive?: boolean },
) =>
  apiFetch<ProductBrand>(`/admin/product-brands/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

export const createProductBrand = (body: { regionId: string; name: string }) =>
  apiFetch<ProductBrand>('/admin/product-brands', {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const getProductLines = (brandId?: string) => {
  const q = brandId ? `?brandId=${brandId}` : '';
  return apiFetch<ProductLine[]>(`/admin/product-lines${q}`);
};

export const createProductLine = (body: { brandId: string; name: string }) =>
  apiFetch<ProductLine>('/admin/product-lines', {
    method: 'POST',
    body: JSON.stringify(body),
  });

/** CAT-009: refused with a 409 when any product still uses the line. */
export const deleteProductLine = (id: string) =>
  apiFetch<{ deleted: true }>(`/admin/product-lines/${id}`, {
    method: 'DELETE',
  });

export const updateProductLine = (
  id: string,
  body: { name?: string; isActive?: boolean },
) =>
  apiFetch<ProductLine>(`/admin/product-lines/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

/**
 * CAT-004: the three endpoints that let a product leave the catalog.
 *
 * `deleteProduct` is SUPER_ADMIN-only and succeeds only when nothing
 * references the product — the server answers 409 with what blocked it.
 * Archiving is the reversible alternative and sits at ADMIN level.
 */
export const deleteProduct = (id: string) =>
  apiFetch<{ deleted: true; deletedVouchers: number }>(`/admin/products/${id}`, {
    method: 'DELETE',
  });

export const archiveProduct = (id: string) =>
  apiFetch<Product>(`/admin/products/${id}/archive`, { method: 'POST' });

export const unarchiveProduct = (id: string) =>
  apiFetch<Product>(`/admin/products/${id}/unarchive`, { method: 'POST' });

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
  /** CUR-001: required closed-set field; replaces free-text `currency`. */
  baseCurrency: 'NGN' | 'USD';
  pricingMode: PricingMode;
  priceUsd?: number;
  /** Transient create/update input only — not stored on the product row (PRICE-002). */
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
