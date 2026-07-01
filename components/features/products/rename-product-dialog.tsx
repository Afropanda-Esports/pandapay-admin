'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil } from 'lucide-react';
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
import { updateProduct } from '@/lib/api/products';

const schema = z.object({
  name: z.string().trim().min(2, 'Min 2 characters'),
});

type FormValues = z.infer<typeof schema>;

interface RenameProductDialogProps {
  productId: string;
  currentName: string;
}

export function RenameProductDialog({
  productId,
  currentName,
}: Readonly<RenameProductDialogProps>) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: currentName },
  });

  const mutation = useMutation({
    mutationFn: (data: FormValues) =>
      updateProduct(productId, { name: data.name }),
    onSuccess: () => {
      toast.success('Product renamed');
      void queryClient.invalidateQueries({ queryKey: ['product', productId] });
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      setOpen(false);
    },
    onError: (err) => {
      const message =
        err instanceof ApiError ? err.message : 'Failed to rename product';
      toast.error(message);
    },
  });

  const onSubmit = form.handleSubmit((data) => mutation.mutate(data));

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) form.reset({ name: currentName });
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Pencil className="size-4" />
            Rename
          </Button>
        }
      />
      <DialogContent>
        <form onSubmit={onSubmit} noValidate>
          <DialogHeader>
            <DialogTitle>Rename product</DialogTitle>
            <DialogDescription>
              Update the display name shown in the catalog and orders.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            <Field>
              <FieldLabel htmlFor="product-rename">Name</FieldLabel>
              <Input
                id="product-rename"
                disabled={mutation.isPending}
                {...form.register('name')}
              />
              <FieldError>{form.formState.errors.name?.message}</FieldError>
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
