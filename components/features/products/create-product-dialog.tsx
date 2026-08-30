'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
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
import { getCurrentRate } from '@/lib/api/pricing';
import {
  getProductBrands,
  getProductLines,
  getRegions,
  createProduct,
} from '@/lib/api/products';
import { getCategories } from '@/lib/api/categories';
import type { PricingMode } from '@/lib/types';

const schema = z
  .object({
    regionId: z.string().min(1, 'Select a region'),
    brandId: z.string().min(1, 'Select a brand'),
    lineId: z.string().min(1, 'Select a product line'),
    name: z.string().trim().min(2, 'Min 2 characters'),
    categoryId: z.string().min(1, 'Select a category'),
    pricingMode: z.enum(['MANUAL_NGN', 'GLOBAL_FX']),
    manualPriceNgn: z.coerce.number().optional(),
    priceUsd: z.coerce.number().optional(),
    currency: z
      .string()
      .trim()
      .min(3, 'Use a 3-letter code')
      .max(3)
      .default('NGN'),
  })
  .superRefine((data, ctx) => {
    if (data.pricingMode === 'MANUAL_NGN') {
      if (!data.manualPriceNgn || data.manualPriceNgn <= 0) {
        ctx.addIssue({
          code: 'custom',
          message: 'Must be greater than 0',
          path: ['manualPriceNgn'],
        });
      }
    } else if (!data.priceUsd || data.priceUsd <= 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'Must be greater than 0',
        path: ['priceUsd'],
      });
    }
  });

type FormValues = z.input<typeof schema>;

