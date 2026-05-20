import { apiFetch } from './client';
import type {
  PricingMode,
  Product,
  ProductWithStats,
  ProductCategory,
  VoucherStats,
} from '@/lib/types';

export const getProducts = (category?: ProductCategory) =>
  apiFetch<ProductWithStats[]>(
    `/admin/products${category ? `?category=${category}` : ''}`,
  );

export const getProduct = (id: string) =>
  apiFetch<ProductWithStats>(`/admin/products/${id}`);

export const createProduct = (body: {
  name: string;
  category: ProductCategory;
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
