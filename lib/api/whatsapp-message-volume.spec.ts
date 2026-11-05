import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseWhatsappMessageVolume } from './analytics-parse.ts';

const zero = { inbound: 0, outbound: 0, total: 0 };

function body(overrides: Record<string, unknown> = {}) {
  return {
    timezone: 'Africa/Lagos',
    days: 7,
    periods: { day: zero, week: zero, month: zero },
    buckets: [
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
      '2026-11-05',
    ].map((date) => ({ date, ...zero })),
    topUsers: [],
    ...overrides,
  };
}

describe('parseWhatsappMessageVolume', () => {
  it('accepts the canonical body', () => {
    const parsed = parseWhatsappMessageVolume(body());
    assert.equal(parsed.ok, true);
  });

  it('rejects a short bucket list without throwing', () => {
    const parsed = parseWhatsappMessageVolume(body({ buckets: [] }));
    assert.deepEqual(parsed, { ok: false, reason: 'buckets' });
  });

  it('rejects a float count without throwing', () => {
    const parsed = parseWhatsappMessageVolume(
      body({
        periods: {
          day: { inbound: 1.5, outbound: 0, total: 1.5 },
          week: zero,
          month: zero,
        },
      }),
    );
    assert.deepEqual(parsed, { ok: false, reason: 'periods' });
  });

  it('rejects a total that does not add up without throwing', () => {
    const parsed = parseWhatsappMessageVolume(
      body({
        periods: {
          day: { inbound: 1, outbound: 1, total: 3 },
          week: zero,
          month: zero,
        },
      }),
    );
    assert.deepEqual(parsed, { ok: false, reason: 'periods' });
  });
});
