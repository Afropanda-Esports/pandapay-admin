'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload } from 'lucide-react';
import { useState } from 'react';
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
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ApiError } from '@/lib/api/client';
import { uploadVouchers } from '@/lib/api/products';

const MAX_CODES = 500;
const COST_AMOUNT_RE = /^(?!0+(\.0+)?$)\d{1,14}(\.\d{1,2})?$/;
const COST_CURRENCY_OPTIONS = [
  { value: 'NGN', label: 'NGN' },
  { value: 'USD', label: 'USD' },
  { value: 'GBP', label: 'GBP' },
] as const;

const parseCodes = (raw: string): string[] =>
  raw
    .split('\n')
    .map((c) => c.trim())
    .filter(Boolean);

interface UploadVouchersDialogProps {
  productId: string;
  productName: string;
}

export function UploadVouchersDialog({
  productId,
  productName,
}: Readonly<UploadVouchersDialogProps>) {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState('');
  const [unitCostAmount, setUnitCostAmount] = useState('');
  const [unitCostCurrency, setUnitCostCurrency] = useState<
    'NGN' | 'USD' | 'GBP'
  >('NGN');
  const queryClient = useQueryClient();

  const codes = parseCodes(raw);
  const overLimit = codes.length > MAX_CODES;
  const costOk = COST_AMOUNT_RE.test(unitCostAmount.trim());

  const resetForm = () => {
    setRaw('');
    setUnitCostAmount('');
    setUnitCostCurrency('NGN');
  };

  const mutation = useMutation({
    mutationFn: (codesToUpload: string[]) =>
      uploadVouchers(productId, {
        codes: codesToUpload,
        unitCostAmount: unitCostAmount.trim(),
        unitCostCurrency,
      }),
    onSuccess: ({ inserted }) => {
      toast.success(
        `Inserted ${inserted} voucher${inserted === 1 ? '' : 's'}`,
      );
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      resetForm();
      setOpen(false);
    },
    onError: (err) => {
      const message =
        err instanceof ApiError ? err.message : 'Failed to upload vouchers';
      toast.error(message);
    },
  });

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (codes.length === 0 || overLimit || !costOk || mutation.isPending) {
      return;
    }
    mutation.mutate(codes);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline">
            <Upload className="size-4" />
            Upload vouchers
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload vouchers</DialogTitle>
          <DialogDescription>
            Paste one code per line for <strong>{productName}</strong>. Codes
            are encrypted server-side before storage. Enter what you paid per
            PIN (buy cost) — this does not change the selling price.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <Field>
            <FieldLabel htmlFor="voucher-codes">Voucher codes</FieldLabel>
            <Textarea
              id="voucher-codes"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder={'STEAM-XXXX-YYYY-ZZZZ\nSTEAM-AAAA-BBBB-CCCC'}
              rows={8}
              disabled={mutation.isPending}
              autoComplete="off"
              spellCheck={false}
            />
            <FieldDescription
              className={overLimit ? 'text-destructive' : undefined}
            >
              {codes.length} / {MAX_CODES} codes
              {overLimit && ' — too many, please split the upload.'}
            </FieldDescription>
          </Field>

          <div className="grid grid-cols-[1fr_7rem] gap-3">
            <Field>
              <FieldLabel htmlFor="unit-cost-amount">
                Unit cost (per PIN)
              </FieldLabel>
              <Input
                id="unit-cost-amount"
                inputMode="decimal"
                value={unitCostAmount}
                onChange={(e) => setUnitCostAmount(e.target.value)}
                placeholder="13200.00"
                disabled={mutation.isPending}
                autoComplete="off"
              />
              <FieldDescription>
                What you paid the supplier for one code.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="unit-cost-currency">Currency</FieldLabel>
              <Select
                items={[...COST_CURRENCY_OPTIONS]}
                value={unitCostCurrency}
                onValueChange={(v) =>
                  setUnitCostCurrency(v as 'NGN' | 'USD' | 'GBP')
                }
                disabled={mutation.isPending}
              >
                <SelectTrigger id="unit-cost-currency" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COST_CURRENCY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                codes.length === 0 ||
                overLimit ||
                !costOk ||
                mutation.isPending
              }
            >
              {mutation.isPending
                ? 'Uploading…'
                : `Upload ${codes.length || ''} ${
                    codes.length === 1 ? 'code' : 'codes'
                  }`.trim()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
