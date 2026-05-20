'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import { useMe } from '@/hooks/use-me';
import { changeOwnPassword } from '@/lib/api/me';
import { ApiError } from '@/lib/api/client';
import { Logo } from '@/components/shared/logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Required'),
    newPassword: z
      .string()
      .min(8, 'Must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Required'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

export default function ChangePasswordPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me, isLoading } = useMe();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: FormValues) =>
      changeOwnPassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      }),
    onSuccess: () => {
      toast.success('Password updated');
      queryClient.invalidateQueries({ queryKey: ['me'] });
      router.push('/dashboard');
    },
    onError: (err) => {
      const message =
        err instanceof ApiError ? err.message : 'Could not update password';
      toast.error(message);
    },
  });

  const onSubmit = form.handleSubmit((data) => mutation.mutate(data));

  return (
    <main className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3">
          <Logo variant="wordmark" priority className="h-9" />
          <div className="space-y-1.5">
            <CardTitle className="text-2xl">Set a new password</CardTitle>
            <p className="text-sm text-muted-foreground">
              {isLoading
                ? 'Loading account…'
                : me?.mustChangePassword
                  ? 'You need to set a permanent password before continuing.'
                  : 'Update your password.'}
            </p>
            {me?.email && (
              <p className="text-xs font-mono text-muted-foreground">
                {me.email}
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} noValidate>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="currentPassword">
                  Current password
                </FieldLabel>
                <Input
                  id="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  autoFocus
                  disabled={mutation.isPending}
                  {...form.register('currentPassword')}
                />
                <FieldError>
                  {form.formState.errors.currentPassword?.message}
                </FieldError>
              </Field>

              <Field>
                <FieldLabel htmlFor="newPassword">New password</FieldLabel>
                <Input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  disabled={mutation.isPending}
                  {...form.register('newPassword')}
                />
                <FieldError>
                  {form.formState.errors.newPassword?.message}
                </FieldError>
              </Field>

              <Field>
                <FieldLabel htmlFor="confirmPassword">
                  Confirm new password
                </FieldLabel>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  disabled={mutation.isPending}
                  {...form.register('confirmPassword')}
                />
                <FieldError>
                  {form.formState.errors.confirmPassword?.message}
                </FieldError>
              </Field>

              <Button
                type="submit"
                size="lg"
                disabled={mutation.isPending}
                className="w-full"
              >
                {mutation.isPending ? 'Updating…' : 'Update password'}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
