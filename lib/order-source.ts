import type { OrderSource } from '@/lib/types';

export const ORDER_SOURCE_LABEL: Record<OrderSource, string> = {
  whatsapp: 'WhatsApp',
  web_store: 'Web Store',
  agent: 'Agent',
};

export function formatOrderSource(source: OrderSource | undefined): string {
  if (!source) return '—';
  return ORDER_SOURCE_LABEL[source] ?? source;
}
