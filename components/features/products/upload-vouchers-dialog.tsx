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
import { Textarea } from '@/components/ui/textarea';
import { ApiError } from '@/lib/api/client';
import { uploadVouchers } from '@/lib/api/products';

const MAX_CODES = 500;

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
  const queryClient = useQueryClient();

  const codes = parseCodes(raw);
  const overLimit = codes.length > MAX_CODES;

  const mutation = useMutation({
    mutationFn: (codesToUpload: string[]) =>
      uploadVouchers(productId, codesToUpload),
    onSuccess: ({ inserted }) => {
      toast.success(
        `Inserted ${inserted} voucher${inserted === 1 ? '' : 's'}`,
      );
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setRaw('');
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
    if (codes.length === 0 || overLimit || mutation.isPending) return;
    mutation.mutate(codes);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setRaw('');
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
            are encrypted server-side before storage.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate>
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
                codes.length === 0 || overLimit || mutation.isPending
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
