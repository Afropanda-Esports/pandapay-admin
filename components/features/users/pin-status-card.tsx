'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { CheckCircle2, KeyRound, Lock } from 'lucide-react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ApiError } from '@/lib/api/client';
import { unlockPin } from '@/lib/api/users';
import type { PinStatus } from '@/lib/types';

interface PinStatusCardProps {
  userId: string;
  pinStatus: PinStatus;
}

export function PinStatusCard({
  userId,
  pinStatus,
}: Readonly<PinStatusCardProps>) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => unlockPin(userId),
    onSuccess: () => {
      toast.success('PIN unlocked');
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
    },
    onError: (err) => {
      const message =
        err instanceof ApiError ? err.message : 'Failed to unlock PIN';
      toast.error(message);
    },
  });

  const { failedAttempts, isLocked, lockedUntil } = pinStatus;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <KeyRound className="size-4" />
          PIN Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            State
          </span>
          {isLocked ? (
            <Badge className="bg-error-100 text-error-700 hover:bg-error-100 border-0">
              <Lock className="mr-1 size-3" />
              Locked
            </Badge>
          ) : (
            <Badge className="bg-success-100 text-success-700 hover:bg-success-100 border-0">
              <CheckCircle2 className="mr-1 size-3" />
              Unlocked
            </Badge>
          )}
        </div>

        <div className="flex items-baseline justify-between">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            Failed attempts
          </span>
          <span className="text-sm font-medium tabular-nums">
            {failedAttempts}
          </span>
        </div>

        {isLocked && lockedUntil && (
          <div className="flex items-baseline justify-between">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Locked until
            </span>
            <span className="text-sm font-medium">
              {format(parseISO(lockedUntil), 'PPpp')}
            </span>
          </div>
        )}

        {isLocked && (
          <div className="flex justify-end pt-2">
            <ConfirmDialog
              trigger={
                <Button
                  variant="outline"
                  size="sm"
                  disabled={mutation.isPending}
                >
                  <KeyRound className="size-4" />
                  Unlock PIN
                </Button>
              }
              title="Unlock PIN?"
              description="Reset failed attempts and clear the lock. The user will be able to retry their PIN immediately."
              confirmLabel="Unlock"
              isPending={mutation.isPending}
              onConfirm={async () => {
                await mutation.mutateAsync();
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
