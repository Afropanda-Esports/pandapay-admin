import { Badge } from '@/components/ui/badge';
import type { VoucherCode, VoucherCodeStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

const STYLES: Record<VoucherCodeStatus, string> = {
  ACTIVE: 'bg-success-100 text-success-700 hover:bg-success-100',
  USED: 'bg-neutral-100 text-neutral-500 hover:bg-neutral-100',
  EXPIRED: 'bg-warning-100 text-warning-700 hover:bg-warning-100',
  REVOKED: 'bg-error-100 text-error-700 hover:bg-error-100',
};

const LABEL: Record<VoucherCodeStatus, string> = {
  ACTIVE: 'Active',
  USED: 'Used',
  EXPIRED: 'Expired',
  REVOKED: 'Revoked',
};

/**
 * Backend has no `status` column — mirrors the precedence in
 * discount-codes.service.ts's applyStatusFilter (isRevoked > isUsed > expiresAt).
 */
export function deriveVoucherCodeStatus(code: VoucherCode): VoucherCodeStatus {
  if (code.isRevoked) return 'REVOKED';
  if (code.isUsed) return 'USED';
  if (new Date(code.expiresAt).getTime() < Date.now()) return 'EXPIRED';
  return 'ACTIVE';
}

export function VoucherStatusBadge({
  code,
  className,
}: Readonly<{ code: VoucherCode; className?: string }>) {
  const status = deriveVoucherCodeStatus(code);
  return (
    <Badge className={cn('font-medium border-0', STYLES[status], className)}>
      {LABEL[status]}
    </Badge>
  );
}
