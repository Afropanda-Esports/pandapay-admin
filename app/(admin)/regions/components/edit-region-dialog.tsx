'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit2 } from 'lucide-react';
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
import { updateRegion } from '@/lib/api/products';
import type { Region } from '@/lib/types';

const schema = z.object({
  name: z.string().trim().min(2, 'Min 2 characters'),
  isActive: z.boolean(),
});

type FormValues = z.input<typeof schema>;

export function EditRegionDialog({ region }: Readonly<{ region: Region }>) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: region.name,
      isActive: region.isActive,
    },
  });

  const mutation = useMutation({
    mutationFn: (data: z.output<typeof schema>) => updateRegion(region.id, data),
    onSuccess: () => {
      toast.success('Region updated');
      queryClient.invalidateQueries({ queryKey: ['regions'] });
      setOpen(false);
    },
    onError: (err) => {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to update region';
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
        if (!next) form.reset({ name: region.name, isActive: region.isActive });
      }}
    >
      <DialogTrigger
        render={
          <Button variant="ghost" size="sm">
            <Edit2 className="size-4" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit region</DialogTitle>
          <DialogDescription>
            Update region name or toggle its active status.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="region-code">Code</FieldLabel>
              <Input
                id="region-code"
                value={region.code}
                disabled
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="region-currency">Currency</FieldLabel>
              <Input
                id="region-currency"
                value={region.currency}
                disabled
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="region-name">Name</FieldLabel>
              <Input
                id="region-name"
                disabled={mutation.isPending}
                {...form.register('name')}
              />
              <FieldError>{form.formState.errors.name?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="region-status">Active Status</FieldLabel>
              <Controller
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <Select
                    value={field.value ? 'true' : 'false'}
                    onValueChange={(v) => field.onChange(v === 'true')}
                    disabled={mutation.isPending}
                  >
                    <SelectTrigger id="region-status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Active</SelectItem>
                      <SelectItem value="false">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Inactive regions prevent new product brands from being created.
              </p>
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
              {mutation.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
