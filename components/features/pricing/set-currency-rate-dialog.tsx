'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Pencil } from 'lucide-react';
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
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api/client';
import { setCurrencyRate } from '@/lib/api/pricing';
import {
  describeLargeRateChange,
  largeRateChangeFrom,
  rateInputIssue,
} from '@/lib/currency-rates';
import { currencySymbol, formatRatePerUnit, type PricingCurrency } from '@/lib/money';
import type { LargeRateChangeDetails } from '@/lib/types';

/**
 * GBP-005 — set a manually managed rate (GBP). Super Admin only; the caller
 * renders this only for them, and the backend refuses everyone else.
 *
 * A change of more than 10 % is refused by the BACKEND with `409
 * LARGE_RATE_CHANGE`. The dialog does not decide that itself: it shows the
 * backend's figures and, only on explicit confirmation, resends the same rate
 * with `confirmLargeChange: true` (DECISION R; audited server-side).
 */
export function SetCurrencyRateDialog({
  currency,
  currentNgnPerUnit,
  affectedProducts,
}: Readonly<{
  currency: PricingCurrency;
  currentNgnPerUnit: string | null;
  affectedProducts: number;
}>) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [rate, setRate] = useState('');
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState(false);
  const [largeChange, setLargeChange] = useState<LargeRateChangeDetails | null>(
    null,
  );

  const reset = () => {
    setRate('');
    setNote('');
    setTouched(false);
    setLargeChange(null);
  };

  const mutation = useMutation({
    mutationFn: (confirmLargeChange: boolean) =>
      setCurrencyRate(currency, {
        ngnPerUnit: rate.trim(),
        note: note.trim() || undefined,
        ...(confirmLargeChange ? { confirmLargeChange: true } : {}),
      }),
    onSuccess: (res) => {
      toast.success(
        `${currency}/NGN set to ${formatRatePerUnit(res.rate.ngnPerUnit, currency)}. ${res.affected} product${res.affected === 1 ? '' : 's'} repriced.`,
      );
      void queryClient.invalidateQueries({ queryKey: ['currency-rates'] });
      void queryClient.invalidateQueries({ queryKey: ['currency-rate-history', currency] });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      void queryClient.invalidateQueries({ queryKey: ['price-preview'] });
      setOpen(false);
      reset();
    },
    onError: (err) => {
      const details = largeRateChangeFrom(err);
      if (details) {
        setLargeChange(details);
        return;
      }
      toast.error(err instanceof ApiError ? err.message : 'Failed to set the rate');
    },
  });

  const inputIssue = rateInputIssue(rate);
  const summary = largeChange ? describeLargeRateChange(largeChange) : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button size="sm">
            <Pencil className="size-4" />
            Set new rate
          </Button>
        }
      />
      <DialogContent>
        {summary ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-warning-700" />
                Confirm a large rate change
              </DialogTitle>
              <DialogDescription>
                This moves the {currency}/NGN rate by more than {summary.threshold}.
                Every {currency} product that is not archived will be repriced.
              </DialogDescription>
            </DialogHeader>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 py-4 text-sm">
              <dt className="text-muted-foreground">Current</dt>
              <dd className="tabular-nums">{summary.current}</dd>
              <dt className="text-muted-foreground">New</dt>
              <dd className="tabular-nums">{summary.proposed}</dd>
              <dt className="text-muted-foreground">Change</dt>
              <dd className="font-semibold tabular-nums">{summary.change}</dd>
            </dl>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setLargeChange(null)}
                disabled={mutation.isPending}
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={() => mutation.mutate(true)}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? 'Saving…' : `Yes, set ${summary.proposed}`}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              setTouched(true);
              if (!inputIssue) mutation.mutate(false);
            }}
          >
            <DialogHeader>
              <DialogTitle>Set the {currency}/NGN rate</DialogTitle>
              <DialogDescription>
                Naira for one {currencySymbol(currency)}1, before markup. Applies
                immediately and reprices {affectedProducts} {currency} product
                {affectedProducts === 1 ? '' : 's'}.
                {currentNgnPerUnit
                  ? ` Current: ${formatRatePerUnit(currentNgnPerUnit, currency)}.`
                  : ' No rate is set yet.'}
              </DialogDescription>
            </DialogHeader>
            <FieldGroup className="py-4">
              <Field>
                <FieldLabel htmlFor="rate-ngn-per-unit">
                  ₦ per {currencySymbol(currency)}1
                </FieldLabel>
                <Input
                  id="rate-ngn-per-unit"
                  type="text"
                  inputMode="decimal"
                  placeholder="2100.00"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  disabled={mutation.isPending}
                />
                {touched && inputIssue ? (
                  <FieldError className="text-error-700">{inputIssue}</FieldError>
                ) : null}
              </Field>
              <Field>
                <FieldLabel htmlFor="rate-note">Note (optional)</FieldLabel>
                <Input
                  id="rate-note"
                  placeholder="e.g. weekly review, source of the rate"
                  maxLength={255}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={mutation.isPending}
                />
              </Field>
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
                {mutation.isPending ? 'Saving…' : 'Set rate'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
