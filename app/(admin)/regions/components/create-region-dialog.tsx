'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
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
import { ApiError } from '@/lib/api/client';
import { createRegion } from '@/lib/api/products';

const schema = z.object({
  code: z.string().trim().min(2, 'Min 2 characters').toUpperCase(),
  name: z.string().trim().min(2, 'Min 2 characters'),
  currency: z.string().trim().min(3, 'Use a 3-letter code').max(3).toUpperCase().default('USD'),
});

type FormValues = z.input<typeof schema>;

export function CreateRegionDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: '',
      name: '',
      currency: 'USD',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: z.output<typeof schema>) => createRegion(data),
    onSuccess: () => {
      toast.success('Region created');
      queryClient.invalidateQueries({ queryKey: ['regions'] });
      form.reset();
      setOpen(false);
    },
    onError: (err) => {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to create region';
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
            New Region
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create region</DialogTitle>
          <DialogDescription>
            Add a geographic region to group product catalogs.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="region-code">Code</FieldLabel>
              <Input
                id="region-code"
                placeholder="US"
                disabled={mutation.isPending}
                {...form.register('code')}
              />
              <FieldError>{form.formState.errors.code?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="region-name">Name</FieldLabel>
              <Input
                id="region-name"
                placeholder="United States"
                disabled={mutation.isPending}
                {...form.register('name')}
              />
              <FieldError>{form.formState.errors.name?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="region-currency">Currency</FieldLabel>
              <Input
                id="region-currency"
                maxLength={3}
                placeholder="USD"
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
              {mutation.isPending ? 'Creating…' : 'Create region'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
