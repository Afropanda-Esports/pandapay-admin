import { FileQuestion } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

export default function AdminNotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <FileQuestion className="size-10 text-muted-foreground" />
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Page not found</h2>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
        </p>
      </div>
      <Button render={<Link href="/dashboard" />}>Back to dashboard</Button>
    </div>
  );
}
