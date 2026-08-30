import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildSupportRequestsQuery } from './support-requests-query.ts';

describe('buildSupportRequestsQuery', () => {
  it('includes page and limit', () => {
    const q = buildSupportRequestsQuery(1, 20);
    assert.equal(q.get('page'), '1');
    assert.equal(q.get('limit'), '20');
    assert.equal(q.has('status'), false);
  });

  it('includes status when provided', () => {
    const open = buildSupportRequestsQuery(2, 20, 'OPEN');
    assert.equal(open.get('page'), '2');
    assert.equal(open.get('status'), 'OPEN');

    const resolved = buildSupportRequestsQuery(1, 20, 'RESOLVED');
    assert.equal(resolved.get('status'), 'RESOLVED');
  });
});
