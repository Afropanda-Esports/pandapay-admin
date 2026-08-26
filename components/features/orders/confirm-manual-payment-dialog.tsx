'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api/client';
import { confirmManualPayment } from '@/lib/api/manual-payments';

export function ConfirmManualPaymentDialog({ orderId, amount, onConfirmed, trigger }: Readonly<{ orderId: string; amount: string; onConfirmed: () => void; trigger: React.ReactNode }>) {
  const [open, setOpen] = useState(false);
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const mutation = useMutation({
    mutationFn: () => confirmManualPayment(orderId, { amountNaira: amount, bankReference: reference.trim(), note: note.trim() || undefined }),
    onSuccess: ({ status }) => {
      toast.success(status === 'confirmed' ? 'Payment confirmed and order settled' : 'Payment was already confirmed');
      setOpen(false);
      setReference('');
      setNote('');
      onConfirmed();
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : 'Could not confirm payment'),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm manual payment</DialogTitle>
          <DialogDescription>Verify the exact credit of ₦{Number(amount).toLocaleString('en-NG')} in the platform bank account. This immediately starts order settlement.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bank-reference">Bank transaction reference</Label>
            <Input id="bank-reference" value={reference} onChange={(event) => setReference(event.target.value)} maxLength={100} placeholder="Unique bank reference" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmation-note">Note (optional)</Label>
            <Input id="confirmation-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} placeholder="Verification context" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={mutation.isPending}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || reference.trim().length < 2}>{mutation.isPending ? 'Settling…' : `Confirm ₦${Number(amount).toLocaleString('en-NG')}`}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
