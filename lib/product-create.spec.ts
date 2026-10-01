import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  EMPTY_CREATE_FORM,
  SKU_PATTERN,
  activeCategories,
  brandsInRegion,
  buildCreateProductBody,
  createErrorMessage,
  createFormIssues,
  currencyOfRegion,
  linesOfBrand,
  productNameIssue,
  readinessChecklist,
  regionOptionLabel,
  selectBrand,
  selectRegion,
  skuIssue,
  suggestSku,
  type CreateProductForm,
} from './product-create.ts';

/**
 * GBP-006 — the Super Admin's product creation form. The hierarchy already
 * exists; the form picks from it. The currency is the REGION's and is never
 * sent. The backend recomputes the price and is the authority on every rule
 * checked here; these checks only explain problems before submit.
 */

const regions = [
  { id: 'r-us', code: 'US', name: 'United States', currency: 'USD', isActive: true },
  { id: 'r-uk', code: 'UK', name: 'United Kingdom', currency: 'GBP', isActive: false },
  { id: 'r-ng', code: 'NG', name: 'Nigeria', currency: 'NGN', isActive: true },
];
const brands = [
  { id: 'b-amz-us', regionId: 'r-us', name: 'Amazon', isActive: true },
  { id: 'b-amz-uk', regionId: 'r-uk', name: 'Amazon', isActive: true },
  { id: 'b-psn-uk', regionId: 'r-uk', name: 'PlayStation', isActive: true },
  { id: 'b-off-uk', regionId: 'r-uk', name: 'Steam', isActive: false },
];
const lines = [
  { id: 'l-amz-uk', brandId: 'b-amz-uk', name: 'Amazon UK', isActive: true },
  { id: 'l-psn-uk', brandId: 'b-psn-uk', name: 'PSN UK', isActive: true },
  { id: 'l-amz-us', brandId: 'b-amz-us', name: 'Amazon gift card', isActive: true },
  { id: 'l-off', brandId: 'b-amz-uk', name: 'Old', isActive: false },
];

const filled = (over: Partial<CreateProductForm> = {}): CreateProductForm => ({
  ...EMPTY_CREATE_FORM,
  regionId: 'r-uk',
  brandId: 'b-amz-uk',
  lineId: 'l-amz-uk',
  categoryId: 'c-gift',
  name: 'Amazon UK £10',
  sku: 'AMZ-UK-GBP-10',
  faceValue: '10',
  ...over,
});

describe('regions', () => {
  test('every region is offered, inactive ones labelled so UK can be staged', () => {
    assert.equal(regionOptionLabel(regions[0]), 'United States · USD');
    assert.equal(regionOptionLabel(regions[1]), 'United Kingdom · GBP · Inactive');
  });

  test('the currency comes from the region', () => {
    assert.equal(currencyOfRegion(regions, 'r-uk'), 'GBP');
    assert.equal(currencyOfRegion(regions, 'r-us'), 'USD');
    assert.equal(currencyOfRegion(regions, ''), null);
    // An unknown currency is not offered as something it is not.
    assert.equal(
      currencyOfRegion([{ ...regions[0], currency: 'EUR' }], 'r-us'),
      null,
    );
  });
});

describe('dependent selects', () => {
  test('a region scopes the brands (active only)', () => {
    assert.deepEqual(
      brandsInRegion(brands, 'r-uk').map((b) => b.id),
      ['b-amz-uk', 'b-psn-uk'],
    );
    assert.deepEqual(brandsInRegion(brands, ''), []);
  });

  test('a brand scopes the product lines (active only)', () => {
    assert.deepEqual(
      linesOfBrand(lines, 'b-amz-uk').map((l) => l.id),
      ['l-amz-uk'],
    );
  });

  test('only active categories are offered', () => {
    assert.deepEqual(
      activeCategories([
        { id: 'a', isActive: true },
        { id: 'b', isActive: false },
      ]).map((c) => c.id),
      ['a'],
    );
  });

  test('changing the region clears the brand and line', () => {
    const next = selectRegion(filled(), 'r-us');
    assert.equal(next.regionId, 'r-us');
    assert.equal(next.brandId, '');
    assert.equal(next.lineId, '');
    assert.equal(next.name, 'Amazon UK £10'); // unrelated fields survive
  });

  test('re-selecting the same region keeps the children', () => {
    const next = selectRegion(filled(), 'r-uk');
    assert.equal(next.brandId, 'b-amz-uk');
    assert.equal(next.lineId, 'l-amz-uk');
  });

  test('changing the region also clears what only applied to the old currency', () => {
    const ngn = filled({ regionId: 'r-ng', ngnPrice: '8000', declaredUsd: '5' });
    const next = selectRegion(ngn, 'r-uk');
    assert.equal(next.ngnPrice, '');
    assert.equal(next.declaredUsd, '');
  });

  test('changing the brand clears the line', () => {
    const next = selectBrand(filled(), 'b-psn-uk');
    assert.equal(next.brandId, 'b-psn-uk');
    assert.equal(next.lineId, '');
  });
});

