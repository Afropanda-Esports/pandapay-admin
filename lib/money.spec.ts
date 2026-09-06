import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  SUPPORTED_CURRENCIES,
  baseCurrencyFor,
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

test('baseCurrencyFor maps each pricing mode (D1a)', () => {
  assert.equal(baseCurrencyFor('MANUAL_NGN'), 'NGN');
  assert.equal(baseCurrencyFor('GLOBAL_FX'), 'USD');
});

// Mutation check: inverting the mapping must fail. If this test only checked
// "returns a supported currency", an inverted map would still pass.
test('baseCurrencyFor mapping is not inverted', () => {
  assert.notEqual(baseCurrencyFor('MANUAL_NGN'), 'USD');
  assert.notEqual(baseCurrencyFor('GLOBAL_FX'), 'NGN');
});
