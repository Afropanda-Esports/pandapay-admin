'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { createProduct } from '@/lib/api/products';
import type { ProductCategory } from '@/lib/types';

const CATEGORY_OPTIONS: { value: ProductCategory; label: string }[] = [
  { value: 'GIFT_CARD', label: 'Gift Card' },
  { value: 'GAME_TOP_UP', label: 'Game Top-up' },
  { value: 'AIRTIME', label: 'Airtime' },
];

// V1 of the create dialog: collects an NGN price (MANUAL_NGN mode). The admin
// can flip the product to GLOBAL_FX with a USD face value from the product
// detail page (Phase D adds that UI).
const schema = z.object({
  name: z.string().trim().min(2, 'Min 2 characters'),
  category: z.enum(['GIFT_CARD', 'GAME_TOP_UP', 'AIRTIME']),
  manualPriceNgn: z.coerce.number().positive('Must be greater than 0'),
  currency: z.string().trim().min(3, 'Use a 3-letter code').max(3).default('NGN'),
});

type FormValues = z.input<typeof schema>;

export function CreateProductDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      category: undefined,
      manualPriceNgn: '' as unknown as number,
      currency: 'NGN',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: z.output<typeof schema>) =>
      createProduct({
        name: data.name,
        category: data.category,
        currency: data.currency,
        pricingMode: 'MANUAL_NGN',
        manualPriceNgn: data.manualPriceNgn,
      }),
    onSuccess: () => {
      toast.success('Product created');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      form.reset();
      setOpen(false);
    },
    onError: (err) => {
      const message =
        err instanceof ApiError ? err.message : 'Failed to create product';
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create product</DialogTitle>
          <DialogDescription>
            Add a new gift card, game top-up, or airtime SKU. Price is set in
            NGN; you can switch the product to USD-based pricing later.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="product-name">Name</FieldLabel>
              <Input
                id="product-name"
                placeholder="Steam Gift Card"
                disabled={mutation.isPending}
                {...form.register('name')}
              />
              <FieldError>{form.formState.errors.name?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="product-category">Category</FieldLabel>
              <Controller
                control={form.control}
                name="category"
                render={({ field }) => (
                  <Select
                    items={CATEGORY_OPTIONS}
                    value={field.value ?? ''}
                    onValueChange={(v) => field.onChange(v)}
                    disabled={mutation.isPending}
                  >
                    <SelectTrigger id="product-category" className="w-full">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError>
                {form.formState.errors.category?.message}
              </FieldError>
            </Field>

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
