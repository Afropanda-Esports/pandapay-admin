'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';

interface ErrorProps {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}

export default function AdminError({
  error,
  unstable_retry,
}: Readonly<ErrorProps>) {
  useEffect(() => {
    console.error('Route segment error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <AlertTriangle className="size-10 text-error-500" />
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          {error.message ||
            'An unexpected error occurred while rendering this page.'}
        </p>
      </div>
      <Button onClick={unstable_retry}>
        <RefreshCw className="size-4" />
        Try again
      </Button>
    </div>
  );
}