export function CreateProductDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: rate } = useQuery({
    queryKey: ['pricing-rate'],
    queryFn: getCurrentRate,
    staleTime: 60_000,
  });

  const { data: regions } = useQuery({
    queryKey: ['regions'],
    queryFn: getRegions,
    staleTime: 60_000,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    staleTime: 60_000,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      regionId: '',
      brandId: '',
      lineId: '',
      name: '',
      categoryId: '',
      pricingMode: 'MANUAL_NGN',
      manualPriceNgn: '' as unknown as number,
      priceUsd: '' as unknown as number,
      currency: 'NGN',
    },
  });

  const pricingMode = form.watch('pricingMode') as PricingMode;
  const watchRegionId = form.watch('regionId');
  const watchCategoryId = form.watch('categoryId');
  const watchBrandId = form.watch('brandId');

  const { data: brands, isFetching: isFetchingBrands } = useQuery({
    queryKey: ['product-brands', watchRegionId, watchCategoryId],
    queryFn: () =>
      getProductBrands(watchRegionId, watchCategoryId),
    enabled: !!watchRegionId && !!watchCategoryId,
    staleTime: 60_000,
  });

  const { data: lines, isFetching: isFetchingLines } = useQuery({
    queryKey: ['product-lines', watchBrandId],
    queryFn: () => getProductLines(watchBrandId),
    enabled: !!watchBrandId,
    staleTime: 60_000,
  });

  const mutation = useMutation({
    mutationFn: (data: z.output<typeof schema>) => {
      if (data.pricingMode === 'GLOBAL_FX') {
        if (!rate) {
          throw new Error(
            'No FX rate set — configure one on the Pricing page first.',
          );
        }
        return createProduct({
          brandId: data.brandId,
          lineId: data.lineId,
          name: data.name,
          categoryId: data.categoryId,
          currency: data.currency,
          pricingMode: 'GLOBAL_FX',
          priceUsd: data.priceUsd,
        });
      }
      return createProduct({
        brandId: data.brandId,
        lineId: data.lineId,
        name: data.name,
        categoryId: data.categoryId,
        currency: data.currency,
        pricingMode: 'MANUAL_NGN',
        manualPriceNgn: data.manualPriceNgn,
      });
    },
    onSuccess: () => {
      toast.success('Product created');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      form.reset();
      setOpen(false);
    },
    onError: (err) => {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to create product';
      toast.error(message);
    },
  });

  const onSubmit = form.handleSubmit((data) =>
    mutation.mutate(data as z.output<typeof schema>),
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) form.reset();
      }}
    >
      <DialogTrigger
        render={
          <Button>
            <Plus className="size-4" />
            New Product
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create product</DialogTitle>
          <DialogDescription>
            Add a catalog SKU with manual NGN pricing or USD face value tied to
            the global FX rate.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="product-region">Region</FieldLabel>
              <Controller
                control={form.control}
                name="regionId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => {
                      field.onChange(v);
                      form.setValue('brandId', ''); // reset brand
                      form.setValue('lineId', ''); // reset line
                    }}
                    disabled={mutation.isPending}
                  >
                    <SelectTrigger id="product-region" className="w-full">
                      <SelectValue placeholder="Select a region" />
                    </SelectTrigger>
                    <SelectContent>
                      {regions?.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError>{form.formState.errors.regionId?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="product-category">Category</FieldLabel>
              <Controller
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <Select
                    value={field.value ?? ''}
                    onValueChange={(v) => {
                      field.onChange(v);
                      form.setValue('brandId', ''); // reset brand
                      form.setValue('lineId', ''); // reset line
                    }}
                    disabled={mutation.isPending}
                  >
                    <SelectTrigger id="product-category" className="w-full">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {(categories ?? []).map((opt) => (
                        <SelectItem key={opt.id} value={opt.id}>
                          {opt.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError>
                {form.formState.errors.categoryId?.message}
              </FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="product-brand">Brand</FieldLabel>
              <Controller
                control={form.control}
                name="brandId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => {
                      field.onChange(v);
                      form.setValue('lineId', ''); // reset line
                    }}
                    disabled={mutation.isPending || !watchRegionId || !watchCategoryId || isFetchingBrands}
                  >
                    <SelectTrigger id="product-brand" className="w-full">
                      <SelectValue placeholder={!watchRegionId || !watchCategoryId ? 'Select region & category first' : 'Select a brand'} />
                    </SelectTrigger>
                    <SelectContent>
                      {brands?.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                      {brands?.length === 0 && (
                        <div className="p-2 text-sm text-muted-foreground">No brands found</div>
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError>{form.formState.errors.brandId?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="product-line">Product line</FieldLabel>
              <Controller
                control={form.control}
                name="lineId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) => field.onChange(v)}
                    disabled={
                      mutation.isPending || !watchBrandId || isFetchingLines
                    }
                  >
                    <SelectTrigger id="product-line" className="w-full">
                      <SelectValue
                        placeholder={
                          !watchBrandId
                            ? 'Select a brand first'
                            : 'Select a product line'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {lines?.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.name}
                        </SelectItem>
                      ))}
                      {lines?.length === 0 && (
                        <div className="p-2 text-sm text-muted-foreground">
                          No lines found — create one for this brand first
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError>{form.formState.errors.lineId?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="product-name">Denomination (e.g. $10)</FieldLabel>
              <Input
                id="product-name"
                placeholder="$10"
                disabled={mutation.isPending}
                {...form.register('name')}
              />
              <FieldError>{form.formState.errors.name?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="product-pricing-mode">Pricing mode</FieldLabel>
              <Controller
                control={form.control}
                name="pricingMode"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(v) =>
                      field.onChange((v as PricingMode) ?? 'MANUAL_NGN')
                    }
                    disabled={mutation.isPending}
                  >
                    <SelectTrigger id="product-pricing-mode" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MANUAL_NGN">Manual NGN</SelectItem>
                      <SelectItem value="GLOBAL_FX">Global FX (USD)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            {pricingMode === 'MANUAL_NGN' ? (
              <Field>
                <FieldLabel htmlFor="product-price">Price (NGN)</FieldLabel>
                <Input
                  id="product-price"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step="any"
                  placeholder="5000"
                  disabled={mutation.isPending}
                  {...form.register('manualPriceNgn')}
                />
                <FieldError>
                  {form.formState.errors.manualPriceNgn?.message}
                </FieldError>
              </Field>
            ) : (
              <Field>
                <FieldLabel htmlFor="product-usd">USD face value</FieldLabel>
                <Input
                  id="product-usd"
                  type="number"
                  inputMode="decimal"
                  min={0.01}
                  step="0.01"
                  placeholder="10.00"
                  disabled={mutation.isPending}
                  {...form.register('priceUsd')}
                />
                <p className="text-xs text-muted-foreground">
                  {rate
                    ? `Current rate: ₦${rate.ngnPerUsd.toLocaleString('en-NG')} / $1`
                    : 'No FX rate set — configure one on the Pricing page first.'}
                </p>
                <FieldError>{form.formState.errors.priceUsd?.message}</FieldError>
              </Field>
            )}

            <Field>
              <FieldLabel htmlFor="product-currency">Currency</FieldLabel>
              <Input
                id="product-currency"
                maxLength={3}
                disabled={mutation.isPending}
                {...form.register('currency')}
              />
              <FieldError>
                {form.formState.errors.currency?.message}
              </FieldError>
            </Field>
          </FieldGroup>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Creating…' : 'Create product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
