import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  RATE_STALE_AFTER_DAYS,
  affectedProductCount,
  canSetRate,
  describeLargeRateChange,
  formatChangePercent,
  largeRateChangeFrom,
  managementLabel,
  rateAgeLabel,
  rateInputIssue,
  staleRateWarning,
} from './currency-rates.ts';

/**
 * GBP-005 — the Currency rates page. USD is the oracle's (read-only); GBP is a
 * manually managed business rate a Super Admin sets (DECISIONS C, Q, R, S).
 */

const NOW = new Date('2026-10-05T12:00:00.000Z');
const daysAgo = (d: number, extraMs = 0) =>
  new Date(NOW.getTime() - d * 86_400_000 - extraMs).toISOString();

describe('managementLabel / canSetRate', () => {
  test('USD is automatic (oracle) and can never be set here', () => {
    assert.equal(managementLabel('ORACLE'), 'Automatic · oracle');
    assert.equal(canSetRate('ORACLE', true), false);
  });

  test('GBP is manual; only a Super Admin (pricing:manage) can set it', () => {
    assert.equal(managementLabel('MANUAL'), 'Manual');
    assert.equal(canSetRate('MANUAL', true), true);
    assert.equal(canSetRate('MANUAL', false), false);
  });
});

describe('rateAgeLabel', () => {
  test('reads as "Set … ago"', () => {
    assert.equal(rateAgeLabel(daysAgo(2), NOW), 'Set 2 days ago');
    assert.equal(rateAgeLabel(daysAgo(0, 5 * 60_000), NOW), 'Set 5 minutes ago');
  });
});

describe('staleRateWarning — DECISION Q: warn after 3 days, never block', () => {
  test('the threshold is 3 days', () => {
    assert.equal(RATE_STALE_AFTER_DAYS, 3);
  });

  test('exactly 3 days is not yet stale', () => {
    assert.equal(staleRateWarning('GBP', daysAgo(3), NOW), null);
  });

  test('older than 3 days warns, and says checkout is not blocked', () => {
    const w = staleRateWarning('GBP', daysAgo(3, 1), NOW);
    assert.ok(w);
    assert.match(w, /GBP\/NGN rate was set 3 days ago/);
    assert.match(w, /not blocked/);
  });

  test('a much older rate names its age', () => {
    assert.match(staleRateWarning('GBP', daysAgo(9), NOW)!, /9 days ago/);
  });

  test('no rate at all is not a staleness warning (the card says "not set")', () => {
    assert.equal(staleRateWarning('GBP', null, NOW), null);
  });
});

describe('rateInputIssue — mirrors the backend: > 0, ≤ 4 dp, ≤ 8 integer digits', () => {
  test('accepts', () => {
    for (const ok of ['2100', '2100.5', '2105.3750', '0.0001', '99999999.9999']) {
      assert.equal(rateInputIssue(ok), null, ok);
    }
  });

  test('refuses', () => {
    for (const bad of ['', '0', '0.0000', '-1', '1.00001', 'abc', '1e3', '123456789']) {
      assert.notEqual(rateInputIssue(bad), null, bad);
    }
  });
});

describe('largeRateChangeFrom — the backend 409, recognised', () => {
  const details = {
    currency: 'GBP',
    previousNgnPerUnit: '2000.0000',
    proposedNgnPerUnit: '2300.0000',
    changePercent: '15.0000',
    direction: 'INCREASE',
    thresholdPercent: '10',
    previousEffectiveFrom: '2026-10-01T00:00:00.000Z',
    requiresConfirmation: true,
  };

  test('a 409 LARGE_RATE_CHANGE yields its details', () => {
    assert.deepEqual(
      largeRateChangeFrom({ status: 409, code: 'LARGE_RATE_CHANGE', details }),
      details,
    );
  });

  test('any other error is not a confirmation prompt', () => {
    assert.equal(largeRateChangeFrom({ status: 409, code: 'OTHER', details }), null);
    assert.equal(largeRateChangeFrom({ status: 400, code: 'INVALID_RATE' }), null);
    assert.equal(largeRateChangeFrom(new Error('x')), null);
  });

  test('describes current, new and the signed change — from the backend figures', () => {
    assert.deepEqual(describeLargeRateChange(details), {
      current: '₦2,000.00 / £1',
      proposed: '₦2,300.00 / £1',
      change: '+15%',
      threshold: '10%',
    });
  });

  test('a decrease is negative', () => {
    assert.equal(
      describeLargeRateChange({
        ...details,
        proposedNgnPerUnit: '1750.0000',
        changePercent: '-12.5000',
        direction: 'DECREASE',
      }).change,
      '−12.5%',
    );
  });
});

describe('formatChangePercent', () => {
  test('trims zeros and signs the value, without floats', () => {
    assert.equal(formatChangePercent('15.0000'), '+15%');
    assert.equal(formatChangePercent('-12.5000'), '−12.5%');
    assert.equal(formatChangePercent('0.0000'), '0%');
    assert.equal(formatChangePercent('3.3333'), '+3.3333%');
  });
});

describe('affectedProductCount', () => {
  test('counts live products priced in the currency', () => {
    const products = [
      { baseCurrency: 'GBP', archivedAt: null },
      { baseCurrency: 'GBP', archivedAt: '2026-09-01T00:00:00Z' },
      { baseCurrency: 'USD', archivedAt: null },
      { baseCurrency: 'GBP' },
    ];
    assert.equal(affectedProductCount(products, 'GBP'), 2);
    assert.equal(affectedProductCount(products, 'USD'), 1);
  });
});
