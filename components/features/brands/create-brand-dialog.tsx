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
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ApiError } from '@/lib/api/client';
import {
  createProductBrand,
  getAllowedBrandNames,
  getRegions,
} from '@/lib/api/products';
import { brandNameItems } from '@/lib/catalog-forms';
import { toSelectItems } from '@/lib/select-items';
import { usePermissions } from '@/hooks/use-permissions';

const schema = z.object({
  regionId: z.string().min(1, 'Region is required'),
  name: z.string().min(1, 'Brand is required'),
});

type FormValues = z.input<typeof schema>;

export function CreateBrandDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const canManage = can('products:manage');

  const { data: regions } = useQuery({
    queryKey: ['regions'],
    queryFn: getRegions,
    staleTime: 60_000,
  });

  // Fetched, never hardcoded — a second copy of LAUNCH_BRANDS here would drift
  // from the constant the WhatsApp bot matches customer messages against.
  const { data: allowedNames } = useQuery({
    queryKey: ['product-brands', 'allowed-names'],
    queryFn: getAllowedBrandNames,
    staleTime: 60_000,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { regionId: '', name: '' },
  });

  const mutation = useMutation({
    mutationFn: (data: z.output<typeof schema>) => createProductBrand(data),
    onSuccess: () => {
      toast.success('Brand created');
      // The Create product dialog reads these, so a brand added here is
      // immediately selectable there without a reload.
      queryClient.invalidateQueries({ queryKey: ['product-brands'] });
      form.reset();
      setOpen(false);
    },
    onError: (err) => {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to create brand';
      // A duplicate (region, name) and an off-list name both arrive here as a
      // 400 explaining itself; showing it on the field keeps it correctable.
      form.setError('name', { message });
    },
  });

  if (!canManage) return null;

  const regionItems = toSelectItems(regions);
  const nameItems = brandNameItems(allowedNames);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus className="mr-2 size-4" /> New brand
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New brand</DialogTitle>
          <DialogDescription>
            Brands are scoped to a region. The name comes from the platforms the
            bot recognises, so customers typing “psn” reach the right catalog.
            Brands cannot be deleted once created.
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
              <FieldLabel htmlFor="brand-region">Region</FieldLabel>
              <Controller
                control={form.control}
                name="regionId"
                render={({ field }) => (
                  <Select
                    items={regionItems}
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={mutation.isPending}
                  >
                    <SelectTrigger id="brand-region" className="w-full">
                      <SelectValue placeholder="Select a region" />
                    </SelectTrigger>
                    <SelectContent>
                      {(regions ?? []).map((region) => (
                        <SelectItem key={region.id} value={region.id}>
                          {region.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError>{form.formState.errors.regionId?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="brand-name">Brand</FieldLabel>
              <Controller
                control={form.control}
                name="name"
                render={({ field }) => (
                  <Select
                    items={nameItems}
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={mutation.isPending || !allowedNames}
                  >
                    <SelectTrigger id="brand-name" className="w-full">
                      <SelectValue placeholder="Select a brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {(allowedNames ?? []).map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
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
              {mutation.isPending ? 'Creating…' : 'Create brand'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
