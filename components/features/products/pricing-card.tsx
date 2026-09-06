'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Coins } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { getCurrentRate } from '@/lib/api/pricing';
import { updateProductPricing } from '@/lib/api/products';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
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
import { usePermissions } from '@/hooks/use-permissions';
import { formatMoney } from '@/lib/money';
import type { ProductWithStats } from '@/lib/types';
import {
  effectiveMarkupBps,
  parseMarkupInput,
  previewNgn,
} from '@/lib/markup';

interface PricingCardProps {
  product: ProductWithStats;
}

/**
 * The field means three different things, and the difference is money:
 * blank follows the global markup, 0 sells at cost, anything else is this
 * product's own margin — and once it has one, changing the global will not
 * move it.
 */
function markupHelp(
  parsed: ReturnType<typeof parseMarkupInput>,
  globalMarkupBps: number | null,
): string {
  if (parsed.error) return 'Basis points over cost — 1350 is 13.5%.';
  const bps = parsed.markupBps ?? null;
  if (bps === null) {
    return globalMarkupBps === null
      ? 'Blank — follows the global markup, which is not set yet.'
      : `Blank — follows the global markup (${globalMarkupBps} bps). Changing the global will move this product.`;
  }
  if (bps === 0) {
    return 'Zero margin — this product sells at cost, and ignores the global markup.';
  }
  return `${(bps / 100).toFixed(2)}% over cost. This overrides the global markup, so changing the global will not move this product.`;
}

export function PricingCard({ product }: Readonly<PricingCardProps>) {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const canEditPricing = can('products:pricing');

  // Local form state — initialised from the product, kept in sync if it reloads.
  // PRICE-004: the markup field is a string, not a number, because an empty
  // field and a typed 0 mean different things and a numeric state would lose
  // the distinction before `parseMarkupInput` ever sees it.
  const [priceUsd, setPriceUsd] = useState<string>(product.priceUsd ?? '');
  const [markupInput, setMarkupInput] = useState<string>(
    product.markupBps === null ? '' : String(product.markupBps),
  );
  const [error, setError] = useState<string | null>(null);

  // Form state is initialised from props once on mount. Parent passes a key
  // so the card remounts (resetting state) when the saved values change —
  // matches React 19's "don't sync state in effects" rule.

  const { data: rate } = useQuery({
    queryKey: ['pricing-rate'],
    queryFn: getCurrentRate,
    staleTime: 60_000,
  });

  const mutation = useMutation({
    mutationFn: () => {
      const usd = Number.parseFloat(priceUsd);
      if (!Number.isFinite(usd) || usd <= 0) {
        throw new Error('Enter a USD face value greater than 0');
      }
      const parsed = parseMarkupInput(markupInput);
      if (parsed.error) throw new Error(parsed.error);

      // `markupBps: null` is sent deliberately — it clears the product's own
      // markup so it follows the global one again. Omitting the field would
      // leave the existing markup in place, which is a different request.
      return updateProductPricing(product.id, {
        priceUsd: usd,
        markupBps: parsed.markupBps ?? null,
      });
    },
    onSuccess: () => {
      toast.success('Pricing updated');
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['product', product.id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err) => {
      const message =
        err instanceof Error ? err.message : 'Failed to update pricing';
      setError(message);
      toast.error(message);
    },
  });

  const parsedMarkup = parseMarkupInput(markupInput);
  const globalMarkupBps = rate?.markupBps ?? null;

  // Live preview of what the backend will compute. Uses the ORACLE rate, not
  // the selling rate: the selling rate already carries the global markup, and
  // multiplying by it would compound the two.
  const preview =
    parsedMarkup.error !== undefined || globalMarkupBps === null
      ? null
      : previewNgn(
          priceUsd,
          rate?.oracleNgnPerUsd ?? null,
          effectiveMarkupBps(parsedMarkup.markupBps ?? null, globalMarkupBps),
        );

  const savedMarkupInput =
    product.markupBps === null ? '' : String(product.markupBps);

  // True iff the form values differ from what's saved.
  const isDirty =
    priceUsd !== (product.priceUsd ?? '') || markupInput !== savedMarkupInput;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Coins className="size-4" />
          Pricing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!canEditPricing ? (
          <p className="text-sm text-muted-foreground">
            Pricing changes require Super Admin. Managers can upload vouchers
            and toggle availability.
          </p>
        ) : null}
        <div className="flex items-baseline justify-between border-b border-border/60 pb-3">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            Current price
          </span>
          <span className="font-heading text-2xl font-bold tabular-nums">
            {formatMoney(product.snapshotNgnPrice, 'NGN')}
          </span>
        </div>

        <div className="flex items-baseline justify-between border-b border-border/60 pb-3">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            Currency
          </span>
          <span className="text-sm tabular-nums">
            {product.baseCurrency}
            <span className="ml-2 text-xs text-muted-foreground">
              from its region
            </span>
          </span>
        </div>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="price-usd">Face value</FieldLabel>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                $
              </span>
              <Input
                id="price-usd"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                placeholder="10.00"
                value={priceUsd}
                onChange={(e) => {
                  setPriceUsd(e.target.value);
                  setError(null);
                }}
                disabled={mutation.isPending || !canEditPricing}
                className="pl-7"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              What the card is worth. The naira price is derived from this.
            </p>
          </Field>

          <Field>
            <FieldLabel htmlFor="markup-bps">Markup</FieldLabel>
            <div className="relative">
              <Input
                id="markup-bps"
                // Deliberately `text`, not `number`: a number input hands back
                // an empty string for "-" and other partial entries, and the
                // difference between blank and 0 is the whole point here.
                type="text"
                inputMode="numeric"
                placeholder={
                  globalMarkupBps === null
                    ? 'Global markup not set'
                    : `${globalMarkupBps} (global)`
                }
                value={markupInput}
                onChange={(e) => {
                  setMarkupInput(e.target.value);
                  setError(null);
                }}
                disabled={mutation.isPending || !canEditPricing}
                className="pr-12"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                bps
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {markupHelp(parsedMarkup, globalMarkupBps)}
            </p>
            {parsedMarkup.error ? (
              <FieldError className="text-error-700">
                {parsedMarkup.error}
              </FieldError>
            ) : null}
          </Field>

          {error && (
            <FieldError className="text-error-700">{error}</FieldError>
          )}

          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="text-xs text-muted-foreground">
              {preview === null ? (
                globalMarkupBps === null
                  ? 'No FX rate set — set one on the Pricing page first.'
                  : 'Enter a face value to preview'
              ) : (
                <>
                  Will save as{' '}
                  <span className="font-mono text-sm text-foreground">
                    {formatMoney(preview, 'NGN')}
                  </span>
                </>
              )}
            </div>
            {canEditPricing ? (
              <Button
                type="button"
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending || !isDirty || preview === null}
              >
                {mutation.isPending ? 'Saving…' : 'Save pricing'}
              </Button>
            ) : null}
          </div>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
