'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Coins, Minus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { ApiError } from '@/lib/api/client';
import { setRate } from '@/lib/api/pricing';
import { getProducts } from '@/lib/api/products';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { ProductWithStats } from '@/lib/types';

const schema = z.object({
  ngnPerUsd: z.coerce
    .number({ message: 'Enter a number' })
    .positive('Must be greater than 0')
    .max(1_000_000, 'That looks too large'),
  note: z.string().trim().max(255).optional(),
});

type FormValues = z.input<typeof schema>;

interface PreviewRow {
  productId: string;
  name: string;
  currentNgn: number;
  newNgn: number;
  delta: number;
}

function buildPreview(
  products: ProductWithStats[] | undefined,
  newRate: number,
): PreviewRow[] {
  if (!products) return [];
  const rows: PreviewRow[] = [];
  for (const p of products) {
    if (p.pricingMode !== 'GLOBAL_FX' || p.priceUsd == null) continue;
    const usd = Number.parseFloat(p.priceUsd);
    const currentNgn = Number.parseFloat(p.snapshotNgnPrice);
    const newNgn = Number.parseFloat((usd * newRate).toFixed(2));
    rows.push({
      productId: p.id,
      name: p.name,
      currentNgn,
      newNgn,
      delta: newNgn - currentNgn,
    });
  }
  return rows;
}

type DeltaDirection = 'up' | 'down' | 'flat';

function describeOverallDelta(
  currentRate: number | null,
  newRate: number,
): { pct: number; direction: DeltaDirection } | null {
  if (currentRate == null || currentRate === 0) return null;
  const pct = ((newRate - currentRate) / currentRate) * 100;
  let direction: DeltaDirection = 'flat';
  if (pct > 0) direction = 'up';
  else if (pct < 0) direction = 'down';
  return { pct, direction };
}

function formatRecomputedSummary(affected: number): string {
  if (affected === 0) return 'No GLOBAL_FX products to recompute.';
  const noun = affected === 1 ? 'product' : 'products';
  return `Recomputed ${affected} ${noun}.`;
}

const PREVIEW_LIMIT = 8;

