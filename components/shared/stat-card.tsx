import type { LucideIcon } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  isLoading?: boolean;
  className?: string;
}

export function StatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  isLoading,
  className,
}: Readonly<StatCardProps>) {
  return (
    <Card className={cn('h-full', className)}>
      <CardContent className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {label}
          </p>
          {isLoading ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            <p className="font-heading text-2xl font-bold tracking-tight">
              {value}
            </p>
          )}
          {isLoading ? (
            <Skeleton className="mt-1 h-3 w-32" />
          ) : subtitle ? (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        <div className="rounded-md bg-muted p-2 text-muted-foreground">
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}
