import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildWhatsappMessagesQuery,
  buildWhatsappMessagesSummaryQuery,
} from './whatsapp-messages-query.ts';

describe('buildWhatsappMessagesQuery', () => {
  it('includes page and limit', () => {
    const q = buildWhatsappMessagesQuery(1, 20);
    assert.equal(q.get('page'), '1');
    assert.equal(q.get('limit'), '20');
  });

  it('includes optional filters when provided', () => {
    const q = buildWhatsappMessagesQuery(2, 10, {
      whatsappNumber: '234801',
      direction: 'outbound',
      reason: 'fulfillment_codes',
      userId: 'user-1',
    });
    assert.equal(q.get('page'), '2');
    assert.equal(q.get('whatsappNumber'), '234801');
    assert.equal(q.get('direction'), 'outbound');
    assert.equal(q.get('reason'), 'fulfillment_codes');
    assert.equal(q.get('userId'), 'user-1');
  });
});

describe('buildWhatsappMessagesSummaryQuery', () => {
  it('omits empty window', () => {
    const q = buildWhatsappMessagesSummaryQuery();
    assert.equal(q.toString(), '');
  });

  it('includes from/to when set', () => {
    const q = buildWhatsappMessagesSummaryQuery(
      '2026-11-01T00:00:00.000Z',
      '2026-11-02T00:00:00.000Z',
    );
    assert.equal(q.get('from'), '2026-11-01T00:00:00.000Z');
    assert.equal(q.get('to'), '2026-11-02T00:00:00.000Z');
  });
});
