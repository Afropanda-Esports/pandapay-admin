export type AnalyticsParse<T> =
  | { ok: true; data: T }
  | { ok: false; reason: string };

export interface ParsedStatsSeries {
  days: 7 | 14 | 30;
  timezone: 'Africa/Lagos';
  buckets: Array<{
    date: string;
    ordersCreated: number;
    ordersFulfilled: number;
    revenueNgn: string;
    newUsers: number;
  }>;
}

export interface ParsedMessageCounts {
  inbound: number;
  outbound: number;
  total: number;
}

export interface ParsedWhatsappMessageVolume {
  timezone: 'Africa/Lagos';
  days: 7 | 14 | 30;
  periods: {
    day: ParsedMessageCounts;
    week: ParsedMessageCounts;
    month: ParsedMessageCounts;
  };
  buckets: Array<ParsedMessageCounts & { date: string }>;
  topUsers: Array<
    ParsedMessageCounts & { userId: string | null; whatsappNumber: string }
  >;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonNegativeInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isDateKey(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isDayWindow(value: unknown): value is 7 | 14 | 30 {
  return value === 7 || value === 14 || value === 30;
}

const MONEY = /^\d+\.\d{2}$/;

function parseCounts(value: unknown): ParsedMessageCounts | null {
  if (!isRecord(value)) return null;
  const { inbound, outbound, total } = value;
  if (
    !isNonNegativeInt(inbound) ||
    !isNonNegativeInt(outbound) ||
    !isNonNegativeInt(total) ||
    total !== inbound + outbound
  ) {
    return null;
  }
  return { inbound, outbound, total };
}

export function parseStatsSeries(body: unknown): AnalyticsParse<ParsedStatsSeries> {
  if (!isRecord(body)) return { ok: false, reason: 'body' };
  if (body.timezone !== 'Africa/Lagos') return { ok: false, reason: 'timezone' };
  if (!isDayWindow(body.days)) return { ok: false, reason: 'days' };
  if (!Array.isArray(body.buckets) || body.buckets.length !== body.days) {
    return { ok: false, reason: 'buckets' };
  }

  const buckets: ParsedStatsSeries['buckets'] = [];
  let previous = '';
  for (const row of body.buckets) {
    if (!isRecord(row)) return { ok: false, reason: 'bucket' };
    if (!isDateKey(row.date) || row.date <= previous) {
      return { ok: false, reason: 'date' };
    }
    if (
      !isNonNegativeInt(row.ordersCreated) ||
      !isNonNegativeInt(row.ordersFulfilled) ||
      !isNonNegativeInt(row.newUsers) ||
      typeof row.revenueNgn !== 'string' ||
      !MONEY.test(row.revenueNgn)
    ) {
      return { ok: false, reason: 'bucket_fields' };
    }
    previous = row.date;
    buckets.push({
      date: row.date,
      ordersCreated: row.ordersCreated,
      ordersFulfilled: row.ordersFulfilled,
      revenueNgn: row.revenueNgn,
      newUsers: row.newUsers,
    });
  }

  return {
    ok: true,
    data: { days: body.days, timezone: 'Africa/Lagos', buckets },
  };
}

export function parseWhatsappMessageVolume(
  body: unknown,
): AnalyticsParse<ParsedWhatsappMessageVolume> {
  if (!isRecord(body)) return { ok: false, reason: 'body' };
  if (body.timezone !== 'Africa/Lagos') return { ok: false, reason: 'timezone' };
  if (!isDayWindow(body.days)) return { ok: false, reason: 'days' };
  if (!isRecord(body.periods)) return { ok: false, reason: 'periods' };

  const day = parseCounts(body.periods.day);
  const week = parseCounts(body.periods.week);
  const month = parseCounts(body.periods.month);
  if (!day || !week || !month) return { ok: false, reason: 'periods' };

  if (!Array.isArray(body.buckets) || body.buckets.length !== body.days) {
    return { ok: false, reason: 'buckets' };
  }
  if (!Array.isArray(body.topUsers) || body.topUsers.length > 20) {
    return { ok: false, reason: 'topUsers' };
  }

  const buckets: ParsedWhatsappMessageVolume['buckets'] = [];
  let previous = '';
  for (const row of body.buckets) {
    if (!isRecord(row) || !isDateKey(row.date) || row.date <= previous) {
      return { ok: false, reason: 'date' };
    }
    const counts = parseCounts(row);
    if (!counts) return { ok: false, reason: 'bucket_fields' };
    previous = row.date;
    buckets.push({ date: row.date, ...counts });
  }

  const topUsers: ParsedWhatsappMessageVolume['topUsers'] = [];
  for (const row of body.topUsers) {
    if (!isRecord(row) || 'body' in row) return { ok: false, reason: 'user' };
    if (row.userId !== null && typeof row.userId !== 'string') {
      return { ok: false, reason: 'user' };
    }
    if (typeof row.whatsappNumber !== 'string') {
      return { ok: false, reason: 'user' };
    }
    const counts = parseCounts(row);
    if (!counts) return { ok: false, reason: 'user' };
    topUsers.push({
      userId: row.userId,
      whatsappNumber: row.whatsappNumber,
      ...counts,
    });
  }

  return {
    ok: true,
    data: {
      timezone: 'Africa/Lagos',
      days: body.days,
      periods: { day, week, month },
      buckets,
      topUsers,
    },
  };
}
