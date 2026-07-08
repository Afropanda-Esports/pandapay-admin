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
import { resolvePaymentException } from '@/lib/api/payment-exceptions';

interface ResolvePaymentExceptionDialogProps {
  exceptionId: string;
  excessAmount: string;
  isPending?: boolean;
  onResolved?: () => void;
  trigger: React.ReactNode;
}

export function ResolvePaymentExceptionDialog({
  exceptionId,
  excessAmount,
  isPending,
  onResolved,
  trigger,
}: Readonly<ResolvePaymentExceptionDialogProps>) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      resolvePaymentException(exceptionId, note.trim() || undefined),
    onSuccess: () => {
      toast.success('Payment exception marked resolved');
      setOpen(false);
      setNote('');
      onResolved?.();
    },
    onError: (err) => {
      const message =
        err instanceof ApiError ? err.message : 'Could not resolve exception';
      toast.error(message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolve overpayment exception</DialogTitle>
          <DialogDescription>
            Confirm manual refund of excess ₦{excessAmount} was completed in
            Paystack (or customer was contacted).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="resolution-note">Resolution note (optional)</Label>
          <Input
            id="resolution-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Paystack refund RRN …"
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
