'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api/client';
import { resolveSupportRequest } from '@/lib/api/support-requests';

interface ResolveSupportRequestDialogProps {
  requestId: string;
  isPending?: boolean;
  onResolved?: () => void;
  trigger: React.ReactNode;
}

export function ResolveSupportRequestDialog({
  requestId,
  isPending,
  onResolved,
  trigger,
}: Readonly<ResolveSupportRequestDialogProps>) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      resolveSupportRequest(requestId, note.trim() || undefined),
    onSuccess: () => {
      toast.success('Support request marked resolved');
      setOpen(false);
      setNote('');
      onResolved?.();
    },
    onError: (err) => {
      const message =
        err instanceof ApiError ? err.message : 'Could not resolve request';
      toast.error(message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolve support request</DialogTitle>
          <DialogDescription>
            Confirm this customer issue was handled (WhatsApp reply, refund, or
            other follow-up).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="support-resolution-note">Resolution note (optional)</Label>
          <Input
            id="support-resolution-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Refunded via Paystack, customer notified on WhatsApp"
            maxLength={500}
            disabled={mutation.isPending || isPending}
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || isPending}
          >
            {mutation.isPending ? 'Saving…' : 'Mark resolved'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
