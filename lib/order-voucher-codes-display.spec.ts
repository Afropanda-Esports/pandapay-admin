import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  appliedDiscountCodeCopyText,
  formatAppliedDiscountCode,
} from './order-voucher-codes-display.ts';

test('missing and blank render as an em dash', () => {
  assert.equal(formatAppliedDiscountCode(undefined), '—');
  assert.equal(formatAppliedDiscountCode(null), '—');
  assert.equal(formatAppliedDiscountCode(''), '—');
  assert.equal(formatAppliedDiscountCode('   '), '—');
});

test('a promotional code is shown as plaintext', () => {
  assert.equal(formatAppliedDiscountCode('PANDA-TEST'), 'PANDA-TEST');
});

test('copy text is the code, or null when empty', () => {
  assert.equal(appliedDiscountCodeCopyText('PANDA-TEST'), 'PANDA-TEST');
  assert.equal(appliedDiscountCodeCopyText(''), null);
  assert.equal(appliedDiscountCodeCopyText(undefined), null);
});
