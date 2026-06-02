'use client';

import { useState } from 'react';

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
import {
  Field,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export type RefundChannel =
  | 'MANUAL'
  | 'BANK_TRANSFER'
  | 'PAYSTACK_REVERSAL'
  | 'CRYPTO_PAYOUT';

const REFUND_CHANNEL_OPTIONS: { value: RefundChannel; label: string }[] = [
  { value: 'MANUAL', label: 'Manual (offline)' },
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
  { value: 'PAYSTACK_REVERSAL', label: 'Paystack reversal' },
  { value: 'CRYPTO_PAYOUT', label: 'Crypto payout' },
];

export interface RecordRefundPayload {
  refundChannel: RefundChannel;
  externalReference?: string;
  note?: string;
}

interface RecordRefundDialogProps {
  trigger: React.ReactNode;
  orderSummary?: string;
  isPending?: boolean;
  onSubmit: (payload: RecordRefundPayload) => void | Promise<void>;
}

export function RecordRefundDialog({
  trigger,
  orderSummary,
  isPending,
  onSubmit,
}: Readonly<RecordRefundDialogProps>) {
  const [open, setOpen] = useState(false);
  const [refundChannel, setRefundChannel] = useState<RefundChannel>('MANUAL');
  const [externalReference, setExternalReference] = useState('');
  const [note, setNote] = useState('');

  const resetForm = () => {
    setRefundChannel('MANUAL');
    setExternalReference('');
    setNote('');
  };

  const handleClose = (next: boolean) => {
    if (isPending) return;
    setOpen(next);
    if (!next) resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      refundChannel,
      externalReference: externalReference.trim() || undefined,
      note: note.trim() || undefined,
    });
    resetForm();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Record refund</DialogTitle>
            <DialogDescription>
              Log an external payout refund. PandaPay does not custody user funds —
              no wallet credit is applied.
              {orderSummary ? (
                <span className="mt-2 block font-medium text-foreground">
                  {orderSummary}
                </span>
              ) : null}
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="py-4">
            <Field>
              <FieldLabel htmlFor="refund-channel">Refund channel</FieldLabel>
              <Select
                value={refundChannel}
                onValueChange={(v) =>
                  setRefundChannel((v as RefundChannel) ?? 'MANUAL')
                }
              >
                <SelectTrigger id="refund-channel" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REFUND_CHANNEL_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="refund-reference">
                External reference
              </FieldLabel>
              <Input
                id="refund-reference"
                placeholder="Bank ref, Paystack reversal ID, tx hash…"
                value={externalReference}
                onChange={(e) => setExternalReference(e.target.value)}
                autoComplete="off"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="refund-note">Note (optional)</FieldLabel>
              <Textarea
                id="refund-note"
                placeholder="Operator, bank, reason…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Recording…' : 'Record refund'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
