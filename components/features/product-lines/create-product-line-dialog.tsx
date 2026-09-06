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
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ApiError } from '@/lib/api/client';
import {
  createProductLine,
  getProductBrands,
  getRegions,
} from '@/lib/api/products';
import {
  CATALOG_NAME_MAX_LENGTH,
  brandLabel,
  catalogNameIssue,
} from '@/lib/catalog-forms';
import { usePermissions } from '@/hooks/use-permissions';

const schema = z.object({
  brandId: z.string().min(1, 'Brand is required'),
  // The 24-character cap is a WhatsApp catalog list-row limit, so it is checked
  // here rather than left to surface as a server error after submit.
  name: z.string().superRefine((value, ctx) => {
    const issue = catalogNameIssue(value);
    if (issue) ctx.addIssue({ code: 'custom', message: issue });
  }),
});

type FormValues = z.input<typeof schema>;

export function CreateProductLineDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const canManage = can('products:manage');

  const { data: brands } = useQuery({
    queryKey: ['product-brands'],
    queryFn: () => getProductBrands(),
    staleTime: 60_000,
  });

  // Brands are region-scoped, so the list holds one entry per region for each
  // platform. Without the region in the label they are indistinguishable.
  const { data: regions } = useQuery({
    queryKey: ['regions'],
    queryFn: getRegions,
    staleTime: 60_000,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { brandId: '', name: '' },
  });

  const mutation = useMutation({
    mutationFn: (data: z.output<typeof schema>) =>
      createProductLine({ brandId: data.brandId, name: data.name.trim() }),
    onSuccess: () => {
      toast.success('Product line created');
      // The Create product dialog reads these, so a line added here is
      // immediately selectable there without a reload.
      queryClient.invalidateQueries({ queryKey: ['product-lines'] });
      form.reset();
      setOpen(false);
    },
    onError: (err) => {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to create product line';
      form.setError('name', { message });
    },
  });

  if (!canManage) return null;

  const brandItems = Object.fromEntries(
    (brands ?? []).map((brand) => [brand.id, brandLabel(brand, regions)]),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus className="mr-2 size-4" /> New product line
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New product line</DialogTitle>
          <DialogDescription>
            A line groups the products under a brand — “PSN Gift Card”, “PS Plus
            Essential”. The name is shown to customers in WhatsApp, and lines
            cannot be deleted once created, so check the spelling.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit((values) =>
              mutation.mutateAsync(values as z.output<typeof schema>),
            )(event);
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="line-brand">Brand</FieldLabel>
              <Controller
                control={form.control}
                name="brandId"
                render={({ field }) => (
                  <Select
                    items={brandItems}
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={mutation.isPending}
                  >
                    <SelectTrigger id="line-brand" className="w-full">
                      <SelectValue placeholder="Select a brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {(brands ?? []).map((brand) => (
                        <SelectItem key={brand.id} value={brand.id}>
                          {brandLabel(brand, regions)}
                        </SelectItem>
                      ))}
                      {brands?.length === 0 && (
                        <div className="p-2 text-sm text-muted-foreground">
                          No brands yet — create one first
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError>{form.formState.errors.brandId?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="line-name">Name</FieldLabel>
              <Input
                id="line-name"
                maxLength={CATALOG_NAME_MAX_LENGTH}
                placeholder="PSN Gift Card"
                disabled={mutation.isPending}
                {...form.register('name')}
              />
              <FieldDescription>
                Up to {CATALOG_NAME_MAX_LENGTH} characters — it has to fit a
                WhatsApp catalog row.
              </FieldDescription>
              <FieldError>{form.formState.errors.name?.message}</FieldError>
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
              {mutation.isPending ? 'Creating…' : 'Create line'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
