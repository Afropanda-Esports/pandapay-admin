'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Copy, Plus } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ApiError } from '@/lib/api/client';
import { generateVoucherCodes } from '@/lib/api/voucher-codes';
import { SUPPORTED_CURRENCIES } from '@/lib/money';
import type { VoucherCode } from '@/lib/types';

const CURRENCY_OPTIONS = SUPPORTED_CURRENCIES.map((value) => ({
  value,
  label: value,
}));

const schema = z.object({
  count: z.coerce.number().int().min(1).max(500),
  // VOUCH-001: face value in the selected currency — not USD-only.
  value: z.coerce.number().min(0.01),
  currency: z.enum(SUPPORTED_CURRENCIES),
  expiresInDays: z.coerce.number().int().min(1).max(90).optional(),
  recipientLabel: z.string().trim().max(120).optional(),
});

type FormValues = z.input<typeof schema>;

export function GenerateVoucherCodesDialog() {
  const [open, setOpen] = useState(false);
  const [generated, setGenerated] = useState<VoucherCode[] | null>(null);
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      count: 10,
      value: '' as unknown as number,
      currency: 'USD',
      expiresInDays: 30,
      recipientLabel: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: z.output<typeof schema>) =>
      generateVoucherCodes({
        count: data.count,
        value: data.value,
        currency: data.currency,
        expiresInDays: data.expiresInDays,
        recipientLabel: data.recipientLabel || undefined,
      }),
    onSuccess: (codes) => {
      toast.success(`${codes.length} voucher code${codes.length === 1 ? '' : 's'} generated`);
      queryClient.invalidateQueries({ queryKey: ['voucher-codes'] });
      setGenerated(codes);
      form.reset();
    },
    onError: (err) => {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to generate voucher codes';
      toast.error(message);
    },
  });

  const onSubmit = form.handleSubmit((data) =>
    mutation.mutate(data as z.output<typeof schema>),
  );

  const handleClose = (next: boolean) => {
    if (mutation.isPending) return;
    setOpen(next);
    if (!next) {
      form.reset();
      setGenerated(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="size-4" />
            Generate codes
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        {generated ? (
          <GeneratedCodesPanel codes={generated} onClose={() => handleClose(false)} />
        ) : (
          <form onSubmit={onSubmit} noValidate>
            <DialogHeader>
              <DialogTitle>Generate voucher codes</DialogTitle>
              <DialogDescription>
                Bulk-create single-use vouchers worth a fixed amount in NGN or
                USD. A voucher applies only to cart items priced in the same
                currency — it is not tied to a particular product.
              </DialogDescription>
            </DialogHeader>

            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="voucher-count">How many codes</FieldLabel>
                <Input
                  id="voucher-count"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={500}
                  disabled={mutation.isPending}
                  {...form.register('count')}
                />
                <FieldError>{form.formState.errors.count?.message}</FieldError>
              </Field>

              <Field>
                <FieldLabel htmlFor="voucher-currency">Currency</FieldLabel>
                <Controller
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <Select
                      items={CURRENCY_OPTIONS}
                      value={field.value}
                      onValueChange={(v) => field.onChange(v)}
                      disabled={mutation.isPending}
                    >
                      <SelectTrigger id="voucher-currency" className="w-full">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  The voucher only reduces the matching-currency subtotal.
                </p>
                <FieldError>{form.formState.errors.currency?.message}</FieldError>
              </Field>

              <Field>
                <FieldLabel htmlFor="voucher-value">Value</FieldLabel>
                <Input
                  id="voucher-value"
                  type="number"
                  inputMode="decimal"
                  min={0.01}
                  step="0.01"
                  placeholder="7.00"
                  disabled={mutation.isPending}
                  {...form.register('value')}
                />
                <p className="text-xs text-muted-foreground">
                  Face value in the currency above. A voucher covering the whole
                  matching subtotal can check out at no cost when that is the
                  entire cart.
                </p>
                <FieldError>{form.formState.errors.value?.message}</FieldError>
              </Field>

              <Field>
                <FieldLabel htmlFor="voucher-expires">Expires in (days)</FieldLabel>
                <Input
                  id="voucher-expires"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={90}
                  placeholder="30"
                  disabled={mutation.isPending}
                  {...form.register('expiresInDays')}
                />
                <FieldError>{form.formState.errors.expiresInDays?.message}</FieldError>
              </Field>

              <Field>
                <FieldLabel htmlFor="voucher-recipient">
                  Recipient label (optional)
                </FieldLabel>
                <Input
                  id="voucher-recipient"
                  placeholder="e.g. influencer campaign, player ID"
                  maxLength={120}
                  disabled={mutation.isPending}
                  {...form.register('recipientLabel')}
                />
                <p className="text-xs text-muted-foreground">
                  Informational only — never enforced at redemption.
                </p>
              </Field>
            </FieldGroup>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Generating…' : 'Generate'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function GeneratedCodesPanel({
  codes,
  onClose,
}: Readonly<{ codes: VoucherCode[]; onClose: () => void }>) {
  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(codes.map((c) => c.code).join('\n'));
      toast.success('Codes copied to clipboard');
    } catch {
      toast.error('Could not copy — copy manually');
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {codes.length} code{codes.length === 1 ? '' : 's'} generated
        </DialogTitle>
        <DialogDescription>
          These codes won&apos;t be shown again in full here — copy them now to
          distribute.
        </DialogDescription>
      </DialogHeader>

      <div className="my-4 max-h-64 overflow-y-auto rounded-lg border border-border bg-muted/40 p-4">
        <ul className="space-y-1 font-mono text-sm">
          {codes.map((c) => (
            <li key={c.id} className="select-all">
              {c.code}
            </li>
          ))}
        </ul>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={handleCopyAll}>
          <Copy className="size-3.5" />
          Copy all
        </Button>
        <Button onClick={onClose}>Done</Button>
      </DialogFooter>
    </>
  );
}
