import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  toBulkDiscountBody,
  validateBulkDiscountForm,
  type BulkDiscountForm,
} from './bulk-discount-form.ts';

const valid: BulkDiscountForm = {
  enabled: true,
  bps: '250',
  thresholdNgn: '100000',
};

describe('validateBulkDiscountForm', () => {
  it('accepts 250 bps over ₦100,000', () => {
    assert.deepEqual(validateBulkDiscountForm(valid), {});
  });

  it('accepts 0 and 10000 bps', () => {
    assert.deepEqual(validateBulkDiscountForm({ ...valid, bps: '0' }), {});
    assert.deepEqual(validateBulkDiscountForm({ ...valid, bps: '10000' }), {});
  });

  for (const bps of ['2.5', '-1', '10001', '', 'abc']) {
    it(`rejects bps ${JSON.stringify(bps)} with a message`, () => {
      const errors = validateBulkDiscountForm({ ...valid, bps });
      assert.equal(typeof errors.bps, 'string');
      assert.ok(errors.bps!.length > 0);
      assert.equal(errors.thresholdNgn, undefined);
    });
  }

  it('accepts a threshold with up to 2 decimals', () => {
    assert.deepEqual(
      validateBulkDiscountForm({ ...valid, thresholdNgn: '99999.50' }),
      {},
    );
  });

  for (const thresholdNgn of ['0', '0.00', '-5', 'abc', '', '100.123']) {
    it(`rejects threshold ${JSON.stringify(thresholdNgn)} with a message`, () => {
      const errors = validateBulkDiscountForm({ ...valid, thresholdNgn });
      assert.equal(typeof errors.thresholdNgn, 'string');
      assert.ok(errors.thresholdNgn!.length > 0);
      assert.equal(errors.bps, undefined);
    });
  }
});

describe('toBulkDiscountBody', () => {
  it('sends whole-number bps and a 2-decimal threshold string', () => {
    assert.deepEqual(toBulkDiscountBody(valid), {
      enabled: true,
      bps: 250,
      thresholdNgn: '100000.00',
    });
  });

  it('keeps the decimals that were typed, padded to two', () => {
    assert.deepEqual(
      toBulkDiscountBody({ enabled: false, bps: ' 125 ', thresholdNgn: '5000.5' }),
      { enabled: false, bps: 125, thresholdNgn: '5000.50' },
    );
  });
});
