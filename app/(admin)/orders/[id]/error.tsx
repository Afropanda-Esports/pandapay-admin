'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function OrderDetailError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-muted-foreground">
      <AlertCircle className="size-8" />
      <p>Could not load this order.</p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => reset()}>
          <RefreshCw className="mr-2 size-4" />
          Retry
        </Button>
        <Button variant="ghost" size="sm" render={<Link href="/orders" />}>
          Back to orders
        </Button>
      </div>
    </div>
  );
}
