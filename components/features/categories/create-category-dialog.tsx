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
import { createCategory } from '@/lib/api/categories';
import { usePermissions } from '@/hooks/use-permissions';

const schema = z.object({
  code: z.string().trim().min(2, 'Code is required').toUpperCase(),
  name: z.string().trim().min(2, 'Name is required'),
});

type FormValues = z.input<typeof schema>;

export function CreateCategoryDialog() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const canManage = can('products:manage'); // Assuming products:manage allows category manage

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: '',
      name: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: z.output<typeof schema>) => createCategory(data),
    onSuccess: () => {
      toast.success('Category created');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      form.reset();
      setOpen(false);
    },
    onError: (err) => {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to create category';
      toast.error(message);
    },
  });

  if (!canManage) return null;

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
            New Category
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Create category</DialogTitle>
          <DialogDescription>
            Add a new product category.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit((data) =>
            mutation.mutate(data as z.output<typeof schema>),
          )}
          noValidate
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="category-code">Code</FieldLabel>
              <Input
                id="category-code"
                placeholder="e.g. GIFT_CARD"
                disabled={mutation.isPending}
                {...form.register('code')}
                onChange={(e) => {
                  e.target.value = e.target.value.toUpperCase();
                  form.setValue('code', e.target.value);
                }}
              />
              <FieldError>{form.formState.errors.code?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="category-name">Name</FieldLabel>
              <Input
                id="category-name"
                placeholder="e.g. Gift Card"
                disabled={mutation.isPending}
                {...form.register('name')}
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
              {mutation.isPending ? 'Creating…' : 'Create category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