describe('name', () => {
  test('2–24 characters', () => {
    assert.equal(productNameIssue('Amazon UK £10'), null);
    assert.match(productNameIssue('')!, /required/);
    assert.match(productNameIssue('A')!, /at least 2/);
    assert.match(productNameIssue('B'.repeat(25))!, /at most 24/);
  });
});

describe('SKU', () => {
  test('the backend pattern', () => {
    assert.equal(String(SKU_PATTERN), String(/^[A-Z0-9][A-Z0-9-]{1,63}$/));
  });

  test('valid SKUs pass', () => {
    for (const ok of ['AMZ-UK-GBP-10', 'PSN-US-USD-100', 'X1']) {
      assert.equal(skuIssue(ok), null, ok);
    }
  });

  test('invalid SKUs are explained — never silently fixed', () => {
    assert.match(skuIssue('')!, /required/);
    assert.match(skuIssue('amz-uk')!, /upper-case/i);
    for (const bad of ['-AMZ', 'A', 'AMZ UK', 'AMZ_UK', `A${'B'.repeat(64)}`]) {
      assert.notEqual(skuIssue(bad), null, bad);
    }
  });

  test('a suggestion follows BRAND-REGION-CUR-AMOUNT and is itself valid', () => {
    assert.equal(
      suggestSku({ brandName: 'Amazon', regionCode: 'UK', currency: 'GBP', faceValue: '10' }),
      'AMAZON-UK-GBP-10',
    );
    assert.equal(
      suggestSku({ brandName: 'Apple iTunes', regionCode: 'US', currency: 'USD', faceValue: '9.99' }),
      'APPLE-ITUNES-US-USD-9-99',
    );
    assert.equal(
      suggestSku({ brandName: 'Amazon', regionCode: 'UK', currency: 'GBP', faceValue: '' }),
      null,
    );
  });
});

describe('createFormIssues — what stops Create before the server is asked', () => {
  test('a complete GBP form has no issues', () => {
    assert.deepEqual(createFormIssues(filled(), 'GBP'), {});
  });

  test('missing hierarchy and fields are reported per field', () => {
    const issues = createFormIssues(EMPTY_CREATE_FORM, null);
    for (const key of ['regionId', 'brandId', 'lineId', 'categoryId', 'name', 'sku']) {
      assert.ok(issues[key as keyof typeof issues], key);
    }
  });

  test('a converted product needs a valid face value; markup must parse', () => {
    assert.ok(createFormIssues(filled({ faceValue: '0' }), 'GBP').faceValue);
    assert.ok(createFormIssues(filled({ markup: '1.5' }), 'GBP').markup);
  });

  test('a naira product needs its naira price and declared dollar value, not a face value', () => {
    const ngn = filled({ regionId: 'r-ng', faceValue: '' });
    const issues = createFormIssues(ngn, 'NGN');
    assert.ok(issues.ngnPrice);
    assert.ok(issues.declaredUsd);
    assert.equal(issues.faceValue, undefined);
  });
});

