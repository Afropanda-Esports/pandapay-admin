'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { PreviewPanel } from '@/components/features/products/pricing-card';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePricePreview } from '@/hooks/use-price-preview';
import { getCategories } from '@/lib/api/categories';
import { getCurrencyRates } from '@/lib/api/pricing';
import {
  createProduct,
  getProductBrands,
  getProductLines,
  getRegions,
} from '@/lib/api/products';
import { CATALOG_NAME_MAX_LENGTH } from '@/lib/catalog-forms';
import { markupGuidance, parseMarkupInput } from '@/lib/markup';
import { currencySymbol, formatMoney, isConvertedCurrency } from '@/lib/money';
import { describePreview, previewRequestFor } from '@/lib/pricing-edit';
import {
  EMPTY_CREATE_FORM,
  activeCategories,
  brandsInRegion,
  buildCreateProductBody,
  createErrorMessage,
  createFormIssues,
  currencyOfRegion,
  linesOfBrand,
  regionOptionLabel,
  selectBrand,
  selectRegion,
  suggestSku,
  type CreateProductForm as FormState,
} from '@/lib/product-create';

/**
 * GBP-006 — create one product (Super Admin). The region, brand, line and
 * category must already exist; this picks from them. The currency is the
 * region's and is shown read-only. The preview is the backend's; Create waits
 * for it, and the backend recomputes the price on create anyway — the product
 * page then shows what was actually stored.
 */
