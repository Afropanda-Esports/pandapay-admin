'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload } from 'lucide-react';
import { useMemo, useState } from 'react';
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
const RATE_RE = /^(?!0+(\.0+)?$)\d{1,14}(\.\d{1,4})?$/;
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

const previewPurchaseTotal = (
  unit: string,
  qty: number,
): string | null => {
  if (qty < 1 || !COST_AMOUNT_RE.test(unit.trim())) return null;
  const u = Number(unit);
  if (!Number.isFinite(u) || u <= 0) return null;
  return (u * qty).toFixed(2);
};

const previewUnitCostNgn = (
  unit: string,
  currency: 'NGN' | 'USD' | 'GBP',
  rate: string,
): string | null => {
  if (!COST_AMOUNT_RE.test(unit.trim())) return null;
  const u = Number(unit);
  if (!Number.isFinite(u) || u <= 0) return null;
  if (currency === 'NGN') return u.toFixed(2);
  if (!RATE_RE.test(rate.trim())) return null;
  const r = Number(rate);
  if (!Number.isFinite(r) || r <= 0) return null;
  return (u * r).toFixed(2);
};

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
  const [unitCostFxRate, setUnitCostFxRate] = useState('');
  const queryClient = useQueryClient();

  const codes = parseCodes(raw);
  const overLimit = codes.length > MAX_CODES;
  const needsRate = unitCostCurrency !== 'NGN';
  const costOk = COST_AMOUNT_RE.test(unitCostAmount.trim());
  const rateOk = !needsRate || RATE_RE.test(unitCostFxRate.trim());
  const purchaseTotalPreview = useMemo(
    () => previewPurchaseTotal(unitCostAmount, codes.length),
    [unitCostAmount, codes.length],
  );
  const unitNgnPreview = useMemo(
    () =>
      previewUnitCostNgn(unitCostAmount, unitCostCurrency, unitCostFxRate),
    [unitCostAmount, unitCostCurrency, unitCostFxRate],
  );

  const resetForm = () => {
    setRaw('');
    setUnitCostAmount('');
    setUnitCostCurrency('NGN');
    setUnitCostFxRate('');
  };

  const mutation = useMutation({
    mutationFn: (codesToUpload: string[]) =>
      uploadVouchers(productId, {
        codes: codesToUpload,
        unitCostAmount: unitCostAmount.trim(),
        unitCostCurrency,
        ...(needsRate ? { unitCostFxRate: unitCostFxRate.trim() } : {}),
      }),
    onSuccess: ({ inserted, unitCostNgn }) => {
      toast.success(
        `Inserted ${inserted} voucher${inserted === 1 ? '' : 's'} · ₦${unitCostNgn}/unit`,
      );
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({
        queryKey: ['product-voucher-batches', productId],
      });
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
    if (
      codes.length === 0 ||
      overLimit ||
      !costOk ||
      !rateOk ||
      mutation.isPending
    ) {
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
            Paste one code per line for <strong>{productName}</strong>. Enter
            the unit cost of one code and FX rate when needed. Batch purchase
            total is unit × quantity. Selling price is unchanged.
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
                Unit cost (one code)
              </FieldLabel>
              <Input
                id="unit-cost-amount"
                inputMode="decimal"
                value={unitCostAmount}
                onChange={(e) => setUnitCostAmount(e.target.value)}
                placeholder="347.50"
                disabled={mutation.isPending}
                autoComplete="off"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="unit-cost-currency">Currency</FieldLabel>
              <Select
                items={[...COST_CURRENCY_OPTIONS]}
                value={unitCostCurrency}
                onValueChange={(v) => {
                  const next = v as 'NGN' | 'USD' | 'GBP';
                  setUnitCostCurrency(next);
                  if (next === 'NGN') setUnitCostFxRate('');
                }}
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

          {needsRate ? (
            <Field>
              <FieldLabel htmlFor="unit-cost-fx-rate">
                FX rate (NGN per {unitCostCurrency})
              </FieldLabel>
              <Input
                id="unit-cost-fx-rate"
                inputMode="decimal"
                value={unitCostFxRate}
                onChange={(e) => setUnitCostFxRate(e.target.value)}
                placeholder="1380"
                disabled={mutation.isPending}
                autoComplete="off"
              />
            </Field>
          ) : null}

          {purchaseTotalPreview != null || unitNgnPreview != null ? (
            <p className="text-sm text-muted-foreground">
              {purchaseTotalPreview != null ? (
                <>
                  Purchase total:{' '}
                  <span className="font-medium text-foreground">
                    {unitCostCurrency === 'NGN' ? '₦' : ''}
                    {purchaseTotalPreview}
                    {unitCostCurrency !== 'NGN' ? ` ${unitCostCurrency}` : ''}
                  </span>
                  <span className="block text-xs">
                    unit × {codes.length} codes
                  </span>
                </>
              ) : null}
              {unitNgnPreview != null ? (
                <span className={purchaseTotalPreview != null ? 'mt-1 block' : undefined}>
                  Cost price / unit:{' '}
                  <span className="font-medium text-foreground">
                    ₦{unitNgnPreview}
                  </span>
                  {needsRate ? (
                    <span className="block text-xs">unit × FX rate</span>
                  ) : null}
                </span>
              ) : null}
            </p>
          ) : null}

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
                !rateOk ||
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
