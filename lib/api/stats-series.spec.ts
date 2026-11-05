import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseStatsSeries } from './analytics-parse.ts';

const bucket = {
  date: '2026-11-05',
  ordersCreated: 1,
  ordersFulfilled: 1,
  revenueNgn: '1500.50',
  newUsers: 0,
};

const dates = [
  '2026-10-30',
  '2026-10-31',
  '2026-11-01',
  '2026-11-02',
  '2026-11-03',
  '2026-11-04',
  '2026-11-05',
];

function sevenBuckets(patch?: Partial<typeof bucket>) {
  return dates.map((date, index) =>
    index === dates.length - 1 ? { ...bucket, date, ...patch } : { ...bucket, date },
  );
}

describe('parseStatsSeries', () => {
  it('accepts a 7-day body', () => {
    const parsed = parseStatsSeries({
      days: 7,
      timezone: 'Africa/Lagos',
      buckets: sevenBuckets(),
    });
    assert.equal(parsed.ok, true);
    if (parsed.ok) assert.equal(parsed.data.buckets.length, 7);
  });

  it('rejects a numeric revenue amount without throwing', () => {
    const parsed = parseStatsSeries({
      days: 7,
      timezone: 'Africa/Lagos',
      buckets: sevenBuckets({ revenueNgn: 1500.5 as unknown as string }),
    });
    assert.deepEqual(parsed, { ok: false, reason: 'bucket_fields' });
  });

  it('rejects a short bucket list without throwing', () => {
    const parsed = parseStatsSeries({
      days: 14,
      timezone: 'Africa/Lagos',
      buckets: [bucket],
    });
    assert.deepEqual(parsed, { ok: false, reason: 'buckets' });
  });

  it('rejects a bad date without throwing', () => {
    const parsed = parseStatsSeries({
      days: 7,
      timezone: 'Africa/Lagos',
      buckets: sevenBuckets({ date: '05-11-2026' }),
    });
    assert.deepEqual(parsed, { ok: false, reason: 'date' });
  });
});
