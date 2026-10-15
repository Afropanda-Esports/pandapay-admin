'use client';

import { Copy } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  formatOrderVoucherCodes,
  orderVoucherCodesCopyText,
} from '@/lib/order-voucher-codes-display';

export function OrderVoucherCodes({
  codes,
}: Readonly<{ codes: string[] | null | undefined }>) {
  const copyText = orderVoucherCodesCopyText(codes);
  const shown = formatOrderVoucherCodes(codes);

  const copy = async () => {
    if (!copyText) return;
    await navigator.clipboard.writeText(copyText);
    toast.success('Code copied');
  };

  return (
    <span className="inline-flex max-w-[16rem] items-start gap-1">
      <span className="font-mono text-xs whitespace-pre-line break-all">
        {shown}
      </span>
      {copyText ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 shrink-0 px-1"
          aria-label="Copy voucher code"
          onClick={() => {
            void copy();
          }}
        >
          <Copy className="size-3.5" />
        </Button>
      ) : null}
    </span>
  );
}
