'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Coins } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { usePermissions } from '@/hooks/use-permissions';
import { usePricePreview } from '@/hooks/use-price-preview';
import { ApiError } from '@/lib/api/client';
import { getCurrencyRates } from '@/lib/api/pricing';
import { updateProductPricing } from '@/lib/api/products';
import { formatBpsAsPercent, markupGuidance, parseMarkupInput } from '@/lib/markup';
import {
  currencySymbol,
  declaredUsdIssue,
  faceValueIssue,
  formatMoney,
  formatProductPrice,
  ngnPriceIssue,
} from '@/lib/money';
import {
  buildPricingPatch,
  describePreview,
  previewErrorMessage,
  previewRequestFor,
  pricingEditKind,
  saveBlockReason,
} from '@/lib/pricing-edit';
import type { ProductWithStats } from '@/lib/types';

interface PricingCardProps {
  product: ProductWithStats;
}

/**
 * GBP-005 — a product's price, in its own currency.
 *
 *   USD, GBP  face value + markup. The selling price shown is the backend's
 *             (`POST /admin/pricing/preview`), the same function that saves and
 *             charges it; Save waits for it. A GBP product never shows dollars.
 *   NGN       the naira price itself, plus its declared dollar value.
 *
 * Editing is Super Admin (`products:pricing`); everyone else sees it read-only.
 * The parent remounts this card (a `key`) when the saved values change.
 */
export function PricingCard({ product }: Readonly<PricingCardProps>) {
  const { can } = usePermissions();
  const canEditPricing = can('products:pricing');
  const kind = pricingEditKind(product.baseCurrency);

  const { data: rates } = useQuery({
    queryKey: ['currency-rates'],
    queryFn: getCurrencyRates,
    staleTime: 60_000,
  });
  const generalMarkupBps = rates?.generalMarkupBps ?? null;

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
        <Row label="Current price">
          <span className="font-heading text-2xl font-bold tabular-nums">
            {formatMoney(product.snapshotNgnPrice, 'NGN')}
          </span>
        </Row>
        <Row label="Currency">
          <span className="text-sm tabular-nums">
            {product.baseCurrency}
            <span className="ml-2 text-xs text-muted-foreground">
              from its region
            </span>
          </span>
        </Row>

        {kind === 'FACE_VALUE' ? (
          <FaceValueEditor
            product={product}
            generalMarkupBps={generalMarkupBps}
            canEdit={canEditPricing}
          />
        ) : (
          <NairaPriceEditor product={product} canEdit={canEditPricing} />
        )}
      </CardContent>
    </Card>
  );
}

function Row({
  label,
  children,
}: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/60 pb-3">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}

function useSavePricing(productId: string, onError: (message: string) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Parameters<typeof updateProductPricing>[1]) =>
      updateProductPricing(productId, patch),
    onSuccess: (saved) => {
      // The saved row is the truth — if a rate moved since the preview, this
      // is the price that was actually stored.
      toast.success(
        `Pricing saved — ${formatMoney(saved.snapshotNgnPrice, 'NGN')}`,
      );
      void queryClient.invalidateQueries({ queryKey: ['product', productId] });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err) => {
      const message =
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Failed to update pricing';
      onError(message);
      toast.error(message);
    },
  });
}

