import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  formatFxMarkupNgn,
  formatMarkupBps,
  formatPricingMode,
} from './fx-markup-display.ts';

test('formatFxMarkupNgn: null / undefined / empty → em dash', () => {
  assert.equal(formatFxMarkupNgn(null), '—');
  assert.equal(formatFxMarkupNgn(undefined), '—');
  assert.equal(formatFxMarkupNgn(''), '—');
});

test('formatFxMarkupNgn: "0.00" is a real zero, not missing', () => {
  const zero = formatFxMarkupNgn('0.00');
  assert.notEqual(zero, '—');
  assert.ok(zero.includes('₦'), `expected naira in ${zero}`);
  assert.ok(zero.includes('0.00'), `expected 0.00 in ${zero}`);
});

test('formatFxMarkupNgn: "800.00" is locale-formatted NGN', () => {
  const eight = formatFxMarkupNgn('800.00');
  assert.ok(eight.includes('₦'), `expected naira in ${eight}`);
  assert.ok(eight.includes('800.00'), `expected 800.00 in ${eight}`);
});

test('formatMarkupBps: 500 → includes 500 and 5%', () => {
  const label = formatMarkupBps(500);
  assert.ok(label.includes('500'), label);
  assert.ok(label.includes('5%'), label);
});

test('formatMarkupBps: null → em dash', () => {
  assert.equal(formatMarkupBps(null), '—');
  assert.equal(formatMarkupBps(undefined), '—');
});

test('formatPricingMode labels', () => {
  assert.equal(formatPricingMode('GLOBAL_FX'), 'GLOBAL_FX');
  assert.equal(formatPricingMode('MANUAL_NGN'), 'Manual NGN');
  assert.equal(formatPricingMode(null), '—');
  assert.equal(formatPricingMode(undefined), '—');
});
