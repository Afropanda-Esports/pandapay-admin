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

export function ConfirmManualPaymentDialog({ orderId, amount, senderName, onConfirmed, trigger }: Readonly<{ orderId: string; amount: string; senderName?: string | null; onConfirmed: () => void; trigger: React.ReactNode }>) {
  const [open, setOpen] = useState(false);
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [observedAmount, setObservedAmount] = useState(amount);
  const mutation = useMutation({
    mutationFn: () => confirmManualPayment(orderId, { amountNaira: observedAmount, bankReference: reference.trim(), note: note.trim() || undefined, decisionContext: note.trim() || 'Bank statement credit independently verified' }),
    onSuccess: ({ status, outstanding, excess }) => {
      const message = status === 'underpaid' ? `Partial payment recorded; ₦${outstanding} remains` : excess ? `Settled; ₦${excess} refund follow-up created` : status === 'confirmed' ? 'Payment confirmed and order settled' : 'Payment was already confirmed';
      toast.success(message);
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
          {senderName ? (
            <p className="rounded-md bg-muted px-3 py-2 text-sm">
              Customer claims this was sent by <span className="font-medium">{senderName}</span> — cross-check against the name on the credit in your bank statement.
            </p>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="observed-amount">Observed amount credited (NGN)</Label>
            <Input id="observed-amount" inputMode="decimal" value={observedAmount} onChange={(event) => setObservedAmount(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bank-reference">Bank transaction reference</Label>
            <Input id="bank-reference" value={reference} onChange={(event) => setReference(event.target.value)} maxLength={100} placeholder="Unique bank reference" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmation-note">Decision context</Label>
            <Input id="confirmation-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} placeholder="How the bank credit was verified" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={mutation.isPending}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || reference.trim().length < 2 || Number(observedAmount) <= 0}>{mutation.isPending ? 'Settling…' : `Record ₦${Number(observedAmount).toLocaleString('en-NG')}`}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