function FaceValueEditor({
  product,
  generalMarkupBps,
  canEdit,
}: Readonly<{
  product: ProductWithStats;
  generalMarkupBps: number | null;
  canEdit: boolean;
}>) {
  const currency = product.baseCurrency;
  const savedFace =
    product.baseAmount ?? (currency === 'USD' ? (product.priceUsd ?? '') : '');
  const savedMarkup = product.markupBps === null ? '' : String(product.markupBps);

  // Strings, not numbers: blank markup (inherit) and 0 (at cost) differ, and a
  // numeric state would lose that before `parseMarkupInput` sees it.
  const [faceValue, setFaceValue] = useState(savedFace);
  const [markup, setMarkup] = useState(savedMarkup);
  const [error, setError] = useState<string | null>(null);
  const mutation = useSavePricing(product.id, setError);

  const parsedMarkup = parseMarkupInput(markup);
  const guidance = markupGuidance(currency, parsedMarkup, generalMarkupBps);
  const faceError = faceValueIssue(faceValue);
  const isDirty = faceValue !== savedFace || markup !== savedMarkup;

  const preview = usePricePreview(
    canEdit
      ? previewRequestFor({ currency, faceValue, markup })
      : { blocked: 'read-only' },
  );
  const display = preview.preview
    ? describePreview(preview.preview, parsedMarkup.markupBps ?? null)
    : null;
  const blockReason = saveBlockReason({
    kind: 'FACE_VALUE',
    isDirty,
    inputError: faceError ?? parsedMarkup.error ?? null,
    preview: preview.state,
  });

  if (!canEdit) {
    return (
      <>
        <Row label="Face value">
          <span className="text-sm tabular-nums">{formatProductPrice(product)}</span>
        </Row>
        <Row label="Markup">
          <span className="text-sm tabular-nums">
            {product.markupBps === null
              ? generalMarkupBps === null
                ? 'Follows the general markup'
                : `Follows the general markup (${formatBpsAsPercent(generalMarkupBps)})`
              : formatBpsAsPercent(product.markupBps)}
          </span>
        </Row>
      </>
    );
  }

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="face-value">Face value</FieldLabel>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {currencySymbol(currency)}
          </span>
          <Input
            id="face-value"
            // Text, not number: the value is sent as the exact decimal string.
            type="text"
            inputMode="decimal"
            placeholder="10.00"
            value={faceValue}
            onChange={(e) => {
              setFaceValue(e.target.value);
              setError(null);
            }}
            disabled={mutation.isPending}
            className="pl-7"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          What the card is worth, in {currency}. The naira price is derived from
          this by the backend.
        </p>
        {faceValue !== '' && faceError ? (
          <FieldError className="text-error-700">{faceError}</FieldError>
        ) : null}
      </Field>

      <Field>
        <FieldLabel htmlFor="markup-bps">Markup</FieldLabel>
        <div className="relative">
          <Input
            id="markup-bps"
            // Deliberately `text`: blank and 0 must stay different.
            type="text"
            inputMode="numeric"
            placeholder={
              generalMarkupBps === null
                ? 'Blank = general markup'
                : `${generalMarkupBps} (general)`
            }
            value={markup}
            onChange={(e) => {
              setMarkup(e.target.value);
              setError(null);
            }}
            disabled={mutation.isPending}
            className="pr-12"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            bps
          </span>
        </div>
        <p className="text-xs text-muted-foreground">{guidance.help}</p>
        {guidance.warning ? (
          <p className="flex items-center gap-1.5 text-xs text-warning-700">
            <AlertTriangle className="size-3.5" />
            {guidance.warning}
          </p>
        ) : null}
        {parsedMarkup.error ? (
          <FieldError className="text-error-700">{parsedMarkup.error}</FieldError>
        ) : null}
      </Field>

      <PreviewPanel
        currency={currency}
        state={preview.state}
        display={display}
        error={preview.error}
      />

      {error && <FieldError className="text-error-700">{error}</FieldError>}

      <div className="flex items-center justify-between gap-3 pt-1">
        <span className="text-xs text-muted-foreground">
          {isDirty && blockReason ? blockReason : null}
        </span>
        <Button
          type="button"
          onClick={() =>
            mutation.mutate(buildPricingPatch(currency, { faceValue, markup }))
          }
          disabled={mutation.isPending || blockReason !== null}
        >
          {mutation.isPending ? 'Saving…' : 'Save pricing'}
        </Button>
      </div>
    </FieldGroup>
  );
}

