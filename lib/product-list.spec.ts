import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  filterProductList,
  groupProductsByBrand,
  NO_BRAND_LABEL,
} from './product-list.ts';
import type { ProductWithStats } from './types.ts';

const product = (
  over: Partial<ProductWithStats> & { id: string; name: string },
): ProductWithStats => ({
  brandId: 'b-default',
  lineId: 'l1',
  categoryId: 'c1',
  baseCurrency: 'USD',
  isAvailable: true,
  markupBps: null,
  priceUsd: '10.00',
  baseAmount: '10.00',
  snapshotNgnPrice: '17600.00',
  snapshotAt: '2026-01-01T00:00:00.000Z',
  archivedAt: null,
  sku: null,
  voucherStats: { total: 4, available: 2, used: 2 },
  ...over,
});

const catalog = [
  product({
    id: 'psn-10',
    name: 'PSN (USA) $10',
    sku: 'PSN-USD-10',
    brandId: 'psn',
    brand: {
      id: 'psn',
      regionId: 'us',
      name: 'PlayStation',
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  }),
  product({
    id: 'steam-10',
    name: 'Steam wallet $10',
    sku: 'STM-USD-10',
    brandId: 'steam',
    brand: {
      id: 'steam',
      regionId: 'us',
      name: 'Steam',
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  }),
  product({
    id: 'nintendo',
    name: 'Nintendo eShop $5',
    sku: 'NIN-USD-5',
    brandId: 'nin',
    brand: {
      id: 'nin',
      regionId: 'us',
      name: 'Nintendo',
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  }),
  product({
    id: 'xbox',
    name: 'Xbox Live $1',
    sku: 'XB-USD-1',
    brandId: 'xbox',
    brand: {
      id: 'xbox',
      regionId: 'us',
      name: 'Xbox',
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  }),
];

test('search "psn" keeps PSN-named products and hides Steam/Nintendo/Xbox', () => {
  const ids = filterProductList(catalog, 'psn', 'all').map((p) => p.id);
  assert.deepEqual(ids, ['psn-10']);
});

test('search matches a SKU substring', () => {
  const ids = filterProductList(catalog, 'STM-USD', 'all').map((p) => p.id);
  assert.deepEqual(ids, ['steam-10']);
});

test('search matches brand name when the product title does not', () => {
  const ids = filterProductList(catalog, 'playstation', 'all').map((p) => p.id);
  assert.deepEqual(ids, ['psn-10']);
});

test('empty query keeps the whole list', () => {
  assert.equal(filterProductList(catalog, '   ', 'all').length, catalog.length);
});

test('missing sku is skipped rather than throwing', () => {
  const row = product({ id: 'bare', name: 'Bare card', sku: null });
  assert.deepEqual(
    filterProductList([row], 'bare', 'all').map((p) => p.id),
    ['bare'],
  );
  assert.deepEqual(filterProductList([row], 'PSN-USD', 'all'), []);
});

test('out of stock is available with zero unused codes', () => {
  const rows = [
    product({
      id: 'sold-out',
      name: 'PSN $1',
      isAvailable: true,
      voucherStats: { total: 10, available: 0, used: 10 },
    }),
    product({
      id: 'live',
      name: 'PSN $5',
      isAvailable: true,
      voucherStats: { total: 4, available: 1, used: 3 },
    }),
    product({
      id: 'dark',
      name: 'PSN $10',
      isAvailable: false,
      voucherStats: { total: 0, available: 0, used: 0 },
    }),
  ];
  assert.deepEqual(
    filterProductList(rows, '', 'out_of_stock').map((p) => p.id),
    ['sold-out'],
  );
});

test('unavailable includes dark SKUs that still have codes', () => {
  const rows = [
    product({
      id: 'dark-stock',
      name: 'Held PSN',
      isAvailable: false,
      voucherStats: { total: 5, available: 5, used: 0 },
    }),
    product({
      id: 'live',
      name: 'Live PSN',
      isAvailable: true,
      voucherStats: { total: 5, available: 5, used: 0 },
    }),
  ];
  assert.deepEqual(
    filterProductList(rows, '', 'unavailable').map((p) => p.id),
    ['dark-stock'],
  );
});

test('in stock requires available flag and unused codes', () => {
  const rows = [
    product({
      id: 'live',
      name: 'Live',
      isAvailable: true,
      voucherStats: { total: 2, available: 1, used: 1 },
    }),
    product({
      id: 'empty',
      name: 'Empty',
      isAvailable: true,
      voucherStats: { total: 2, available: 0, used: 2 },
    }),
    product({
      id: 'dark',
      name: 'Dark',
      isAvailable: false,
      voucherStats: { total: 2, available: 2, used: 0 },
    }),
  ];
  assert.deepEqual(
    filterProductList(rows, '', 'in_stock').map((p) => p.id),
    ['live'],
  );
});

test('groups PlayStation before Steam (A–Z) and sorts SKUs by name', () => {
  const psn3 = product({
    id: 'psn-3',
    name: 'PSN (USA) $3',
    brandId: 'psn',
    brand: {
      id: 'psn',
      regionId: 'us',
      name: 'PlayStation',
      isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  });
  const groups = groupProductsByBrand([catalog[1], psn3, catalog[0]]);
  assert.deepEqual(
    groups.map((g) => g.brandName),
    ['PlayStation', 'Steam'],
  );
  assert.deepEqual(
    groups[0].products.map((p) => p.name),
    ['PSN (USA) $10', 'PSN (USA) $3'],
  );
});

test('products without a brand sit under No brand', () => {
  const row = product({ id: 'orphan', name: 'Orphan', brand: undefined });
  const groups = groupProductsByBrand([row]);
  assert.equal(groups[0].brandName, NO_BRAND_LABEL);
  assert.equal(groups[0].products[0].id, 'orphan');
});