describe('buildCreateProductBody', () => {
  test('GBP: baseAmount, markup null when blank, unavailable by default, NO currency', () => {
    const body = buildCreateProductBody(filled(), 'GBP');
    assert.deepEqual(body, {
      brandId: 'b-amz-uk',
      lineId: 'l-amz-uk',
      categoryId: 'c-gift',
      name: 'Amazon UK £10',
      sku: 'AMZ-UK-GBP-10',
      baseAmount: '10',
      markupBps: null,
      isAvailable: false,
    });
    assert.equal('currency' in body, false);
    assert.equal('baseCurrency' in body, false);
    assert.equal('priceUsd' in body, false);
  });

  test('0 markup is sent as 0; a markup as itself', () => {
    assert.equal(buildCreateProductBody(filled({ markup: '0' }), 'GBP').markupBps, 0);
    assert.equal(buildCreateProductBody(filled({ markup: '1300' }), 'USD').markupBps, 1300);
  });

  test('USD uses baseAmount, never the deprecated priceUsd', () => {
    const body = buildCreateProductBody(
      filled({ regionId: 'r-us', brandId: 'b-amz-us', lineId: 'l-amz-us' }),
      'USD',
    );
    assert.equal(body.baseAmount, '10');
    assert.equal('priceUsd' in body, false);
  });

  test('NGN sends its native fields and no face value', () => {
    const body = buildCreateProductBody(
      filled({ regionId: 'r-ng', faceValue: '', ngnPrice: '8000', declaredUsd: '5' }),
      'NGN',
    );
    assert.equal(body.ngnPrice, 8000);
    assert.equal(body.priceUsd, 5);
    assert.equal('baseAmount' in body, false);
    assert.equal('markupBps' in body, false);
  });

  test('"available once stocked" is sent as the operator ticked it', () => {
    assert.equal(
      buildCreateProductBody(filled({ availableOnceStocked: true }), 'GBP').isAvailable,
      true,
    );
  });

  test('the preview result is never part of the request', () => {
    const body = buildCreateProductBody(filled(), 'GBP') as Record<string, unknown>;
    assert.equal('ngnPrice' in body, false);
    assert.equal('snapshotNgnPrice' in body, false);
  });

  test('refuses to build from an invalid form', () => {
    assert.throws(() => buildCreateProductBody(filled({ sku: 'bad sku' }), 'GBP'));
  });
});

describe('createErrorMessage — backend refusals, explained', () => {
  const cases: Array<[Record<string, unknown>, RegExp]> = [
    [{ status: 409, code: 'SKU_TAKEN', message: 'SKU "X" is already used' }, /SKU "X" is already used/],
    [{ status: 409, code: 'PRODUCT_NAME_TAKEN', message: '"A" already exists in this product line' }, /already exists in this product line/],
    [{ status: 400, code: 'FX_RATE_MISSING', message: 'Set a GBP/NGN rate first' }, /Set a GBP\/NGN rate first/],
    [{ status: 400, code: 'BAD_REQUEST', message: 'ProductLine does not belong to ProductBrand' }, /ProductLine does not belong to ProductBrand/],
    [{ status: 403, message: 'Super admin access required' }, /Only a Super Admin can create products/],
  ];
  for (const [err, expected] of cases) {
    test(`${String(err.code ?? err.status)}`, () => {
      assert.match(createErrorMessage(err), expected);
    });
  }

  test('an unknown failure is generic', () => {
    assert.equal(createErrorMessage(new Error('boom')), 'Could not create the product.');
  });
});

describe('readinessChecklist — after creation, on the product page', () => {
  test('a new UK product: price shown, no stock, unavailable, region inactive → not visible', () => {
    const list = readinessChecklist({
      snapshotNgnPrice: '23100.00',
      sku: 'AMZ-UK-GBP-10',
      isAvailable: false,
      archivedAt: null,
      voucherStats: { available: 0 },
      regionActive: false,
    });
    assert.deepEqual(list, {
      items: [
        { key: 'price', label: 'Price — review it in the Pricing card', value: '₦23,100', ok: true },
        { key: 'stock', label: 'Stock', value: '0 available', ok: false },
        { key: 'available', label: 'Available', value: 'No', ok: false },
        { key: 'region', label: 'Region active', value: 'No', ok: false },
      ],
      customerVisible: false,
    });
  });

  test('stocked, available, active region, SKU, not archived → visible', () => {
    const list = readinessChecklist({
      snapshotNgnPrice: '18100.00',
      sku: 'PSN-US-USD-10',
      isAvailable: true,
      archivedAt: null,
      voucherStats: { available: 4 },
      regionActive: true,
    });
    assert.equal(list.customerVisible, true);
  });

  test('an unknown region state is never reported as visible', () => {
    const list = readinessChecklist({
      snapshotNgnPrice: '18100.00',
      sku: 'PSN-US-USD-10',
      isAvailable: true,
      archivedAt: null,
      voucherStats: { available: 4 },
      regionActive: null,
    });
    assert.equal(list.customerVisible, false);
    assert.equal(list.items[3].value, 'Unknown');
  });
});