/** The backend preview: rate, effective markup, selling price. */
export function PreviewPanel({
  currency,
  state,
  display,
  error,
}: Readonly<{
  currency: string;
  state: 'idle' | 'loading' | 'ready' | 'error';
  display: ReturnType<typeof describePreview> | null;
  error: unknown;
}>) {
  return (
    <div className="space-y-1.5 rounded-lg border border-border bg-muted/30 p-3 text-sm">
      {state === 'ready' && display ? (
        <>
          <PreviewLine label="Face value" value={display.faceValue} />
          <PreviewLine label={display.rateLabel} value={display.rate} />
          <PreviewLine label="Markup applied" value={display.markup} />
          <PreviewLine
            label="Selling price preview"
            value={<span className="font-semibold">{display.ngnPrice}</span>}
          />
        </>
      ) : state === 'error' ? (
        <p className="text-error-700">{previewErrorMessage(error, currency)}</p>
      ) : state === 'loading' ? (
        <p className="text-muted-foreground">Calculating the selling price…</p>
      ) : (
        <p className="text-muted-foreground">
          Enter a valid face value to preview the selling price.
        </p>
      )}
    </div>
  );
}

function PreviewLine({
  label,
  value,
}: Readonly<{ label: string; value: React.ReactNode }>) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

/**
 * A naira product: the typed price IS the price (no conversion, no markup).
 * Its declared dollar value is still required by the backend.
 */
function NairaPriceEditor({
  product,
  canEdit,
}: Readonly<{ product: ProductWithStats; canEdit: boolean }>) {
  const savedNgn = product.snapshotNgnPrice;
  const savedUsd = product.priceUsd ?? '';
  const [ngnPrice, setNgnPrice] = useState(savedNgn);
  const [declaredUsd, setDeclaredUsd] = useState(savedUsd);
  const [error, setError] = useState<string | null>(null);
  const mutation = useSavePricing(product.id, setError);

  if (!canEdit) {
    return (
      <Row label="Declared dollar value">
        <span className="text-sm tabular-nums">
          {savedUsd ? formatMoney(savedUsd, 'USD') : '—'}
        </span>
      </Row>
    );
  }

  const inputError = ngnPriceIssue(ngnPrice) ?? declaredUsdIssue(declaredUsd);
  const blockReason = saveBlockReason({
    kind: 'NGN_PRICE',
    isDirty: ngnPrice !== savedNgn || declaredUsd !== savedUsd,
    inputError,
    preview: 'idle',
  });

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="ngn-price">Naira price</FieldLabel>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            ₦
          </span>
          <Input
            id="ngn-price"
            type="text"
            inputMode="decimal"
            value={ngnPrice}
            onChange={(e) => {
              setNgnPrice(e.target.value);
              setError(null);
            }}
            disabled={mutation.isPending}
            className="pl-7"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Naira products are priced directly — this is the price customers pay.
          No exchange rate or markup applies.
        </p>
      </Field>
      <Field>
        <FieldLabel htmlFor="declared-usd">Declared dollar value</FieldLabel>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            $
          </span>
          <Input
            id="declared-usd"
            type="text"
            inputMode="decimal"
            value={declaredUsd}
            onChange={(e) => {
              setDeclaredUsd(e.target.value);
              setError(null);
            }}
            disabled={mutation.isPending}
            className="pl-7"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Used to measure USD vouchers against this product. It does not change
          the naira price.
        </p>
      </Field>
      {error && <FieldError className="text-error-700">{error}</FieldError>}
      <div className="flex items-center justify-between gap-3 pt-1">
        <span className="text-xs text-muted-foreground">
          {blockReason && blockReason !== 'No changes to save' ? blockReason : null}
        </span>
        <Button
          type="button"
          onClick={() =>
            mutation.mutate(buildPricingPatch('NGN', { ngnPrice, declaredUsd }))
          }
          disabled={mutation.isPending || blockReason !== null}
        >
          {mutation.isPending ? 'Saving…' : 'Save pricing'}
        </Button>
      </div>
    </FieldGroup>
  );
}
