import { Skeleton } from '@/components/ui/skeleton';

const ROW_KEYS = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6'];

export default function AdminLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="rounded-lg border border-border">
        {ROW_KEYS.map((k) => (
          <div
            key={k}
            className="flex items-center gap-3 border-b border-border/60 px-3 py-3 last:border-b-0"
          >
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