export function SetRateForm({
  currentRate,
}: Readonly<{ currentRate: number | null }>) {
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      ngnPerUsd: currentRate ?? '',
      note: '',
    },
  });

  // Watch the input for the live preview. z.coerce.number() makes the input
  // type `unknown`, so we use Number() which handles strings, numbers, null,
  // and undefined all the way through.
  const watchedRate = form.watch('ngnPerUsd');
  const draftRate = Number(watchedRate);
  const isDraftValid =
    Number.isFinite(draftRate) && draftRate > 0 && draftRate !== currentRate;

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => getProducts(),
    // Don't refetch on every keystroke — products are stable enough.
    staleTime: 60_000,
    // Don't fetch until the input is a usable value.
    enabled: isDraftValid,
  });

  const previewRows = isDraftValid ? buildPreview(products, draftRate) : [];
  const overallDelta = isDraftValid
    ? describeOverallDelta(currentRate, draftRate)
    : null;
  const hasGlobalFxProducts = (products ?? []).some(
    (p) => p.pricingMode === 'GLOBAL_FX' && p.priceUsd != null,
  );

  const mutation = useMutation({
    mutationFn: (data: z.output<typeof schema>) =>
      setRate({ ngnPerUsd: data.ngnPerUsd, note: data.note }),
    onSuccess: (res) => {
      const recomputed = formatRecomputedSummary(res.affected);
      toast.success(
        `Rate set to ₦${res.rate.ngnPerUsd.toLocaleString('en-NG')} / $1. ${recomputed}`,
      );
      queryClient.invalidateQueries({ queryKey: ['pricing-rate'] });
      queryClient.invalidateQueries({ queryKey: ['pricing-rate-history'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      form.reset({ ngnPerUsd: res.rate.ngnPerUsd, note: '' });
    },
    onError: (err) => {
      const message =
        err instanceof ApiError ? err.message : 'Failed to update rate';
      toast.error(message);
    },
  });

  const onSubmit = form.handleSubmit((data) =>
    // Schema input/output types differ (coerce.number) — narrow back via the Zod parse.
    mutation.mutate(schema.parse(data)),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Coins className="size-4" />
          Update rate
        </CardTitle>
        <CardDescription>
          Save to recompute every GLOBAL_FX product in one transaction. MANUAL_NGN
          products are not affected.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="rate-value">NGN per $1</FieldLabel>
              <Input
                id="rate-value"
                type="number"
                inputMode="decimal"
                step="0.0001"
                min="0.0001"
                disabled={mutation.isPending}
                {...form.register('ngnPerUsd')}
              />
              <FieldError>
                {form.formState.errors.ngnPerUsd?.message}
              </FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="rate-note">Note (optional)</FieldLabel>
              <Input
                id="rate-note"
                placeholder="e.g. weekly review, market move, etc."
                disabled={mutation.isPending}
                {...form.register('note')}
              />
              <FieldError>{form.formState.errors.note?.message}</FieldError>
            </Field>

            {isDraftValid && (
              <RatePreview
                draftRate={draftRate}
                overallDelta={overallDelta}
                hasGlobalFxProducts={hasGlobalFxProducts}
                rows={previewRows}
              />
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Saving…' : 'Save & recompute'}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

function RatePreview({
  draftRate,
  overallDelta,
  hasGlobalFxProducts,
  rows,
}: Readonly<{
  draftRate: number;
  overallDelta: { pct: number; direction: DeltaDirection } | null;
  hasGlobalFxProducts: boolean;
  rows: PreviewRow[];
}>) {
  if (!hasGlobalFxProducts) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        No products use Global FX pricing yet. Saving will set the rate for any
        product flipped to GLOBAL_FX later.
      </div>
    );
  }

  const visible = rows.slice(0, PREVIEW_LIMIT);
  const hidden = rows.length - visible.length;

  let DeltaIcon = Minus;
  let deltaTone = 'text-muted-foreground';
  if (overallDelta?.direction === 'up') {
    DeltaIcon = ArrowUp;
    deltaTone = 'text-warning-700';
  } else if (overallDelta?.direction === 'down') {
    DeltaIcon = ArrowDown;
    deltaTone = 'text-success-700';
  }

  return (
    <div className="rounded-lg border border-warning-200 bg-warning-50 dark:border-warning-700/40 dark:bg-warning-700/10 p-3 space-y-2">
      <div className="flex items-center justify-between text-xs font-medium">
        <span>
          {rows.length} GLOBAL_FX product{rows.length === 1 ? '' : 's'} will be
          repriced at ₦{draftRate.toLocaleString('en-NG')} / $1
        </span>
        {overallDelta && (
          <span className={cn('inline-flex items-center gap-1', deltaTone)}>
            <DeltaIcon className="size-3.5" />
            {Math.abs(overallDelta.pct).toFixed(1)}%
          </span>
        )}
      </div>
      <table className="w-full text-xs">
        <thead className="text-muted-foreground">
          <tr>
            <th className="text-left font-normal py-1">Product</th>
            <th className="text-right font-normal py-1">Current</th>
            <th className="text-right font-normal py-1">New</th>
            <th className="text-right font-normal py-1">Δ</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((row) => (
            <PreviewRowItem key={row.productId} row={row} />
          ))}
        </tbody>
      </table>
      {hidden > 0 && (
        <div className="text-xs text-muted-foreground">
          + {hidden} more product{hidden === 1 ? '' : 's'}
        </div>
      )}
    </div>
  );
}

function PreviewRowItem({ row }: Readonly<{ row: PreviewRow }>) {
  let deltaClass = 'text-muted-foreground';
  if (row.delta > 0) deltaClass = 'text-warning-700';
  else if (row.delta < 0) deltaClass = 'text-success-700';

  return (
    <tr className="border-t border-border/40">
      <td className="py-1">{row.name}</td>
      <td className="text-right tabular-nums py-1">
        ₦{row.currentNgn.toLocaleString('en-NG')}
      </td>
      <td className="text-right tabular-nums py-1">
        ₦{row.newNgn.toLocaleString('en-NG')}
      </td>
      <td className={cn('text-right tabular-nums py-1', deltaClass)}>
        {row.delta > 0 ? '+' : ''}
        ₦{row.delta.toLocaleString('en-NG')}
      </td>
    </tr>
  );
}
