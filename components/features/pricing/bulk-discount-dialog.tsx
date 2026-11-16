'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ApiError } from '@/lib/api/client';
import { updateBulkDiscount } from '@/lib/api/pricing';
import {
  toBulkDiscountBody,
  validateBulkDiscountForm,
  type BulkDiscountBody,
  type BulkDiscountForm,
} from '@/lib/bulk-discount-form';
import { formatBpsAsPercent } from '@/lib/markup';
import { formatMoney } from '@/lib/money';
import type { BulkDiscountSettings } from '@/lib/types';

function formFrom(current: BulkDiscountSettings): BulkDiscountForm {
  return {
    enabled: current.enabled,
    bps: String(current.bps),
    thresholdNgn: current.thresholdNgn,
  };
}

function describeChange(body: BulkDiscountBody): string {
  if (!body.enabled) {
    return 'The bulk discount will be turned off. New orders get no automatic discount.';
  }
  return `New WhatsApp orders of ${formatMoney(body.thresholdNgn, 'NGN')} or more will get ${formatBpsAsPercent(body.bps)} off, unless they use a discount or voucher code.`;
}

/**
 * Edit the bulk discount. Super Admin only: the card renders this only for
 * them, and the backend refuses everyone else with a 403.
 */
export function BulkDiscountDialog({
  current,
}: Readonly<{ current: BulkDiscountSettings }>) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<BulkDiscountForm>(() => formFrom(current));
  const [touched, setTouched] = useState(false);
  const [pending, setPending] = useState<BulkDiscountBody | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const reset = () => {
    setForm(formFrom(current));
    setTouched(false);
    setPending(null);
    setApiError(null);
  };

  const mutation = useMutation({
    mutationFn: (body: BulkDiscountBody) => updateBulkDiscount(body),
    onSuccess: (saved) => {
      toast.success(
        saved.enabled
          ? `Bulk discount on: ${formatBpsAsPercent(saved.bps)} from ${formatMoney(saved.thresholdNgn, 'NGN')}.`
          : 'Bulk discount turned off.',
      );
      void queryClient.invalidateQueries({ queryKey: ['bulk-discount'] });
      setOpen(false);
      reset();
    },
    onError: (err) => {
      setPending(null);
      if (err instanceof ApiError && err.status === 400) {
        setApiError(err.message);
        return;
      }
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to save the bulk discount',
      );
    },
  });

  const errors = validateBulkDiscountForm(form);
  const valid = !errors.bps && !errors.thresholdNgn;
  const preview = errors.bps
    ? null
    : formatBpsAsPercent(Number.parseInt(form.bps.trim(), 10));

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <Pencil className="size-4" />
            Edit
          </Button>
        }
      />
      <DialogContent>
        {pending ? (
          <>
            <DialogHeader>
              <DialogTitle>Save the bulk discount?</DialogTitle>
              <DialogDescription>{describeChange(pending)}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPending(null)}
                disabled={mutation.isPending}
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={() => mutation.mutate(pending)}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? 'Saving…' : 'Yes, save'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              setTouched(true);
              setApiError(null);
              if (valid) setPending(toBulkDiscountBody(form));
            }}
          >
            <DialogHeader>
              <DialogTitle>Bulk discount</DialogTitle>
              <DialogDescription>
                An automatic discount on WhatsApp orders at or over the
                threshold, including USDC. Never combined with a discount or
                voucher code. Applies to new orders only.
              </DialogDescription>
            </DialogHeader>
            <FieldGroup className="py-4">
              <Field orientation="horizontal">
                <Switch
                  id="bulk-discount-enabled"
                  checked={form.enabled}
                  onCheckedChange={(enabled) => setForm({ ...form, enabled })}
                  disabled={mutation.isPending}
                />
                <FieldLabel htmlFor="bulk-discount-enabled">
                  {form.enabled ? 'On' : 'Off'}
                </FieldLabel>
              </Field>
              <Field>
                <FieldLabel htmlFor="bulk-discount-bps">
                  Discount (basis points)
                </FieldLabel>
                <Input
                  id="bulk-discount-bps"
                  type="text"
                  inputMode="numeric"
                  placeholder="250"
                  value={form.bps}
                  onChange={(e) => setForm({ ...form, bps: e.target.value })}
                  disabled={mutation.isPending}
                />
                {touched && errors.bps ? (
                  <FieldError className="text-error-700">{errors.bps}</FieldError>
                ) : (
                  <FieldDescription>
                    {preview ? `= ${preview} off` : '250 bps is 2.5%.'}
                  </FieldDescription>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="bulk-discount-threshold">
                  Threshold (₦)
                </FieldLabel>
                <Input
                  id="bulk-discount-threshold"
                  type="text"
                  inputMode="decimal"
                  placeholder="100000"
                  value={form.thresholdNgn}
                  onChange={(e) =>
                    setForm({ ...form, thresholdNgn: e.target.value })
                  }
                  disabled={mutation.isPending}
                />
                {touched && errors.thresholdNgn ? (
                  <FieldError className="text-error-700">
                    {errors.thresholdNgn}
                  </FieldError>
                ) : (
                  <FieldDescription>
                    Orders of this amount or more qualify.
                  </FieldDescription>
                )}
              </Field>
              {apiError ? (
                <FieldError className="text-error-700">{apiError}</FieldError>
              ) : null}
            </FieldGroup>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                Review
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
