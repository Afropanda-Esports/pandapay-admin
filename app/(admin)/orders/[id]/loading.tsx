import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function OrderDetailLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-64" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {['a', 'b', 'c', 'd', 'e'].map((k) => (
          <Card key={k}>
            <CardHeader>
              <Skeleton className="h-5 w-28" />
            </CardHeader>
            <CardContent className="space-y-3">
              {['1', '2', '3'].map((kk) => (
                <Skeleton key={kk} className="h-5 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
