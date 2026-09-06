import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  SUPPORTED_CURRENCIES,
  formatMoney,
  isSupportedCurrency,
} from './money.ts';

test('supported set matches the backend enum exactly', () => {
  assert.deepEqual([...SUPPORTED_CURRENCIES].sort(), ['NGN', 'USD']);
});

test('isSupportedCurrency accepts only the closed set', () => {
  assert.equal(isSupportedCurrency('NGN'), true);
  assert.equal(isSupportedCurrency('USD'), true);
  for (const code of ['XYZ', 'GBP', 'ngn', 'usd', '', 'NGNN']) {
    assert.equal(isSupportedCurrency(code), false);
  }
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
