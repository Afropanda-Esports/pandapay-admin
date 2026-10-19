'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import { login, resendLoginCode, verifyLogin } from '@/lib/api/auth';
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

const credentialsSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

const codeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
});

type CredentialsValues = z.infer<typeof credentialsSchema>;
type CodeValues = z.infer<typeof codeSchema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [emailHint, setEmailHint] = useState('');

  const credentials = useForm<CredentialsValues>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { email: '', password: '' },
  });

  const codeForm = useForm<CodeValues>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: '' },
  });

  const finishSession = (res: { must_change_password: boolean }) => {
    queryClient.removeQueries({ queryKey: ['me'] });
    if (res.must_change_password) {
      router.push('/change-password');
      return;
    }
    const redirect = searchParams.get('redirect') ?? '/dashboard';
    router.push(redirect);
  };

  const onCredentials = credentials.handleSubmit(async (data) => {
    setSubmitting(true);
    try {
      const res = await login(data.email, data.password);
      setChallengeId(res.challenge_id);
      setEmailHint(data.email);
      codeForm.reset({ code: '' });
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Something went wrong';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  });

  const onCode = codeForm.handleSubmit(async (data) => {
    if (!challengeId) return;
    setSubmitting(true);
    try {
      const res = await verifyLogin(challengeId, data.code);
      finishSession(res);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Something went wrong';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  });

  const onResend = async () => {
    if (!challengeId) return;
    setSubmitting(true);
    try {
      const res = await resendLoginCode(challengeId);
      setChallengeId(res.challenge_id);
      toast.success('A new code was sent to your admin email');
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Something went wrong';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (challengeId) {
    return (
      <form onSubmit={onCode} noValidate>
        <FieldGroup>
          <p className="text-sm text-muted-foreground">
            We sent a 6-digit sign-in code to {emailHint}. Enter it to continue.
          </p>
          <Field>
            <FieldLabel htmlFor="code">Authentication code</FieldLabel>
            <Input
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              disabled={submitting}
              maxLength={6}
              {...codeForm.register('code')}
            />
            <FieldError>{codeForm.formState.errors.code?.message}</FieldError>
          </Field>
          <Button type="submit" size="lg" disabled={submitting} className="w-full">
            {submitting ? 'Verifying…' : 'Verify code'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={submitting}
            className="w-full"
            onClick={() => {
              void onResend();
            }}
          >
            Resend code
          </Button>
        </FieldGroup>
      </form>
    );
  }

  return (
    <form onSubmit={onCredentials} noValidate>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            autoFocus
            disabled={submitting}
            {...credentials.register('email')}
          />
          <FieldError>{credentials.formState.errors.email?.message}</FieldError>
        </Field>

        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            disabled={submitting}
            {...credentials.register('password')}
          />
          <FieldError>
            {credentials.formState.errors.password?.message}
          </FieldError>
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
