import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildIntentsOrdersQuery } from './intents-query.ts';

describe('buildIntentsOrdersQuery', () => {
  it('always sends page and limit, nothing else by default', () => {
    const q = buildIntentsOrdersQuery({ page: 1, limit: 20 });
    assert.equal(q.toString(), 'page=1&limit=20');
  });

  it('sends each filter only when it is set', () => {
    const q = buildIntentsOrdersQuery({
      page: 2,
      limit: 20,
      status: 'PAID',
      chain: 'solana',
      from: '2026-11-01',
      to: '2026-11-15',
      orderId: 'GCPSU',
    });
    assert.equal(q.get('page'), '2');
    assert.equal(q.get('status'), 'PAID');
    assert.equal(q.get('chain'), 'solana');
    assert.equal(q.get('from'), '2026-11-01');
    assert.equal(q.get('to'), '2026-11-15');
    assert.equal(q.get('orderId'), 'GCPSU');
  });

  it('drops empty and null filters', () => {
    const q = buildIntentsOrdersQuery({
      page: 1,
      limit: 20,
      status: null,
      chain: '',
      orderId: '  ',
    });
    assert.equal(q.toString(), 'page=1&limit=20');
  });
});
