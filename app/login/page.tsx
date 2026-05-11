'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import { login } from '@/lib/api/auth';
import { useAuth } from '@/hooks/use-auth';
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

const schema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type FormValues = z.infer<typeof schema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { saveToken } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = form.handleSubmit(async (data) => {
    setSubmitting(true);
    try {
      const { access_token } = await login(data.email, data.password);
      saveToken(access_token);
      const redirect = searchParams.get('redirect') ?? '/dashboard';
      router.push(redirect);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Something went wrong';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            autoFocus
            disabled={submitting}
            {...form.register('email')}
          />
          <FieldError>{form.formState.errors.email?.message}</FieldError>
        </Field>

        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            disabled={submitting}
            {...form.register('password')}
          />
          <FieldError>{form.formState.errors.password?.message}</FieldError>
        </Field>

        <Button type="submit" size="lg" disabled={submitting} className="w-full">
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </FieldGroup>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3">
          <Logo variant="wordmark" priority className="h-9" />
          <div className="space-y-1.5">
            <CardTitle className="text-2xl">Admin</CardTitle>
            <p className="text-sm text-muted-foreground">
              Sign in to manage orders, products, and users.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="h-[280px]" />}>
            <LoginForm />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  );
}
