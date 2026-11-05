const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/** `YYYY-MM-DD` → `5 Nov`, without parsing through a timezone. */
export function formatAnalyticsDay(dateKey: string): string {
  const [, month, day] = dateKey.split('-');
  const monthIndex = Number(month) - 1;
  const label = MONTHS[monthIndex];
  if (!label || !day) return dateKey;
  return `${Number(day)} ${label}`;
}
