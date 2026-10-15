'use client';

import { Copy } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  appliedDiscountCodeCopyText,
  formatAppliedDiscountCode,
} from '@/lib/order-voucher-codes-display';

export function AppliedDiscountCode({
  code,
}: Readonly<{ code: string | null | undefined }>) {
  const copyText = appliedDiscountCodeCopyText(code);
  const shown = formatAppliedDiscountCode(code);

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
          aria-label="Copy discount code"
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
