import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  SUPPORTED_CURRENCIES,
  VOUCHER_CURRENCIES,
  formatMoney,
  formatProductPrice,
  isSupportedCurrency,
  isVoucherCurrency,
} from './money.ts';

// GBP-003: GBP is a real pricing currency in the backend, so the console must
// be able to render it.
test('supported (pricing) set matches the backend enum exactly', () => {
  assert.deepEqual([...SUPPORTED_CURRENCIES].sort(), ['GBP', 'NGN', 'USD']);
});

test('isSupportedCurrency accepts only the closed set', () => {
  assert.equal(isSupportedCurrency('NGN'), true);
  assert.equal(isSupportedCurrency('USD'), true);
  assert.equal(isSupportedCurrency('GBP'), true);
  for (const code of ['XYZ', 'EUR', 'gbp', 'ngn', 'usd', '', 'NGNN']) {
    assert.equal(isSupportedCurrency(code), false);
  }
});

// GBP-003 / DECISION F: vouchers are their own capability. Widening the
// pricing list must not put GBP in the voucher dialog.
test('voucher currencies stay NGN and USD', () => {
  assert.deepEqual([...VOUCHER_CURRENCIES].sort(), ['NGN', 'USD']);
  assert.equal(isVoucherCurrency('GBP'), false);
  assert.equal(isVoucherCurrency('USD'), true);
  assert.equal(isVoucherCurrency('NGN'), true);
});

test('formatMoney renders pounds', () => {
  assert.equal(formatMoney(10, 'GBP'), '£10');
  assert.equal(formatMoney('10.00', 'GBP'), '£10');
  assert.equal(formatMoney('1234.5', 'GBP'), '£1,234.50');
});

test('formatMoney omits decimals on whole NGN amounts', () => {
  assert.equal(formatMoney('8000.00', 'NGN'), '₦8,000');
});

test('formatMoney keeps decimals on fractional USD amounts', () => {
  assert.equal(formatMoney('5.50', 'USD'), '$5.50');
});

test('formatMoney groups thousands', () => {
  assert.equal(formatMoney('1234567.89', 'NGN'), '₦1,234,567.89');
});

test('formatMoney omits decimals on whole USD', () => {
  assert.equal(formatMoney('5.00', 'USD'), '$5');
});

test('formatMoney refuses an unsupported currency rather than rendering it', () => {
  assert.throws(
    () => formatMoney('6985', 'XYZ' as 'NGN'),
    /Unsupported currency/,
  );
});

/**
 * `baseCurrencyFor` is gone with PRICE-004. CUR-001-FE derived a product's
 * currency from its pricing mode; the mode no longer exists, and currency now
 * comes from the region, so there is no mapping left to invert. Its coverage
 * moves to `lib/markup.spec.ts`, which guards the distinction that replaced it.
 */

// ─── formatProductPrice (GBP-003) ────────────────────────────────────────────

const base = { snapshotNgnPrice: '23100.00', priceUsd: null, baseAmount: null };

test('a GBP product shows its pound face value — not dollars, not the naira snapshot', () => {
  const shown = formatProductPrice({
    ...base,
    baseCurrency: 'GBP',
    baseAmount: '10.00',
  });
  assert.equal(shown, '£10');
  assert.notEqual(shown, '$10');
  assert.notEqual(shown, '£23,100');
  assert.notEqual(shown, '₦23,100');
});

test('a USD product shows its face value from baseAmount', () => {
  assert.equal(
    formatProductPrice({
      baseCurrency: 'USD',
      baseAmount: '10.00',
      priceUsd: '10.00',
      snapshotNgnPrice: '17600.00',
    }),
    '$10',
  );
});

test('a USD product from a backend without baseAmount still renders from priceUsd', () => {
  assert.equal(
    formatProductPrice({
      baseCurrency: 'USD',
      priceUsd: '5.50',
      snapshotNgnPrice: '9000.00',
    }),
    '$5.50',
  );
});

test('a naira product shows its naira price, unchanged', () => {
  assert.equal(
    formatProductPrice({
      baseCurrency: 'NGN',
      baseAmount: null,
      priceUsd: '5.00',
      snapshotNgnPrice: '8000.00',
    }),
    '₦8,000',
  );
});

test('a GBP product never falls back to priceUsd', () => {
  assert.throws(
    () =>
      formatProductPrice({
        baseCurrency: 'GBP',
        baseAmount: null,
        priceUsd: '10.00',
        snapshotNgnPrice: '23100.00',
      }),
    /GBP product is missing its face value/,
  );
});
