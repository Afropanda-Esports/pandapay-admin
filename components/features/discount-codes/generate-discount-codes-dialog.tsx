'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
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
import { generateDiscountCodes } from '@/lib/api/discount-codes';
import { getProducts } from '@/lib/api/products';
import { getCategories } from '@/lib/api/categories';
import { toSelectItems } from '@/lib/select-items';
import type { DiscountCode } from '@/lib/types';

const DISCOUNT_TYPE_OPTIONS = [
  { value: 'PERCENTAGE', label: 'Percentage off' },
  { value: 'FIXED_AMOUNT', label: 'Fixed amount off' },
] as const;

const targetTypeValues = ['product', 'category'] as const;
const discountTypeValues = ['PERCENTAGE', 'FIXED_AMOUNT'] as const;

const schema = z
  .object({
    targetType: z.enum(targetTypeValues),
    productId: z.string().optional(),
    categoryId: z.string().optional(),
    count: z.coerce.number().int().min(1).max(500),
    discountType: z.enum(discountTypeValues),
    discountValue: z.coerce.number().min(0.01),
    expiresInDays: z.coerce.number().int().min(1).max(90).optional(),
    recipientLabel: z.string().trim().max(120).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.targetType === 'product' && !data.productId) {
      ctx.addIssue({
        code: 'custom',
        message: 'Select a product',
        path: ['productId'],
      });
    }
    if (data.targetType === 'category' && !data.categoryId) {
      ctx.addIssue({
        code: 'custom',
        message: 'Select a category',
        path: ['categoryId'],
      });
    }
  });

type FormValues = z.input<typeof schema>;

export function GenerateDiscountCodesDialog() {
  const [open, setOpen] = useState(false);
  const [generated, setGenerated] = useState<DiscountCode[] | null>(null);
  const queryClient = useQueryClient();

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => getProducts(),
    staleTime: 60_000,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    staleTime: 60_000,
  });

  const productSelectItems = useMemo(
    () => toSelectItems(products),
    [products],
  );
  const categorySelectItems = useMemo(
    () => toSelectItems(categories),
    [categories],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      targetType: 'category',
      productId: undefined,
      categoryId: undefined,
      count: 10,
      discountType: 'PERCENTAGE',
      discountValue: '' as unknown as number,
      expiresInDays: 30,
      recipientLabel: '',
    },
  });

  const targetType = form.watch('targetType');

  const mutation = useMutation({
    mutationFn: (data: z.output<typeof schema>) =>
      generateDiscountCodes({
        count: data.count,
        productId: data.targetType === 'product' ? data.productId : undefined,
        categoryId: data.targetType === 'category' ? data.categoryId : undefined,
        discountType: data.discountType,
        discountValue: data.discountValue,
        expiresInDays: data.expiresInDays,
        recipientLabel: data.recipientLabel || undefined,
      }),
    onSuccess: (codes) => {
      toast.success(`${codes.length} discount code${codes.length === 1 ? '' : 's'} generated`);
      queryClient.invalidateQueries({ queryKey: ['discount-codes'] });
      setGenerated(codes);
      form.reset();
    },
    onError: (err) => {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to generate discount codes';
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
              <DialogTitle>Generate discount codes</DialogTitle>
              <DialogDescription>
                Bulk-create single-use codes tied to one product or an entire
                category.
              </DialogDescription>
            </DialogHeader>

            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="discount-target-type">Applies to</FieldLabel>
                <Controller
                  control={form.control}
                  name="targetType"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(v) => field.onChange(v)}
                      disabled={mutation.isPending}
                    >
                      <SelectTrigger id="discount-target-type" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="category">A category</SelectItem>
                        <SelectItem value="product">A specific product</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>

              {targetType === 'product' ? (
                <Field>
                  <FieldLabel htmlFor="discount-product">Product</FieldLabel>
                  <Controller
                    control={form.control}
                    name="productId"
                    render={({ field }) => (
                      <Select
                        items={productSelectItems}
                        value={field.value ?? ''}
                        onValueChange={(v) => field.onChange(v)}
                        disabled={mutation.isPending}
                      >
                        <SelectTrigger id="discount-product" className="w-full">
                          <SelectValue placeholder="Select a product" />
                        </SelectTrigger>
                        <SelectContent>
                          {(products ?? []).map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldError>{form.formState.errors.productId?.message}</FieldError>
                </Field>
              ) : (
                <Field>
                  <FieldLabel htmlFor="discount-category">Category</FieldLabel>
                  <Controller
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <Select
                        items={categorySelectItems}
                        value={field.value ?? ''}
                        onValueChange={(v) => field.onChange(v)}
                        disabled={mutation.isPending}
                      >
                        <SelectTrigger id="discount-category" className="w-full">
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
                  <FieldError>{form.formState.errors.categoryId?.message}</FieldError>
                </Field>
              )}

              <Field>
                <FieldLabel htmlFor="discount-count">How many codes</FieldLabel>
                <Input
                  id="discount-count"
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
                <FieldLabel htmlFor="discount-type">Discount type</FieldLabel>
                <Controller
                  control={form.control}
                  name="discountType"
                  render={({ field }) => (
                    <Select
                      items={DISCOUNT_TYPE_OPTIONS}
                      value={field.value}
                      onValueChange={(v) => field.onChange(v)}
                      disabled={mutation.isPending}
                    >
                      <SelectTrigger id="discount-type" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DISCOUNT_TYPE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="discount-value">
                  {form.watch('discountType') === 'FIXED_AMOUNT'
                    ? 'Amount off (NGN)'
                    : 'Percent off'}
                </FieldLabel>
                <Input
                  id="discount-value"
                  type="number"
                  inputMode="decimal"
                  min={0.01}
                  step="0.01"
                  placeholder={form.watch('discountType') === 'FIXED_AMOUNT' ? '500' : '10'}
                  disabled={mutation.isPending}
                  {...form.register('discountValue')}
                />
                <FieldError>{form.formState.errors.discountValue?.message}</FieldError>
              </Field>

              <Field>
                <FieldLabel htmlFor="discount-expires">Expires in (days)</FieldLabel>
                <Input
                  id="discount-expires"
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
                <FieldLabel htmlFor="discount-recipient">
                  Recipient label (optional)
                </FieldLabel>
                <Input
                  id="discount-recipient"
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
}: Readonly<{ codes: DiscountCode[]; onClose: () => void }>) {
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
