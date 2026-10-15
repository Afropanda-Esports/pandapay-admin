import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  formatOrderVoucherCodes,
  orderVoucherCodesCopyText,
} from './order-voucher-codes-display.ts';

test('missing, undefined, and empty render as an em dash', () => {
  assert.equal(formatOrderVoucherCodes(undefined), '—');
  assert.equal(formatOrderVoucherCodes(null), '—');
  assert.equal(formatOrderVoucherCodes([]), '—');
});

test('one PIN is the plaintext, not an em dash', () => {
  const shown = formatOrderVoucherCodes(['AAAA']);
  assert.equal(shown, 'AAAA');
  assert.notEqual(shown, '—');
});

test('two PINs join with a newline', () => {
  assert.equal(formatOrderVoucherCodes(['AAAA', 'BBBB']), 'AAAA\nBBBB');
});

test('copy text is the joined PINs, or null when empty', () => {
  assert.equal(orderVoucherCodesCopyText(['AAAA', 'BBBB']), 'AAAA\nBBBB');
  assert.equal(orderVoucherCodesCopyText([]), null);
  assert.equal(orderVoucherCodesCopyText(undefined), null);
});
