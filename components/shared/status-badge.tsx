import { Badge } from '@/components/ui/badge';
import type { OrderStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

const STYLES: Record<OrderStatus, string> = {
  PENDING: 'bg-warning-100 text-warning-700 hover:bg-warning-100',
  PAID: 'bg-info-100 text-info-700 hover:bg-info-100',
  FULFILLED: 'bg-success-100 text-success-700 hover:bg-success-100',
  EXPIRED: 'bg-neutral-100 text-neutral-500 hover:bg-neutral-100',
  FAILED: 'bg-error-100 text-error-700 hover:bg-error-100',
  REFUNDED: 'bg-purple-100 text-purple-700 hover:bg-purple-100',
};

export function StatusBadge({
  status,
  className,
}: Readonly<{ status: OrderStatus; className?: string }>) {
  return (
    <Badge className={cn('font-medium border-0', STYLES[status], className)}>
      {status}
    </Badge>
  );
}
