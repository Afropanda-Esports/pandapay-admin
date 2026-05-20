'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Copy, Plus } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ApiError } from '@/lib/api/client';
import { createAdmin } from '@/lib/api/admins';
import type { AdminRole } from '@/lib/types';

const ROLE_OPTIONS: { value: AdminRole; label: string }[] = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
];

const schema = z.object({
  email: z.email('Enter a valid email'),
  displayName: z.string().trim().min(2, 'Min 2 characters'),
  role: z.enum(['ADMIN', 'SUPER_ADMIN']),
});

type FormValues = z.infer<typeof schema>;

export function CreateAdminDialog() {
  const [open, setOpen] = useState(false);
  const [createdPassword, setCreatedPassword] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', displayName: '', role: 'ADMIN' },
  });

  const mutation = useMutation({
    mutationFn: (data: FormValues) => createAdmin(data),
    onSuccess: (res) => {
      toast.success(`Admin ${res.admin.email} created`);
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      queryClient.invalidateQueries({ queryKey: ['admin-directory'] });
      setCreatedPassword({
        email: res.admin.email,
        password: res.temporaryPassword,
      });
      form.reset();
    },
    onError: (err) => {
      const message =
        err instanceof ApiError ? err.message : 'Failed to create admin';
      toast.error(message);
    },
  });

  const onSubmit = form.handleSubmit((data) => mutation.mutate(data));

  const handleClose = (next: boolean) => {
    if (mutation.isPending) return;
    setOpen(next);
    if (!next) {
      form.reset();
      setCreatedPassword(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="size-4" />
            Invite admin
          </Button>
        }
      />
      <DialogContent>
        {createdPassword ? (
          <CreatedPasswordPanel
            email={createdPassword.email}
            password={createdPassword.password}
            onClose={() => handleClose(false)}
          />
        ) : (
          <form onSubmit={onSubmit} noValidate>
            <DialogHeader>
              <DialogTitle>Invite admin</DialogTitle>
              <DialogDescription>
                A one-time temporary password is generated. Share it with the
                new admin — they will be required to set their own password
                on first login.
              </DialogDescription>
            </DialogHeader>

            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="admin-email">Email</FieldLabel>
                <Input
                  id="admin-email"
                  type="email"
                  autoComplete="off"
                  disabled={mutation.isPending}
                  {...form.register('email')}
                />
                <FieldError>{form.formState.errors.email?.message}</FieldError>
              </Field>

              <Field>
                <FieldLabel htmlFor="admin-name">Display name</FieldLabel>
                <Input
                  id="admin-name"
                  autoComplete="off"
                  disabled={mutation.isPending}
                  {...form.register('displayName')}
                />
                <FieldError>
                  {form.formState.errors.displayName?.message}
                </FieldError>
              </Field>

              <Field>
                <FieldLabel htmlFor="admin-role">Role</FieldLabel>
                <Controller
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <Select
                      items={ROLE_OPTIONS}
                      value={field.value}
                      onValueChange={(v) => field.onChange(v)}
                      disabled={mutation.isPending}
                    >
                      <SelectTrigger id="admin-role" className="w-full">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError>{form.formState.errors.role?.message}</FieldError>
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
                {mutation.isPending ? 'Creating…' : 'Create admin'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CreatedPasswordPanel({
  email,
  password,
  onClose,
}: Readonly<{ email: string; password: string; onClose: () => void }>) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      toast.success('Password copied to clipboard');
    } catch {
      toast.error('Could not copy — copy manually');
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Admin created</DialogTitle>
        <DialogDescription>
          Send this one-time password to {email} via a trusted channel. You
          will not see it again.
        </DialogDescription>
      </DialogHeader>

      <div className="my-4 rounded-lg border border-border bg-muted/40 p-4 space-y-2">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          Temporary password
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 select-all rounded bg-background px-3 py-2 font-mono text-sm">
            {password}
          </code>
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="size-3.5" />
            Copy
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          The new admin must change this password on first login.
        </p>
      </div>

      <DialogFooter>
        <Button onClick={onClose}>Done</Button>
      </DialogFooter>
    </>
  );
}
