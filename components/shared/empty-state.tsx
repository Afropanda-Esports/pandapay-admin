import { Inbox, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  message: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  message,
  action,
  className,
}: Readonly<EmptyStateProps>) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 py-16 text-center text-muted-foreground',
        className,
      )}
    >
      <Icon className="h-10 w-10" aria-hidden />
      {title && (
        <p className="text-base font-medium text-foreground">{title}</p>
      )}
      <p className="max-w-sm text-sm">{message}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
