'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  approveFraudEvent,
  listFraudEvents,
  rejectFraudEvent,
  type FraudEvent,
} from '@/lib/api/fraud';

export default function FraudReviewPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['fraud-events'],
    queryFn: () => listFraudEvents(1, 50),
  });

  const approve = useMutation({
    mutationFn: approveFraudEvent,
    onSuccess: () => {
      toast.success('Payment approved for fulfillment');
      void queryClient.invalidateQueries({ queryKey: ['fraud-events'] });
    },
    onError: () => toast.error('Could not approve'),
  });

  const reject = useMutation({
    mutationFn: rejectFraudEvent,
    onSuccess: () => {
      toast.success('Flag rejected');
      void queryClient.invalidateQueries({ queryKey: ['fraud-events'] });
    },
    onError: () => toast.error('Could not reject'),
  });

  const events = data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fraud review"
        description="Payments flagged by the fraud engine before auto-fulfillment."
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>
        }
      />

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : isError ? (
        <p className="text-sm text-destructive">Failed to load fraud queue.</p>
      ) : events.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No pending fraud reviews.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-4">
          {events.map((event) => (
            <FraudCard
              key={event.id}
              event={event}
              onApprove={() => approve.mutate(event.id)}
              onReject={() => reject.mutate(event.id)}
              busy={approve.isPending || reject.isPending}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function FraudCard({
  event,
  onApprove,
  onReject,
  busy,
}: Readonly<{
  event: FraudEvent;
  onApprove: () => void;
  onReject: () => void;
  busy: boolean;
}>) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base">
            Risk {event.riskScore} — {event.action}
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {format(parseISO(event.createdAt), 'PPpp')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={onApprove} disabled={busy}>
            Approve
          </Button>
          <Button size="sm" variant="outline" onClick={onReject} disabled={busy}>
            Reject
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p>
          <span className="text-muted-foreground">Signal:</span> {event.signalType}
        </p>
        {event.narrative ? <p>{event.narrative}</p> : null}
        {event.orderId ? (
          <p className="font-mono text-xs">Order: {event.orderId}</p>
        ) : null}
        {event.providerRef ? (
          <p className="font-mono text-xs break-all">Ref: {event.providerRef}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
