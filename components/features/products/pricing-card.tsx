'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Coins, Globe, Wallet } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { getCurrentRate } from '@/lib/api/pricing';
import { updateProductPricing } from '@/lib/api/products';
import { Badge } from '@/components/ui/badge';
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
import { cn } from '@/lib/utils';
import type { PricingMode, ProductWithStats } from '@/lib/types';

interface PricingCardProps {
  product: ProductWithStats;
}

const MODE_DESCRIPTIONS: Record<PricingMode, string> = {
  GLOBAL_FX:
    'NGN price is derived from a USD face value × the global FX rate. Recomputes when the rate changes.',
  MANUAL_NGN:
    'NGN price is set directly. Ignores the global FX rate — use for SKUs whose wholesale fluctuates (Steam, iTunes, PSN).',
};

function formatPriceNgn(value: string): string {
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n)) return value;
  return `₦${n.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
}

export function PricingCard({ product }: Readonly<PricingCardProps>) {
  const queryClient = useQueryClient();

  // Local form state — initialised from the product, kept in sync if it reloads.
  const [mode, setMode] = useState<PricingMode>(product.pricingMode);
  const [priceUsd, setPriceUsd] = useState<string>(product.priceUsd ?? '');
  const [manualPriceNgn, setManualPriceNgn] = useState<string>(
    product.manualPriceNgn ?? '',
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
      if (mode === 'GLOBAL_FX') {
        const usd = Number.parseFloat(priceUsd);
        if (!Number.isFinite(usd) || usd <= 0) {
          throw new Error('Enter a USD face value greater than 0');
        }
        return updateProductPricing(product.id, {
          pricingMode: 'GLOBAL_FX',
          priceUsd: usd,
        });
      }
      const ngn = Number.parseFloat(manualPriceNgn);
      if (!Number.isFinite(ngn) || ngn <= 0) {
        throw new Error('Enter a NGN price greater than 0');
      }
      return updateProductPricing(product.id, {
        pricingMode: 'MANUAL_NGN',
        manualPriceNgn: ngn,
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

  // Live NGN preview based on current form state + rate.
  const previewNgn = (() => {
    if (mode === 'MANUAL_NGN') {
      const n = Number.parseFloat(manualPriceNgn);
      return Number.isFinite(n) ? n.toFixed(2) : null;
    }
    if (rate == null) return null;
    const usd = Number.parseFloat(priceUsd);
    if (!Number.isFinite(usd)) return null;
    return (usd * rate.ngnPerUsd).toFixed(2);
  })();

  // True iff the form values differ from what's saved.
  const isDirty =
    mode !== product.pricingMode ||
    (mode === 'GLOBAL_FX' && priceUsd !== (product.priceUsd ?? '')) ||
    (mode === 'MANUAL_NGN' &&
      manualPriceNgn !== (product.manualPriceNgn ?? ''));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Coins className="size-4" />
          Pricing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline justify-between border-b border-border/60 pb-3">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            Current price
          </span>
          <span className="font-heading text-2xl font-bold tabular-nums">
            {formatPriceNgn(product.snapshotNgnPrice)}
          </span>
        </div>

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Pricing mode
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <ModeOption
              icon={Globe}
              label="Global FX"
              selected={mode === 'GLOBAL_FX'}
              onClick={() => {
                setMode('GLOBAL_FX');
                setError(null);
              }}
            />
            <ModeOption
              icon={Wallet}
              label="Manual NGN"
              selected={mode === 'MANUAL_NGN'}
              onClick={() => {
                setMode('MANUAL_NGN');
                setError(null);
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {MODE_DESCRIPTIONS[mode]}
          </p>
        </div>

        <FieldGroup>
          {mode === 'GLOBAL_FX' ? (
            <Field>
              <FieldLabel htmlFor="price-usd">USD face value</FieldLabel>
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
                  disabled={mutation.isPending}
                  className="pl-7"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {rate
                  ? `Current rate: ₦${rate.ngnPerUsd.toLocaleString('en-NG')} / $1`
                  : 'No FX rate set — set one on the Pricing page before saving.'}
              </p>
            </Field>
          ) : (
            <Field>
              <FieldLabel htmlFor="price-ngn">Manual NGN price</FieldLabel>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  ₦
                </span>
                <Input
                  id="price-ngn"
                  type="number"
                  inputMode="numeric"
                  step="any"
                  min="1"
                  placeholder="5000"
                  value={manualPriceNgn}
                  onChange={(e) => {
                    setManualPriceNgn(e.target.value);
                    setError(null);
                  }}
                  disabled={mutation.isPending}
                  className="pl-7"
                />
              </div>
            </Field>
          )}

          {error && (
            <FieldError className="text-error-700">{error}</FieldError>
          )}

          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="text-xs text-muted-foreground">
              {previewNgn === null ? (
                'Enter a value to preview'
              ) : (
                <>
                  Will save as{' '}
                  <span className="font-mono text-sm text-foreground">
                    ₦{Number.parseFloat(previewNgn).toLocaleString('en-NG')}
                  </span>
                </>
              )}
            </div>
            <Button
              type="button"
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !isDirty || previewNgn === null}
            >
              {mutation.isPending ? 'Saving…' : 'Save pricing'}
            </Button>
          </div>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}

function ModeOption({
  icon: Icon,
  label,
  selected,
  onClick,
}: Readonly<{
  icon: typeof Globe;
  label: string;
  selected: boolean;
  onClick: () => void;
}>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm transition-colors',
        selected
          ? 'border-primary bg-primary/10 text-foreground'
          : 'hover:bg-muted text-muted-foreground',
      )}
    >
      <Icon className="size-4" />
      <span className="font-medium">{label}</span>
      {selected && (
        <Badge className="ml-auto bg-primary text-primary-foreground hover:bg-primary border-0 text-[10px] px-1.5 py-0">
          Active
        </Badge>
      )}
    </button>
  );
}