export function CreateProductForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(EMPTY_CREATE_FORM);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: regions = [] } = useQuery({ queryKey: ['regions'], queryFn: getRegions });
  const { data: brands = [] } = useQuery({
    queryKey: ['product-brands', form.regionId],
    queryFn: () => getProductBrands(form.regionId),
    enabled: form.regionId !== '',
  });
  const { data: lines = [] } = useQuery({
    queryKey: ['product-lines', form.brandId],
    queryFn: () => getProductLines(form.brandId),
    enabled: form.brandId !== '',
  });
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  });
  const { data: rates } = useQuery({
    queryKey: ['currency-rates'],
    queryFn: getCurrencyRates,
    staleTime: 60_000,
  });

  const region = regions.find((r) => r.id === form.regionId);
  const currency = currencyOfRegion(regions, form.regionId);
  const converted = currency !== null && isConvertedCurrency(currency);
  const brandOptions = brandsInRegion(brands, form.regionId);
  const lineOptions = linesOfBrand(lines, form.brandId);
  const categoryOptions = activeCategories(categories);
  const issues = createFormIssues(form, currency);
  const parsedMarkup = parseMarkupInput(form.markup);
  const guidance = currency
    ? markupGuidance(currency, parsedMarkup, rates?.generalMarkupBps ?? null)
    : null;

  const preview = usePricePreview(
    converted && currency
      ? previewRequestFor({
          currency,
          regionId: form.regionId,
          faceValue: form.faceValue,
          markup: form.markup,
        })
      : { blocked: 'no converted currency' },
  );
  const display = preview.preview
    ? describePreview(preview.preview, parsedMarkup.markupBps ?? null)
    : null;

  const suggestion =
    currency && region
      ? suggestSku({
          brandName: brandOptions.find((b) => b.id === form.brandId)?.name ?? '',
          regionCode: region.code,
          currency,
          faceValue: form.faceValue,
        })
      : null;

  const mutation = useMutation({
    mutationFn: () => createProduct(buildCreateProductBody(form, currency!)),
    onSuccess: (product) => {
      toast.success(
        `Created ${product.name} — stored at ${formatMoney(product.snapshotNgnPrice, 'NGN')}${product.isAvailable ? '' : ', unavailable'}.`,
      );
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      router.push(`/products/${product.id}`);
    },
    onError: (err) => setServerError(createErrorMessage(err)),
  });

  const hasIssues = Object.keys(issues).length > 0;
  const previewReady = !converted || preview.state === 'ready';
  const canCreate = !hasIssues && previewReady && !mutation.isPending;

  const update = (patch: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setServerError(null);
  };
  const showIssue = (key: keyof FormState) =>
    submitted || form[key] !== EMPTY_CREATE_FORM[key] ? issues[key] : undefined;

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(true);
        if (canCreate) mutation.mutate();
      }}
      className="grid grid-cols-1 gap-4 lg:grid-cols-2"
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Where it sits</CardTitle>
          <CardDescription>
            The region, brand, product line and category must already exist.
            Inactive regions are listed so a market can be staged before launch.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <SelectField
              id="create-region"
              label="Region"
              placeholder="Select a region"
              value={form.regionId}
              options={regions.map((r) => ({ value: r.id, label: regionOptionLabel(r) }))}
              onChange={(v) => {
                setForm((prev) => selectRegion(prev, v));
                setServerError(null);
              }}
              issue={showIssue('regionId')}
              disabled={mutation.isPending}
            />
            {region && !region.isActive ? (
              <p className="text-xs text-muted-foreground">
                {region.name} is inactive: products here stay invisible to
                customers until the region is activated (a separate launch step).
              </p>
            ) : null}
            <SelectField
              id="create-brand"
              label="Brand"
              placeholder={form.regionId ? 'Select a brand' : 'Choose a region first'}
              value={form.brandId}
              options={brandOptions.map((b) => ({ value: b.id, label: b.name }))}
              onChange={(v) => {
                setForm((prev) => selectBrand(prev, v));
                setServerError(null);
              }}
              issue={showIssue('brandId')}
              disabled={mutation.isPending || !form.regionId}
            />
            <SelectField
              id="create-line"
              label="Product line"
              placeholder={form.brandId ? 'Select a product line' : 'Choose a brand first'}
              value={form.lineId}
              options={lineOptions.map((l) => ({ value: l.id, label: l.name }))}
              onChange={(v) => update({ lineId: v })}
              issue={showIssue('lineId')}
              disabled={mutation.isPending || !form.brandId}
            />
            <SelectField
              id="create-category"
              label="Category"
              placeholder="Select a category"
              value={form.categoryId}
              options={categoryOptions.map((c) => ({ value: c.id, label: c.name }))}
              onChange={(v) => update({ categoryId: v })}
              issue={showIssue('categoryId')}
              disabled={mutation.isPending}
            />
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">The product</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="create-name">Name</FieldLabel>
              <Input
                id="create-name"
                maxLength={CATALOG_NAME_MAX_LENGTH}
                placeholder="e.g. Amazon UK £10"
                value={form.name}
                onChange={(e) => update({ name: e.target.value })}
                disabled={mutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                2–{CATALOG_NAME_MAX_LENGTH} characters (a WhatsApp catalog row);
                unique within the product line.
              </p>
              {showIssue('name') ? (
                <FieldError className="text-error-700">{showIssue('name')}</FieldError>
              ) : null}
            </Field>

            <Field>
              <FieldLabel htmlFor="create-sku">SKU</FieldLabel>
              <Input
                id="create-sku"
                className="font-mono"
                placeholder={suggestion ?? 'e.g. AMZ-UK-GBP-10'}
                value={form.sku}
                onChange={(e) => update({ sku: e.target.value })}
                disabled={mutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                Required and unique. A–Z, 0–9 and hyphens. Convention:
                BRAND-REGION-CUR-AMOUNT
                {suggestion ? (
                  <>
                    {' '}
                    —{' '}
                    <button
                      type="button"
                      className="font-mono underline"
                      onClick={() => update({ sku: suggestion })}
                    >
                      use {suggestion}
                    </button>
                  </>
                ) : null}
                .
              </p>
              {showIssue('sku') ? (
                <FieldError className="text-error-700">{showIssue('sku')}</FieldError>
              ) : null}
            </Field>

            <Field>
              <FieldLabel htmlFor="create-currency">Currency</FieldLabel>
              <Input
                id="create-currency"
                readOnly
                value={currency ? `${currency} — from the region` : 'Choose a region'}
                className="bg-muted/40"
              />
            </Field>

            {converted && currency ? (
              <>
                <Field>
                  <FieldLabel htmlFor="create-face-value">Face value</FieldLabel>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      {currencySymbol(currency)}
                    </span>
                    <Input
                      id="create-face-value"
                      type="text"
                      inputMode="decimal"
                      placeholder="10.00"
                      value={form.faceValue}
                      onChange={(e) => update({ faceValue: e.target.value })}
                      disabled={mutation.isPending}
                      className="pl-7"
                    />
                  </div>
                  {showIssue('faceValue') ? (
                    <FieldError className="text-error-700">
                      {showIssue('faceValue')}
                    </FieldError>
                  ) : null}
                </Field>
                <Field>
                  <FieldLabel htmlFor="create-markup">Markup</FieldLabel>
                  <div className="relative">
                    <Input
                      id="create-markup"
                      type="text"
                      inputMode="numeric"
                      placeholder="Blank = general markup"
                      value={form.markup}
                      onChange={(e) => update({ markup: e.target.value })}
                      disabled={mutation.isPending}
                      className="pr-12"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      bps
                    </span>
                  </div>
                  {guidance ? (
                    <p className="text-xs text-muted-foreground">{guidance.help}</p>
                  ) : null}
                  {guidance?.warning ? (
                    <p className="flex items-center gap-1.5 text-xs text-warning-700">
                      <AlertTriangle className="size-3.5" />
                      {guidance.warning}
                    </p>
                  ) : null}
                  {showIssue('markup') ? (
                    <FieldError className="text-error-700">{showIssue('markup')}</FieldError>
                  ) : null}
                </Field>
                <PreviewPanel
                  currency={currency}
                  state={preview.state}
                  display={display}
                  error={preview.error}
                />
              </>
            ) : null}

            {currency && !converted ? (
              <>
                <Field>
                  <FieldLabel htmlFor="create-ngn-price">Naira price</FieldLabel>
                  <Input
                    id="create-ngn-price"
                    type="text"
                    inputMode="decimal"
                    value={form.ngnPrice}
                    onChange={(e) => update({ ngnPrice: e.target.value })}
                    disabled={mutation.isPending}
                  />
                  <p className="text-xs text-muted-foreground">
                    Naira products are priced directly; no rate or markup applies.
                  </p>
                  {showIssue('ngnPrice') ? (
                    <FieldError className="text-error-700">{showIssue('ngnPrice')}</FieldError>
                  ) : null}
                </Field>
                <Field>
                  <FieldLabel htmlFor="create-declared-usd">Declared dollar value</FieldLabel>
                  <Input
                    id="create-declared-usd"
                    type="text"
                    inputMode="decimal"
                    value={form.declaredUsd}
                    onChange={(e) => update({ declaredUsd: e.target.value })}
                    disabled={mutation.isPending}
                  />
                  {showIssue('declaredUsd') ? (
                    <FieldError className="text-error-700">
                      {showIssue('declaredUsd')}
                    </FieldError>
                  ) : null}
                </Field>
              </>
            ) : null}

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={form.availableOnceStocked}
                onChange={(e) => update({ availableOnceStocked: e.target.checked })}
                disabled={mutation.isPending}
              />
              <span>
                Available once stocked
                <span className="block text-xs text-muted-foreground">
                  Leave unticked to review the price and upload stock first, then
                  mark it available from the product page.
                </span>
              </span>
            </label>

            {serverError ? (
              <FieldError className="text-error-700">{serverError}</FieldError>
            ) : null}

            <div className="flex items-center justify-end gap-3">
              {converted && preview.state === 'error' ? (
                <span className="text-xs text-error-700">
                  Create is disabled until the price can be previewed.
                </span>
              ) : null}
              <Button type="submit" disabled={!canCreate}>
                {mutation.isPending ? 'Creating…' : 'Create product'}
              </Button>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>
    </form>
  );
}

function SelectField({
  id,
  label,
  placeholder,
  value,
  options,
  onChange,
  issue,
  disabled,
}: Readonly<{
  id: string;
  label: string;
  placeholder: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  issue?: string;
  disabled?: boolean;
}>) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        items={Object.fromEntries(options.map((o) => [o.value, o.label]))}
        value={value}
        onValueChange={(v) => onChange(String(v ?? ''))}
        disabled={disabled}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {issue ? <FieldError className="text-error-700">{issue}</FieldError> : null}
    </Field>
  );
}
